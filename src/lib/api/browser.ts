import { CourseIndex } from "./course-index";
import { createCourseSearch } from "./course-search";
import { loadCatalogue } from "./static-data";

let shared: ReturnType<typeof createCourseSearch> | undefined;

/** One search per page load over the catalogue published with the site. */
export function courseSearch() {
  shared ??= createCourseSearch({ index: new CourseIndex(), load: () => loadCatalogue() });
  return shared;
}
