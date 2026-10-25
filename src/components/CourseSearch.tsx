"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { courseSearch } from "@/lib/api/browser";
import type { IndexedCourse } from "@/lib/api/course-index";

const href = (code: string) => `/course/?code=${encodeURIComponent(code.trim().toUpperCase())}`;

export default function CourseSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IndexedCourse[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { courseSearch().warm(); }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return setResults([]);
    const s = courseSearch();
    setResults(s.local(q)); // instant, from the cached index
    let stale = false;
    setBusy(true);
    const t = setTimeout(() => {
      s.search(q).then((r) => !stale && setResults(r)).finally(() => !stale && setBusy(false));
    }, 100);
    return () => { stale = true; clearTimeout(t); };
  }, [query]);

  return (
    <form
      className="search"
      onSubmit={(e) => {
        e.preventDefault();
        const first = results[0];
        if (first) router.push(href(first.code));
        else if (query.trim()) router.push(href(query));
      }}
    >
      <label htmlFor="code" className="sr-only">Course code or name</label>
      <input id="code" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Course code or name, e.g. CS1234" autoComplete="off" />
      <button type="submit">Find course</button>
      {(results.length > 0 || busy) && (
        <ul className="results" aria-busy={busy}>
          {results.map((c) => (
            <li key={c.code}>
              <a href={href(c.code)}><strong>{c.code}</strong> {c.name}</a>
              <span className="year">{c.years[0]?.year}</span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
