import { searchRemote } from "./client";
import type { CourseIndex, IndexedCourse } from "./course-index";

interface Options {
  index: CourseIndex;
  fetch?: typeof fetch;
}

const MIN_REMOTE = 2;

/**
 * Two-tier search: `local` answers instantly from the index; `search`
 * consults the study guide only for queries the index has not covered yet.
 */
export function createCourseSearch({ index, fetch: f }: Options) {
  const asked = new Set<string>();
  const key = (q: string) => q.trim().toLowerCase();
  const covered = (q: string) => {
    const k = key(q);
    // A longer query is covered when a shorter prefix was already fetched and
    // returned fewer hits than the page size (i.e. the whole result set).
    return [...asked].some((a) => k.startsWith(a));
  };

  return {
    local: (q: string, limit?: number): IndexedCourse[] => index.search(q, limit),

    async search(q: string, limit = 10): Promise<IndexedCourse[]> {
      const k = key(q);
      if (k.length >= MIN_REMOTE && !covered(k)) {
        try {
          const { hits, total } = await searchRemote(k, { fetch: f, limit: 100 });
          index.add(hits);
          if (total <= hits.length) asked.add(k);
        } catch {
          /* offline or blocked: fall through to what we already know */
        }
      }
      return index.search(q, limit);
    },
  };
}
