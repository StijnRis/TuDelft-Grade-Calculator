import type { CourseIndex, IndexedCourse } from "./course-index";
import type { CourseHit } from "./osiris";

interface Options {
  index: CourseIndex;
  /** Loads the full catalogue (the published snapshot). */
  load: () => Promise<CourseHit[]>;
}

/**
 * Search over the published catalogue. It is loaded once (shared between
 * concurrent callers); `local` answers instantly from whatever is loaded.
 */
export function createCourseSearch({ index, load }: Options) {
  let loaded = false;
  let loading: Promise<void> | undefined;

  function ready(): Promise<void> {
    if (loaded) return Promise.resolve();
    loading ??= load()
      .then((hits) => {
        index.add(hits);
        loaded = true;
      })
      .catch(() => {
        /* offline: search what we have, retry on the next search */
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
