/**
 * The two number helpers every report leans on: which band a mark falls in,
 * and how a movement is written down.
 *
 * Both have boundaries that are decisions rather than arithmetic -- 0.75 is
 * "strong" and 0.7499 is not; a two-point wobble is not a trend -- so they are
 * pinned here rather than left to be re-guessed on the next screen.
 */

import { describe, expect, it } from "vitest";

import {
  bandFor,
  bandForPct,
  direction,
  gradeFor,
  marks,
  pct,
  percent,
  percentDelta,
  points,
  round,
} from "@/lib/scale";

describe("the band a score falls in", () => {
  it("takes the boundary values as the better band", () => {
    expect(bandFor(0.75).key).toBe("strong");
    expect(bandFor(0.7499).key).toBe("fair");
    expect(bandFor(0.5).key).toBe("fair");
    expect(bandFor(0.4999).key).toBe("weak");
    expect(bandFor(0).key).toBe("weak");
  });

  it("keeps no score and no score: it is not the same as a nought", () => {
    expect(bandFor(null).key).toBe("none");
    expect(bandFor(undefined).key).toBe("none");
  });

  it("reads a 0-100 score on the same thresholds", () => {
    // The reports state their percentages as 0-100, so the same boundaries
    // have to hold one scale up -- otherwise every report reads "strong".
    expect(bandForPct(75).key).toBe("strong");
    expect(bandForPct(74).key).toBe("fair");
    expect(bandForPct(50).key).toBe("fair");
    expect(bandForPct(49).key).toBe("weak");
    expect(bandForPct(null).key).toBe("none");
  });
});

describe("writing a movement down", () => {
  it("signs percentage points, and calls nothing no change", () => {
    expect(points(3.04)).toBe("+3.0 pts");
    expect(points(-2.5)).toBe("−2.5 pts");
    expect(points(0)).toBe("no change");
    expect(points(null)).toBe("—");
  });

  it("signs a fraction the same way", () => {
    expect(percentDelta(0.1)).toBe("+10%");
    expect(percentDelta(-0.1)).toBe("−10%");
    expect(percentDelta(0)).toBe("no change");
  });

  it("keeps a wobble from reading as a trend", () => {
    expect(direction(0.03).key).toBe("up");
    expect(direction(-0.03).key).toBe("down");
    // Inside the dead zone: two marks on a class of thirty is not a trend.
    expect(direction(0.01).key).toBe("flat");
    expect(direction(-0.01).key).toBe("flat");
    expect(direction(null).key).toBe("none");
  });

  it("formats the numbers around it the same way everywhere", () => {
    expect(percent(0.6234)).toBe("62%");
    expect(percent(null)).toBe("—");
    expect(pct(73.33)).toBe("73%");
    expect(pct(73.36, 1)).toBe("73.4%");
    expect(pct(null)).toBe("—");
    expect(marks(7, 10)).toBe("7 / 10");
    expect(marks(null, 10)).toBe("—");
    expect(round(3)).toBe("3");
    expect(round(3.456, 2)).toBe("3.46");
  });

  it("gives a percentage a grade letter, and nothing no grade at all", () => {
    expect(gradeFor(75)).toBe("A");
    expect(gradeFor(74.9)).toBe("B");
    expect(gradeFor(45)).toBe("C");
    expect(gradeFor(30)).toBe("D");
    expect(gradeFor(29.9)).toBe("F");
    // A missing mark is not a fail.
    expect(gradeFor(null)).toBe("—");
  });
});
