import type { CourseTest } from "@/lib/api/normalize";
import type { AssessmentComponent, ParsedAssessment } from "./parse";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Build a ParsedAssessment straight from the study guide's structured test
 * table: relative weights become percentages, pass/fail parts become notes.
 */
export function assessmentFromTests(tests: CourseTest[]): ParsedAssessment {
  const weighted = tests.filter((t) => !t.passFail && t.weight !== undefined && t.weight > 0);
  const sum = weighted.reduce((a, t) => a + t.weight!, 0);
  const lines: string[] = [];

  const components: AssessmentComponent[] = weighted.map((t) => {
    const weight = round2((t.weight! / sum) * 100);
    const source = `${t.name}: ${weight}%${t.minGrade !== undefined ? ` (minimum grade ${t.minGrade.toFixed(1)})` : ""}`;
    lines.push(source);
    return { name: t.name, weight, ...(t.minGrade !== undefined && { minGrade: t.minGrade }), source };
  });

  const passFail = tests
    .filter((t) => t.passFail)
    .map((t) => `${t.name} has to be passed (a satisfactory result).`);
  lines.push(...passFail);

  const totalWeight = round2(components.reduce((a, c) => a + c.weight, 0));
  return {
    components,
    passFail,
    totalWeight,
    confident: components.length > 0 && Math.abs(totalWeight - 100) < 0.5,
    text: lines.join("\n"),
  };
}
