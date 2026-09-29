import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { nextStepFor, stepsFor } from "@/components/teacher/examPipeline";
import ConfidenceBadge from "@/components/teacher/ConfidenceBadge.vue";
import { resolveNavigation } from "@/router/guard";
import { scaledSize } from "@/lib/downscale";

/**
 * The rules a teacher's day depends on: which step comes next, whether a mark
 * can be trusted, who is allowed where, and how big a photo gets before it is
 * sent over a school connection.
 */

describe("the exam pipeline's next step", () => {
  const exam = (status) => ({ status });

  it("maps every status to the action that unblocks it", () => {
    expect(nextStepFor(exam("draft"), {})).toMatchObject({
      step: "files",
      actionLabel: "Upload files",
    });
    expect(nextStepFor(exam("needs_confirmation"), { unconfirmed: 3 })).toMatchObject({
      step: "confirm",
      variant: "warning",
    });
    expect(nextStepFor(exam("ready"), { scripts: 0 })).toMatchObject({
      step: "scripts",
      actionLabel: "Upload scripts",
    });
    expect(nextStepFor(exam("finalized"), {})).toMatchObject({
      step: "insights",
      variant: "success",
    });
  });

  it("waits rather than offering a button while a background step runs", () => {
    for (const status of ["extracting", "marking"]) {
      const next = nextStepFor(exam(status), {});
      expect(next.actionLabel).toBe("");
      expect(next.indeterminate).toBe(true);
    }
  });

  it("counts the answers left to review", () => {
    expect(nextStepFor(exam("review"), { awaiting: 7 }).label).toContain("7");
  });

  it("locks the steps ahead of the exam and says why", () => {
    const steps = stepsFor("ready", {});
    const states = Object.fromEntries(steps.map((step) => [step.key, step.state]));

    expect(states.files).toBe("done");
    expect(states.confirm).toBe("done");
    expect(states.scripts).toBe("current");
    expect(states.marking).toBe("locked");

    const locked = steps.find((step) => step.key === "marking");
    expect(locked.reason).toBeTruthy();
  });

  it("flags the step that is waiting on a teacher", () => {
    const confirm = stepsFor("needs_confirmation", { unconfirmed: 2 }).find(
      (step) => step.key === "confirm"
    );
    expect(confirm.state).toBe("attention");
  });
});

describe("confidence bands", () => {
  const band = (value) => mount(ConfidenceBadge, { props: { value } }).text();

  it("splits at the thresholds the marking pipeline auto-accepts on", () => {
    expect(band(0.95)).toContain("Confident");
    expect(band(0.8)).toContain("Confident");
    // Just under the line is the band that asks for a teacher.
    expect(band(0.79)).toContain("Check this");
    expect(band(0.5)).toContain("Check this");
    expect(band(0.49)).toContain("Unsure");
    expect(band(0)).toContain("Unsure");
  });

  it("says nothing at all when there is no score", () => {
    // An unscored answer is not an unconfident one.
    expect(mount(ConfidenceBadge, { props: { value: null } }).text()).toBe("");
  });
});

describe("the route guard", () => {
  /** The shape `resolveNavigation` is actually called with. */
  const auth = (over = {}) => ({
    isAuthenticated: true,
    mustChangePassword: false,
    role: "teacher",
    home: "/teacher/dashboard",
    ...over,
  });
  const going = (name, roles) => ({
    name,
    fullPath: `/${name}`,
    meta: roles ? { roles } : {},
  });

  it("keeps a teacher out of the admin pages", () => {
    // Not "sends them home": the guard refuses the route outright, so a
    // mistyped link does not look like it worked.
    expect(resolveNavigation(going("admin-exams", ["school_admin"]), auth())).toMatchObject({
      name: "forbidden",
    });
  });

  it("lets a teacher into their own pages", () => {
    expect(resolveNavigation(going("teacher-exams", ["teacher"]), auth())).toBe(true);
  });

  it("sends an anonymous visitor to login, remembering where they were going", () => {
    const result = resolveNavigation(
      { name: "teacher-exams", fullPath: "/teacher/exams", meta: { roles: ["teacher"] } },
      auth({ isAuthenticated: false, role: null })
    );
    expect(result).toMatchObject({ name: "login", query: { redirect: "/teacher/exams" } });
  });

  it("parks an account that still holds a temporary password", () => {
    const result = resolveNavigation(going("teacher-exams", ["teacher"]), auth({ mustChangePassword: true }));
    expect(result).toMatchObject({ name: "change-password" });
  });
});

describe("downscaling an uploaded page", () => {
  it("leaves an image that already fits alone", () => {
    expect(scaledSize(1200, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("scales the longest edge down and keeps the shape", () => {
    // 4000x3000 -> longest edge 2000, so exactly half.
    expect(scaledSize(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    // Portrait: the height is what gets clamped.
    expect(scaledSize(1500, 3000, 2000)).toEqual({ width: 1000, height: 2000 });
  });
});
