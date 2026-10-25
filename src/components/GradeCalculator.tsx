"use client";
import { useMemo, useState } from "react";
import { parseAssessment, type ParsedAssessment } from "@/lib/assessment/parse";
import { finalGrade, requiredGrade, roundGrade } from "@/lib/grades/calc";

interface Row { name: string; weight: number; minGrade?: number; source: string }

export default function GradeCalculator({ assessmentText = "", assessment }: { assessmentText?: string; assessment?: ParsedAssessment }) {
  const parsed = useMemo(() => assessment ?? parseAssessment(assessmentText), [assessment, assessmentText]);
  const [overrides, setOverrides] = useState<Record<number, Partial<Row>>>({});
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [goal, setGoal] = useState("5.5");

  const rows: Row[] = parsed.components.map((c, i) => ({ ...c, ...overrides[i] }));
  const set = (i: number, patch: Partial<Row>) => setOverrides((o) => ({ ...o, [i]: { ...o[i], ...patch } }));
  const numeric: Record<string, number | undefined> = {};
  rows.forEach((r) => {
    const v = parseFloat((grades[r.name] ?? "").replace(",", "."));
    numeric[r.name] = Number.isNaN(v) ? undefined : v;
  });

  const total = rows.reduce((a, r) => a + r.weight, 0);
  const result = finalGrade(rows, numeric);
  const missing = rows.filter((r) => numeric[r.name] === undefined);
  const needed = missing.length === 1
    ? requiredGrade(rows, numeric, missing[0].name, parseFloat(goal.replace(",", ".")) || 5.5)
    : undefined;

  return (
    <div className="grid">
      <section className="card">
        <h2>Assessment (as in the study guide)</h2>
        {parsed.text ? (
          <p className="source">{highlight(parsed.text, rows.map((r) => r.source))}</p>
        ) : (
          <p className="muted">No assessment text available.</p>
        )}
        {parsed.passFail.length > 0 && (
          <>
            <h3>Other requirements</h3>
            <ul>{parsed.passFail.map((s) => <li key={s}>{s}</li>)}</ul>
          </>
        )}
      </section>

      <section className="card">
        <h2>Calculator</h2>
        {rows.length === 0 ? (
          <p className="warn">Couldn’t find weights in the text. Read the assessment on the left and use the manual calculator.</p>
        ) : (
          <>
            {!parsed.confident && (
              <p className="warn">Weights add up to {total}%, not 100%. Parsing is best-effort – check and edit the weights below.</p>
            )}
            <table>
              <thead><tr><th>Part</th><th>Weight %</th><th>Min</th><th>Your grade</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td title={`Source: ${r.source}`}>{r.name}</td>
                    <td><input aria-label={`${r.name} weight`} type="number" min={0} max={100} value={r.weight} onChange={(e) => set(i, { weight: Number(e.target.value) })} /></td>
                    <td><input aria-label={`${r.name} minimum`} type="number" min={1} max={10} step={0.5} value={r.minGrade ?? ""} onChange={(e) => set(i, { minGrade: e.target.value ? Number(e.target.value) : undefined })} /></td>
                    <td><input aria-label={`${r.name} grade`} inputMode="decimal" placeholder="1–10" value={grades[r.name] ?? ""} onChange={(e) => setGrades((g) => ({ ...g, [r.name]: e.target.value }))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.grade !== null ? (
              <div className={`result ${result.passed ? "pass" : "fail"}`}>
                <strong>{result.grade.toFixed(2)}</strong> → rounded {roundGrade(result.grade).toFixed(1)}
                <div>{result.passed ? "Passed ✅" : "Not passed ❌"}</div>
                {result.reasons.map((m) => <small key={m}>{m}</small>)}
              </div>
            ) : needed !== undefined ? (
              <div className="result">
                <label>Target grade <input value={goal} onChange={(e) => setGoal(e.target.value)} className="inline" /></label>
                <div>
                  {needed === null ? "Not reachable" : <>You need <strong>{needed.toFixed(2)}</strong></>} on {missing[0].name}
                </div>
              </div>
            ) : (
              <p className="muted">Fill in your grades to see the result. Leave one empty to see what you need.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function highlight(text: string, sources: string[]) {
  const spans: Array<[number, number]> = [];
  for (const s of sources) {
    const i = s ? text.indexOf(s) : -1;
    if (i >= 0) spans.push([i, i + s.length]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  const out: React.ReactNode[] = [];
  let pos = 0;
  spans.forEach(([s, e], k) => {
    if (s < pos) return;
    out.push(text.slice(pos, s), <mark key={k}>{text.slice(s, e)}</mark>);
    pos = e;
  });
  out.push(text.slice(pos));
  return out;
}
