/**
 * The filter bar and the query string, in one place.
 *
 * A picker's filters live in the URL so a link to "Form 2A, Mathematics, Term
 * 1" is a link someone can send. That means two-way conversion, and the two
 * directions have to agree or the page reloads into a different filter than the
 * one on screen. Keeping the conversion here makes it testable without a router.
 */

/** The query string as the filter bar's own shape. */
export function filtersFromQuery(query) {
  const q = query || {};
  return {
    // One control picks a class and a subject together, so the URL's two keys
    // become one value here -- "classId|subjectId".
    classSubject: q.classId ? `${q.classId}|${q.subjectId || ""}` : "",
    termId: q.termId || "",
    examId: q.examId || "",
  };
}

/** The filter bar's shape back into a query string, keeping anything else. */
export function queryFromFilters(filters, current) {
  const query = { ...(current || {}) };
  const [classId, subjectId] = String((filters && filters.classSubject) || "").split("|");
  const pairs = [
    ["classId", classId],
    ["subjectId", subjectId],
    ["termId", filters && filters.termId],
    ["examId", filters && filters.examId],
  ];
  for (const [key, value] of pairs) {
    if (value) query[key] = value;
    else delete query[key];
  }
  return query;
}

/** The two halves of a `classSubject` value, either of which may be empty. */
export function splitClassSubject(value) {
  const [classId = "", subjectId = ""] = String(value || "").split("|");
  return { classId, subjectId };
}

/**
 * The school's subject row and the curriculum subject are different tables.
 *
 * `classReport` and `classProgress` take a curriculum subject id, while a
 * teacher's assignment carries the school's own row; the two are joined on
 * their code, which is the only thing they share.
 */
export function curriculumIdFor(curriculum, code) {
  const wanted = String(code || "").toUpperCase();
  if (!wanted) return "";
  const found = (curriculum || []).find(
    (item) => String(item.code || "").toUpperCase() === wanted
  );
  return found ? found.id : "";
}
