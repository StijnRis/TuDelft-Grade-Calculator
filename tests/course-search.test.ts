import { describe, expect, it, vi } from "vitest";
import catalogue from "./fixtures/osiris-catalogue.json";
import { CourseIndex, type MemoryStorage } from "@/lib/api/course-index";
import { createCourseSearch } from "@/lib/api/course-search";

const mem = (): MemoryStorage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
/** The recorded page, with `total` matching the trimmed hit list so it counts as the whole catalogue. */
const whole = { hits: { ...catalogue.hits, total: { value: catalogue.hits.hits.length } } };
const okFetch = () => vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => whole });
const make = (f: unknown, storage = mem()) =>
  createCourseSearch({ index: new CourseIndex({ storage }), fetch: f as never });

describe("createCourseSearch", () => {
  it("loads the whole catalogue once, then answers every search locally", async () => {
    const f = okFetch();
    const s = make(f);
    expect((await s.search("climate")).map((r) => r.code)).toEqual(["AESM401B-24"]);
    await s.search("extraction");
    await s.search("aesm");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("does not reload on the next visit while the stored catalogue is fresh", async () => {
    const storage = mem();
    await make(okFetch(), storage).search("climate");
    const f = okFetch();
    expect((await make(f, storage).search("climate")).length).toBe(1);
    expect(f).not.toHaveBeenCalled();
  });

  it("exposes instant local results without any request", () => {
    const f = okFetch();
    const s = make(f);
    expect(s.local("cs")).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it("does not treat a partial page as the whole catalogue", async () => {
    const partial = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => catalogue });
    const s = make(partial);
    await s.search("climate");
    await s.search("climate");
    expect(partial).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight catalogue request between concurrent searches", async () => {
    const f = okFetch();
    const s = make(f);
    await Promise.all([s.search("climate"), s.search("extraction")]);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("returns what it knows when the network fails, and retries next time", async () => {
    const down = vi.fn().mockRejectedValue(new TypeError("x"));
    const s = make(down);
    expect(await s.search("climate")).toEqual([]);
    expect(await s.search("climate")).toEqual([]);
    expect(down).toHaveBeenCalledTimes(2);
  });
});
