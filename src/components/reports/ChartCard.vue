<template>
  <!--
    A chart and the one line that says what it shows. The takeaway is part of
    the card rather than a caption underneath, because a chart nobody reads is
    a chart nobody acts on.
  -->
  <div
    class="relative flex flex-col min-w-0 break-words bg-white rounded mb-4 shadow-lg print:shadow-none print:border print:border-blueGray-200 print:break-inside-avoid"
  >
    <div class="rounded-t px-4 py-3 border-0">
      <div class="flex flex-wrap items-center">
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-base text-blueGray-700">{{ title }}</h3>
          <p v-if="takeaway" class="text-sm text-blueGray-500 mt-1">{{ takeaway }}</p>
        </div>
        <div class="flex-none print:hidden"><slot name="actions" /></div>
      </div>
    </div>
    <div class="px-4 pb-4 flex-1">
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: "chart-card",
  props: {
    title: { type: String, required: true },
    takeaway: { type: String, default: "" },
  },
};
</script>
