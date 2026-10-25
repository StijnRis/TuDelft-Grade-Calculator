export interface GradedComponent {
  name: string;
  weight: number;
  minGrade?: number;
}

export const PASS_GRADE = 5.5;

export function roundGrade(g: number): number {
  return Math.round(g * 2) / 2;
}

export interface FinalResult {
  grade: number | null;
  passed: boolean | null;
  reasons: string[];
}

export function finalGrade(
  components: GradedComponent[],
  grades: Record<string, number | undefined>,
): FinalResult {
  const reasons: string[] = [];
  let sum = 0;
  let totalWeight = 0;
  let complete = true;
  for (const c of components) {
    const g = grades[c.name];
    if (g === undefined || Number.isNaN(g)) {
      complete = false;
      continue;
    }
    sum += g * c.weight;
    totalWeight += c.weight;
    if (c.minGrade !== undefined && g < c.minGrade) {
      reasons.push(`${c.name} is below the minimum grade of ${c.minGrade}`);
    }
  }
  if (!complete || totalWeight === 0) return { grade: null, passed: null, reasons };
  const grade = sum / totalWeight;
  if (grade < PASS_GRADE) reasons.push(`Final grade is below ${PASS_GRADE}`);
  return { grade, passed: reasons.length === 0, reasons };
}

/** Grade needed on `target` component to reach `goal`; null when it can't be reached. */
export function requiredGrade(
  components: GradedComponent[],
  known: Record<string, number | undefined>,
  target: string,
  goal: number,
): number | null {
  const t = components.find((c) => c.name === target);
  if (!t) return null;
  const totalWeight = components.reduce((a, c) => a + c.weight, 0);
  const others = components
    .filter((c) => c.name !== target)
    .reduce((a, c) => a + (known[c.name] ?? 0) * c.weight, 0);
  const needed = (goal * totalWeight - others) / t.weight;
  const clamped = Math.max(needed, t.minGrade ?? 1);
  return clamped > 10 ? null : clamped;
}
