/**
 * Where a skill stands against the mastery line.
 *
 * The backend reads a skill's run of scores and sends back one of five strings;
 * every progress screen then colours, sorts and filters by them. They live here
 * rather than inside one view so the reports cannot drift apart on what "open"
 * means, and so the labels can be tested without rendering a page.
 *
 * - `CLOSED`    the skill crossed the mastery target from below. The one to
 *               celebrate, and the one to stop practising.
 * - `IMPROVING` still under the target, but climbing towards it.
 * - `STABLE`    still under the target and holding there.
 * - `DECLINING` still under the target and moving away from it.
 * - `OPEN`      still under the target and not climbing: the target was never
 *               reached, and nothing is moving it there.
 *
 * `order` is how a report lists them: the work still owed on top, the finished
 * skills at the bottom.
 */
export const SKILL_STATUS = {
  DECLINING: { label: "Declining", classes: "bg-red-200 text-red-800", text: "text-red-600", order: 0 },
  OPEN: { label: "Open", classes: "bg-amber-200 text-amber-800", text: "text-amber-700", order: 1 },
  STABLE: { label: "Stable", classes: "bg-blueGray-200 text-blueGray-700", text: "text-blueGray-500", order: 2 },
  IMPROVING: { label: "Improving", classes: "bg-lightBlue-200 text-lightBlue-800", text: "text-lightBlue-600", order: 3 },
  CLOSED: { label: "Closed", classes: "bg-emerald-200 text-emerald-800", text: "text-emerald-600", order: 4 },
};

/** The entry for a status. Anything unrecognised reads as the quiet one. */
export function statusFor(status) {
  return SKILL_STATUS[status] || SKILL_STATUS.STABLE;
}

/** The number a status sorts by: the ones still needing work come first. */
export function orderOf(status) {
  return statusFor(status).order;
}

/** The two statuses that mean this skill still has to be taught something. */
export function openOrDeclining(status) {
  return status === "OPEN" || status === "DECLINING";
}
