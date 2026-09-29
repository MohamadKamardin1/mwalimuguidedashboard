/**
 * The numbers on a report, turned into something a teacher can read at a
 * glance.
 *
 * Two jobs, kept in one place so a 62% is the same colour in a KPI row, a
 * heatmap cell and a skill bar. Everything here is pure and takes the value it
 * is describing -- there is nothing to fetch and nothing to keep in step.
 */

/** The bands a mark falls in. Boundaries are the product's, not the code's. */
export const BANDS = [
  { at: 0.75, key: "strong", label: "Strong", text: "text-emerald-800", bar: "bg-emerald-500", soft: "bg-emerald-200" },
  { at: 0.5, key: "fair", label: "Getting there", text: "text-amber-800", bar: "bg-amber-500", soft: "bg-amber-200" },
  { at: 0, key: "weak", label: "Needs work", text: "text-red-800", bar: "bg-red-500", soft: "bg-red-200" },
];

/** The band for a 0-1 score, or the "no data" band when there is none. */
export function bandFor(score) {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return {
      key: "none",
      label: "No data",
      text: "text-blueGray-600",
      bar: "bg-blueGray-300",
      soft: "bg-blueGray-200",
    };
  }
  return BANDS.find((band) => score >= band.at) || BANDS[BANDS.length - 1];
}

/**
 * A heatmap cell's colour.
 *
 * Five steps rather than a continuous ramp: a cell this small cannot show a
 * gradient, and a teacher compares cells by sameness, not by shade. No score
 * is grey, never red -- an unmeasured cell is not a failed one.
 */
export function heatColour(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return "bg-blueGray-100";
  if (score >= 0.85) return "bg-emerald-500";
  if (score >= 0.7) return "bg-emerald-300";
  if (score >= 0.5) return "bg-amber-300";
  if (score >= 0.3) return "bg-red-300";
  return "bg-red-500";
}

/** White text on the dark steps, dark text on the light ones. */
export function heatText(score) {
  if (score === null || score === undefined) return "text-blueGray-400";
  return score >= 0.85 || score < 0.3 ? "text-white" : "text-blueGray-700";
}

/**
 * A number that is ALREADY a percentage, 0-100.
 *
 * The reports do their arithmetic in percentage points and say so in the
 * schema: "Percentages are 0-100, not 0-1: they are read, not multiplied."
 * Running one through `percent()` above turns 73 into 7300%.
 */
export function pct(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(digits)}%`;
}

/** The band for a 0-100 score. The same thresholds, one scale up. */
export function bandForPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return bandFor(null);
  return bandFor(value / 100);
}

/** Percentage points, with the sign: the reports' own delta is 0-100 too. */
export function points(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value === 0) return "no change";
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)} pts`;
}

/** 0.6234 -> "62%"; nothing -> an em dash, never "0%". */
export function percent(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

/** A mark out of a total: `marks(7, 10)` -> "7 / 10". */
export function marks(earned, possible) {
  if (earned === null || earned === undefined) return "—";
  return `${round(earned)} / ${round(possible)}`;
}

/** One decimal place at most, and no trailing ".0". */
export function round(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const fixed = Number(value).toFixed(digits);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

/** The same, as a percentage, for a delta that is already 0-1. */
export function percentDelta(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const shown = percent(Math.abs(value));
  if (value === 0) return "no change";
  return `${value > 0 ? "+" : "−"}${shown}`;
}

/**
 * Which way a number moved, and how to draw it.
 *
 * The dead zone keeps a rounding wobble from reading as progress: two marks on
 * a class of thirty is not a trend.
 */
export const DEAD_ZONE = 0.02;

export function direction(delta) {
  if (delta === null || delta === undefined || Number.isNaN(delta)) {
    return { key: "none", icon: "fas fa-minus", text: "text-blueGray-400", label: "No comparison yet" };
  }
  if (delta > DEAD_ZONE) {
    return { key: "up", icon: "fas fa-arrow-up", text: "text-emerald-600", label: "Up" };
  }
  if (delta < -DEAD_ZONE) {
    return { key: "down", icon: "fas fa-arrow-down", text: "text-red-600", label: "Down" };
  }
  return { key: "flat", icon: "fas fa-arrow-right", text: "text-blueGray-400", label: "Holding steady" };
}

/** The grade bands, in NECTA's secondary shape: A 75+, B 65+, C 45+, D 30+, F. */
export const GRADES = [
  { min: 75, grade: "A" },
  { min: 65, grade: "B" },
  { min: 45, grade: "C" },
  { min: 30, grade: "D" },
  { min: 0, grade: "F" },
];

/** A 0-100 percentage as a grade letter. Nothing -> an em dash, never an F. */
export function gradeFor(pctValue) {
  if (pctValue === null || pctValue === undefined || Number.isNaN(pctValue)) return "—";
  const found = GRADES.find((band) => pctValue >= band.min);
  return found ? found.grade : "F";
}

/** A grade band's colour, by its letter. */
export function gradeColour(grade) {
  const letter = String(grade || "").toUpperCase().charAt(0);
  if (letter === "A") return "bg-emerald-500";
  if (letter === "B") return "bg-emerald-300";
  if (letter === "C") return "bg-amber-300";
  if (letter === "D") return "bg-red-300";
  if (letter === "F") return "bg-red-500";
  return "bg-blueGray-300";
}

/** The longest a bar can be drawn, so a chart never overflows its card. */
export function barWidth(value, max = 1) {
  if (!max) return 0;
  return Math.max(2, Math.min(100, (Math.abs(value) / max) * 100));
}
