import { describe, expect, it, vi } from "vitest";
import catalogue from "./fixtures/osiris-catalogue.json";
import { CourseIndex } from "@/lib/api/course-index";
import { createCourseSearch } from "@/lib/api/course-search";
import { parseSearchResponse } from "@/lib/api/osiris";

const hits = parseSearchResponse(catalogue).hits;
const make = (load: () => Promise<typeof hits>) => createCourseSearch({ index: new CourseIndex(), load });

describe("createCourseSearch", () => {
  it("loads the catalogue once, then answers every search locally", async () => {
    const load = vi.fn().mockResolvedValue(hits);
    const s = make(load);
    expect((await s.search("climate")).map((r) => r.code)).toEqual(["AESM401B-24"]);
    await s.search("extraction");
    await s.search("aesm");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("exposes instant local results without any request", () => {
    const load = vi.fn().mockResolvedValue(hits);
    expect(make(load).local("climate")).toEqual([]);
    expect(load).not.toHaveBeenCalled();
  });

  it("shares one in-flight request between concurrent searches", async () => {
    const load = vi.fn().mockResolvedValue(hits);
    const s = make(load);
    await Promise.all([s.search("climate"), s.search("extraction")]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("returns nothing when loading fails, and retries on the next search", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValue(hits);
    const s = make(load);
    expect(await s.search("climate")).toEqual([]);
    expect((await s.search("climate")).length).toBe(1);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
