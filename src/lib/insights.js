/**
 * The few derived numbers the teacher screens share, in one place so the
 * thresholds are stated once rather than re-guessed per page.
 *
 * Everything here is pure: give it the rows the API returned.
 */

/**
 * The band a mastery score falls in.
 *
 * Boundaries are the ones the product asked for: under 0.5 is red, up to and
 * including 0.75 is orange, above that green. A missing score is neither --
 * it is "no data", which is not the same as "weak".
 */
export function masteryBand(score) {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return {
      key: "none",
      bar: "bg-blueGray-300",
      text: "text-blueGray-400",
      chip: "text-blueGray-600 bg-blueGray-200",
      label: "No data",
    };
  }
  if (score < 0.5) {
    return {
      key: "low",
      bar: "bg-red-500",
      text: "text-red-500",
      chip: "text-red-600 bg-red-200",
      label: "Needs work",
    };
  }
  if (score <= 0.75) {
    return {
      key: "mid",
      bar: "bg-amber-500",
      text: "text-amber-600",
      chip: "text-amber-600 bg-amber-200",
      label: "Getting there",
    };
  }
  return {
    key: "high",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
    chip: "text-emerald-600 bg-emerald-200",
    label: "Strong",
  };
}

/**
 * Mastery rows -> one point per exam.
 *
 * `studentProgress` returns a row per skill per exam, oldest first. A single
 * point per exam is what a progress line wants, so the marks are pooled
 * (earned over possible) rather than averaged, which weights a 10-mark
 * question above a 2-mark one. Pooling needs both figures; if the API ever
 * sends only `score`, the mean of the scores is the fallback.
 *
 * Order is the order the API gave, which its contract says is oldest first.
 */
export function perExamSeries(rows) {
  const byExam = new Map();
  for (const row of rows) {
    if (!byExam.has(row.examId)) {
      byExam.set(row.examId, { examId: row.examId, at: row.recordedAt, earned: 0, possible: 0, scores: [] });
    }
    const point = byExam.get(row.examId);
    point.earned += row.marksEarned || 0;
    point.possible += row.marksPossible || 0;
    if (typeof row.score === "number") point.scores.push(row.score);
    // Keep the earliest stamp seen for the exam, so ordering stays stable.
    if (row.recordedAt && row.recordedAt < point.at) point.at = row.recordedAt;
  }

  return [...byExam.values()].map((point) => ({
    examId: point.examId,
    at: point.at,
    score: point.possible
      ? point.earned / point.possible
      : point.scores.reduce((sum, s) => sum + s, 0) / (point.scores.length || 1),
  }));
}

/** The most recent score, or null when there is no history yet. */
export function latestScore(series) {
  return series.length ? series[series.length - 1].score : null;
}

/**
 * Which way the last two exams moved. The dead zone keeps rounding noise from
 * reading as progress.
 */
export function trendOf(series) {
  if (series.length < 2) return "flat";
  const last = series[series.length - 1].score;
  const previous = series[series.length - 2].score;
  if (last - previous > 0.02) return "up";
  if (last - previous < -0.02) return "down";
  return "flat";
}

export const TREND = {
  up: { icon: "fas fa-arrow-up", classes: "text-emerald-500", label: "Improving" },
  flat: { icon: "fas fa-arrow-right", classes: "text-blueGray-400", label: "Holding steady" },
  down: { icon: "fas fa-arrow-down", classes: "text-red-500", label: "Slipping" },
};

/** The last recorded score for each skill, keyed by skill id. */
export function latestPerSkill(rows) {
  const bySkill = new Map();
  for (const row of rows) {
    const skillId = row.skill.id;
    const previous = bySkill.get(skillId);
    if (!previous || (row.recordedAt || "") >= (previous.recordedAt || "")) {
      bySkill.set(skillId, row);
    }
  }
  return bySkill;
}

/** 0.42 -> "42%"; nothing -> an em dash, never "0%". */
export function formatScore(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

/** The Date scalar is an ISO yyyy-mm-dd string. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/**
 * A JSON blob from the API, flattened to readable lines.
 *
 * Insights and reports carry free-form JSON, so each entry is read for the
 * field a human would want and falls back to raw JSON only when it has to.
 */
export function toLines(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => {
      if (item === null || item === undefined) return "";
      if (typeof item === "string") return item;
      if (typeof item === "number") return String(item);
      const text =
        item.label ||
        item.text ||
        item.recommendation ||
        item.mistake ||
        item.question ||
        item.title ||
        item.name;
      if (text) return String(text);
      return JSON.stringify(item);
    })
    .filter(Boolean);
}

/** How many scripts one exam average will read. */
const SCRIPT_LIMIT = 40;

/**
 * The average of an exam, pooled across its scripts.
 *
 * The API exposes no exam aggregate and no bulk results, so the only route is
 * one `scriptResult` per script -- capped at SCRIPT_LIMIT so a page cannot
 * fan out into hundreds of requests. A backend `examStats(examId)` would
 * replace this outright.
 */
export async function examAverage(examId) {
  const { gql } = await import("@/api/client");

  const scripts = await gql(
    `query ExamScripts($examId: ID!) { scripts(examId: $examId, limit: ${SCRIPT_LIMIT}) { items { id } } }`,
    { examId }
  );
  if (!scripts.scripts.items.length) return null;

  const results = await Promise.all(
    scripts.scripts.items.map((script) =>
      gql(
        `query ScriptResult($scriptId: ID!) { scriptResult(scriptId: $scriptId) { totalMarks maxMarks } }`,
        { scriptId: script.id }
      )
    )
  );

  const earned = results.reduce((sum, r) => sum + (r.scriptResult.totalMarks || 0), 0);
  const possible = results.reduce((sum, r) => sum + (r.scriptResult.maxMarks || 0), 0);
  return possible ? earned / possible : null;
}
