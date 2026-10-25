import { describe, expect, it, vi } from "vitest";
import { fetchCourse, courseUrl } from "@/lib/api/client";
import fixture from "./fixtures/course.assumed.json";

const ok = (body: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });

describe("studiegids client", () => {
  it("builds the course URL from the configured base", () => {
    expect(courseUrl("cs1234", "https://x.test/api")).toBe("https://x.test/api/courses/CS1234");
  });

  it("fetches and normalizes a course", async () => {
    const f = ok(fixture);
    const c = await fetchCourse("CS1234", { fetch: f, base: "https://x.test/api" });
    expect(f).toHaveBeenCalledWith("https://x.test/api/courses/CS1234", expect.anything());
    expect(c.name).toBe("Algorithms & Data Structures");
  });

  it("unwraps a single-element array or {data}", async () => {
    const c1 = await fetchCourse("A", { fetch: ok([fixture]), base: "b" });
    const c2 = await fetchCourse("A", { fetch: ok({ data: fixture }), base: "b" });
    expect(c1.code).toBe("CS1234");
    expect(c2.code).toBe("CS1234");
  });

  it("throws a helpful error on 404 and on network failure", async () => {
    const nf = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    await expect(fetchCourse("ZZ", { fetch: nf, base: "b" })).rejects.toThrow(/not found/i);
    const net = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fetchCourse("ZZ", { fetch: net, base: "b" })).rejects.toThrow(/CORS|network/i);
  });
});
