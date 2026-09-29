<template>
  <!-- Pinned to the top edge, above the sidebar (z-50), never over the navbar. -->
  <div
    v-if="toasts.length"
    class="fixed top-0 inset-x-0 z-50 flex flex-col items-center gap-2 p-4 pointer-events-none"
    style="padding-top: calc(1rem + env(safe-area-inset-top))"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="pointer-events-auto w-full max-w-md flex items-start gap-3 rounded shadow-lg px-4 py-3 text-white"
      :class="toast.kind === 'error' ? 'bg-red-500' : 'bg-emerald-500'"
      role="status"
    >
      <i
        class="mt-0.5 text-sm"
        :class="toast.kind === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'"
      ></i>
      <p class="flex-1 text-sm font-semibold">
        {{ toast.message }}
        <!-- A job that finished somewhere else is only useful with a way
             to get there. -->
        <router-link
          v-if="toast.action"
          :to="toast.action.to"
          class="ml-2 underline font-bold whitespace-nowrap"
          @click="dismiss(toast.id)"
        >
          {{ toast.action.label }}
        </router-link>
      </p>
      <button
        type="button"
        class="opacity-75 hover:opacity-100"
        aria-label="Dismiss"
        @click="dismiss(toast.id)"
      >
        <i class="fas fa-times text-sm"></i>
      </button>
    </div>
  </div>
</template>

<script>
import { reactive } from "vue";

/**
 * A single toast queue shared by the whole app. Call the helpers from
 * anywhere -- components, stores, the router -- with no provider to set up:
 *
 *   import { toastError } from "@/components/ui/Toast.vue";
 *   toastError("Could not save that.");
 *
 * Every toast clears itself; errors stay a little longer because they ask the
 * reader to do something.
 */
const toasts = reactive([]);

let nextId = 0;

function push(kind, message, timeout, action = null) {
  const id = nextId++;
  toasts.push({ id, kind, message, action });
  setTimeout(() => {
    const index = toasts.findIndex((toast) => toast.id === id);
    if (index !== -1) toasts.splice(index, 1);
  }, timeout);
  return id;
}

export function toastSuccess(message, timeout = 3000, action = null) {
  return push("success", message, timeout, action);
}

export function toastError(message, timeout = 6000, action = null) {
  return push("error", message, timeout, action);
}

export function dismiss(id) {
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index !== -1) toasts.splice(index, 1);
}

export default {
  name: "app-toast",
  setup() {
    return { toasts, dismiss };
  },
};
</script>
