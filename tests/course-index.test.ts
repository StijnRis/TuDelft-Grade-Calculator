import { describe, expect, it, vi } from "vitest";
import { CourseIndex, type MemoryStorage } from "@/lib/api/course-index";
import type { CourseHit } from "@/lib/api/osiris";

const hit = (code: string, name: string, year: string, id = 1): CourseHit => ({
  id, code, name, year, languages: [], lecturers: [],
});
const mem = (): MemoryStorage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

describe("CourseIndex", () => {
  it("merges offerings per code with years newest first", () => {
    const ix = new CourseIndex({ storage: mem() });
    ix.add([hit("CS1234", "Algorithms", "2024-2025", 1), hit("CS1234", "Algorithms", "2025-2026", 2)]);
    expect(ix.search("CS1234")).toEqual([
      { code: "CS1234", name: "Algorithms", years: [{ year: "2025-2026", id: 2 }, { year: "2024-2025", id: 1 }] },
    ]);
  });

  it("ranks exact code, code prefix, name prefix, then name contains", () => {
    const ix = new CourseIndex({ storage: mem() });
    ix.add([
      hit("XX0003", "Intro to AE", "2025-2026"),
      hit("AE1111", "Flight Mechanics", "2025-2026"),
      hit("AE11112", "Other", "2025-2026"),
      hit("YY0001", "AE basics", "2025-2026"),
    ]);
    expect(ix.search("ae1111").map((r) => r.code)).toEqual(["AE1111", "AE11112"]);
    expect(ix.search("ae").map((r) => r.code)).toEqual(["AE1111", "AE11112", "YY0001", "XX0003"]);
  });

  it("matches every word of the query, case- and accent-insensitive", () => {
    const ix = new CourseIndex({ storage: mem() });
    ix.add([hit("CS1", "Algorithms & Data Structures", "2025-2026"), hit("CS2", "Data Science", "2025-2026")]);
    expect(ix.search("structures data").map((r) => r.code)).toEqual(["CS1"]);
    expect(ix.search("ÀLGORITHMS").map((r) => r.code)).toEqual(["CS1"]);
  });

  it("limits results", () => {
    const ix = new CourseIndex({ storage: mem() });
    ix.add(Array.from({ length: 30 }, (_, i) => hit(`C${i}`, "Course", "2025-2026")));
    expect(ix.search("course", 5)).toHaveLength(5);
  });

  it("persists to storage and reloads while fresh", () => {
    const storage = mem();
    new CourseIndex({ storage, now: () => 1000 }).add([hit("CS1", "A", "2025-2026")]);
    const again = new CourseIndex({ storage, now: () => 2000, ttlMs: 5000 });
    expect(again.search("cs1")).toHaveLength(1);
  });

  it("drops stale persisted data", () => {
    const storage = mem();
    new CourseIndex({ storage, now: () => 0 }).add([hit("CS1", "A", "2025-2026")]);
    const later = new CourseIndex({ storage, now: () => 10_000, ttlMs: 5000 });
    expect(later.search("cs1")).toEqual([]);
  });

  it("survives corrupt or throwing storage", () => {
    const corrupt: MemoryStorage = { getItem: () => "{nope", setItem: () => {} };
    expect(new CourseIndex({ storage: corrupt }).search("x")).toEqual([]);
    const throwing: MemoryStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    const ix = new CourseIndex({ storage: throwing });
    expect(() => ix.add([hit("CS1", "A", "2025-2026")])).not.toThrow();
    expect(ix.search("cs1")).toHaveLength(1);
  });

  it("remembers that the full catalogue was loaded, until stale", () => {
    const storage = mem();
    const ix = new CourseIndex({ storage, now: () => 0 });
    expect(ix.isComplete()).toBe(false);
    ix.add([hit("CS1", "A", "2025-2026")]);
    ix.markComplete();
    expect(new CourseIndex({ storage, now: () => 10, ttlMs: 100 }).isComplete()).toBe(true);
    expect(new CourseIndex({ storage, now: () => 1000, ttlMs: 100 }).isComplete()).toBe(false);
  });

  it("only persists when something changed", () => {
    const storage = mem();
    const spy = vi.spyOn(storage, "setItem");
    const ix = new CourseIndex({ storage });
    ix.add([hit("CS1", "A", "2025-2026")]);
    ix.add([hit("CS1", "A", "2025-2026")]);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
