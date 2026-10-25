"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchCourse } from "@/lib/api/client";
import type { Course } from "@/lib/api/normalize";
import GradeCalculator from "./GradeCalculator";

export default function CourseView() {
  const code = useSearchParams().get("code") ?? "";
  const [course, setCourse] = useState<Course>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!code) return;
    const ctl = new AbortController();
    setCourse(undefined);
    setError(undefined);
    fetchCourse(code, { signal: ctl.signal })
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
  if (!course) return <p aria-busy="true">Loading {code} from the study guide…</p>;

  return (
    <>
      <h1>{course.code} – {course.name}</h1>
      <dl className="facts">
        {course.ects !== undefined && <><dt>ECTS</dt><dd>{course.ects}</dd></>}
        {course.language && <><dt>Language</dt><dd>{course.language}</dd></>}
        {course.faculty && <><dt>Faculty</dt><dd>{course.faculty}</dd></>}
        {course.period && <><dt>Period</dt><dd>{course.period}</dd></>}
        {course.responsible && <><dt>Responsible</dt><dd>{course.responsible}</dd></>}
        {course.extra.map((e) => <><dt key={`t${e.label}`}>{e.label}</dt><dd key={`d${e.label}`}>{e.value}</dd></>)}
      </dl>
      {course.description && <p>{course.description}</p>}
      <GradeCalculator assessmentText={course.assessmentText} />
    </>
  );
}
