import { CourseIndex } from "./course-index";
import { createCourseSearch } from "./course-search";

let shared: ReturnType<typeof createCourseSearch> | undefined;

/** One search + persisted index per page load, backed by localStorage. */
export function courseSearch() {
  if (!shared) {
    let storage: Storage | undefined;
    try {
      storage = window.localStorage;
    } catch {
      /* storage blocked: in-memory only */
    }
    shared = createCourseSearch({ index: new CourseIndex({ storage }) });
  }
  return shared;
}
