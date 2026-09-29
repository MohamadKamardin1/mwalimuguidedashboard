<template>
  <div v-if="open" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4">
      <div
        class="fixed inset-0 bg-blueGray-800 bg-opacity-60"
        @click="cancel"
      ></div>

      <!-- Same shape as the Teachers form: white header strip, body, footer. -->
      <div class="relative w-full max-w-md bg-blueGray-100 shadow-xl rounded-lg">
        <div class="rounded-t bg-white mb-0 px-6 py-6">
          <div class="flex items-center justify-between">
            <h6 class="text-blueGray-700 text-xl font-bold">{{ title }}</h6>
            <button
              type="button"
              class="text-blueGray-400 hover:text-blueGray-600 text-xl leading-none outline-none focus:outline-none"
              aria-label="Close"
              @click="cancel"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div class="px-6 py-6">
          <p class="text-sm text-blueGray-600">{{ message }}</p>
        </div>

        <div class="rounded-b bg-white px-6 py-4 flex justify-end">
          <button
            type="button"
            class="text-blueGray-600 background-transparent font-bold uppercase text-xs px-4 py-2 mr-1 outline-none focus:outline-none ease-linear transition-all duration-150"
            :disabled="busy"
            @click="cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            class="text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 disabled:opacity-60"
            :class="danger ? 'bg-red-500 active:bg-red-600' : 'bg-emerald-500 active:bg-emerald-600'"
            :disabled="busy"
            @click="$emit('confirm')"
          >
            <i
              v-if="busy"
              class="fas fa-circle-notch fa-spin mr-1"
            ></i>
            {{ busy ? "Working..." : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "confirm-dialog",
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: "Are you sure?" },
    message: { type: String, default: "" },
    confirmLabel: { type: String, default: "Confirm" },
    // Red for anything that takes something away.
    danger: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
  },
  emits: ["confirm", "cancel"],
  methods: {
    cancel() {
      if (!this.busy) this.$emit("cancel");
    },
  },
};
</script>
