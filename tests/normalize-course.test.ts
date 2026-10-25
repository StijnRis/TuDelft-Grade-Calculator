import { describe, expect, it } from "vitest";
import fixture from "./fixtures/course.assumed.json";
import { normalizeCourse } from "@/lib/api/normalize";

describe("normalizeCourse", () => {
  it("maps a course payload", () => {
    const c = normalizeCourse(fixture);
    expect(c).toMatchObject({
      code: "CS1234",
      name: "Algorithms & Data Structures",
      ects: 5,
      language: "English",
      faculty: "EEMCS",
    });
    expect(c.assessmentText).toContain("Written exam");
  });

  it("accepts alternative key names and nested objects", () => {
    const c = normalizeCourse({
      Code: "AE1111",
      Title: { en: "Flight Mechanics" },
      Credits: "4",
      Assessment: { en: "Exam (100%)" },
    });
    expect(c).toMatchObject({ code: "AE1111", name: "Flight Mechanics", ects: 4 });
    expect(c.assessmentText).toBe("Exam (100%)");
  });

  it("collects unknown scalar fields as extra info", () => {
    const c = normalizeCourse({ code: "X1", name: "X", foo: "bar", nested: { a: 1 } });
    expect(c.extra).toContainEqual({ label: "foo", value: "bar" });
  });

  it("throws on junk input", () => {
    expect(() => normalizeCourse(null)).toThrow();
  });
});
