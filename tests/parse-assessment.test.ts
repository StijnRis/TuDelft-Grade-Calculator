import { describe, expect, it } from "vitest";
import { parseAssessment } from "@/lib/assessment/parse";

describe("parseAssessment", () => {
  it("parses a simple exam + assignment split", () => {
    const r = parseAssessment("Written exam (70%) and assignment (30%).");
    expect(r.components.map((c) => [c.name, c.weight])).toEqual([
      ["Written exam", 70],
      ["Assignment", 30],
    ]);
    expect(r.totalWeight).toBe(100);
    expect(r.confident).toBe(true);
  });

  it("parses 'NN% name' ordering", () => {
    const r = parseAssessment("30% project, 70% final exam");
    expect(r.components.map((c) => [c.name, c.weight])).toEqual([
      ["Project", 30],
      ["Final exam", 70],
    ]);
  });

  it("parses colon and weight formats", () => {
    const r = parseAssessment("Exam: 60 %\nLab report: 40 %");
    expect(r.components.map((c) => c.weight)).toEqual([60, 40]);
  });

  it("parses decimal and comma weights", () => {
    const r = parseAssessment("Midterm (12,5%), Final (87.5%)");
    expect(r.components.map((c) => c.weight)).toEqual([12.5, 87.5]);
  });

  it("parses fractions as weights", () => {
    const r = parseAssessment("Exam (2/3), Assignment (1/3)");
    expect(r.components.map((c) => Math.round(c.weight))).toEqual([67, 33]);
  });

  it("extracts minimum grade per component", () => {
    const r = parseAssessment("Exam (60%, minimum grade 5.0), Assignment (40%, minimum 5.5)");
    expect(r.components.map((c) => c.minGrade)).toEqual([5, 5.5]);
  });

  it("detects pass/fail components with no weight", () => {
    const r = parseAssessment("Final grade: exam (100%). Lab attendance is mandatory (pass/fail).");
    expect(r.components[0]).toMatchObject({ name: "Exam", weight: 100 });
    expect(r.passFail.length).toBe(1);
  });

  it("is not confident when weights do not sum to 100", () => {
    const r = parseAssessment("Exam (50%), Project (20%)");
    expect(r.totalWeight).toBe(70);
    expect(r.confident).toBe(false);
  });

  it("returns no components for text without weights", () => {
    const r = parseAssessment("Oral examination.");
    expect(r.components).toEqual([]);
    expect(r.confident).toBe(false);
  });

  it("keeps the source snippet for each component", () => {
    const r = parseAssessment("Written exam (70%) and assignment (30%).");
    expect(r.components[0].source).toContain("70%");
  });

  it("strips HTML", () => {
    const r = parseAssessment("<p>Exam <b>(100%)</b></p>");
    expect(r.components).toMatchObject([{ name: "Exam", weight: 100 }]);
  });
});
