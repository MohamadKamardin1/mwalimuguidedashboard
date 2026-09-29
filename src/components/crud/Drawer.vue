<template>
  <!--
    A panel that slides in from the right, for reading one record without
    leaving the list. Same header/body/footer rhythm as FormModal.
  -->
  <div v-if="open" class="fixed inset-0 z-50 overflow-hidden">
    <div class="absolute inset-0 bg-blueGray-800 bg-opacity-60" @click="close"></div>

    <div
      class="absolute inset-y-0 right-0 w-full bg-blueGray-100 shadow-xl flex flex-col"
      :class="widthClass"
    >
      <div class="bg-white px-6 py-6 flex items-center justify-between">
        <div>
          <h6 class="text-blueGray-700 text-xl font-bold">{{ title }}</h6>
          <p v-if="subtitle" class="text-sm text-blueGray-500 mt-1">
            {{ subtitle }}
          </p>
        </div>
        <button
          type="button"
          class="text-blueGray-400 hover:text-blueGray-600 text-xl leading-none outline-none focus:outline-none"
          aria-label="Close"
          @click="close"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-6">
        <slot />
      </div>

      <div v-if="$slots.footer" class="bg-white px-6 py-4">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script>
const WIDTHS = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

export default {
  name: "app-drawer",
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    width: { type: String, default: "md" },
  },
  emits: ["close"],
  computed: {
    widthClass() {
      return WIDTHS[this.width] || WIDTHS.md;
    },
  },
  methods: {
    close() {
      this.$emit("close");
    },
  },
};
</script>
