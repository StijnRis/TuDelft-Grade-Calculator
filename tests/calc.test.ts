import { describe, expect, it } from "vitest";
import { finalGrade, requiredGrade, roundGrade } from "@/lib/grades/calc";

const comps = [
  { name: "Exam", weight: 70, minGrade: 5 },
  { name: "Assignment", weight: 30 },
];

describe("finalGrade", () => {
  it("computes weighted average", () => {
    expect(finalGrade(comps, { Exam: 7, Assignment: 9 }).grade).toBeCloseTo(7.6);
  });
  it("fails when a minimum grade is not met", () => {
    const r = finalGrade(comps, { Exam: 4.5, Assignment: 10 });
    expect(r.passed).toBe(false);
    expect(r.reasons[0]).toMatch(/Exam/);
  });
  it("returns null grade until all components are filled", () => {
    expect(finalGrade(comps, { Exam: 7 }).grade).toBeNull();
  });
  it("passes at >= 5.5 rounded", () => {
    expect(finalGrade(comps, { Exam: 5.5, Assignment: 5.5 }).passed).toBe(true);
  });
});

describe("requiredGrade", () => {
  it("computes grade needed on the missing component for a target", () => {
    // 0.7*x + 0.3*8 = 6 -> x = 5.142...
    expect(requiredGrade(comps, { Assignment: 8 }, "Exam", 6)).toBeCloseTo(5.1428, 3);
  });
  it("respects the component minimum grade", () => {
    expect(requiredGrade(comps, { Assignment: 10 }, "Exam", 5.5)).toBe(5);
  });
  it("returns null when impossible (>10)", () => {
    expect(requiredGrade(comps, { Assignment: 1 }, "Exam", 9)).toBeNull();
  });
});

describe("roundGrade", () => {
  it("rounds to nearest half for final grades", () => {
    expect(roundGrade(7.26)).toBe(7.5);
    expect(roundGrade(7.24)).toBe(7);
  });
});
