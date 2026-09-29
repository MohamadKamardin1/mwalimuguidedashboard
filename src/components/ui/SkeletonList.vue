<template>
  <!--
    The shape of what is coming, rather than a spinner.

    A skeleton says how much is on the way and where it will be, so the page
    does not jump when it arrives. It is also honest about being a placeholder:
    the bars are the real card and row heights.
  -->
  <div :aria-busy="true" :aria-label="label" role="status">
    <!-- Rows: a table, a list, a queue. -->
    <div v-if="variant === 'rows'" class="w-full">
      <div
        v-for="n in count"
        :key="n"
        class="flex items-center py-4 border-b border-blueGray-100 last:border-0"
      >
        <div class="w-9 h-9 rounded-full bg-blueGray-100 animate-pulse flex-none mr-3"></div>
        <div class="flex-1 min-w-0">
          <div class="h-3 w-2/3 bg-blueGray-100 rounded animate-pulse mb-2"></div>
          <div class="h-3 w-1/3 bg-blueGray-100 rounded animate-pulse"></div>
        </div>
        <div class="w-16 h-3 bg-blueGray-100 rounded animate-pulse flex-none ml-3"></div>
      </div>
    </div>

    <!-- Cards: the dashboard, a grid of classes, a question list. -->
    <div v-else class="flex flex-wrap">
      <div
        v-for="n in count"
        :key="n"
        class="w-full mb-4 px-0"
        :class="columnClass"
      >
        <div class="shadow rounded bg-white px-4 py-5 h-full">
          <div class="h-4 w-1/3 bg-blueGray-100 rounded animate-pulse mb-3"></div>
          <div class="h-3 w-2/3 bg-blueGray-100 rounded animate-pulse mb-2"></div>
          <div class="h-3 w-1/2 bg-blueGray-100 rounded animate-pulse"></div>
        </div>
      </div>
    </div>

    <p class="sr-only">{{ label }}</p>
  </div>
</template>

<script>
export default {
  name: "skeleton-list",
  props: {
    /** How many placeholder rows or cards to draw. */
    count: { type: Number, default: 4 },
    /** "rows" for a table or queue, "cards" for a grid. */
    variant: { type: String, default: "rows" },
    /** Read out to a screen reader instead of the empty bars. */
    label: { type: String, default: "Loading" },
  },
  computed: {
    columnClass() {
      return this.variant === "cards" ? "md:w-6/12 xl:w-4/12" : "";
    },
  },
};
</script>
