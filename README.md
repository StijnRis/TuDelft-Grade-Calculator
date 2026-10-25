# TU Delft Grade Calculator

Unofficial grade calculator for TU Delft courses (inspired by uqmarks.com). Next.js static export, all data fetched client-side from the study guide.

- `src/lib/assessment/parse.ts` – parses free-form assessment text into weighted components (keeps the source fragment of each).
- `src/lib/grades/calc.ts` – final grade / required grade logic.
- `src/lib/api/` – Osiris Student API client (search + course detail), normalizer and a cached course index.

Course data is fetched in the browser when a course is requested (nothing is prebuilt). The whole
catalogue (~2,500 courses, <100 kB gzipped) is loaded in one request and cached in localStorage
for a week, so searching by code or name is instant.

## The study guide API (verified 2026-10-25)

TU Delft's study guide runs on the Osiris Student API at `https://tudelft.osiris-student.nl/student/osiris`
(headers `taal: EN`, `client_type: web`):

- `POST student/cursussen/zoeken` – Elasticsearch-style search. Code lookup is a `phrase_prefix`
  keyword search (a `terms` query on `cursus` returns nothing); only the current year is indexed.
- `GET owc/cursussen/{id}` – course "rubrieken". `rubriek-toetsen` / `tabel-toetsen` is a structured
  test table (relative weight, minimum grade), used directly by the calculator.

Fixtures in `tests/fixtures/osiris-*.json` are recorded from the live portal.

## Known blocker: CORS

The portal answers `access-control-allow-origin: http://localhost:8080` on every real response, so a
browser on any other origin (e.g. GitHub Pages) cannot read it. Node/curl are unaffected. A static
site therefore needs either a small CORS proxy in front of the portal (set `NEXT_PUBLIC_OSIRIS_BASE`
to it) or a build-time snapshot of the data.

## Develop

    npm ci && npm test && npm run dev

Deploys via GitHub Actions to Pages on push to `main` (set Settings → Pages → Source: GitHub Actions).
