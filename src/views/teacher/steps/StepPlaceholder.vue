<template>
  <!--
    One file for all seven workspace steps until T4-T9 build them. It shows the
    step's own name and what the exam needs here, so a route can be checked
    before its screen exists.
  -->
  <div class="px-4 pb-4">
    <div class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white">
      <div class="rounded-t mb-0 px-4 py-3 border-0">
        <h3 class="font-semibold text-lg text-blueGray-700 px-4">{{ title }}</h3>
        <p class="text-sm text-blueGray-500 px-4 mt-1">{{ description }}</p>
      </div>

      <div class="px-8 py-6">
        <div v-if="figures.length" class="flex flex-wrap mb-4">
          <div v-for="item in figures" :key="item.label" class="w-6/12 md:w-3/12 py-2 pr-3">
            <span class="text-xl font-bold block text-blueGray-600">{{ item.value }}</span>
            <span class="text-xs text-blueGray-400">{{ item.label }}</span>
          </div>
        </div>

        <div class="bg-blueGray-50 border-l-4 border-blueGray-300 rounded px-4 py-3">
          <p class="text-sm text-blueGray-600">
            This step is not built yet. It will be one of the exam workspace tabs.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * The name comes from the route's own `meta.step`, so adding a step means
 * adding a route rather than another component.
 */
export default {
  name: "exam-step-placeholder",
  props: {
    /** Passed down by the workspace shell. */
    exam: { type: Object, default: null },
    counts: { type: Object, default: null },
  },
  computed: {
    step() {
      return this.$route.meta.step || {};
    },
    title() {
      return this.step.label || "Step";
    },
    description() {
      return this.step.description || "";
    },
    /** Only the figures this step is about, so the page says something real. */
    figures() {
      if (!this.counts) return [];
      const shown = {
        files: [["Files", this.counts.files]],
        confirm: [["Questions to confirm", this.counts.unconfirmed]],
        scripts: [
          ["Scripts", this.counts.scripts],
          ["Without a student", this.counts.unmatched],
        ],
        marking: [["Scripts", this.counts.scripts]],
        review: [["Answers to review", this.counts.awaiting]],
        results: [["Scripts", this.counts.scripts]],
        insights: [],
      }[this.$route.meta.stepKey];
      return (shown || []).map(([label, value]) => ({ label, value }));
    },
  },
};
</script>
