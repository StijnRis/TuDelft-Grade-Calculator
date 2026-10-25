import { describe, expect, it } from "vitest";
import search from "./fixtures/osiris-search.json";
import catalogue from "./fixtures/osiris-catalogue.json";
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

  it("filters on year", () => {
    const q = buildSearchQuery({ year: "2025" });
    expect(q.query.bool.must).toContainEqual({ term: { collegejaar: "2025-2026" } });
  });

  it("can request the whole catalogue with a trimmed _source", () => {
    const q = buildSearchQuery({ limit: 5000, source: ["cursus"] });
    expect(q.size).toBe(5000);
    expect(q._source).toEqual(["cursus"]);
    expect(buildSearchQuery({ limit: 99999 }).size).toBe(10000);
  });

  it("ignores one-character keywords", () => {
    expect(buildSearchQuery({ keyword: "a" }).query.bool.must).toEqual([]);
  });
});

describe("parseSearchResponse", () => {
  it("maps a recorded TU Delft hit", () => {
    const { hits, total } = parseSearchResponse(search);
    expect(total).toBe(1);
    expect(hits[0]).toMatchObject({
      id: 125437,
      code: "AE1111",
      name: "Exploring Aerospace Engineering and Design",
      year: "2026-2027",
      ects: 5,
      faculty: "Aerospace Engineering",
      languages: ["English"],
    });
    // the API lists one lecturer twice
    expect(hits[0].lecturers).toHaveLength(3);
  });

  it("maps a trimmed catalogue page", () => {
    const { hits, total } = parseSearchResponse(catalogue);
    expect(total).toBe(2549);
    expect(hits).toHaveLength(6);
    expect(hits[0]).toMatchObject({ code: "AESM306A-24", ects: 9 });
  });

  it("tolerates comma decimals and numeric years", () => {
    const { hits } = parseSearchResponse({ hits: { total: 1, hits: [{ _source: { id_cursus: 1, cursus: "X", collegejaar: 2025, punten: "2,5" } }] } });
    expect(hits[0]).toMatchObject({ ects: 2.5, year: "2025-2026", name: "X" });
  });

  it("returns nothing for junk", () => {
    expect(parseSearchResponse(null)).toEqual({ hits: [], total: 0 });
    expect(parseSearchResponse({})).toEqual({ hits: [], total: 0 });
  });
});
