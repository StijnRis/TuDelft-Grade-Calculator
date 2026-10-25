import type { CourseHit } from "./osiris";

export interface MemoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface IndexedCourse {
  code: string;
  name: string;
  /** Known offerings, newest first. */
  years: Array<{ year: string; id: number }>;
}

interface Options {
  storage?: MemoryStorage;
  now?: () => number;
  ttlMs?: number;
  key?: string;
}

const WEEK = 7 * 24 * 3600 * 1000;
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Local, persisted catalogue of course codes, names and years. TU Delft's
 * whole catalogue is small, so it is loaded once and every search after that
 * is answered locally and instantly.
 */
export class CourseIndex {
  private courses = new Map<string, IndexedCourse>();
  private storage?: MemoryStorage;
  private now: () => number;
  private ttl: number;
  private key: string;
  private completedAt?: number;

  constructor(o: Options = {}) {
    this.storage = o.storage;
    this.now = o.now ?? Date.now;
    this.ttl = o.ttlMs ?? WEEK;
    this.key = o.key ?? "tudelft-course-index-v1";
    this.load();
  }

  add(hits: CourseHit[]): void {
    let changed = false;
    for (const h of hits) {
      let c = this.courses.get(h.code);
      if (!c) {
        c = { code: h.code, name: h.name, years: [] };
        this.courses.set(h.code, c);
        changed = true;
      }
      const known = c.years.find((y) => y.year === h.year);
      if (!known) {
        c.years.push({ year: h.year, id: h.id });
        c.years.sort((a, b) => b.year.localeCompare(a.year));
        // The newest offering's name wins.
        if (c.years[0].year === h.year && c.name !== h.name) c.name = h.name;
        changed = true;
      }
    }
    if (changed) this.save();
  }

  /** True when the whole catalogue was loaded recently, so local search is exhaustive. */
  isComplete(): boolean {
    return this.completedAt !== undefined && this.now() - this.completedAt <= this.ttl;
  }

  markComplete(): void {
    this.completedAt = this.now();
    this.save();
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

  private load(): void {
    try {
      const raw = this.storage?.getItem(this.key);
      if (!raw) return;
      const data = JSON.parse(raw) as { savedAt: number; completedAt?: number; courses: IndexedCourse[] };
      if (this.now() - data.savedAt > this.ttl) return;
      for (const c of data.courses) this.courses.set(c.code, c);
      this.completedAt = data.completedAt;
    } catch {
      /* corrupt or unavailable storage: start empty */
    }
  }

  private save(): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify({ savedAt: this.now(), completedAt: this.completedAt, courses: [...this.courses.values()] }));
    } catch {
      /* quota or blocked storage: keep working in memory */
    }
  }
}
