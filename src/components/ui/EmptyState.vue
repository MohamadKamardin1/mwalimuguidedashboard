<template>
  <!-- A Notus card holding a single centred message. -->
  <div
    class="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded"
  >
    <div class="flex-auto p-8 text-center">
      <div
        class="text-blueGray-300 text-3xl mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-blueGray-100"
      >
        <i :class="icon"></i>
      </div>
      <h3 class="text-blueGray-700 font-bold text-lg mb-1">{{ title }}</h3>
      <p v-if="description" class="text-sm text-blueGray-500 max-w-md mx-auto">
        {{ description }}
      </p>
      <div v-if="$slots.action" class="mt-4">
        <slot name="action" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "app-empty-state",
  props: {
    title: {
      type: String,
      default: "Nothing here yet",
    },
    description: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "fas fa-inbox",
    },
  },
};
</script>
