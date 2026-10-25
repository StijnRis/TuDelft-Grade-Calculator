import { describe, expect, it, vi } from "vitest";
import course from "./fixtures/osiris-course.json";
import { normalizeCourseDetail } from "@/lib/api/normalize";
import { loadCatalogue, loadCourse } from "@/lib/api/static-data";

const res = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });
const snapshotCourse = normalizeCourseDetail(course, 125437);

describe("static snapshot reader", () => {
  it("loads the catalogue file under the site's base path", async () => {
    const f = vi.fn().mockResolvedValue(
      res({ generatedAt: "x", courses: [{ id: 1, code: "AE1111", name: "Flight", year: "2026-2027", ects: 5 }] }),
    );
    const hits = await loadCatalogue({ fetch: f as never, base: "/app/data" });
    expect(f.mock.calls[0][0]).toBe("/app/data/catalogue.json");
    expect(hits[0]).toMatchObject({ code: "AE1111", ects: 5, languages: [], lecturers: [] });
  });

  it("loads one course by slugged code", async () => {
    const f = vi.fn().mockResolvedValue(res(snapshotCourse));
    const c = await loadCourse("TN12025-A", { fetch: f as never, base: "/data" });
    expect(f.mock.calls[0][0]).toBe("/data/courses/tn12025-a.json");
    expect(c.tests).toHaveLength(3);
  });

  it("reports unknown courses and failures clearly", async () => {
    const nf = vi.fn().mockResolvedValue(res({}, 404));
    await expect(loadCourse("ZZ", { fetch: nf as never, base: "/d" })).rejects.toThrow(/not found/i);
    const bad = vi.fn().mockResolvedValue(res({}, 500));
    await expect(loadCatalogue({ fetch: bad as never, base: "/d" })).rejects.toThrow(/HTTP 500/);
    const net = vi.fn().mockRejectedValue(new TypeError("x"));
    await expect(loadCourse("A", { fetch: net as never, base: "/d" })).rejects.toThrow(/network/i);
  });
});
