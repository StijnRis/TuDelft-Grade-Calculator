import { fetchCatalogue } from "./client";
import type { CourseIndex, IndexedCourse } from "./course-index";

interface Options {
  index: CourseIndex;
  fetch?: typeof fetch;
}

/**
 * Search over the persisted course index. The whole catalogue is fetched in a
 * single request the first time (or when the stored copy is stale); `local`
 * answers instantly from whatever is already known.
 */
export function createCourseSearch({ index, fetch: f }: Options) {
  let loading: Promise<void> | undefined;

  function ready(): Promise<void> {
    if (index.isComplete()) return Promise.resolve();
    loading ??= fetchCatalogue({ fetch: f })
      .then(({ hits, total }) => {
        index.add(hits);
        if (total <= hits.length) index.markComplete();
      })
      .catch(() => {
        /* offline or blocked: search what we have, retry on the next search */
      })
      .finally(() => {
        loading = undefined;
      });
    return loading;
  }

  return {
    local: (q: string, limit?: number): IndexedCourse[] => index.search(q, limit),

    async search(q: string, limit = 10): Promise<IndexedCourse[]> {
      await ready();
      return index.search(q, limit);
    },

    /** Start loading in the background, e.g. when the search box mounts. */
    warm: ready,
  };
}
