<template>
  <!--
    The shell every report wears: who and what it is about at the top, the
    toolbar under it, then the sections.

    It owns the two things no report should have to: the loading and failure
    states, and the print header, which repeats the title on paper because the
    app's own header is not printed.
  -->
  <div class="report-page" :class="{ 'report-landscape': landscape }">
    <!-- Only on paper: a stack of sheets with no title on them is unreadable
         a day later. The foot of every sheet carries the school, this title
         and "Page n of m", all of it from the `@page` margin boxes in
         `index.css`. -->
    <div class="hidden print:block mb-4">
      <h1 class="text-xl font-bold text-blueGray-800">{{ title }}</h1>
      <p class="text-sm text-blueGray-500">
        {{ subtitle }}
        <span v-if="printedOn"> · printed {{ printedOn }}</span>
      </p>
    </div>

    <div v-if="loading" class="w-full">
      <skeleton-list variant="cards" :count="2" :label="`Loading ${title}`" />
      <skeleton-list :count="4" :label="`Loading ${title}`" />
      <p class="text-sm text-blueGray-500 text-center py-2 print:hidden">
        <i class="fas fa-magic mr-1" aria-hidden="true"></i>
        AI is preparing this. It reads every script, so it takes a moment.
      </p>
    </div>

    <empty-state
      v-else-if="error"
      title="Could not load this report"
      :description="error"
      icon="fas fa-exclamation-triangle"
    >
      <template #action>
        <button
          type="button"
          class="h-11 bg-blueGray-800 text-white text-xs font-bold uppercase px-4 rounded shadow"
          @click="$emit('reload')"
        >
          Try again
        </button>
      </template>
    </empty-state>

    <template v-else>
      <div class="w-full mb-4 print:hidden">
        <div class="relative flex flex-col min-w-0 break-words w-full shadow-lg rounded bg-white">
          <div class="px-4 py-4">
            <div class="flex flex-wrap items-start">
              <div class="flex-1 min-w-0 pr-2">
                <h1 class="font-semibold text-xl text-blueGray-700">{{ title }}</h1>
                <p class="text-sm text-blueGray-500 mt-1">{{ subtitle }}</p>
              </div>
              <div class="flex-none"><slot name="header-actions" /></div>
            </div>
          </div>
        </div>
      </div>

      <slot name="toolbar" />
      <slot />
    </template>
  </div>
</template>

<script>
import EmptyState from "@/components/ui/EmptyState.vue";
import SkeletonList from "@/components/ui/SkeletonList.vue";
import { setReportFooter } from "@/lib/reportIO";
import { useAuthStore } from "@/stores/auth";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default {
  name: "report-page",
  components: { EmptyState, SkeletonList },
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    loading: { type: Boolean, default: false },
    error: { type: String, default: "" },
    /** Sets the printed footer's two strings. Defaults to the school on the account. */
    school: { type: String, default: "" },
    /**
     * Print this report sideways. Set by reports whose widest table is the
     * point of them; `printLandscape()` toggles the same class at print time.
     */
    landscape: { type: Boolean, default: false },
  },
  emits: ["reload"],
  computed: {
    printedOn() {
      const now = new Date();
      return `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    },
    schoolName() {
      // The report can name the school it is about; failing that, the account
      // signed in is the school the reader works for.
      if (this.school) return this.school;
      const user = this.auth.user;
      return user && user.school ? user.school.name : "";
    },
  },
  watch: {
    // The footer is read from CSS variables at the moment the dialog opens,
    // so they are kept in step with the report on screen rather than set once.
    schoolName: {
      immediate: true,
      handler() {
        setReportFooter(this.schoolName, this.title);
      },
    },
    title: {
      immediate: true,
      handler() {
        setReportFooter(this.schoolName, this.title);
      },
    },
  },
  setup() {
    return { auth: useAuthStore() };
  },
};
</script>
