# TU Delft Grade Calculator

Unofficial grade calculator for TU Delft courses (inspired by uqmarks.com). Next.js static export, all data fetched client-side from the study guide.

- `src/lib/assessment/parse.ts` – parses free-form assessment text into weighted components (keeps the source fragment of each).
- `src/lib/grades/calc.ts` – final grade / required grade logic.
- `src/lib/api/` – study guide client + normalizer.

## Known limitation: study guide API is unverified

The environment this was built in could not reach `studiegids.tudelft.nl`, so the endpoint
(`src/lib/api/client.ts` → `courseUrl`) and field mapping (`normalize.ts`) are **assumptions**
covered by a fixture (`tests/fixtures/course.assumed.json`). Inspect the real XHR requests in your
browser dev tools, then update those two files and the fixture. The API must also allow CORS for
a pure client-side app. The `/calculator` page (paste assessment text) works regardless.

## Develop

    npm ci && npm test && npm run dev

Deploys via GitHub Actions to Pages on push to `main` (set Settings → Pages → Source: GitHub Actions).
