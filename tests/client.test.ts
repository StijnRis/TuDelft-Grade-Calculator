import { describe, expect, it, vi } from "vitest";
import search from "./fixtures/osiris-search.json";
import course from "./fixtures/osiris-course.json";
import catalogue from "./fixtures/osiris-catalogue.json";
import { fetchCatalogue, fetchCourse, searchRemote, OSIRIS_BASE } from "@/lib/api/client";

const res = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

/** A second (older) offering derived from the recorded hit, to test year selection. */
const older = structuredClone(search);
Object.assign(older.hits.hits[0]._source, { id_cursus: 99, collegejaar: "2025-2026" });
const twoYears = { hits: { total: { value: 2 }, hits: [search.hits.hits[0], older.hits.hits[0]] } };

function router(searchBody: unknown = search) {
  return vi.fn(async (url: string) => {
    if (url.endsWith("/student/cursussen/zoeken")) return res(searchBody);
    if (/\/owc\/cursussen\/\d+$/.test(url)) return res(course);
    return res({}, 404);
  });
}

describe("osiris client", () => {
  it("targets the TU Delft Osiris portal", () => {
    expect(OSIRIS_BASE).toBe("https://tudelft.osiris-student.nl/student/osiris");
  });

  it("POSTs the search with Osiris headers", async () => {
    const f = router();
    const { hits } = await searchRemote("ae11", { fetch: f as never });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${OSIRIS_BASE}/student/cursussen/zoeken`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ taal: "EN", client_type: "web", "Content-Type": "application/json" });
    expect(JSON.parse(init.body as string).query).toBeDefined();
    expect(hits).toHaveLength(1);
  });

  it("loads the whole catalogue in one request", async () => {
    const f = router(catalogue);
    const { hits, total } = await fetchCatalogue({ fetch: f as never });
    expect(f).toHaveBeenCalledTimes(1);
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.size).toBeGreaterThan(2549);
    expect(body._source).toContain("cursus_lange_naam");
    expect(hits).toHaveLength(6);
    expect(total).toBe(2549);
  });

  it("resolves a code by keyword search (exact match) and fetches the detail", async () => {
    const f = router();
    const c = await fetchCourse("ae1111", { fetch: f as never });
    expect(JSON.stringify(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).query)).toContain('"query":"AE1111"');
    expect(f.mock.calls[1][0]).toBe(`${OSIRIS_BASE}/owc/cursussen/125437`);
    expect(c.name).toBe("Exploring Aerospace Engineering and Design");
    expect(c.tests).toHaveLength(3);
  });

  it("takes the newest offering, or the requested year", async () => {
    const newest = router(twoYears);
    await fetchCourse("AE1111", { fetch: newest as never });
    expect(newest.mock.calls[1][0]).toMatch(/\/125437$/);
    const picked = router(twoYears);
    await fetchCourse("AE1111", { year: "2025", fetch: picked as never });
    expect(picked.mock.calls[1][0]).toMatch(/\/99$/);
  });

  it("ignores prefix matches that are not the exact code", async () => {
    const f = router();
    await expect(fetchCourse("AE11", { fetch: f as never })).rejects.toThrow(/not found/i);
  });

  it("throws on HTTP errors and network failures", async () => {
    const bad = vi.fn().mockResolvedValue(res({}, 500));
    await expect(searchRemote("cs", { fetch: bad as never })).rejects.toThrow(/HTTP 500/);
    const net = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(searchRemote("cs", { fetch: net as never })).rejects.toThrow(/CORS|network/i);
  });
});
