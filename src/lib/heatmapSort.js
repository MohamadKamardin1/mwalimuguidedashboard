/**
 * How a heatmap orders its rows.
 *
 * Kept out of the component because it is the part with rules in it: a student
 * who was never measured is not the worst in the class, and they are not the
 * best either. Both cases sort to the bottom whichever way the arrow points,
 * and the tests pin that down.
 */

/** One student's score for one skill, or null when they were not measured. */
export function scoreFor(row, skillId) {
  const wanted = skillId && typeof skillId === "object" ? skillId.skillId : skillId;
  if (!row || !row.cells) return null;
  const cell = row.cells.find((item) => item.skillId === wanted);
  return cell && typeof cell.score === "number" ? cell.score : null;
}

/** `{ studentName: "…", average: 0.62, cells: [...] }` in the chosen order. */
export function sortHeatmapRows(rows, sort) {
  const list = [...(rows || [])];
  const by = (sort && sort.by) || "name";
  const direction = (sort && sort.dir) === -1 ? -1 : 1;

  if (by === "average") {
    return list.sort((a, b) => {
      if (a.average === null && b.average === null) return 0;
      if (a.average === null) return 1;
      if (b.average === null) return -1;
      return (a.average - b.average) * direction;
    });
  }

  if (by === "skill" && sort.skillId) {
    return list.sort((a, b) => {
      const left = scoreFor(a, sort.skillId);
      const right = scoreFor(b, sort.skillId);
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      return (left - right) * direction;
    });
  }

  return list.sort(
    (a, b) => String(a.studentName || "").localeCompare(String(b.studentName || "")) * direction
  );
}

/** The mean of the scores that exist. Null when nothing was measured. */
export function meanOf(scores) {
  const measured = (scores || []).filter((score) => typeof score === "number");
  if (!measured.length) return null;
  return measured.reduce((sum, score) => sum + score, 0) / measured.length;
}
