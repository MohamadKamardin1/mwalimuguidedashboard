<template>
  <!--
    The Notus stat tile, minus the trend. The theme's CardStats always renders a
    percentage and a "since last month" line, which would mean inventing a
    number here, so this shows a plain count instead.
  -->
  <div
    class="relative flex flex-col min-w-0 break-words bg-white rounded mb-6 shadow-lg"
  >
    <div class="flex-auto p-4">
      <div class="flex flex-wrap items-center">
        <div class="relative w-full pr-4 max-w-full flex-grow flex-1">
          <h5 class="text-blueGray-400 uppercase font-bold text-xs">
            {{ label }}
          </h5>
          <span class="font-semibold text-xl text-blueGray-700">
            {{ value }}
          </span>
        </div>
        <div class="relative w-auto pl-4 flex-initial">
          <div
            class="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 shadow-lg rounded-full"
            :class="iconColor"
          >
            <i :class="icon"></i>
          </div>
        </div>
      </div>
      <p v-if="hint" class="text-sm text-blueGray-400 mt-4">{{ hint }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: "stat-card",
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number], default: 0 },
    icon: { type: String, default: "far fa-chart-bar" },
    iconColor: { type: String, default: "bg-lightBlue-500" },
    /** A quiet second line, for context rather than a fabricated trend. */
    hint: { type: String, default: "" },
  },
};
</script>
