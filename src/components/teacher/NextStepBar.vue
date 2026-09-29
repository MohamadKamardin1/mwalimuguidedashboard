<template>
  <!--
    One recommended action, pinned to the bottom of a workspace so it is
    reachable without scrolling back. Every exam step ends with one of these
    rather than a row of equally-weighted buttons.
  -->
  <div
    v-if="label || actionLabel"
    class="sticky bottom-0 z-40 pt-3 pb-3 -mx-4 px-4 bg-blueGray-100 bg-opacity-95 border-t border-blueGray-200"
    style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))"
  >
    <div class="flex flex-wrap items-center">
      <div class="w-full md:flex-1 md:pr-4 mb-3 md:mb-0">
        <p class="text-sm font-bold" :class="tone.text">{{ label }}</p>
        <p v-if="description" class="text-sm text-blueGray-500 mt-1">
          {{ description }}
        </p>
      </div>

      <!-- A background step has nothing to press, so it shows a wait instead. -->
      <div v-if="indeterminate" class="w-full md:w-48">
        <div class="w-full bg-blueGray-300 rounded-full h-1">
          <div class="bg-lightBlue-500 h-1 rounded-full w-full animate-pulse"></div>
        </div>
      </div>

      <div class="w-full md:w-auto">
        <button
          v-if="actionLabel"
          type="button"
          :disabled="busy"
          class="w-full md:w-auto h-11 text-white text-xs font-bold uppercase px-5 rounded shadow hover:shadow-lg outline-none focus:outline-none disabled:opacity-60 ease-linear transition-all duration-150"
          :class="tone.button"
          @click="run"
        >
          <i v-if="busy" class="fas fa-circle-notch fa-spin mr-1"></i>
          <i v-else-if="icon" class="fas mr-1" :class="icon"></i>
          {{ busy ? busyLabel : actionLabel }}
        </button>

        <button
          v-if="secondaryLabel"
          type="button"
          class="w-full md:w-auto h-11 text-blueGray-600 text-xs font-bold uppercase px-4 mt-2 md:mt-0 md:ml-2 rounded"
          @click="$emit('secondary')"
        >
          {{ secondaryLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * The bar's mood, not its content: a step that unblocks marking is `primary`,
 * one that wants a decision is `warning`, and `danger` is for locking things.
 */
const VARIANTS = {
  primary: { text: "text-blueGray-700", button: "bg-emerald-500 active:bg-emerald-600" },
  info: { text: "text-blueGray-700", button: "bg-lightBlue-500 active:bg-lightBlue-600" },
  warning: { text: "text-amber-700", button: "bg-amber-500 active:bg-amber-600" },
  success: { text: "text-emerald-700", button: "bg-emerald-500 active:bg-emerald-600" },
  danger: { text: "text-red-700", button: "bg-red-500 active:bg-red-600" },
};

export default {
  name: "next-step-bar",
  props: {
    /** The one thing to do next, in a few words. */
    label: { type: String, default: "" },
    /** Why it matters, or what happens when it is done. */
    description: { type: String, default: "" },
    actionLabel: { type: String, default: "" },
    /** Called on click. The bar does not decide what the step is. */
    onAction: { type: Function, default: null },
    variant: { type: String, default: "primary" },
    icon: { type: String, default: "" },
    /** Shows a spinner and blocks a second click. */
    busy: { type: Boolean, default: false },
    busyLabel: { type: String, default: "Working..." },
    /** An optional quieter way out, e.g. "Skip for now". */
    secondaryLabel: { type: String, default: "" },
    /**
     * True while a background step runs with no measurable percentage. Shows a
     * waiting bar rather than an invented one.
     */
    indeterminate: { type: Boolean, default: false },
  },
  emits: ["secondary"],
  computed: {
    /** `variant` is the prop; the resolved palette is `tone`. */
    tone() {
      return VARIANTS[this.variant] || VARIANTS.primary;
    },
  },
  methods: {
    run() {
      if (this.onAction && !this.busy) this.onAction();
    },
  },
};
</script>
