import { describe, expect, it } from "vitest";
import { CourseIndex } from "@/lib/api/course-index";
import type { CourseHit } from "@/lib/api/osiris";

const hit = (code: string, name: string, year: string, id = 1): CourseHit => ({
  id, code, name, year, languages: [], lecturers: [],
});

describe("CourseIndex", () => {
  it("merges offerings per code with years newest first", () => {
    const ix = new CourseIndex();
    ix.add([hit("CS1234", "Algorithms", "2024-2025", 1), hit("CS1234", "Algorithms", "2025-2026", 2)]);
    expect(ix.search("CS1234")).toEqual([
      { code: "CS1234", name: "Algorithms", years: [{ year: "2025-2026", id: 2 }, { year: "2024-2025", id: 1 }] },
    ]);
  });

  it("ranks exact code, code prefix, name prefix, then name contains", () => {
    const ix = new CourseIndex();
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
    const ix = new CourseIndex();
    ix.add([hit("CS1", "Algorithms & Data Structures", "2025-2026"), hit("CS2", "Data Science", "2025-2026")]);
    expect(ix.search("structures data").map((r) => r.code)).toEqual(["CS1"]);
    expect(ix.search("ÀLGORITHMS").map((r) => r.code)).toEqual(["CS1"]);
  });

  it("limits results", () => {
    const ix = new CourseIndex();
    ix.add(Array.from({ length: 30 }, (_, i) => hit(`C${i}`, "Course", "2025-2026")));
    expect(ix.search("course", 5)).toHaveLength(5);
  });
});
