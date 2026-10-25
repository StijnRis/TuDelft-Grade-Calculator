import { describe, expect, it } from "vitest";
import course from "./fixtures/osiris-course.json";
import weighted from "./fixtures/osiris-course-weighted.json";
import { normalizeCourseDetail } from "@/lib/api/normalize";

describe("normalizeCourseDetail (recorded TU Delft responses)", () => {
  it("reads the header and study points", () => {
    const c = normalizeCourseDetail(course, 125437);
    expect(c).toMatchObject({
      id: 125437,
      code: "AE1111",
      name: "Exploring Aerospace Engineering and Design",
      year: "2026-2027",
      ects: 5,
    });
  });

  it("reads the structured tests with weights and minimum grades", () => {
    const { tests } = normalizeCourseDetail(course, 1);
    expect(tests.map((t) => [t.name, t.weight, t.minGrade])).toEqual([
      ["Engineering Drawing", 2, 5],
      ["Exploring Aerospace Engineering and Desi", 3, 5],
      ["Mentor Programme", 1, undefined],
    ]);
    expect(tests[2].passFail).toBe(true);
    expect(tests[0].passFail).toBe(false);
  });

  it("keeps percentage weights as they are", () => {
    const { tests } = normalizeCourseDetail(weighted, 1);
    expect(tests.map((t) => [t.name, t.weight])).toEqual([["Assignment", 30], ["Digital Exam", 70]]);
  });

  it("exposes readable sections without CSS or boilerplate rubrieken", () => {
    const { sections } = normalizeCourseDetail(course, 1);
    const all = sections.map((s) => s.text).join("\n");
    expect(all).not.toMatch(/body\s*\{|<style|<html/i);
    expect(sections.some((s) => /minimum of 6/.test(s.text))).toBe(true);
    expect(sections.find((s) => s.title === "Faculty")).toBeUndefined();
  });

  it("has no tests when there is no test table", () => {
    const c = normalizeCourseDetail({ items: [{ rubriek: "rubriek-kop", velden: [{ veld: "cursus", waarde: "X1" }] }] }, 1);
    expect(c).toMatchObject({ name: "X1", tests: [] });
  });

  it("throws on junk", () => {
    expect(() => normalizeCourseDetail(null, 1)).toThrow();
    expect(() => normalizeCourseDetail({ items: [] }, 1)).toThrow();
  });
});
