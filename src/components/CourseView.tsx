"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { loadCourse } from "@/lib/api/static-data";
import type { Course } from "@/lib/api/normalize";
import { assessmentFromTests } from "@/lib/assessment/from-tests";
import GradeCalculator from "./GradeCalculator";

export default function CourseView() {
  const params = useSearchParams();
  const code = params.get("code") ?? "";
  const [course, setCourse] = useState<Course>();
  const assessment = useMemo(() => (course ? assessmentFromTests(course.tests) : undefined), [course]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!code) return;
    const ctl = new AbortController();
    setCourse(undefined);
    setError(undefined);
    loadCourse(code, { signal: ctl.signal })
      .then(setCourse)
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    document.title = `${code} grade calculator | TU Delft Grade Calculator`;
    return () => ctl.abort();
  }, [code]);

  if (!code) return <p>No course code given. <Link href="/">Search for a course</Link>.</p>;
  if (error) return (
    <div className="card">
      <h1>{code}</h1>
      <p className="warn">{error}</p>
      <p>You can still <Link href="/calculator/">paste the assessment text manually</Link>.</p>
    </div>
  );
  if (!course) return <p aria-busy="true">Loading {code} …</p>;

  return (
    <>
      <h1>{course.code} – {course.name}</h1>
      <dl className="facts">
        {course.year && <><dt>Year</dt><dd>{course.year}</dd></>}
        {course.ects !== undefined && <><dt>ECTS</dt><dd>{course.ects}</dd></>}
        {course.deepLink && <><dt>Study guide</dt><dd><a href={course.deepLink}>Open official page</a></dd></>}
      </dl>
      {course.sections.map((s, i) => (
        <details key={i}><summary>{s.title}</summary><p>{s.text}</p></details>
      ))}
      <GradeCalculator assessment={assessment} />
    </>
  );
}
