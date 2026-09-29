import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The GraphQL in this app lives in template literals inside components, which
 * means the editor treats it as JavaScript and a mistake in it is invisible
 * until it reaches the server.
 *
 * A `//` comment did exactly that: the workspace's `EXAM` query gained a
 * two-line note above `warnings`, GraphQL rejected the whole document with
 * "Syntax Error: Unexpected character: '/'", and the page that ran it showed
 * "Exam not found" -- because a failed query leaves no data, and no data looks
 * exactly like a missing exam. The comment was correct JavaScript and invalid
 * GraphQL.
 *
 * GraphQL comments start with `#`. This checks the strings themselves, since
 * there is no parser in the dependency tree to check them for us.
 */

const SRC = join(process.cwd(), "src");

function componentFiles(dir = SRC) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...componentFiles(path));
    else if (name.endsWith(".vue") || name.endsWith(".js")) found.push(path);
  }
  return found;
}

/** Every template literal in `source` that looks like a GraphQL document. */
function graphqlStrings(source) {
  const found = [];
  for (const match of source.matchAll(/`([^`]*)`/gs)) {
    const body = match[1];
    if (!/\b(query|mutation|subscription)\b/.test(body)) continue;
    const line = source.slice(0, match.index).split("\n").length;
    found.push({ body, line, text: match[0] });
  }
  return found;
}

describe("the GraphQL written inside components", () => {
  it("uses no JavaScript comments, which GraphQL rejects", () => {
    const offenders = [];
    for (const path of componentFiles()) {
      const source = readFileSync(path, "utf8");
      for (const { body, line } of graphqlStrings(source)) {
        body.split("\n").forEach((text, offset) => {
          const trimmed = text.trim();
          // `#` is the comment GraphQL understands; `//` and `/*` are not.
          if (trimmed.startsWith("//") || trimmed.startsWith("/*")) {
            offenders.push(
              `${path.slice(SRC.length + 1)}:${line + offset + 1} — ${trimmed.slice(0, 60)}`
            );
          }
        });
      }
    }
    expect(offenders).toEqual([]);
  });

  it("has balanced braces in every document", () => {
    // A missing brace is the other way a query stops being a query, and it
    // fails the same way: no data, so the page looks empty rather than broken.
    const offenders = [];
    for (const path of componentFiles()) {
      const source = readFileSync(path, "utf8");
      for (const { body, line } of graphqlStrings(source)) {
        const opens = (body.match(/{/g) || []).length;
        const closes = (body.match(/}/g) || []).length;
        if (opens !== closes) {
          offenders.push(`${path.slice(SRC.length + 1)}:${line} — ${opens} { against ${closes} }`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
