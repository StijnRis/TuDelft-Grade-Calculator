import { normalizeCourseDetail, type Course } from "./normalize";
import { buildSearchQuery, parseSearchResponse, parseYear, type CourseHit } from "./osiris";

export const OSIRIS_BASE =
  process.env.NEXT_PUBLIC_OSIRIS_BASE ?? "https://tudelft.osiris-student.nl/student/osiris";

interface Options {
  fetch?: typeof fetch;
  base?: string;
  signal?: AbortSignal;
}

const HEADERS = { "Content-Type": "application/json", taal: "EN", client_type: "web" };

async function request(path: string, opts: Options, body?: unknown): Promise<unknown> {
  const doFetch = opts.fetch ?? fetch;
  let res: Response;
  try {
    res = await doFetch(`${opts.base ?? OSIRIS_BASE}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: HEADERS,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
    throw new Error("Network error while contacting the study guide (it may block browser requests via CORS).");
  }
  if (res.status === 404) throw new Error("Course not found");
  if (!res.ok) throw new Error(`Study guide responded with HTTP ${res.status}`);
  return res.json();
}

export async function searchRemote(
  keyword: string,
  opts: Options & { limit?: number; year?: string } = {},
): Promise<{ hits: CourseHit[]; total: number }> {
  const query = buildSearchQuery({ keyword, year: opts.year, limit: opts.limit });
  return parseSearchResponse(await request("student/cursussen/zoeken", opts, query));
}

const CATALOGUE_FIELDS = ["id_cursus", "cursus", "collegejaar", "cursus_lange_naam", "cursus_korte_naam", "punten", "faculteit_naam"];

/** Every course in the portal (~2,500 offerings, <100 kB gzipped) in a single request. */
export async function fetchCatalogue(opts: Options = {}): Promise<{ hits: CourseHit[]; total: number }> {
  const query = buildSearchQuery({ limit: 10_000, source: CATALOGUE_FIELDS });
  return parseSearchResponse(await request("student/cursussen/zoeken", opts, query));
}

/** Fetch a course by code; the newest offering unless `year` is given. */
export async function fetchCourse(code: string, opts: Options & { year?: string } = {}): Promise<Course> {
  const wanted = code.trim().toUpperCase();
  // A plain keyword search is the only code lookup the portal supports; filter to the exact code.
  const { hits } = await searchRemote(wanted, { ...opts, limit: 50 });
  const offerings = hits.filter((h) => h.code.toUpperCase() === wanted);
  const year = opts.year ? parseYear(opts.year) : "";
  const pick = year
    ? offerings.find((h) => h.year === year)
    : offerings.sort((a, b) => b.year.localeCompare(a.year))[0];
  if (!pick) throw new Error(`Course ${wanted}${year ? ` (${year})` : ""} not found`);
  const detail = await request(`owc/cursussen/${pick.id}`, opts);
  return { ...normalizeCourseDetail(detail, pick.id), ...(pick.ects !== undefined && { ects: pick.ects }) };
}
