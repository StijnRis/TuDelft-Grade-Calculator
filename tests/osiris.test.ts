import { describe, expect, it } from "vitest";
import search from "./fixtures/osiris-search.json";
import { buildSearchQuery, parseSearchResponse, parseYear } from "@/lib/api/osiris";

describe("parseYear", () => {
  it("normalizes to an academic-year range", () => {
    expect(parseYear(2025)).toBe("2025-2026");
    expect(parseYear("2025")).toBe("2025-2026");
    expect(parseYear("2025-2026")).toBe("2025-2026");
    expect(parseYear(undefined)).toBe("");
  });
});

describe("buildSearchQuery", () => {
  it("matches code or name by phrase prefix, newest year first", () => {
    const q = buildSearchQuery({ keyword: " cs12 ", limit: 20 });
    expect(q.size).toBe(20);
    expect(q.from).toBe(0);
    expect(JSON.stringify(q.query)).toContain('"query":"CS12"');
    expect(JSON.stringify(q.query)).toContain("cursus_lange_naam");
    expect(q.sort[0]).toEqual({ collegejaar: { order: "desc" } });
  });

  it("filters on exact code and year", () => {
    const q = buildSearchQuery({ codes: ["CS1234"], year: "2025" });
    const must = q.query.bool.must;
    expect(must).toContainEqual({ terms: { cursus: ["CS1234"] } });
    expect(must).toContainEqual({ term: { collegejaar: "2025-2026" } });
  });

  it("ignores one-character keywords", () => {
    expect(buildSearchQuery({ keyword: "a" }).query.bool.must).toEqual([]);
  });
});

describe("parseSearchResponse", () => {
  it("maps hits and total", () => {
    const { hits, total } = parseSearchResponse(search);
    expect(total).toBe(3);
    expect(hits[0]).toMatchObject({
      id: 901,
      code: "CS1234",
      name: "Algorithms & Data Structures",
      year: "2025-2026",
      ects: 5,
      languages: ["English"],
      lecturers: ["Dr. A. Teacher"],
    });
    expect(hits[1].ects).toBe(5);
    expect(hits[2].year).toBe("2025-2026");
  });

  it("returns nothing for junk", () => {
    expect(parseSearchResponse(null)).toEqual({ hits: [], total: 0 });
    expect(parseSearchResponse({})).toEqual({ hits: [], total: 0 });
  });
});
