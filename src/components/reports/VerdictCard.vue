<template>
  <!--
    The sentence a teacher would say if you asked "how did they do?". The AI
    chip is not decoration: it says where the sentence came from, so the
    evidence chips underneath can be checked against it.
  -->
  <div class="bg-lightBlue-50 border-l-4 border-lightBlue-500 rounded px-4 py-4 mb-4 print:bg-white print:border print:border-blueGray-300">
    <div class="flex flex-wrap items-center mb-2">
      <ai-chip class="mr-2" />
      <span v-if="dismissible" class="flex-1"></span>
      <button
        v-if="dismissible"
        type="button"
        class="text-lightBlue-400 hover:text-lightBlue-600 w-8 h-8 print:hidden"
        aria-label="Dismiss this summary"
        @click="hidden = true"
      >
        <i class="fas fa-times" aria-hidden="true"></i>
      </button>
    </div>

    <p v-if="!hidden" class="text-blueGray-700 text-sm leading-relaxed">{{ summary }}</p>

    <div v-if="!hidden && evidence.length" class="flex flex-wrap gap-2 mt-3">
      <span
        v-for="chip in evidence"
        :key="chip.label"
        class="text-xs font-semibold rounded-full px-3 py-1"
        :class="chip.classes"
      >
        {{ chip.label }}
      </span>
    </div>
  </div>
</template>

<script>
import AiChip from "@/components/teacher/AiChip.vue";

export default {
  name: "verdict-card",
  components: { AiChip },
  props: {
    /** One sentence. If it needs two, the evidence below should carry it. */
    summary: { type: String, default: "" },
    /** `[{ label, classes }]` — the numbers the sentence rests on. */
    evidence: { type: Array, default: () => [] },
    dismissible: { type: Boolean, default: true },
  },
  data() {
    return { hidden: false };
  },
};
</script>
