<template>
  <!-- A Notus card, flagged amber because the contents are unrecoverable. -->
  <div
    class="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded border-l-4 border-amber-500"
  >
    <div class="p-5">
      <div class="flex items-start">
        <div class="text-amber-500 text-xl mr-3 mt-1">
          <i class="fas fa-key"></i>
        </div>
        <div class="flex-1">
          <h6 class="font-bold text-blueGray-700">{{ title }}</h6>
          <p class="text-sm text-blueGray-600 mt-1">
            Give this password to
            <span class="font-semibold">{{ email }}</span>.
            <span class="font-bold text-amber-700">
              It will not be shown again.
            </span>
          </p>

          <div class="mt-3 flex flex-wrap items-center">
            <code
              class="bg-blueGray-100 text-blueGray-800 px-3 py-2 rounded text-base font-bold tracking-wider select-all"
              >{{ password }}</code
            >
            <button
              type="button"
              class="ml-2 bg-blueGray-800 text-white active:bg-blueGray-600 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none ease-linear transition-all duration-150"
              @click="copy"
            >
              <i class="fas" :class="copied ? 'fa-check' : 'fa-copy'"></i>
              {{ copied ? "Copied" : "Copy" }}
            </button>
          </div>

          <p class="text-xs text-blueGray-500 mt-3">
            They will be asked to choose their own password the first time they
            sign in.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { toastError } from "@/components/ui/Toast.vue";

export default {
  name: "one-time-secret-panel",
  props: {
    title: {
      type: String,
      default: "Temporary password",
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  data() {
    return { copied: false };
  },
  methods: {
    async copy() {
      try {
        await navigator.clipboard.writeText(this.password);
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      } catch (error) {
        // The clipboard API needs a secure context; tell the user to copy by
        // hand rather than pretending it worked.
        toastError(
          "The browser blocked the clipboard. Select the password and copy it by hand."
        );
      }
    },
  },
};
</script>
