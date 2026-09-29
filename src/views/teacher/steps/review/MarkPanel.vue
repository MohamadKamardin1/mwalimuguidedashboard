<template>
  <ai-note label="Marked by the AI" :dismissible="false">
    <!-- Headline: what it awarded and how sure it was -->
    <div class="flex flex-wrap items-center mb-2">
      <span class="text-2xl font-bold text-blueGray-700 mr-3">
        {{ formatMarks(marks) }}
        <span class="text-blueGray-400 text-lg">/ {{ item.maxMarks }}</span>
      </span>
      <confidence-badge :value="item.confidence" />
      <span
        v-if="item.errorType && item.errorType !== 'none'"
        class="ml-2 text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-amber-800 bg-amber-200"
      >
        {{ humanise(item.errorType) }}
      </span>
      <span
        v-if="item.errorCarriedForward"
        class="ml-2 text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-800 bg-blueGray-200"
        title="The mistake came from an earlier part of the question"
      >
        Carried forward
      </span>
      <span
        v-if="item.legibilityScore !== null && item.legibilityScore < 0.5"
        class="ml-2 text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-800 bg-red-200"
      >
        Hard to read
      </span>
    </div>

    <p v-if="item.reasoning" class="text-sm text-blueGray-600 mb-3">
      {{ item.reasoning }}
    </p>

    <!-- Rubric rows: toggling one recomputes the total -->
    <div v-if="rows.length" class="border-t border-solid border-lightBlue-200 pt-3">
      <h6 class="text-xs uppercase font-bold text-blueGray-500 mb-2">
        Rubric
      </h6>
      <div
        v-for="row in rows"
        :key="row.id"
        class="flex items-start py-2"
      >
        <button
          type="button"
          class="mt-1 mr-3 flex-shrink-0 rounded border-2 border-solid w-6 h-6 flex items-center justify-center"
          :class="
            on[row.id]
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-blueGray-300 text-transparent'
          "
          :aria-label="on[row.id] ? `Take back ${row.label}` : `Award ${row.label}`"
          :disabled="busy"
          @click="toggle(row)"
        >
          <i class="fas fa-check text-xs"></i>
        </button>

        <div class="flex-1 min-w-0">
          <p class="text-sm text-blueGray-700">
            <span class="font-bold mr-1">{{ row.label }}</span>
            {{ row.description }}
          </p>
          <p class="text-xs text-blueGray-400">
            {{ on[row.id] ? "Awarded" : "Not awarded" }}
            · {{ row.marks }} mark{{ row.marks === 1 ? "" : "s" }}
            <template v-if="!on[row.id] && row.reason"> · {{ row.reason }}</template>
          </p>
        </div>
      </div>
    </div>
    <p v-else class="text-xs text-blueGray-400 border-t border-solid border-lightBlue-200 pt-3">
      This question has no rubric, so use the marks stepper below.
    </p>
  </ai-note>
</template>

<script>
import AiNote from "@/components/teacher/AiNote.vue";
import ConfidenceBadge from "@/components/teacher/ConfidenceBadge.vue";

export default {
  name: "mark-panel",
  components: { AiNote, ConfidenceBadge },
  props: {
    /** The ReviewItemType being decided. */
    item: { type: Object, required: true },
    /** The question's rubric items, for the labels and mark values. */
    rubric: { type: Array, default: () => [] },
    /** The mark that would be saved right now. */
    marks: { type: Number, default: null },
    busy: { type: Boolean, default: false },
  },
  emits: ["update:marks"],
  data() {
    return { on: {} };
  },
  computed: {
    /** What the model awarded, keyed by rubric item id. */
    awardedById() {
      const map = new Map();
      const rows = Array.isArray(this.item.rubricBreakdown) ? this.item.rubricBreakdown : [];
      for (const row of rows) {
        if (row && row.rubric_item_id) map.set(row.rubric_item_id, row);
      }
      return map;
    },
    rows() {
      const order = {};
      return this.rubric
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((item) => {
          order[item.kind] = (order[item.kind] || 0) + 1;
          const awarded = this.awardedById.get(item.id);
          return {
            id: item.id,
            label: `${item.kind || "R"}${item.order || order[item.kind]}`,
            description: item.description,
            marks: item.marks,
            reason: awarded ? awarded.reason : "",
            wasAwarded: Boolean(awarded && Number(awarded.awarded) > 0),
          };
        });
    },
  },
  watch: {
    // A new answer means a fresh set of toggles.
    "item.answerId": {
      immediate: true,
      handler() {
        this.reset();
      },
    },
    awardedById: {
      handler() {
        this.reset();
      },
    },
  },
  methods: {
    reset() {
      const next = {};
      for (const row of this.rows) next[row.id] = row.wasAwarded;
      this.on = next;
    },
    toggle(row) {
      this.on = { ...this.on, [row.id]: !this.on[row.id] };
      this.$emit("update:marks", this.total());
    },
    total() {
      return this.rows.reduce((sum, row) => sum + (this.on[row.id] ? row.marks : 0), 0);
    },
    formatMarks(value) {
      if (value === null || value === undefined) return "—";
      return Number.isInteger(value) ? String(value) : value.toFixed(1);
    },
    humanise(value) {
      return String(value).replace(/_/g, " ");
    },
  },
};
</script>
