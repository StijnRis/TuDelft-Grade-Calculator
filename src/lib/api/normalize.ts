import { htmlToText } from "@/lib/assessment/parse";

export interface Course {
  code: string;
  name: string;
  ects?: number;
  language?: string;
  faculty?: string;
  responsible?: string;
  period?: string;
  /** Description as plain text. */
  description?: string;
  /** Raw (HTML) assessment text exactly as the study guide provides it. */
  assessmentText: string;
  /** Any other scalar fields the API returned, shown as-is. */
  extra: Array<{ label: string; value: string }>;
}

type Json = Record<string, unknown>;

const KEYS = {
  code: ["code", "courseCode", "course_code", "Code"],
  name: ["name", "title", "courseName", "Name", "Title"],
  ects: ["ects", "credits", "ECTS", "Credits"],
  language: ["language", "Language", "instructionLanguage"],
  faculty: ["faculty", "Faculty", "department"],
  responsible: ["responsible", "responsibleInstructor", "coordinator", "Responsible"],
  period: ["period", "Period", "education_period"],
  description: ["description", "Description", "summary", "content"],
  assessment: ["assessment", "Assessment", "examination", "assessmentForm", "toetsing"],
} as const;

/** Resolve plain strings, numbers and `{en, nl}` style localized objects. */
function asText(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number") return String(v);
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Json;
    for (const k of ["en", "EN", "en-GB", "nl", "NL"]) {
      const t = asText(o[k]);
      if (t) return t;
    }
  }
  return undefined;
}

function pick(obj: Json, keys: readonly string[]): { key?: string; value?: string } {
  for (const k of keys) {
    const value = asText(obj[k]);
    if (value !== undefined) return { key: k, value };
  }
  return {};
}

export function normalizeCourse(raw: unknown): Course {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Unexpected course payload");
  }
  const o = raw as Json;
  const used = new Set<string>();
  const get = (field: keyof typeof KEYS) => {
    const { key, value } = pick(o, KEYS[field]);
    if (key) used.add(key);
    return value;
  };

  const code = get("code");
  const name = get("name");
  if (!code && !name) throw new Error("Course payload has neither a code nor a name");
  const ects = get("ects");
  const description = get("description");

  const extra = Object.entries(o)
    .filter(([k, v]) => !used.has(k) && !k.startsWith("_") && asText(v) !== undefined)
    .map(([label, v]) => ({ label, value: htmlToText(asText(v)!) }));

  return {
    code: code ?? "",
    name: name ?? code ?? "",
    ects: ects !== undefined && !Number.isNaN(parseFloat(ects)) ? parseFloat(ects) : undefined,
    language: get("language"),
    faculty: get("faculty"),
    responsible: get("responsible"),
    period: get("period"),
    description: description ? htmlToText(description) : undefined,
    assessmentText: get("assessment") ?? "",
    extra,
  };
}
