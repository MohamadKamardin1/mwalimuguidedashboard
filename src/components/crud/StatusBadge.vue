<template>
  <span
    class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full whitespace-nowrap"
    :class="variant.classes"
  >
    {{ label || variant.label }}
  </span>
</template>

<script>
/**
 * The pill the Notus tables use for status. Named states rather than colours,
 * so a page says what a thing *is* and the palette stays in one place.
 */
const VARIANTS = {
  active: { classes: "text-emerald-800 bg-emerald-200", label: "Active" },
  inactive: { classes: "text-red-800 bg-red-200", label: "Inactive" },
  current: { classes: "text-lightBlue-800 bg-lightBlue-200", label: "Current" },
  past: { classes: "text-blueGray-800 bg-blueGray-200", label: "Past" },
  upcoming: { classes: "text-amber-800 bg-amber-200", label: "Upcoming" },
  // Script pipeline states.
  uploaded: { classes: "text-blueGray-800 bg-blueGray-200", label: "Uploaded" },
  matched: { classes: "text-lightBlue-800 bg-lightBlue-200", label: "Matched" },
  extracted: { classes: "text-emerald-800 bg-emerald-200", label: "Extracted" },
  marked: { classes: "text-emerald-800 bg-emerald-200", label: "Marked" },
  reviewed: { classes: "text-emerald-800 bg-emerald-200", label: "Reviewed" },
  final: { classes: "text-emerald-800 bg-emerald-200", label: "Final" },
  pending: { classes: "text-amber-800 bg-amber-200", label: "Pending" },
  done: { classes: "text-emerald-800 bg-emerald-200", label: "Done" },
  failed: { classes: "text-red-800 bg-red-200", label: "Failed" },
  draft: { classes: "text-blueGray-800 bg-blueGray-200", label: "Draft" },
  warning: { classes: "text-amber-800 bg-amber-200", label: "Needs attention" },
  // Exam pipeline. Keyed by the backend's own status values, so a page can
  // hand `status` straight through without translating it first.
  extracting: { classes: "text-lightBlue-800 bg-lightBlue-200", label: "Extracting" },
  marking: { classes: "text-lightBlue-800 bg-lightBlue-200", label: "Marking" },
  needs_confirmation: { classes: "text-amber-800 bg-amber-200", label: "Needs confirmation" },
  review: { classes: "text-amber-800 bg-amber-200", label: "Review" },
  ready: { classes: "text-teal-800 bg-teal-200", label: "Ready" },
  finalized: { classes: "text-emerald-800 bg-emerald-200", label: "Finalized" },
};

const FALLBACK = { classes: "text-blueGray-800 bg-blueGray-200", label: "" };

export default {
  name: "status-badge",
  props: {
    status: { type: String, default: "" },
    // Overrides the wording without changing the colour.
    label: { type: String, default: "" },
  },
  computed: {
    variant() {
      const found = VARIANTS[this.status];
      if (found) return found;
      // An unknown status still renders, showing whatever it was given.
      return { ...FALLBACK, label: this.status };
    },
  },
};
</script>
