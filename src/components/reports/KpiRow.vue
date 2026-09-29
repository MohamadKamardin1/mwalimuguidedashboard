<template>
  <!--
    A headline figure, with what it moved by if there is a comparison.

    No `break-words`: it stops a long value overflowing its card, but it does
    it by breaking inside words, and "STD DEVIATION" reading "DEVIATIO / N" on
    a phone is worse than the overflow it prevents. The room comes instead from
    the icon, which is decoration and steps aside below `sm`.
  -->
  <div class="relative flex flex-col min-w-0 bg-white rounded mb-4 shadow print:shadow-none print:border print:border-blueGray-200">
    <div class="flex-auto p-4">
      <div class="flex flex-wrap items-start">
        <div class="flex-1 min-w-0 pr-2">
          <h5 class="text-blueGray-400 uppercase font-bold text-xs">{{ label }}</h5>
          <span class="font-semibold text-xl text-blueGray-700">{{ value }}</span>
        </div>
        <div v-if="icon" class="flex-none hidden sm:block print:hidden">
          <div
            class="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 shadow-lg rounded-full"
            :class="iconColor"
          >
            <i :class="icon" aria-hidden="true"></i>
          </div>
        </div>
      </div>

      <p v-if="hasDelta" class="text-xs mt-2" :class="move.text">
        <i :class="move.icon" aria-hidden="true"></i>
        <span class="font-bold ml-1">{{ deltaText }}</span>
        <span v-if="deltaLabel" class="text-blueGray-400 ml-1">{{ deltaLabel }}</span>
      </p>
      <p v-else-if="hint" class="text-xs text-blueGray-400 mt-2">{{ hint }}</p>
    </div>
  </div>
</template>

<script>
import { direction, percentDelta } from "@/lib/scale";

export default {
  name: "kpi-row",
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number], default: "—" },
    /** 0-1 movement, or null when there is nothing to compare against. */
    delta: { type: Number, default: null },
    /** What the delta is measured against, e.g. "since the last exam". */
    deltaLabel: { type: String, default: "" },
    /** A quiet line when there is no delta to show. */
    hint: { type: String, default: "" },
    icon: { type: String, default: "" },
    iconColor: { type: String, default: "bg-lightBlue-500" },
  },
  computed: {
    hasDelta() {
      return this.delta !== null && this.delta !== undefined;
    },
    move() {
      return direction(this.delta);
    },
    deltaText() {
      if (this.move.key === "flat") return "Holding steady";
      if (this.move.key === "none") return this.move.label;
      return percentDelta(this.delta);
    },
  },
};
</script>
