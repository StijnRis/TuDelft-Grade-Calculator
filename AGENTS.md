# AGENTS.md

Guidance for AI agents working in this repo.

## Always record the owner's preferences

When the owner states a preference, convention or constraint (in chat, in a review, anywhere),
**write it into the "Owner preferences" list below in the same change**, so it survives across
sessions. Never rely on memory of the conversation. Update an existing entry instead of adding a
contradicting one.

## Owner preferences

- **Test-driven development.** Write the failing test first, then the code; keep `npm test`,
  `npm run typecheck` and `npm run build` green before committing.
- **Static site.** Next.js static export (`output: "export"`, GitHub Pages). No server, no API
  routes, no server-side data.
- **Content is fetched at request time.** Course data is never baked into the build; the browser
  fetches it from the study guide when the user asks for a course.
- **Smart caching for search.** Course code/name/year lookups must feel instant: the whole catalogue
  is loaded once into a persisted local index (`src/lib/api/course-index.ts`, 1 week TTL) and every
  search is answered locally.
- **Real API over assumptions.** Verify the study guide's API shapes against actual responses and
  record those as fixtures. Say plainly when something could not be verified.

## Layout

- `src/lib/api/osiris.ts` – pure wire format: query builder + search response parser.
- `src/lib/assessment/from-tests.ts` – structured test table -> weights for the calculator.
- `src/lib/api/normalize.ts` – course detail (rubrieken) -> `Course`.
- `src/lib/api/client.ts` – `fetch` calls (`fetchCatalogue`, `fetchCourse`).
- `src/lib/api/course-index.ts`, `course-search.ts`, `browser.ts` – cached search.
- `src/lib/assessment/parse.ts`, `src/lib/grades/calc.ts` – assessment parsing and grade math.
- `tests/` – vitest; fixtures in `tests/fixtures/`.
