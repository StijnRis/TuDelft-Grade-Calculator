import { buildSearchQuery, parseSearchResponse, type CourseHit } from "./osiris";

/**
 * Talks to the Osiris portal. The portal only allows browser requests from
 * localhost, so this is used at build time (scripts/snapshot.ts), never in the
 * browser.
 */
export const OSIRIS_BASE =
  process.env.OSIRIS_BASE ?? "https://tudelft.osiris-student.nl/student/osiris";

interface Options {
  fetch?: typeof fetch;
  base?: string;
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
    });
  } catch {
    throw new Error("Network error while contacting the study guide");
  }
  if (res.status === 404) throw new Error("Course not found");
  if (!res.ok) throw new Error(`Study guide responded with HTTP ${res.status}`);
  return res.json();
}

const CATALOGUE_FIELDS = ["id_cursus", "cursus", "collegejaar", "cursus_lange_naam", "cursus_korte_naam", "punten", "faculteit_naam"];

/** Every course in the portal (~2,500 offerings) in a single request. */
export async function fetchCatalogue(opts: Options = {}): Promise<{ hits: CourseHit[]; total: number }> {
  const query = buildSearchQuery({ limit: 10_000, source: CATALOGUE_FIELDS });
  return parseSearchResponse(await request("student/cursussen/zoeken", opts, query));
}

/** Raw course detail ("rubrieken") for an Osiris course id. */
export function fetchCourseById(id: number, opts: Options = {}): Promise<unknown> {
  return request(`owc/cursussen/${id}`, opts);
}
