<template>
  <!--
    What can be done to a report, in one strip.

    Print and CSV are the two ways a teacher gets a report out of the app and
    into a staff meeting. On a phone the strip is too narrow to hold three
    buttons beside a back button and a language picker, so below `sm` the three
    collapse into one menu -- the same actions, one tap deeper, rather than a
    row of buttons that wrap onto two lines and cover the report.
  -->
  <div class="flex flex-wrap items-center gap-2 mb-4 print:hidden">
    <button
      v-if="backTo"
      type="button"
      class="h-11 inline-flex items-center text-blueGray-600 text-xs font-bold uppercase px-3 rounded hover:bg-blueGray-100"
      @click="$router.push(backTo)"
    >
      <i class="fas fa-arrow-left mr-1" aria-hidden="true"></i> {{ backLabel }}
    </button>

    <div class="flex-1"></div>

    <select-field
      v-if="languages"
      v-model="language"
      :options="languages"
      flush
      class="w-36"
      aria-label="Report language"
    />

    <!-- Wide enough for the actions to stand on their own. -->
    <div class="hidden sm:flex flex-wrap items-center gap-2">
      <button
        v-if="share"
        type="button"
        class="h-11 inline-flex items-center bg-blueGray-100 text-blueGray-700 text-xs font-bold uppercase px-4 rounded hover:bg-blueGray-200"
        @click="$emit('share')"
      >
        <i class="fas fa-share-alt mr-1" aria-hidden="true"></i> Share
      </button>

      <button
        type="button"
        class="h-11 inline-flex items-center bg-blueGray-100 text-blueGray-700 text-xs font-bold uppercase px-4 rounded hover:bg-blueGray-200"
        @click="$emit('export')"
      >
        <i class="fas fa-file-csv mr-1" aria-hidden="true"></i> Export CSV
      </button>

      <button
        type="button"
        class="h-11 inline-flex items-center bg-blueGray-800 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg"
        @click="$emit('print')"
      >
        <i class="fas fa-print mr-1" aria-hidden="true"></i> Print
      </button>
    </div>

    <!-- Narrow: everything the strip would have held, behind one button. -->
    <div class="sm:hidden relative">
      <button
        type="button"
        class="h-11 w-11 inline-flex items-center justify-center bg-blueGray-100 text-blueGray-700 rounded hover:bg-blueGray-200"
        aria-haspopup="true"
        :aria-expanded="open ? 'true' : 'false'"
        aria-label="Report actions"
        @click="open = !open"
      >
        <i class="fas fa-ellipsis-h" aria-hidden="true"></i>
      </button>

      <div v-if="open" class="fixed inset-0 z-40" @click="open = false"></div>

      <div
        v-if="open"
        class="absolute right-0 mt-1 z-50 w-48 bg-white rounded shadow-lg border border-blueGray-100 py-1"
        role="menu"
      >
        <button
          v-if="share"
          type="button"
          role="menuitem"
          class="w-full h-11 inline-flex items-center px-4 text-left text-xs font-bold uppercase text-blueGray-700 hover:bg-blueGray-100"
          @click="run('share')"
        >
          <i class="fas fa-share-alt mr-2" aria-hidden="true"></i> Share
        </button>
        <button
          type="button"
          role="menuitem"
          class="w-full h-11 inline-flex items-center px-4 text-left text-xs font-bold uppercase text-blueGray-700 hover:bg-blueGray-100"
          @click="run('export')"
        >
          <i class="fas fa-file-csv mr-2" aria-hidden="true"></i> Export CSV
        </button>
        <button
          type="button"
          role="menuitem"
          class="w-full h-11 inline-flex items-center px-4 text-left text-xs font-bold uppercase text-blueGray-700 hover:bg-blueGray-100"
          @click="run('print')"
        >
          <i class="fas fa-print mr-2" aria-hidden="true"></i> Print
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import SelectField from "@/components/crud/SelectField.vue";

export default {
  name: "report-toolbar",
  components: { SelectField },
  props: {
    /** Where the back button goes. Omit it and there is no back button. */
    backTo: { type: [String, Object], default: null },
    backLabel: { type: String, default: "Back" },
    /** `[{ value, label }]` for the language toggle, or null to hide it. */
    languages: { type: Array, default: null },
    modelValue: { type: String, default: "en" },
    /** Show the share button. Off by default: a link is not always shareable. */
    share: { type: Boolean, default: false },
  },
  emits: ["print", "export", "share", "update:modelValue"],
  data() {
    return { open: false };
  },
  computed: {
    language: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit("update:modelValue", value);
      },
    },
  },
  methods: {
    /** The menu closes behind whatever it started. */
    run(action) {
      this.open = false;
      this.$emit(action);
    },
  },
};
</script>
