/**
 * Wire format of the Osiris Student API that TU Delft publishes at
 * https://tudelft.osiris-student.nl (an Elasticsearch-backed search plus a
 * "rubrieken" detail endpoint). Pure functions only; no I/O here.
 */

export interface CourseHit {
  /** Internal Osiris id of this offering (one per academic year). */
  id: number;
  code: string;
  name: string;
  /** Academic year as "YYYY-YYYY". */
  year: string;
  ects?: number;
  faculty?: string;
  languages: string[];
  lecturers: string[];
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

/** 2025 | "2025" | "2025-2026" -> "2025-2026"; anything else -> "". */
export function parseYear(value: unknown): string {
  const raw = text(value);
  const single = /^(\d{4})$/.exec(raw);
  if (single) return `${single[1]}-${Number(single[1]) + 1}`;
  return /^\d{4}-\d{4}$/.test(raw) ? raw : "";
}

export function parseEcts(value: unknown): number | undefined {
  const n = parseFloat(text(value).replace(",", "."));
  return Number.isNaN(n) ? undefined : n;
}

export interface SearchOptions {
  keyword?: string;
  year?: string;
  /** Restrict the returned `_source` fields (keeps big pages small). */
  source?: string[];
  limit?: number;
  offset?: number;
}

export function buildSearchQuery(o: SearchOptions) {
  const must: Json[] = [];
  const term = (o.keyword ?? "").trim().toUpperCase();
  if (term.length > 1) {
    must.push({
      multi_match: {
        query: term,
        type: "phrase_prefix",
        fields: ["cursus", "cursus_korte_naam", "cursus_lange_naam"],
        max_expansions: 200,
      },
    });
  }
  if (o.year) must.push({ term: { collegejaar: parseYear(o.year) } });
  return {
    ...(o.source && { _source: o.source }),
    query: { bool: { must } },
    sort: [{ collegejaar: { order: "desc" } }],
    track_total_hits: true,
    size: Math.max(1, Math.min(o.limit ?? 10, 10_000)),
    from: Math.max(0, o.offset ?? 0),
  };
}

export function parseSearchResponse(raw: unknown): { hits: CourseHit[]; total: number } {
  const root = isObj(raw) && isObj(raw.hits) ? raw.hits : undefined;
  const list = root && Array.isArray(root.hits) ? root.hits : undefined;
  if (!root || !list) return { hits: [], total: 0 };

  const hits: CourseHit[] = [];
  for (const h of list) {
    const s = isObj(h) && isObj(h._source) ? h._source : undefined;
    const code = s ? text(s.cursus) : "";
    if (!s || !code) continue;
    const names = (v: unknown, key: string) =>
      (Array.isArray(v) ? v : [])
        .map((x) => (isObj(x) ? text(x[key]) : ""))
        .filter((x, i, a) => x && a.indexOf(x) === i);
    hits.push({
      id: Number(s.id_cursus) || 0,
      code,
      name: text(s.cursus_lange_naam) || text(s.cursus_korte_naam) || code,
      year: parseYear(s.collegejaar),
      ects: parseEcts(s.punten),
      faculty: text(s.faculteit_naam) || text(s.faculteit) || undefined,
      languages: names(s.voertalen, "voertaal_omschrijving"),
      lecturers: names(s.docenten, "docent"),
    });
  }
  const t = root.total;
  const total = isObj(t) ? Number(t.value) : Number(t);
  return { hits, total: Number.isFinite(total) ? total : hits.length };
}
