<template>
  <div v-if="open" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <div
        class="fixed inset-0 bg-blueGray-800 bg-opacity-60"
        @click="close"
      ></div>

      <div
        class="relative w-full bg-blueGray-100 shadow-xl rounded-lg"
        :class="widthClass"
      >
        <!-- Header -->
        <div class="rounded-t bg-white mb-0 px-6 py-6">
          <div class="flex items-center justify-between">
            <h6 class="text-blueGray-700 text-xl font-bold">{{ title }}</h6>
            <button
              type="button"
              class="text-blueGray-400 hover:text-blueGray-600 text-xl leading-none outline-none focus:outline-none"
              aria-label="Close"
              @click="close"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <form @submit.prevent="$emit('submit')">
          <div class="px-6 py-8">
            <!-- The fields, with any per-field error the API reported. -->
            <slot :errors="mapped.fields" />

            <div
              v-if="mapped.general"
              class="mx-4 mt-2 flex items-start rounded bg-red-100 px-4 py-3"
              role="alert"
            >
              <i class="fas fa-exclamation-circle text-red-500 mt-1 mr-3"></i>
              <p class="text-sm text-red-600">{{ mapped.general }}</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="rounded-b bg-white px-6 py-4 flex justify-end">
            <button
              type="button"
              class="text-blueGray-600 background-transparent font-bold uppercase text-xs px-4 py-2 mr-1 outline-none focus:outline-none ease-linear transition-all duration-150"
              :disabled="busy"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 disabled:opacity-60"
              :class="submitClass"
              :disabled="busy"
            >
              <i
                class="fas mr-1"
                :class="busy ? 'fa-circle-notch fa-spin' : submitIcon"
              ></i>
              {{ busy ? busyLabel : submitLabel }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { mapApiError } from "@/components/crud/errors";

const WIDTHS = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

export default {
  name: "form-modal",
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: "" },
    submitLabel: { type: String, default: "Save" },
    busyLabel: { type: String, default: "Saving..." },
    submitIcon: { type: String, default: "fa-check" },
    width: { type: String, default: "md" },
    busy: { type: Boolean, default: false },
    variant: { type: String, default: "primary" },
    /**
     * Whatever the last submit threw: an ApiError, or a plain string for
     * errors raised before the request was made.
     */
    error: { type: [Object, String], default: null },
  },
  emits: ["submit", "close"],
  computed: {
    mapped() {
      return mapApiError(this.error);
    },
    widthClass() {
      return WIDTHS[this.width] || WIDTHS.md;
    },
    submitClass() {
      return this.variant === "danger"
        ? "bg-red-500 active:bg-red-600"
        : "bg-emerald-500 active:bg-emerald-600";
    },
  },
  methods: {
    close() {
      if (!this.busy) this.$emit("close");
    },
  },
};
</script>
