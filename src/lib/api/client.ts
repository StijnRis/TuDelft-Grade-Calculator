import { normalizeCourse, type Course } from "./normalize";

/**
 * NOTE: the studiegids endpoint layout is unverified (the build environment
 * could not reach studiegids.tudelft.nl). Adjust `courseUrl` and, if needed,
 * `normalize.ts` once the real API responses have been inspected.
 * The base can be overridden at build time with NEXT_PUBLIC_STUDIEGIDS_API.
 */
export const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_STUDIEGIDS_API ?? "https://studiegids.tudelft.nl/api";

export function courseUrl(code: string, base: string = DEFAULT_API_BASE): string {
  return `${base}/courses/${encodeURIComponent(code.trim().toUpperCase())}`;
}

interface Options {
  fetch?: typeof fetch;
  base?: string;
  signal?: AbortSignal;
}

export async function fetchCourse(code: string, opts: Options = {}): Promise<Course> {
  const doFetch = opts.fetch ?? fetch;
  let res: Response;
  try {
    res = await doFetch(courseUrl(code, opts.base), { signal: opts.signal });
  } catch {
    throw new Error(
      "Network error while contacting the study guide (the API may block browser requests via CORS).",
    );
  }
  if (res.status === 404) throw new Error(`Course ${code.toUpperCase()} not found`);
  if (!res.ok) throw new Error(`Study guide responded with HTTP ${res.status}`);
  let body: unknown = await res.json();
  if (Array.isArray(body)) body = body[0];
  if (body && typeof body === "object" && "data" in body) body = (body as { data: unknown }).data;
  return normalizeCourse(body);
}
