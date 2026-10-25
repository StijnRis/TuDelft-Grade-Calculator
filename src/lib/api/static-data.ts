import type { Course } from "./normalize";
import type { CatalogueFile } from "./snapshot";
import type { CourseHit } from "./osiris";
import { courseSlug } from "./slug";

/** Where the build publishes the snapshot (honours the GitHub Pages base path). */
export const DATA_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data`;

interface Options {
  fetch?: typeof fetch;
  base?: string;
  signal?: AbortSignal;
}

async function getJson<T>(path: string, opts: Options): Promise<T> {
  const doFetch = opts.fetch ?? fetch;
  let res: Response;
  try {
    res = await doFetch(`${opts.base ?? DATA_BASE}/${path}`, { signal: opts.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
    throw new Error("Network error while loading course data");
  }
  if (res.status === 404) throw new Error("Course not found");
  if (!res.ok) throw new Error(`Course data responded with HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function loadCatalogue(opts: Options = {}): Promise<CourseHit[]> {
  const file = await getJson<CatalogueFile>("catalogue.json", opts);
  return file.courses.map((c) => ({ ...c, languages: [], lecturers: [] }));
}

export function loadCourse(code: string, opts: Options = {}): Promise<Course> {
  return getJson<Course>(`courses/${courseSlug(code)}.json`, opts);
}
