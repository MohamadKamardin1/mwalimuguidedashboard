<template>
  <!--
    One skill's history, small enough to sit in a list row.
    No axis and no labels: it answers "which way is this going", and the row
    around it carries the numbers.
  -->
  <svg
    v-if="values.length > 1"
    :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
    class="w-full"
    :style="{ height: height + 'px' }"
    role="img"
    :aria-label="label"
    preserveAspectRatio="none"
  >
    <line
      v-for="tick in [0, 100]"
      :key="tick"
      x1="0"
      :x2="WIDTH"
      :y1="yFor(tick)"
      :y2="yFor(tick)"
      stroke="#E2E8F0"
      stroke-width="1"
    />
    <polyline
      :points="linePoints"
      fill="none"
      :stroke="colour"
      stroke-width="2"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
    <circle
      v-for="(point, index) in plotted"
      :key="index"
      :cx="xFor(index)"
      :cy="yFor(point)"
      r="2.5"
      :fill="colour"
    />
  </svg>

  <span v-else class="text-xs text-blueGray-300">one exam</span>
</template>

<script>
import { bandFor } from "@/lib/scale";

const WIDTH = 100;
const HEIGHT = 28;

export default {
  name: "skill-sparkline",
  props: {
    /** 0-1 scores, oldest first. Nulls are skipped, not treated as zero. */
    values: { type: Array, default: () => [] },
    /** Overrides the colour that the band would give it. */
    colour: { type: String, default: "" },
    height: { type: Number, default: 28 },
  },
  computed: {
    plotted() {
      return this.values.filter((value) => value !== null && value !== undefined);
    },
    linePoints() {
      return this.plotted
        .map((value, index) => `${this.xFor(index)},${this.yFor(value * 100)}`)
        .join(" ");
    },
    stroke() {
      if (this.colour) return this.colour;
      // The line takes the colour of where it ended up.
      const last = this.plotted[this.plotted.length - 1];
      const band = bandFor(last === undefined ? null : last);
      return { "bg-emerald-500": "#10B981", "bg-amber-500": "#F59E0B", "bg-red-500": "#EF4444" }[
        band.bar
      ] || "#94A3B8";
    },
    label() {
      return `Skill trend: ${this.plotted.map((v) => Math.round(v * 100) + "%").join(", ")}`;
    },
  },
  methods: {
    xFor(index) {
      if (this.plotted.length <= 1) return WIDTH / 2;
      return (WIDTH * index) / (this.plotted.length - 1);
    },
    yFor(value) {
      const clamped = Math.max(0, Math.min(100, value));
      return HEIGHT - (HEIGHT * clamped) / 100;
    },
  },
};
</script>
