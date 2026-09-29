<template>
  <div class="px-4 pb-4">
    <div class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white">
      <div class="rounded-t mb-0 px-4 py-3 border-0">
        <h3 class="font-semibold text-lg text-blueGray-700">Marking</h3>
        <p class="text-sm text-blueGray-500">
          The model marks each answer against the rubric. You can leave this
          page — it keeps going, and the exam shows up where you left it.
        </p>
      </div>

      <div class="px-4 pb-4">
        <job-progress
          v-if="job"
          :job="job"
          title="Marking answers"
          retry-label="Mark the rest again"
          @retry="retry"
        />

        <p v-else class="text-sm text-blueGray-500 mb-3">
          <i class="fas fa-info-circle mr-2 text-blueGray-400"></i>
          This run was started elsewhere. The counts below still update.
        </p>

        <!-- Live counters -->
        <div class="flex flex-wrap mt-3">
          <div class="w-6/12 md:w-3/12 py-2 px-1">
            <span class="text-xl font-bold block text-blueGray-600">
              {{ markedCount }}<span class="text-blueGray-300">/{{ totalAnswers }}</span>
            </span>
            <span class="text-xs text-blueGray-400">Answers marked</span>
          </div>
          <div class="w-6/12 md:w-3/12 py-2 px-1">
            <span
              class="text-xl font-bold block"
              :class="awaiting ? 'text-amber-600' : 'text-blueGray-600'"
            >
              {{ awaiting }}
            </span>
            <span class="text-xs text-blueGray-400">Need review</span>
          </div>
          <div class="w-6/12 md:w-3/12 py-2 px-1">
            <span
              class="text-xl font-bold block"
              :class="failed.length ? 'text-red-500' : 'text-blueGray-600'"
            >
              {{ failed.length }}
            </span>
            <span class="text-xs text-blueGray-400">Could not be marked</span>
          </div>
        </div>

        <div v-if="failed.length" class="bg-red-50 border-l-4 border-red-400 rounded px-4 py-3 mt-2">
          <p class="text-sm text-red-600 mb-1">
            The model could not mark {{ failed.length }} answer(s). They are in
            the review queue so you can mark them yourself.
          </p>
          <p class="text-xs text-red-500">{{ failed[0].error }}</p>
        </div>
      </div>
    </div>

    <!-- Hand-off -->
    <div
      v-if="finished || awaiting > 0"
      class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white"
    >
      <div class="p-4">
        <template v-if="awaiting > 0">
          <h6 class="font-semibold text-blueGray-700 mb-1">
            {{ awaiting }} answer{{ awaiting === 1 ? "" : "s" }} need your decision
          </h6>
          <p class="text-sm text-blueGray-500 mb-3">
            The model was not sure about these. A few minutes here is what makes
            the marks trustworthy.
          </p>
          <router-link
            :to="{ name: 'teacher-exam-review', params: { id: exam.id } }"
            class="bg-emerald-500 text-white text-sm font-bold uppercase px-5 py-3 rounded shadow hover:shadow-lg inline-block"
          >
            <i class="fas fa-gavel mr-2"></i>Start review
          </router-link>
        </template>

        <template v-else>
          <h6 class="font-semibold text-blueGray-700 mb-1">
            Nothing needed your review
          </h6>
          <p class="text-sm text-blueGray-500 mb-3">
            Every answer was marked confidently. Open the review screen to
            finalise the exam.
          </p>
          <router-link
            :to="{ name: 'teacher-exam-review', params: { id: exam.id } }"
            class="bg-blueGray-800 text-white text-sm font-bold uppercase px-5 py-3 rounded shadow hover:shadow-lg inline-block"
          >
            <i class="fas fa-flag-checkered mr-2"></i>Go to review
          </router-link>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from "vue";

import { gql } from "@/api/client";
import JobProgress from "@/components/teacher/JobProgress.vue";
import { jobFor, rememberJob, useJob } from "@/components/teacher/useJob";
import { toastError } from "@/components/ui/Toast.vue";

const REVIEW_COUNT = `query ($examId: ID!) { reviewQueue(examId: $examId, limit: 1) { total } }`;

const START_MARKING = `mutation ($examId: ID!) { startMarking(examId: $examId) }`;

/** How often the review count is refreshed while marking runs. */
const COUNT_INTERVAL = 3000;

export default {
  name: "exam-step-marking",
  components: { JobProgress },
  props: {
    exam: { type: Object, required: true },
    counts: { type: Object, default: null },
  },
  emits: ["changed"],

  setup(props) {
    // A ref, so a retry can point the same follower at a new job.
    const jobId = ref(jobFor(`exam:${props.exam.id}:marking`));
    const followed = useJob(jobId);

    // Unpacked: `JobProgress` takes plain values, and a ref nested in an
    // object is not unwrapped on the way into props -- it would arrive as the
    // ref, so the card read no status and no progress out of it.
    return {
      jobId,
      job: followed.job,
      jobResult: followed.result,
      jobFinished: computed(() => followed.done.value || followed.failed.value),
      rememberJob,
    };
  },

  data() {
    return { awaiting: 0, poller: null };
  },

  computed: {
    /** The batch job counts one answer at a time as they are marked. */
    result() {
      return this.jobResult || {};
    },
    totalAnswers() {
      return Number(this.result.total || 0);
    },
    markedCount() {
      return Number(this.result.done || 0);
    },
    failed() {
      return this.result.errors || [];
    },
    finished() {
      return this.jobFinished;
    },
  },

  watch: {
    // The queue grows as marking runs, so the parent's counts go stale.
    awaiting(value, previous) {
      if (value !== previous) this.$emit("changed");
    },
    finished(value) {
      if (value) this.$emit("changed");
    },
  },

  async mounted() {
    await this.refreshCount();
    // Kept polling after the job ends too: the queue is what the review screen
    // and the dashboard read, and the teacher may still be working through it.
    this.poller = setInterval(this.refreshCount, COUNT_INTERVAL);
  },

  beforeUnmount() {
    clearInterval(this.poller);
  },

  methods: {
    /** Ask the server to mark whatever is still unmarked. */
    async retry() {
      try {
        const data = await gql(START_MARKING, { examId: this.exam.id });
        rememberJob(`exam:${this.exam.id}:marking`, data.startMarking, {
          examId: this.exam.id,
          step: "marking",
          label: "Marking the answers",
        });
        this.jobId = data.startMarking;
      } catch (error) {
        toastError(error.message);
      }
    },

    async refreshCount() {
      try {
        const data = await gql(REVIEW_COUNT, { examId: this.exam.id });
        this.awaiting = data.reviewQueue.total;
      } catch (error) {
        // A blip should not empty the counter; keep the last known figure.
      }
    },
  },
};
</script>
