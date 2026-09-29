<template>
  <div class="flex items-center justify-center py-10" :class="inline ? '' : 'w-full'">
    <div class="flex flex-col items-center">
      <i
        class="fas fa-circle-notch fa-spin text-blueGray-400"
        :class="large ? 'text-3xl' : 'text-xl'"
      ></i>
      <p v-if="label" class="mt-3 text-sm font-semibold text-blueGray-500">
        {{ label }}
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: "app-spinner",
  props: {
    label: {
      type: String,
      default: "Loading…",
    },
    // A bigger glyph for a full-page wait.
    large: {
      type: Boolean,
      default: false,
    },
    // Set when the spinner sits beside other content rather than owning the row.
    inline: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
