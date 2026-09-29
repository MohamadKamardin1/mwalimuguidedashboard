<template>
  <!--
    The one mark that says "a model wrote this". Every screen that shows AI
    output carries it, so a teacher can always tell machine work from their own
    at a glance, without reading the surrounding sentence.
  -->
  <span
    class="bg-lightBlue-500 text-white text-xs font-bold uppercase px-2 py-1 rounded inline-flex items-center"
    :title="title"
  >
    <i class="fas fa-magic mr-1" aria-hidden="true"></i>
    <span>AI</span>
    <span v-if="label" class="ml-1 normal-case font-semibold">{{ label }}</span>
    <span class="sr-only">{{ srLabel }}</span>
  </span>
</template>

<script>
export default {
  name: "ai-chip",
  props: {
    /** A word after the chip, e.g. "is preparing this". */
    label: { type: String, default: "" },
    title: { type: String, default: "Written by an AI model, not by a person" },
  },
  computed: {
    /** Screen readers get the full sentence even when the chip is short. */
    srLabel() {
      return this.label ? "" : "AI generated";
    },
  },
};
</script>
