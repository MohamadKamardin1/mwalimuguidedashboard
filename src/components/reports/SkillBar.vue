<template>
  <!-- One skill against the class or the student. The bar is the score. -->
  <div class="mb-3">
    <div class="flex flex-wrap items-baseline">
      <span class="flex-1 min-w-0 text-sm text-blueGray-700 truncate" :title="name">
        {{ name }}
      </span>
      <span class="flex-none text-sm font-bold ml-2" :class="band.text">
        {{ percent(score) }}
      </span>
    </div>

    <div class="flex items-center mt-1">
      <div class="flex-1 bg-blueGray-200 rounded-full h-2">
        <div
          class="h-2 rounded-full"
          :class="band.bar"
          :style="{ width: barWidth(score) + '%' }"
        ></div>
      </div>
      <span v-if="measured" class="flex-none text-xs text-blueGray-400 ml-2 w-16 text-right">
        {{ measured }} answer{{ measured === 1 ? "" : "s" }}
      </span>
    </div>

    <!-- The comparison line only exists when there is a class to compare to. -->
    <p
      v-if="score !== null && against !== null"
      class="text-xs mt-1"
      :class="comparison.text"
    >
      <i :class="comparison.icon" aria-hidden="true"></i>
      <span class="ml-1">{{ comparison.label }}</span>
    </p>
  </div>
</template>

<script>
import { bandFor, barWidth, percent, percentDelta } from "@/lib/scale";

export default {
  name: "skill-bar",
  props: {
    name: { type: String, required: true },
    /** 0-1, or null when the skill was not measured. */
    score: { type: Number, default: null },
    /** The class average for the same skill, when there is one. */
    against: { type: Number, default: null },
    measured: { type: Number, default: 0 },
  },
  computed: {
    band() {
      return bandFor(this.score);
    },
    comparison() {
      if (this.against === null || this.score === null) return {};
      const delta = this.score - this.against;
      if (delta > 0.02) {
        return {
          text: "text-emerald-600",
          icon: "fas fa-arrow-up",
          label: `${percentDelta(delta)} above the class`,
        };
      }
      if (delta < -0.02) {
        return {
          text: "text-red-600",
          icon: "fas fa-arrow-down",
          label: `${percentDelta(delta)} below the class`,
        };
      }
      return { text: "text-blueGray-400", icon: "fas fa-minus", label: "In line with the class" };
    },
  },
  methods: { percent, barWidth },
};
</script>
