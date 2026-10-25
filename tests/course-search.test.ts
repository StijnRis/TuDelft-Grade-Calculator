import { describe, expect, it, vi } from "vitest";
import search from "./fixtures/osiris-search.json";
import { CourseIndex, type MemoryStorage } from "@/lib/api/course-index";
import { createCourseSearch } from "@/lib/api/course-search";

const mem = (): MemoryStorage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const okFetch = () => vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => search });

describe("createCourseSearch", () => {
  it("hits the network once, then answers repeats from the index", async () => {
    const f = okFetch();
    const s = createCourseSearch({ index: new CourseIndex({ storage: mem() }), fetch: f as never });
    const first = await s.search("flight");
    expect(first.map((r) => r.code)).toEqual(["AE1111"]);
    expect(f).toHaveBeenCalledTimes(1);
    await s.search("flight");
    await s.search("flight mech");
    expect(f).toHaveBeenCalledTimes(1);
    await s.search("fligh"); // shorter than anything fetched so far: not covered
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("exposes instant local results without any request", () => {
    const f = okFetch();
    const index = new CourseIndex({ storage: mem() });
    const s = createCourseSearch({ index, fetch: f as never });
    expect(s.local("cs")).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it("skips the network for very short queries", async () => {
    const f = okFetch();
    const s = createCourseSearch({ index: new CourseIndex({ storage: mem() }), fetch: f as never });
    expect(await s.search("c")).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it("falls back to local results when the network fails", async () => {
    const index = new CourseIndex({ storage: mem() });
    const ok = createCourseSearch({ index, fetch: okFetch() as never });
    await ok.search("flight");
    const down = createCourseSearch({ index, fetch: vi.fn().mockRejectedValue(new TypeError("x")) as never });
    expect((await down.search("flight mech")).map((r) => r.code)).toEqual(["AE1111"]);
  });
});
