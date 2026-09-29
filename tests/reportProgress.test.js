/**
 * The five labels a skill can carry on a progress report.
 *
 * They come from the backend as words in capitals, and the order they sort by
 * is a product decision: the skills that still need teaching come first, and
 * the ones already closed come last. Both are worth pinning -- a status the
 * server adds later must not vanish from the screen, and must not jump the
 * queue to the top of it.
 */

import { describe, expect, it } from "vitest";

import { openOrDeclining, orderOf, SKILL_STATUS, statusFor } from "@/lib/progressStatus";

const BACKEND_STATUSES = ["CLOSED", "IMPROVING", "STABLE", "DECLINING", "OPEN"];

describe("a skill's status", () => {
  it("labels every status the backend can send", () => {
    for (const status of BACKEND_STATUSES) {
      expect(SKILL_STATUS[status], status).toBeTruthy();
      expect(SKILL_STATUS[status].label, status).toBeTruthy();
      expect(SKILL_STATUS[status].classes, status).toBeTruthy();
    }
  });

  it("reads an unknown or missing status as the quiet one", () => {
    expect(statusFor("SOMETHING_NEW").label).toBe("Stable");
    expect(statusFor(undefined).label).toBe("Stable");
    expect(statusFor(null).label).toBe("Stable");
  });

  it("sorts the work still to do above the work already done", () => {
    const sorted = [...BACKEND_STATUSES].sort((a, b) => orderOf(a) - orderOf(b));
    expect(sorted).toEqual(["DECLINING", "OPEN", "STABLE", "IMPROVING", "CLOSED"]);
    expect(orderOf("nonsense")).toBe(orderOf("STABLE"));
  });

  it("counts exactly two statuses as still needing teaching", () => {
    expect(BACKEND_STATUSES.filter(openOrDeclining)).toEqual(["DECLINING", "OPEN"]);
    expect(openOrDeclining("CLOSED")).toBe(false);
    expect(openOrDeclining("STABLE")).toBe(false);
    expect(openOrDeclining(undefined)).toBe(false);
  });
});
