<template>
  <div
    v-if="total > pageSize"
    class="px-8 py-4 flex flex-wrap items-center justify-between"
  >
    <span class="text-sm text-blueGray-500">
      Showing {{ first }}-{{ last }} of {{ total }}
    </span>
    <div>
      <button
        type="button"
        class="text-xs font-bold uppercase px-3 py-1 rounded mr-1 ease-linear transition-all duration-150"
        :class="
          page <= 1
            ? 'text-blueGray-300 cursor-not-allowed'
            : 'text-blueGray-700 hover:text-blueGray-500'
        "
        :disabled="page <= 1"
        @click="$emit('change', page - 1)"
      >
        <i class="fas fa-angle-double-left"></i> Previous
      </button>
      <button
        type="button"
        class="text-xs font-bold uppercase px-3 py-1 rounded ease-linear transition-all duration-150"
        :class="
          page >= pageCount
            ? 'text-blueGray-300 cursor-not-allowed'
            : 'text-blueGray-700 hover:text-blueGray-500'
        "
        :disabled="page >= pageCount"
        @click="$emit('change', page + 1)"
      >
        Next <i class="fas fa-angle-double-right"></i>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "app-pagination",
  props: {
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 10 },
    total: { type: Number, default: 0 },
  },
  emits: ["change"],
  computed: {
    pageCount() {
      return Math.max(1, Math.ceil(this.total / this.pageSize));
    },
    first() {
      return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
    },
    last() {
      return Math.min(this.page * this.pageSize, this.total);
    },
  },
};
</script>
