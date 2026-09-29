<template>
  <!--
    The one place a running ProcessingJob is drawn. Takes the object `useJob`
    hands back, so a page never re-draws a bar or re-reads a status itself.
  -->
  <div
    class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
  >
    <div class="rounded-t mb-0 px-4 py-3 border-0">
      <div class="flex flex-wrap items-center">
        <div class="relative w-full px-4 max-w-full flex-grow flex-1">
          <h3 class="font-semibold text-lg text-blueGray-700">{{ title }}</h3>
          <p v-if="job" class="text-sm text-blueGray-500 mt-1">{{ statusLine }}</p>
        </div>
        <div class="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
          <ai-chip v-if="ai" class="mr-2" />
          <status-badge :status="badge.status" :label="badge.label" />
        </div>
      </div>
    </div>

    <div class="px-8 py-6">
      <div v-if="failed" class="bg-red-50 border-l-4 border-red-500 px-4 py-3 rounded mb-4">
        <p class="text-sm font-bold text-red-700">
          {{ ai ? "The AI could not finish this." : "This did not finish." }}
        </p>
        <p class="text-sm text-red-600 mt-1">{{ reason }}</p>
        <p v-if="job && job.error" class="text-xs text-red-400 mt-1 break-words">
          {{ job.error }}
        </p>
        <button
          v-if="retryLabel"
          type="button"
          class="mt-3 h-11 bg-red-500 text-white text-xs font-bold uppercase px-4 rounded shadow hover:bg-red-600"
          @click="$emit('retry')"
        >
          <i class="fas fa-redo mr-1"></i> {{ retryLabel }}
        </button>
      </div>

      <div class="w-full bg-blueGray-200 rounded-full h-2 mb-2">
        <div
          class="h-2 rounded-full ease-linear transition-all duration-300"
          :class="failed ? 'bg-red-500' : done ? 'bg-emerald-500' : 'bg-lightBlue-500'"
          :style="{ width: barWidth }"
        ></div>
      </div>

      <div class="flex flex-wrap items-center justify-between">
        <p class="text-xs text-blueGray-500">{{ progress }}%</p>
        <p v-if="running" class="text-xs text-blueGray-400">
          <i class="fas fa-circle-notch fa-spin mr-1" aria-hidden="true"></i>
          {{ stage || (ai ? "AI is preparing this — you can leave this page." : "Working — you can leave this page.") }}
        </p>
      </div>

      <!-- Whatever the job produced, drawn by the page that knows its shape. -->
      <div v-if="done" class="mt-4">
        <slot :result="result" />
      </div>
    </div>
  </div>
</template>

<script>
import StatusBadge from "@/components/crud/StatusBadge.vue";
import AiChip from "@/components/teacher/AiChip.vue";
import { plainReason } from "@/stores/jobs";

const LABELS = {
  uploaded: "Queued",
  processing: "Running",
  needs_review: "Needs review",
  done: "Done",
  failed: "Failed",
};

export default {
  name: "job-progress",
  components: { AiChip, StatusBadge },
  props: {
    /** The object from `useJob`: { status, progress, error, result, jobType }. */
    job: { type: Object, default: null },
    title: { type: String, default: "Working" },
    /** What the job is doing right now, in the caller's own words. */
    stage: { type: String, default: "" },
    /** True when a model is doing the work, so the AI chip and wording apply. */
    ai: { type: Boolean, default: true },
    /** Shown on a retry button when the job fails. Empty hides the button. */
    retryLabel: { type: String, default: "" },
  },
  emits: ["retry"],
  computed: {
    status() {
      return (this.job && this.job.status) || "";
    },
    progress() {
      return (this.job && this.job.progress) || 0;
    },
    result() {
      return this.job ? this.job.result : null;
    },
    running() {
      return ["uploaded", "processing"].includes(this.status);
    },
    done() {
      return this.status === "done";
    },
    failed() {
      return this.status === "failed";
    },
    barWidth() {
      // A job with no progress figure still shows movement while it runs.
      if (this.done) return "100%";
      return `${Math.max(0, Math.min(100, this.progress))}%`;
    },
    /** The failure, said so a teacher knows what to do about it. */
    reason() {
      return plainReason(this.job || {});
    },
    statusLine() {
      if (this.failed) return "Something went wrong.";
      if (this.done) return "Finished.";
      return LABELS[this.status] || "Waiting to start.";
    },
    badge() {
      if (this.failed) return { status: "failed", label: "Failed" };
      if (this.done) return { status: "done", label: "Done" };
      if (this.status === "needs_review") return { status: "warning", label: "Needs review" };
      if (this.running) return { status: "current", label: "Running" };
      return { status: "pending", label: "Queued" };
    },
  },
};
</script>
