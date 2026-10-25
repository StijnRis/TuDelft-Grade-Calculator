import { htmlToText } from "@/lib/assessment/parse";
import { parseEcts, parseYear } from "./osiris";

export interface Course {
  id: number;
  code: string;
  name: string;
  year: string;
  ects?: number;
  deepLink?: string;
  /** Assessment description as plain text, ready for `parseAssessment`. */
  assessmentText: string;
  /** Every non-empty field of the course page as plain text. */
  sections: Array<{ title: string; text: string }>;
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

/** Rubriek or field names that hold the assessment ("toetsing", "tentamen", ...). */
const ASSESSMENT = /toets|tentam|exam|assess/i;

interface Field { veld: string; titel: string; waarde: string }

function flatten(velden: unknown): Field[] {
  const out: Field[] = [];
  for (const v of Array.isArray(velden) ? velden : []) {
    if (!isObj(v)) continue;
    const waarde = v.waarde;
    if (isObj(waarde) && Array.isArray(waarde.velden)) {
      out.push(...flatten(waarde.velden));
    } else if (typeof waarde === "string" || typeof waarde === "number") {
      out.push({ veld: str(v.veld), titel: str(v.titel), waarde: String(waarde) });
    }
  }
  return out;
}

export function normalizeCourseDetail(raw: unknown, id: number): Course {
  const items = isObj(raw) && Array.isArray(raw.items) ? raw.items : [];
  if (!items.length) throw new Error("Unexpected course payload");

  const kop: Record<string, string> = {};
  const sections: Course["sections"] = [];
  const assessment: string[] = [];

  for (const item of items) {
    if (!isObj(item)) continue;
    const rubriek = str(item.rubriek);
    const fields = flatten(item.velden);
    if (rubriek === "rubriek-kop") {
      for (const f of fields) kop[f.veld] = f.waarde;
      continue;
    }
    for (const f of fields) {
      const plain = htmlToText(f.waarde);
      if (!plain) continue;
      sections.push({ title: f.titel || f.veld, text: plain });
      if (ASSESSMENT.test(rubriek) || ASSESSMENT.test(f.veld)) assessment.push(plain);
    }
  }

  const code = str(kop.cursus);
  const name = str(kop.cursus_lange_naam) || str(kop.cursus_korte_naam) || code;
  if (!code && !name) throw new Error("Course payload has neither a code nor a name");
  return {
    id,
    code,
    name,
    year: parseYear(kop.collegejaar),
    ects: parseEcts(kop.punten),
    deepLink: str(kop.deeplink_detailscherm_extern) || undefined,
    assessmentText: assessment.join("\n"),
    sections,
  };
}
