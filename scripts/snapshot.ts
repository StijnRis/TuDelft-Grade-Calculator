/**
 * Downloads the TU Delft catalogue and every course into public/data so the
 * static site can serve them (the portal does not allow browser requests).
 * Usage: npm run snapshot [-- --limit 50]   (limit is for quick local runs)
 */
import { join } from "node:path";
import { fetchCatalogue, fetchCourseById } from "../src/lib/api/osiris-client";
import { buildSnapshot, writeSnapshot } from "../src/lib/api/snapshot";

const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : undefined;

const { hits, total } = await fetchCatalogue();
if (hits.length < total) throw new Error(`Catalogue truncated: got ${hits.length} of ${total}`);
console.log(`Catalogue: ${hits.length} offerings`);

const snapshot = await buildSnapshot({
  hits: limit ? hits.slice(0, limit) : hits,
  fetchDetail: (id) => fetchCourseById(id),
  onProgress: (done, all) => done % 250 === 0 && console.log(`  ${done}/${all}`),
});
writeSnapshot(join(process.cwd(), "public", "data"), snapshot);
console.log(`Wrote ${snapshot.courses.length} courses (${snapshot.catalogue.generatedAt})`);
