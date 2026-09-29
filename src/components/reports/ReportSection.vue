<template>
  <!-- One titled block of a report. Everything below the header is the slot. -->
  <section class="report-section mb-6 print:mb-4">
    <div class="flex flex-wrap items-start mb-3">
      <div class="flex-1 min-w-0 pr-3">
        <h2 class="font-semibold text-lg text-blueGray-700">{{ title }}</h2>
        <!-- The one line that says what this block is for, before the reader
             works it out from the chart. -->
        <p v-if="takeaway" class="text-sm text-blueGray-500 mt-1">{{ takeaway }}</p>
      </div>
      <div class="flex-none print:hidden"><slot name="actions" /></div>
    </div>
    <slot />
  </section>
</template>

<script>
export default {
  name: "report-section",
  props: {
    title: { type: String, required: true },
    /** A sentence, not a label: the point of the block. */
    takeaway: { type: String, default: "" },
  },
};
</script>
