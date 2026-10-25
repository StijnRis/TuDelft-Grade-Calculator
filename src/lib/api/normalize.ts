import { htmlToText } from "@/lib/assessment/parse";
import { parseEcts, parseYear } from "./osiris";

export interface CourseTest {
  name: string;
  /** Relative weight as published (points or percent); absent when not numeric. */
  weight?: number;
  minGrade?: number;
  /** Graded as sufficient/insufficient rather than with a number. */
  passFail: boolean;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  year: string;
  ects?: number;
  deepLink?: string;
  tests: CourseTest[];
  /** Readable course information (content, lecturers, assessment rules). */
  sections: Array<{ title: string; text: string }>;
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const num = (v: unknown): number | undefined => {
  const s = str(v).replace(",", ".");
  return /^\d+(\.\d+)?$/.test(s) ? parseFloat(s) : undefined;
};

/** Rubrieken shown as sections, with a fallback title when the field has none. */
const SECTIONS: Record<string, string> = {
  "rubriek-inhoud": "Content",
  "rubriek-docenten": "Lecturers",
  "rubriek-toetsen": "Assessment",
};

const velden = (v: unknown): Json[] => (Array.isArray(v) ? v.filter(isObj) : []);

/** Plain text of a field value: strings, nested `velden` regions and row tables. */
function leaves(waarde: unknown): string {
  if (typeof waarde === "string" || typeof waarde === "number") return htmlToText(String(waarde));
  if (Array.isArray(waarde)) {
    return waarde
      .filter(isObj)
      .map((row) => {
        const inner = velden(row.velden)
          .map((f) => (f.docent !== undefined ? str(f.docent) : labelled(f)))
          .filter(Boolean)
          .join(", ");
        return [str(row.omschrijving), inner].filter(Boolean).join(": ");
      })
      .filter(Boolean)
      .join("\n");
  }
  if (isObj(waarde)) return velden(waarde.velden).map(labelled).filter(Boolean).join("\n");
  return "";
}

function labelled(f: Json): string {
  const t = leaves(f.waarde);
  return t && str(f.titel) ? `${str(f.titel)}: ${t}` : t;
}

function parseTests(rows: unknown): CourseTest[] {
  return (Array.isArray(rows) ? rows.filter(isObj) : []).map((row) => {
    const f: Record<string, string> = {};
    for (const v of velden(row.velden)) f[str(v.veld)] = str(v.waarde);
    const minRaw = f["item-toets-minimum-cijfer"] ?? "";
    const minGrade = num(minRaw);
    const passFail = /sufficient|satisfactory|pass/i.test(`${minRaw} ${f["item-toets-resultaatschaal"] ?? ""}`) && minGrade === undefined;
    return {
      name: str(row.omschrijving) || "Test",
      weight: num(f["item-toets-weging"]),
      minGrade,
      passFail,
    };
  });
}

export function normalizeCourseDetail(raw: unknown, id: number): Course {
  const items = isObj(raw) ? velden(raw.items) : [];
  if (!items.length) throw new Error("Unexpected course payload");

  const kop: Record<string, string> = {};
  const sections: Course["sections"] = [];
  let tests: CourseTest[] = [];
  let points: string | undefined;

  for (const item of items) {
    const rubriek = str(item.rubriek);
    for (const f of velden(item.velden)) {
      const veld = str(f.veld);
      if (rubriek === "rubriek-kop") kop[veld] = str(f.waarde);
      else if (veld === "item-punten-zoek") points = str(f.waarde);
      else if (veld === "tabel-toetsen") tests = parseTests(f.waarde);
      else if (rubriek in SECTIONS) {
        const text = leaves(f.waarde);
        if (text) sections.push({ title: str(f.titel) || SECTIONS[rubriek], text });
      }
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
    ects: parseEcts(points),
    deepLink: str(kop.deeplink_detailscherm_extern) || undefined,
    tests,
    sections,
  };
}
