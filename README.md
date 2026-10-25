# TU Delft Grade Calculator

Unofficial grade calculator for TU Delft courses (inspired by uqmarks.com). Next.js static export, all data fetched client-side from the study guide.

- `src/lib/assessment/parse.ts` – parses free-form assessment text into weighted components (keeps the source fragment of each).
- `src/lib/grades/calc.ts` – final grade / required grade logic.
- `src/lib/api/` – Osiris Student API client (search + course detail), normalizer and a cached course index.

Course data is fetched in the browser when a course is requested (nothing is prebuilt). Searches
by code or name are answered from a localStorage-persisted index (code, name, years) that grows as
you search, and only hit the network for queries it has not covered.

## Known limitation: API not yet verified live

TU Delft's study guide is backed by the Osiris Student API at `https://tudelft.osiris-student.nl/student/osiris`
(`POST student/cursussen/zoeken`, `GET owc/cursussen/{id}`). The request/response shapes were taken
from the open-source [osiris-mcp-server](https://github.com/mitkozh/osiris-mcp-server) client,
because the environment this was built in could not reach TU Delft hosts. Still to confirm in a
browser: that the host serves TU Delft, that CORS allows the custom `taal`/`client_type` headers,
and which rubriek holds the assessment (`ASSESSMENT` regex in `normalize.ts`). Then replace
`tests/fixtures/osiris-*.json` with recorded responses. Override the host with `NEXT_PUBLIC_OSIRIS_BASE`.

## Develop

    npm ci && npm test && npm run dev

Deploys via GitHub Actions to Pages on push to `main` (set Settings → Pages → Source: GitHub Actions).
