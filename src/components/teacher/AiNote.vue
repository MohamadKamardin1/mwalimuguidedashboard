<template>
  <!--
    Anything a model wrote goes in one of these, so a teacher can always tell
    machine reasoning from their own. Dismissible by default: nothing the AI
    says should be stuck on the screen.
  -->
  <div
    v-if="!hidden"
    class="bg-lightBlue-50 border-l-4 border-lightBlue-500 rounded px-4 py-3 mb-3"
  >
    <div class="flex flex-wrap items-start">
      <div class="flex-grow flex-1 min-w-0">
        <p class="flex items-center mb-1">
          <ai-chip class="mr-2" />
          <span class="text-xs font-bold uppercase text-lightBlue-700">{{ label }}</span>
        </p>
        <div class="text-sm text-blueGray-600">
          <slot>{{ text }}</slot>
        </div>
        <p v-if="hint" class="text-xs text-blueGray-400 mt-1">{{ hint }}</p>
      </div>

      <button
        v-if="dismissible"
        type="button"
        class="text-lightBlue-400 hover:text-lightBlue-600 ml-2 px-2 py-1"
        :aria-label="`Dismiss ${label}`"
        @click="dismiss"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
</template>

<script>
import AiChip from "@/components/teacher/AiChip.vue";

export default {
  name: "ai-note",
  components: { AiChip },
  props: {
    /** What kind of machine output this is, e.g. "Suggested mark". */
    label: { type: String, default: "AI reasoning" },
    /** Plain text. Use the default slot instead when the content is markup. */
    text: { type: String, default: "" },
    /** A quiet line under the content, for a caveat or an instruction. */
    hint: { type: String, default: "" },
    dismissible: { type: Boolean, default: true },
  },
  emits: ["dismiss"],
  data() {
    return { hidden: false };
  },
  methods: {
    dismiss() {
      this.hidden = true;
      this.$emit("dismiss");
    },
  },
};
</script>
