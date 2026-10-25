import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeCourseDetail, type Course } from "./normalize";
import type { CourseHit } from "./osiris";
import { courseSlug } from "./slug";

export { courseSlug };

export interface CatalogueFile {
  generatedAt: string;
  courses: Array<{ id: number; code: string; name: string; year: string; ects?: number; faculty?: string }>;
}

export interface Snapshot {
  catalogue: CatalogueFile;
  courses: Array<{ slug: string; course: Course }>;
}

const MAX_SECTION = 2000;

interface Options {
  hits: CourseHit[];
  fetchDetail: (id: number) => Promise<unknown>;
  concurrency?: number;
  retries?: number;
  retryDelayMs?: number;
  /** Fail the build when more than this share of courses cannot be fetched. */
  maxFailureRate?: number;
  now?: () => Date;
  onProgress?: (done: number, total: number) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch every course (newest offering per code) and assemble the static data set. */
export async function buildSnapshot(o: Options): Promise<Snapshot> {
  const retries = o.retries ?? 3;
  const newest = new Map<string, CourseHit>();
  for (const h of o.hits) {
    const known = newest.get(h.code);
    if (!known || h.year > known.year) newest.set(h.code, h);
  }
  const list = [...newest.values()];
  if (!list.length) throw new Error("Catalogue is empty; refusing to publish an empty site");

  const seen = new Map<string, string>();
  for (const h of list) {
    const slug = courseSlug(h.code);
    const other = seen.get(slug);
    if (other) throw new Error(`Courses ${other} and ${h.code} map to the same file name "${slug}"`);
    seen.set(slug, h.code);
  }

  async function fetchOne(hit: CourseHit): Promise<Course> {
    let last: unknown;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const course = normalizeCourseDetail(await o.fetchDetail(hit.id), hit.id);
        return {
          ...course,
          ects: hit.ects ?? course.ects,
          sections: course.sections.map((s) =>
            s.text.length > MAX_SECTION ? { ...s, text: `${s.text.slice(0, MAX_SECTION)}…` } : s,
          ),
        };
      } catch (e) {
        last = e;
        if (attempt < retries - 1) await sleep((o.retryDelayMs ?? 500) * 2 ** attempt);
      }
    }
    throw last;
  }

  const results: Array<{ hit: CourseHit; course?: Course }> = list.map((hit) => ({ hit }));
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < results.length) {
      const r = results[next++];
      try {
        r.course = await fetchOne(r.hit);
      } catch {
        /* counted below */
      }
      o.onProgress?.(++done, results.length);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, o.concurrency ?? 6) }, worker));

  const ok = results.filter((r): r is { hit: CourseHit; course: Course } => !!r.course);
  const failed = results.length - ok.length;
  if (failed / results.length > (o.maxFailureRate ?? 0.02)) {
    throw new Error(`${failed} of ${results.length} courses failed to download`);
  }

  return {
    catalogue: {
      generatedAt: (o.now?.() ?? new Date()).toISOString(),
      courses: ok.map(({ hit, course }) => ({
        id: hit.id,
        code: hit.code,
        name: hit.name,
        year: hit.year,
        ...(course.ects !== undefined && { ects: course.ects }),
        ...(hit.faculty && { faculty: hit.faculty }),
      })),
    },
    courses: ok.map(({ hit, course }) => ({ slug: courseSlug(hit.code), course })),
  };
}

/** Replace `dir` with catalogue.json plus courses/<slug>.json. */
export function writeSnapshot(dir: string, snap: Snapshot): void {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "courses"), { recursive: true });
  writeFileSync(join(dir, "catalogue.json"), JSON.stringify(snap.catalogue));
  for (const { slug, course } of snap.courses) {
    writeFileSync(join(dir, "courses", `${slug}.json`), JSON.stringify(course));
  }
}
