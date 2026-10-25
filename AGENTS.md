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
- **Smart caching for search.** Course code/name/year lookups must feel instant: a persisted local
  index (`src/lib/api/course-index.ts`) answers repeat and refined searches, and the network is
  only used for queries the index has not covered.
- **Real API over assumptions.** Prefer the study guide's real API shapes verified against actual
  responses; keep fixtures honest about whether they were recorded live.

## Layout

- `src/lib/api/osiris.ts` – pure wire format: query builder + search response parser.
- `src/lib/api/normalize.ts` – course detail (rubrieken) -> `Course`.
- `src/lib/api/client.ts` – `fetch` calls (`searchRemote`, `fetchCourse`).
- `src/lib/api/course-index.ts`, `course-search.ts`, `browser.ts` – cached search.
- `src/lib/assessment/parse.ts`, `src/lib/grades/calc.ts` – assessment parsing and grade math.
- `tests/` – vitest; fixtures in `tests/fixtures/`.
