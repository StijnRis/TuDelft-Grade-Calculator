import { describe, expect, it } from "vitest";
import course from "./fixtures/osiris-course.json";
import weighted from "./fixtures/osiris-course-weighted.json";
import { normalizeCourseDetail } from "@/lib/api/normalize";
import { assessmentFromTests } from "@/lib/assessment/from-tests";

describe("assessmentFromTests", () => {
  it("converts relative weights to percentages and keeps pass/fail parts apart", () => {
    const a = assessmentFromTests(normalizeCourseDetail(course, 1).tests);
    expect(a.components.map((c) => [c.name, c.weight, c.minGrade])).toEqual([
      ["Engineering Drawing", 40, 5],
      ["Exploring Aerospace Engineering and Desi", 60, 5],
    ]);
    expect(a.totalWeight).toBe(100);
    expect(a.confident).toBe(true);
    expect(a.passFail).toEqual(["Mentor Programme has to be passed (a satisfactory result)."]);
  });

  it("uses percentage weights unchanged", () => {
    const a = assessmentFromTests(normalizeCourseDetail(weighted, 1).tests);
    expect(a.components.map((c) => c.weight)).toEqual([30, 70]);
  });

  it("rounds odd splits and still reports a total of 100", () => {
    const a = assessmentFromTests([
      { name: "A", weight: 1, passFail: false },
      { name: "B", weight: 1, passFail: false },
      { name: "C", weight: 1, passFail: false },
    ]);
    expect(a.components.map((c) => c.weight)).toEqual([33.33, 33.33, 33.33]);
    expect(a.confident).toBe(true);
  });

  it("makes every component source findable in the text for highlighting", () => {
    const a = assessmentFromTests(normalizeCourseDetail(course, 1).tests);
    for (const c of a.components) expect(a.text).toContain(c.source);
  });

  it("is not confident without weighted tests", () => {
    const a = assessmentFromTests([{ name: "Pass", passFail: true }]);
    expect(a.components).toEqual([]);
    expect(a.confident).toBe(false);
    expect(assessmentFromTests([]).text).toBe("");
  });
});
