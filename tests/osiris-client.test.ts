import { describe, expect, it, vi } from "vitest";
import course from "./fixtures/osiris-course.json";
import catalogue from "./fixtures/osiris-catalogue.json";
import { fetchCatalogue, fetchCourseById, OSIRIS_BASE } from "@/lib/api/osiris-client";

const res = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

describe("osiris client (build-time only)", () => {
  it("targets the TU Delft Osiris portal", () => {
    expect(OSIRIS_BASE).toBe("https://tudelft.osiris-student.nl/student/osiris");
  });

  it("loads the whole catalogue in one POST with Osiris headers", async () => {
    const f = vi.fn().mockResolvedValue(res(catalogue));
    const { hits, total } = await fetchCatalogue({ fetch: f as never });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${OSIRIS_BASE}/student/cursussen/zoeken`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ taal: "EN", client_type: "web", "Content-Type": "application/json" });
    const body = JSON.parse(init.body as string);
    expect(body.size).toBeGreaterThan(2549);
    expect(body._source).toContain("cursus_lange_naam");
    expect(hits).toHaveLength(6);
    expect(total).toBe(2549);
  });

  it("fetches a course detail by id", async () => {
    const f = vi.fn().mockResolvedValue(res(course));
    expect(await fetchCourseById(125437, { fetch: f as never })).toEqual(course);
    expect(f.mock.calls[0][0]).toBe(`${OSIRIS_BASE}/owc/cursussen/125437`);
  });

  it("throws on 404, HTTP errors and network failures", async () => {
    await expect(fetchCourseById(1, { fetch: vi.fn().mockResolvedValue(res({}, 404)) as never })).rejects.toThrow(/not found/i);
    await expect(fetchCatalogue({ fetch: vi.fn().mockResolvedValue(res({}, 500)) as never })).rejects.toThrow(/HTTP 500/);
    await expect(fetchCatalogue({ fetch: vi.fn().mockRejectedValue(new TypeError("x")) as never })).rejects.toThrow(/network/i);
  });
});
