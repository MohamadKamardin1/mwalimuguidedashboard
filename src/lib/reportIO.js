/**
 * Getting a report out of the app.
 *
 * A report that cannot leave the screen is only half a report: it has to be
 * printable for a staff meeting and pasteable into whatever spreadsheet the
 * school already keeps.
 */

/**
 * One CSV cell, quoted only when it has to be.
 *
 * A comma, a quote or a newline inside a value would otherwise break the row.
 * The leading `=` and `+` are escaped too: a spreadsheet treats them as the
 * start of a formula, which is how a name becomes something that runs.
 */
export function csvCell(value) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Rows of values -> a CSV document. */
export function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Written as a character, not literally: a stray BOM in the source trips
 *  linters and editors alike. */
const BYTE_ORDER_MARK = "\uFEFF";

/** Hand a file to the browser to download. */
export function download(filename, text, type = "text/csv;charset=utf-8") {
  // The BOM is what makes Excel read it as UTF-8 rather than as the local
  // codepage, which matters the moment a name has an accent in it.
  const blob = new Blob([BYTE_ORDER_MARK + text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Rows -> a CSV download, named after the report it came from. */
export function exportRows(filename, rows) {
  download(filename, toCsv(rows));
}

/**
 * Print what is on the screen.
 *
 * The page's own print stylesheet does the work: it hides the chrome, keeps
 * every card whole and keeps the colours -- which is what a heatmap is made
 * of. Nothing is re-rendered here, so what prints is what was read.
 */
export function printPage() {
  window.print();
}

/**
 * Print sideways, for a table wider than it is tall.
 *
 * A named page does the switching: `@page report-landscape { size: A4
 * landscape }` is declared once in the stylesheet, and the report root carries
 * `page: report-landscape` for the duration of the dialog. An injected
 * `@page { size: landscape }` would also have replaced the margin boxes the
 * footer is written in -- the sheet would have lost its page numbers and the
 * school's name exactly when it was widest.
 */
export function printLandscape() {
  const root = document.querySelector(".report-page");
  if (!root) {
    window.print();
    return;
  }

  root.classList.add("report-landscape");
  const clean = () => {
    root.classList.remove("report-landscape");
    window.removeEventListener("afterprint", clean);
  };
  window.addEventListener("afterprint", clean);
  window.print();
  window.setTimeout(clean, 3000);
}

/**
 * The school's name and the report's title, for the printed footer.
 *
 * `content` in a margin box cannot read the DOM, but it can read a custom
 * property, so the two strings are published as `--report-school` and
 * `--report-title` on the document root before the print dialog opens. Set as
 * a quoted JSON string: a `content` list needs a string token, not bare words.
 */
export function setReportFooter(school, title) {
  const root = document.documentElement.style;
  root.setProperty("--report-school", JSON.stringify(school || ""));
  root.setProperty("--report-title", JSON.stringify(title || ""));
}
