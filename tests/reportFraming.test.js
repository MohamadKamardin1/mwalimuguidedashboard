/**
 * Two rules that decide what a report even is before it renders.
 *
 * The filter bar and the URL have to agree in both directions, or a shared
 * link opens on a different filter than the one on screen. And a parent's copy
 * is a different document from a teacher's: it must not carry the child's place
 * in the class, on screen or on paper.
 */

import { describe, expect, it } from "vitest";

import {
  isParentCopy,
  resolveCopy,
  showsClassComparison,
  showsRankBand,
} from "@/lib/reportCopy";
import {
  curriculumIdFor,
  filtersFromQuery,
  queryFromFilters,
  splitClassSubject,
} from "@/lib/reportQuery";

describe("the filter bar and the query string", () => {
  it("turns the URL's two keys into the one control that sets them", () => {
    expect(filtersFromQuery({ classId: "c1", subjectId: "s1", termId: "t1", examId: "e1" })).toEqual({
      classSubject: "c1|s1",
      termId: "t1",
      examId: "e1",
    });
  });

  it("survives the round trip, including half a pair", () => {
    const query = { classId: "c1", subjectId: "s1", termId: "t1" };
    expect(queryFromFilters(filtersFromQuery(query), {})).toEqual(query);
    // A class with no subject chosen yet is half a pair, and must not be lost.
    const half = { classId: "c1", termId: "t1" };
    expect(queryFromFilters(filtersFromQuery(half), {})).toEqual(half);
  });

  it("keeps what it does not own, and drops what it emptied", () => {
    const next = queryFromFilters({ classSubject: "c1|s1", termId: "", examId: "e1" }, {
      classId: "old",
      subjectId: "old",
      termId: "t9",
      copy: "parent",
    });
    expect(next).toEqual({ classId: "c1", subjectId: "s1", examId: "e1", copy: "parent" });
  });

  it("splits a class-subject value, either half possibly empty", () => {
    expect(splitClassSubject("c1|s1")).toEqual({ classId: "c1", subjectId: "s1" });
    expect(splitClassSubject("c1|")).toEqual({ classId: "c1", subjectId: "" });
    expect(splitClassSubject("")).toEqual({ classId: "", subjectId: "" });
  });

  it("joins the school's subject row to the curriculum's on their code", () => {
    const curriculum = [
      { id: "cur-math", code: "MATH" },
      { id: "cur-eng", code: "ENG" },
    ];
    expect(curriculumIdFor(curriculum, "math")).toBe("cur-math");
    expect(curriculumIdFor(curriculum, "ENG")).toBe("cur-eng");
    expect(curriculumIdFor(curriculum, "BIO")).toBe("");
    expect(curriculumIdFor(curriculum, "")).toBe("");
  });
});

describe("the two copies of a student report", () => {
  it("is the parent's only when the URL says so", () => {
    expect(resolveCopy({ copy: "parent" })).toBe("parent");
    expect(resolveCopy({ copy: "teacher" })).toBe("teacher");
    expect(resolveCopy({ copy: "PARENT" })).toBe("teacher");
    expect(resolveCopy({})).toBe("teacher");
    expect(resolveCopy(undefined)).toBe("teacher");
  });

  it("hides the class comparison and the band from the parent's copy", () => {
    expect(showsClassComparison("parent")).toBe(false);
    expect(showsRankBand("parent")).toBe(false);
    expect(isParentCopy("parent")).toBe(true);
  });

  it("shows both on the teacher's copy", () => {
    expect(showsClassComparison("teacher")).toBe(true);
    expect(showsRankBand("teacher")).toBe(true);
    expect(isParentCopy("teacher")).toBe(false);
  });
});
