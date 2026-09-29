<template>
  <!--
    How sure the model was. The thresholds are the same ones the marking
    pipeline auto-accepts on, so green here means "no teacher needed".
  -->
  <span
    v-if="shown"
    class="text-xs font-bold px-2 py-1 rounded inline-flex items-center"
    :class="variant.classes"
    :title="title"
  >
    <i class="fas mr-1" :class="variant.icon"></i>{{ variant.label }}
  </span>
</template>

<script>
/**
 * Three bands, one definition:
 *   0.8 and up   the model was confident; the mark stands on its own
 *   0.5 to 0.8   worth a look before it is trusted
 *   below 0.5    the teacher should decide
 */
export const HIGH = 0.8;
export const MEDIUM = 0.5;

const BANDS = {
  high: {
    classes: "text-emerald-800 bg-emerald-200",
    label: "Confident",
    icon: "fa-check",
  },
  medium: {
    classes: "text-amber-800 bg-amber-200",
    label: "Check this",
    icon: "fa-exclamation",
  },
  low: {
    classes: "text-red-800 bg-red-200",
    label: "Unsure",
    icon: "fa-question",
  },
  unknown: {
    classes: "text-blueGray-800 bg-blueGray-200",
    label: "No score",
    icon: "fa-minus",
  },
};

export default {
  name: "confidence-badge",
  props: {
    /** 0 to 1, or null when nothing has scored it yet. */
    value: { type: Number, default: null },
    /** Shows the percentage next to the wording. */
    showValue: { type: Boolean, default: true },
  },
  computed: {
    band() {
      if (this.value === null || this.value === undefined) return "unknown";
      if (this.value >= HIGH) return "high";
      if (this.value >= MEDIUM) return "medium";
      return "low";
    },
    variant() {
      const found = BANDS[this.band];
      if (this.band === "unknown" || !this.showValue) return found;
      return { ...found, label: `${found.label} ${Math.round(this.value * 100)}%` };
    },
    shown() {
      // Nothing to say when a caller passes no score at all.
      return this.value !== null && this.value !== undefined;
    },
    title() {
      if (this.band === "unknown") return "No confidence score for this answer";
      return `The model was ${Math.round(this.value * 100)}% confident`;
    },
  },
};
</script>
