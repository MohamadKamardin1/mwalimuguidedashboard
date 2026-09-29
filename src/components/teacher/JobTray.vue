<template>
  <!--
    What is working in the background, from anywhere in the app. A teacher who
    starts an extraction and walks to another screen still needs to see it
    finish, and to be able to get back to it.
  -->
  <li class="relative list-none">
    <button
      type="button"
      class="h-11 px-3 flex items-center text-blueGray-400 hover:text-blueGray-600 focus:outline-none focus:ring-2 focus:ring-lightBlue-400 rounded"
      :aria-label="
        count
          ? `${count} job(s) running in the background`
          : 'No jobs running'
      "
      :aria-expanded="open ? 'true' : 'false'"
      @click="toggle"
    >
      <span class="relative">
        <i class="fas fa-circle-notch" :class="count ? 'fa-spin' : ''"></i>
        <span
          v-if="count"
          class="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 inline-flex items-center justify-center"
        >
          {{ count }}
        </span>
      </span>
      <!-- Announced when the tray changes without the teacher opening it. -->
      <span class="sr-only" role="status">{{ liveMessage }}</span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 mt-1 w-72 sm:w-80 bg-white rounded shadow-lg z-50 py-2"
    >
      <p class="px-4 py-2 text-xs font-bold uppercase text-blueGray-400">
        Working in the background
      </p>

      <div v-if="!jobs.length" class="px-4 py-3 text-sm text-blueGray-500">
        Nothing is running. Uploads and AI work show up here while they run.
      </div>

      <div
        v-for="job in jobs"
        :key="job.id"
        class="px-4 py-3 border-t border-blueGray-100"
      >
        <div class="flex flex-wrap items-start">
          <div class="flex-1 min-w-0 pr-2">
            <p class="text-sm font-bold text-blueGray-700">{{ job.label }}</p>
            <p class="text-xs text-blueGray-400 mt-1">{{ stageOf(job) }}</p>
          </div>
          <button
            type="button"
            class="w-8 h-8 text-blueGray-300 hover:text-blueGray-500 flex-none"
            :aria-label="`Stop following ${job.label}`"
            @click="dismiss(job.id)"
          >
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>

        <div class="w-full bg-blueGray-200 rounded-full h-1 mt-2">
          <div
            class="h-1 rounded-full ease-linear transition-all duration-300"
            :class="job.status === 'failed' ? 'bg-red-500' : 'bg-lightBlue-500'"
            :style="{ width: Math.max(3, job.progress || 0) + '%' }"
          ></div>
        </div>

        <router-link
          v-if="routeFor(job)"
          :to="routeFor(job)"
          class="mt-2 h-9 inline-flex items-center text-xs font-bold uppercase text-lightBlue-600 hover:text-lightBlue-800"
          @click="open = false"
        >
          Open the exam <i class="fas fa-arrow-right ml-1"></i>
        </router-link>
      </div>
    </div>
  </li>
</template>

<script>
import { mapState, mapActions } from "pinia";

import { useJobsStore } from "@/stores/jobs";

/** The same words the page's own progress card uses, so the two agree. */
const STAGES = {
  process_exam_files: "Preparing the pages",
  extract_exam: "Reading the paper and scheme",
  extract_scripts: "Reading the scripts",
  mark_exam: "Marking the answers",
  build_insights: "Writing the reports",
};

export default {
  name: "job-tray",
  computed: {
    ...mapState(useJobsStore, ["jobs", "open", "count"]),
    liveMessage() {
      if (!this.jobs.length) return "";
      return this.jobs
        .map((job) => `${job.label}: ${this.stageOf(job)}`)
        .join(". ");
    },
  },
  created() {
    this.start();
  },
  beforeUnmount() {
    this.stop();
  },
  methods: {
    ...mapActions(useJobsStore, ["start", "stop", "toggle", "dismiss", "routeFor"]),

    stageOf(job) {
      if (job.status === "failed") return "Did not finish";
      const named = STAGES[job.jobType];
      const percent = Math.max(0, Math.min(100, job.progress || 0));
      return named ? `${named} — ${percent}%` : `Working — ${percent}%`;
    },
  },
};
</script>
