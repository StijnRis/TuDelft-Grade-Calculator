"use client";
import { useState } from "react";
import GradeCalculator from "@/components/GradeCalculator";

export default function Page() {
  const [text, setText] = useState("Written exam (70%, minimum grade 5.0) and assignment (30%).");
  return (
    <>
      <h1>Manual grade calculator</h1>
      <p>Paste the assessment section from the study guide. Weights are detected automatically and you can correct them.</p>
      <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} aria-label="Assessment text" />
      <GradeCalculator key={text} assessmentText={text} />
    </>
  );
}
