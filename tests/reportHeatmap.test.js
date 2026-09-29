/**
 * How a heatmap orders its rows.
 *
 * The interesting case is the student who was never measured: they are not the
 * worst in the class and not the best, so they sort to the bottom whichever way
 * the arrow points. Sorting them to the top -- which is what a plain `null <
 * 0.2` would do -- puts the empty rows where a teacher looks first.
 */

import { describe, expect, it } from "vitest";

import { meanOf, scoreFor, sortHeatmapRows } from "@/lib/heatmapSort";

const ROWS = [
  { studentName: "Beatrice", average: 0.4, cells: [{ skillId: "s1", score: 0.2 }, { skillId: "s2", score: 0.6 }] },
  { studentName: "Anisa", average: null, cells: [{ skillId: "s1", score: null }, { skillId: "s2", score: null }] },
  { studentName: "Chipo", average: 0.7, cells: [{ skillId: "s1", score: 0.9 }, { skillId: "s2", score: 0.5 }] },
];

const names = (rows) => rows.map((row) => row.studentName);

describe("a heatmap's rows", () => {
  it("sorts by name, both ways", () => {
    expect(names(sortHeatmapRows(ROWS, { by: "name", dir: 1 }))).toEqual(["Anisa", "Beatrice", "Chipo"]);
    expect(names(sortHeatmapRows(ROWS, { by: "name", dir: -1 }))).toEqual(["Chipo", "Beatrice", "Anisa"]);
  });

  it("sorts by row average, and keeps the unmeasured student last either way", () => {
    expect(names(sortHeatmapRows(ROWS, { by: "average", dir: 1 }))).toEqual(["Beatrice", "Chipo", "Anisa"]);
    expect(names(sortHeatmapRows(ROWS, { by: "average", dir: -1 }))).toEqual(["Chipo", "Beatrice", "Anisa"]);
  });

  it("sorts by one skill, with the unmeasured student last again", () => {
    expect(names(sortHeatmapRows(ROWS, { by: "skill", skillId: "s1", dir: 1 }))).toEqual(["Beatrice", "Chipo", "Anisa"]);
    expect(names(sortHeatmapRows(ROWS, { by: "skill", skillId: "s2", dir: -1 }))).toEqual(["Beatrice", "Chipo", "Anisa"]);
  });

  it("does not reorder the array it was given", () => {
    const rows = [...ROWS];
    sortHeatmapRows(rows, { by: "average", dir: -1 });
    expect(names(rows)).toEqual(["Beatrice", "Anisa", "Chipo"]);
  });

  it("reads a student's score for a skill, and nothing for a missing one", () => {
    expect(scoreFor(ROWS[2], "s1")).toBe(0.9);
    expect(scoreFor(ROWS[1], "s1")).toBe(null);
    expect(scoreFor(ROWS[0], "s9")).toBe(null);
    // The caller may hand back a whole column object.
    expect(scoreFor(ROWS[2], { skillId: "s2" })).toBe(0.5);
  });

  it("averages the scores that exist, and says nothing when none do", () => {
    expect(meanOf([0.5, null, 1])).toBeCloseTo(0.75);
    expect(meanOf([null, undefined])).toBe(null);
    expect(meanOf([])).toBe(null);
  });
});
