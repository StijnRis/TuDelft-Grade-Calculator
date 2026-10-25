"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CourseSearch() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form
      className="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) router.push(`/course/?code=${encodeURIComponent(code.trim().toUpperCase())}`);
      }}
    >
      <label htmlFor="code" className="sr-only">Course code</label>
      <input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Course code, e.g. CS1234" autoComplete="off" />
      <button type="submit">Find course</button>
    </form>
  );
}
