/**
 * Derived results for one exam, kept pure so the numbers can be reasoned about
 * without the page around them.
 *
 * Nothing here comes from the API: the backend has no grading logic and
 * `ExamStatsType` exposes only a pooled average, so the grade bands, the pass
 * mark and the distribution are all computed here.
 */

/**
 * Grade bands, in NECTA's secondary shape.
 *
 * This is a client-side assumption. The server defines no grades -- the AI
 * prompt it uses says outright that a model must "never promise a grade" -- so
 * a school with a different scale would need it made configurable, or a
 * `grade` field on `ExamStatsType`. Fail is a real band here, not an error.
 */
export const GRADES = [
  { min: 75, grade: "A" },
  { min: 65, grade: "B" },
  { min: 45, grade: "C" },
  { min: 30, grade: "D" },
  { min: 0, grade: "F" },
];

/** At or above this percentage is a pass. Also a client-side assumption. */
export const PASS_MARK = 30;

/** A percentage as a grade letter. */
export function gradeFor(percent) {
  if (percent === null || percent === undefined || Number.isNaN(percent)) return "";
  const found = GRADES.find((band) => percent >= band.min);
  return found ? found.grade : "F";
}

/** 0.7345 -> 73.5 */
export function asPercent(earned, possible) {
  if (!possible) return null;
  return Math.round((earned / possible) * 1000) / 10;
}

function median(sorted) {
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round(((sorted[middle - 1] + sorted[middle]) / 2) * 10) / 10;
}

/**
 * The class's spread, from the per-student percentages.
 *
 * `average` is taken here rather than from `examStats.average` so every card
 * on the page describes the same set of students: the API's average pools
 * every marked answer, including ones belonging to a script whose student
 * never matched.
 */
export function summarise(rows) {
  const percents = rows
    .map((row) => row.percent)
    .filter((value) => value !== null && value !== undefined)
    .sort((a, b) => a - b);

  if (!percents.length) {
    return { count: 0, average: null, median: null, highest: null, lowest: null, passRate: null };
  }

  const total = percents.reduce((sum, value) => sum + value, 0);
  const passed = percents.filter((value) => value >= PASS_MARK).length;

  return {
    count: percents.length,
    average: Math.round((total / percents.length) * 10) / 10,
    median: median(percents),
    highest: percents[percents.length - 1],
    lowest: percents[0],
    passRate: Math.round((passed / percents.length) * 1000) / 10,
  };
}

/**
 * Rank by mark, highest first. Tied marks share a rank, and the next rank
 * skips the places they occupy -- two students on 80 are both 2nd, and the
 * one below them is 4th.
 */
export function withRanks(rows) {
  const sorted = [...rows].sort((a, b) => (b.total || 0) - (a.total || 0));
  let lastTotal = null;
  let lastRank = 0;
  return sorted.map((row, index) => {
    const rank = row.total === lastTotal ? lastRank : index + 1;
    lastTotal = row.total;
    lastRank = rank;
    return { ...row, rank };
  });
}

/** One CSV cell: quoted only when it has to be. */
function cell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const CSV_COLUMNS = [
  ["Rank", (row) => row.rank],
  ["Student", (row) => row.studentName],
  ["Admission no", (row) => row.admissionNo],
  ["Marks", (row) => row.total],
  ["Out of", (row) => row.maxMarks],
  ["Percent", (row) => row.percent],
  ["Grade", (row) => row.grade],
  ["Main gap", (row) => row.gap],
];

/** Rows to a CSV string, with a header. */
export function toCsv(rows, columns = CSV_COLUMNS) {
  const lines = [columns.map(([title]) => cell(title)).join(",")];
  for (const row of rows) {
    lines.push(columns.map(([, read]) => cell(read(row))).join(","));
  }
  return lines.join("\n");
}

/**
 * Hand a string to the browser as a download.
 *
 * The BOM is deliberate: Excel reads a CSV as the system codepage without it,
 * which turns any accented name into mojibake.
 */
export function downloadCsv(filename, csv) {
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** "Mid-term test" -> "mid-term-test-results.csv" */
export function csvFilename(examTitle) {
  const slug = String(examTitle || "exam")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "exam"}-results.csv`;
}
