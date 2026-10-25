import { describe, expect, it, vi } from "vitest";
import search from "./fixtures/osiris-search.json";
import course from "./fixtures/osiris-course.json";
import { fetchCourse, searchRemote, OSIRIS_BASE } from "@/lib/api/client";

const res = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

/** Routes by URL: POST .../zoeken -> search, GET .../cursussen/{id} -> course. */
function router(opts: { searchBody?: unknown; courseStatus?: number } = {}) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/cursussen/zoeken")) return res(opts.searchBody ?? search);
    if (/\/owc\/cursussen\/\d+$/.test(url)) return res(course, opts.courseStatus ?? 200);
    return res({}, 404);
  });
}

describe("osiris client", () => {
  it("targets the TU Delft Osiris portal", () => {
    expect(OSIRIS_BASE).toBe("https://tudelft.osiris-student.nl/student/osiris");
  });

  it("POSTs the search with Osiris headers", async () => {
    const f = router();
    const { hits } = await searchRemote("cs12", { fetch: f as never });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`${OSIRIS_BASE}/student/cursussen/zoeken`);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ taal: "EN", client_type: "web", "Content-Type": "application/json" });
    expect(JSON.parse(init?.body as string).query).toBeDefined();
    expect(hits).toHaveLength(3);
  });

  it("resolves a code to the newest offering and fetches its detail", async () => {
    const f = router();
    const c = await fetchCourse("cs1234", { fetch: f as never });
    expect(f.mock.calls[1][0]).toBe(`${OSIRIS_BASE}/owc/cursussen/901`);
    expect(c.name).toBe("Algorithms & Data Structures");
    expect(c.assessmentText).toContain("Written exam");
  });

  it("picks the requested year", async () => {
    const f = router();
    await fetchCourse("CS1234", { year: "2024-2025", fetch: f as never });
    expect(f.mock.calls[1][0]).toBe(`${OSIRIS_BASE}/owc/cursussen/801`);
  });

  it("throws not found when the code has no exact match", async () => {
    const f = router({ searchBody: { hits: { total: 0, hits: [] } } });
    await expect(fetchCourse("ZZ9999", { fetch: f as never })).rejects.toThrow(/not found/i);
  });

  it("throws on HTTP errors and network failures", async () => {
    const bad = vi.fn().mockResolvedValue(res({}, 500));
    await expect(searchRemote("cs", { fetch: bad as never })).rejects.toThrow(/HTTP 500/);
    const net = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(searchRemote("cs", { fetch: net as never })).rejects.toThrow(/CORS|network/i);
  });
});
