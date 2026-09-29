import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The workspace shell hands each step an `exam` object and a `counts` object.
 *
 * GraphQL returns only the fields that were asked for, so a step that reads a
 * field the shell forgot to select does not get `undefined` -- it throws during
 * render, and in Vue 3 that blanks the whole tree. The confirm step did exactly
 * this with `exam.warnings`: the page died on
 * "undefined is not an object (evaluating '$props.exam.warnings.length')" the
 * first time it was ever opened in a browser, months of API-only checking
 * having never rendered it.
 *
 * These read the source rather than mount the components, because the fault is
 * in a query string, not in behaviour.
 */

// Vitest runs from the project root, which is the only path that resolves
// the same in the runner and in a plain `vitest run`. `import.meta.url`
// arrives rewritten by the transform and pointed at /src.
const SRC = join(process.cwd(), "src");

function read(path) {
  return readFileSync(join(SRC, path), "utf8");
}

/**
 * The field names the shell's `exam` query selects, at the top level.
 *
 * A line is `a b c`, or `field {` opening a block, or `field { a b }` on one
 * line. Only what sits before the brace is top level; the rest belongs to the
 * nested selection and is not what the steps read.
 */
function shellSelects() {
  const shell = read("views/teacher/ExamWorkspace.vue");
  const start = shell.indexOf("const EXAM = `");
  const query = shell.slice(start, shell.indexOf("`;", start));
  const body = query.slice(query.indexOf("exam(id: $id) {") + "exam(id: $id) {".length);

  const names = [];
  for (const line of body.split("\n")) {
    const head = line.includes("{") ? line.slice(0, line.indexOf("{")) : line;
    for (const word of head.trim().split(/\s+/)) {
      if (/^[a-z][a-zA-Z]*$/.test(word)) names.push(word);
    }
  }
  return new Set(names);
}

describe("the exam shell and its steps", () => {
  it("selects every field the steps read off the exam prop", () => {
    const selected = shellSelects();
    expect(selected.has("warnings")).toBe(true);
    expect(selected.has("title")).toBe(true);

    const steps = readdirSync(join(SRC, "views/teacher/steps"));
    const missing = [];
    for (const name of steps) {
      if (!name.endsWith(".vue")) continue;
      const source = read(`views/teacher/steps/${name}`);
      for (const match of source.matchAll(/\bexam\.([a-zA-Z]+)/g)) {
        const field = match[1];
        if (!selected.has(field)) missing.push(`${name} reads exam.${field}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("keeps the confirm step working when the field is absent", () => {
    // The prop is whatever the shell selected. A step has to survive a missing
    // optional field rather than blanking the screen.
    const source = read("views/teacher/steps/ConfirmStep.vue");

    // The one thing the template guards on is the guarded computed...
    expect(source).toContain("this.exam.warnings || []");
    expect(source).toContain('v-if="warnings.length"');
    // ...and nothing reaches for the raw field any more.
    expect(source).not.toContain("exam.warnings.length");
    expect(source).not.toContain("in exam.warnings");
  });
});
