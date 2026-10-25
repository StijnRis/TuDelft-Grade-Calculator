import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import catalogue from "./fixtures/osiris-catalogue.json";
import course from "./fixtures/osiris-course.json";
import { parseSearchResponse, type CourseHit } from "@/lib/api/osiris";
import { buildSnapshot, courseSlug, writeSnapshot } from "@/lib/api/snapshot";

const hits = parseSearchResponse(catalogue).hits;
const hit = (code: string, year: string, id: number): CourseHit => ({ id, code, name: code, year, languages: [], lecturers: [] });
const opts = { concurrency: 2, retryDelayMs: 0, now: () => new Date("2026-10-25T00:00:00Z") };

describe("courseSlug", () => {
  it("makes codes safe for file names and URLs", () => {
    expect(courseSlug("AE1111")).toBe("ae1111");
    expect(courseSlug("TN12025-A")).toBe("tn12025-a");
    expect(courseSlug("ABC 12.3/x")).toBe("abc_12.3_x");
  });
});

describe("buildSnapshot", () => {
  it("fetches every course once and builds a catalogue", async () => {
    const fetchDetail = vi.fn().mockResolvedValue(course);
    const snap = await buildSnapshot({ hits, fetchDetail, ...opts });
    expect(fetchDetail).toHaveBeenCalledTimes(hits.length);
    expect(snap.catalogue.generatedAt).toBe("2026-10-25T00:00:00.000Z");
    expect(snap.catalogue.courses).toHaveLength(hits.length);
    expect(snap.catalogue.courses[0]).toMatchObject({ code: "AESM306A-24", ects: 9 });
    expect(snap.courses).toHaveLength(hits.length);
    expect(snap.courses[0].course.tests).toHaveLength(3);
  });

  it("keeps only the newest offering per code", async () => {
    const fetchDetail = vi.fn().mockResolvedValue(course);
    const snap = await buildSnapshot({ hits: [hit("A1", "2025-2026", 1), hit("A1", "2026-2027", 2)], fetchDetail, ...opts });
    expect(fetchDetail).toHaveBeenCalledTimes(1);
    expect(fetchDetail).toHaveBeenCalledWith(2);
    expect(snap.catalogue.courses).toHaveLength(1);
  });

  it("retries a failing course, then drops it from the catalogue", async () => {
    const fetchDetail = vi.fn(async (id: number) => {
      if (id === 2) throw new Error("boom");
      return course;
    });
    const many = Array.from({ length: 100 }, (_, i) => hit(`C${i}`, "2026-2027", i + 1));
    const snap = await buildSnapshot({ hits: many, fetchDetail, maxFailureRate: 0.05, ...opts });
    expect(snap.catalogue.courses).toHaveLength(99);
    expect(snap.catalogue.courses.find((c) => c.code === "C1")).toBeUndefined();
    expect(fetchDetail.mock.calls.filter(([id]) => id === 2)).toHaveLength(3);
  });

  it("fails the whole build when too many courses fail", async () => {
    const fetchDetail = vi.fn().mockRejectedValue(new Error("down"));
    await expect(buildSnapshot({ hits: hits.slice(0, 4), fetchDetail, ...opts })).rejects.toThrow(/failed/i);
  });

  it("refuses an empty catalogue", async () => {
    await expect(buildSnapshot({ hits: [], fetchDetail: vi.fn(), ...opts })).rejects.toThrow(/empty/i);
  });

  it("throws when two codes share a file name", async () => {
    const fetchDetail = vi.fn().mockResolvedValue(course);
    await expect(
      buildSnapshot({ hits: [hit("A 1", "2026-2027", 1), hit("A_1", "2026-2027", 2)], fetchDetail, ...opts }),
    ).rejects.toThrow(/same file name/i);
  });

  it("caps very long section text", async () => {
    const big = structuredClone(course);
    big.items.find((i) => i.rubriek === "rubriek-inhoud")!.velden[0].waarde = "x".repeat(10_000);
    const snap = await buildSnapshot({ hits: hits.slice(0, 1), fetchDetail: vi.fn().mockResolvedValue(big), ...opts });
    const content = snap.courses[0].course.sections.find((s) => s.title === "Content")!;
    expect(content.text.length).toBeLessThanOrEqual(2001);
  });
});

describe("writeSnapshot", () => {
  it("writes catalogue.json and one file per course, replacing old output", async () => {
    const dir = mkdtempSync(join(tmpdir(), "snap-"));
    const snap = await buildSnapshot({ hits: hits.slice(0, 2), fetchDetail: vi.fn().mockResolvedValue(course), ...opts });
    writeSnapshot(dir, snap);
    writeSnapshot(dir, snap);
    expect(JSON.parse(readFileSync(join(dir, "catalogue.json"), "utf8")).courses).toHaveLength(2);
    const files = readdirSync(join(dir, "courses"));
    expect(files.sort()).toEqual(["aesm306a-24.json", "aesm401b-24.json"]);
    expect(JSON.parse(readFileSync(join(dir, "courses", files[0]), "utf8")).code).toBe("AE1111");
  });
});
