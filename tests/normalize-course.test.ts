import { describe, expect, it } from "vitest";
import course from "./fixtures/osiris-course.json";
import { normalizeCourseDetail } from "@/lib/api/normalize";

describe("normalizeCourseDetail", () => {
  it("builds a course from rubrieken", () => {
    const c = normalizeCourseDetail(course, 901);
    expect(c).toMatchObject({
      id: 901,
      code: "CS1234",
      name: "Algorithms & Data Structures",
      year: "2025-2026",
      deepLink: "https://studiegids.tudelft.nl/x",
    });
    expect(c.sections).toContainEqual({ title: "Course Contents", text: "Learn to design algorithms." });
  });

  it("extracts assessment text from exam-like sections", () => {
    const c = normalizeCourseDetail(course, 901);
    expect(c.assessmentText).toContain("Written exam (70%");
    expect(c.assessmentText).not.toContain("<p>");
  });

  it("skips empty fields and header section from the generic sections", () => {
    const c = normalizeCourseDetail(course, 901);
    expect(c.sections.every((s) => s.text)).toBe(true);
    expect(c.sections.find((s) => s.title === "cursus")).toBeUndefined();
  });

  it("leaves assessment empty when none is present", () => {
    const c = normalizeCourseDetail({ items: [{ rubriek: "rubriek-kop", velden: [{ veld: "cursus", waarde: "X1" }] }] }, 1);
    expect(c.assessmentText).toBe("");
    expect(c.name).toBe("X1");
  });

  it("throws on junk", () => {
    expect(() => normalizeCourseDetail(null, 1)).toThrow();
    expect(() => normalizeCourseDetail({ items: [] }, 1)).toThrow();
  });
});
