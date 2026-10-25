import type { CourseHit } from "./osiris";

export interface IndexedCourse {
  code: string;
  name: string;
  /** Known offerings, newest first. */
  years: Array<{ year: string; id: number }>;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** In-memory course catalogue with ranked code/name search. */
export class CourseIndex {
  private courses = new Map<string, IndexedCourse>();

  add(hits: CourseHit[]): void {
    for (const h of hits) {
      let c = this.courses.get(h.code);
      if (!c) {
        c = { code: h.code, name: h.name, years: [] };
        this.courses.set(h.code, c);
      }
      if (c.years.some((y) => y.year === h.year)) continue;
      c.years.push({ year: h.year, id: h.id });
      c.years.sort((a, b) => b.year.localeCompare(a.year));
      // The newest offering's name wins.
      if (c.years[0].year === h.year) c.name = h.name;
    }
  }

  search(query: string, limit = 10): IndexedCourse[] {
    const words = fold(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const q = words.join(" ");
    const scored: Array<[number, IndexedCourse]> = [];
    for (const c of this.courses.values()) {
      const code = fold(c.code);
      const name = fold(c.name);
      if (!words.every((w) => code.includes(w) || name.includes(w))) continue;
      const rank = code === q ? 0 : code.startsWith(q) ? 1 : name.startsWith(q) ? 2 : 3;
      scored.push([rank, c]);
    }
    scored.sort((a, b) => a[0] - b[0] || a[1].code.localeCompare(b[1].code));
    return scored.slice(0, limit).map(([, c]) => c);
  }
}
