/**
 * Which copy of a student report is being read.
 *
 * A teacher's copy and a parent's copy are the same report seen from two
 * sides: the parent's copy is the sheet that goes home, and what it leaves
 * out is the point of it. The rule lives here rather than in the view so it
 * can be pinned down by a test.
 */

const TEACHER = "teacher";
const PARENT = "parent";

export const COPY_MODES = [
  { value: TEACHER, label: "Teacher copy" },
  { value: PARENT, label: "Parent copy" },
];

/** The copy named in `?copy=`, and only that: anything else is the teacher's. */
export function resolveCopy(query) {
  return query && query.copy === PARENT ? PARENT : TEACHER;
}

export function isParentCopy(copy) {
  return copy === PARENT;
}

/** Comparing a child to their classmates is the teacher's conversation. */
export function showsClassComparison(copy) {
  return !isParentCopy(copy);
}

/** "A third of the class" is a teacher's frame, not a parent's. */
export function showsRankBand(copy) {
  return !isParentCopy(copy);
}
