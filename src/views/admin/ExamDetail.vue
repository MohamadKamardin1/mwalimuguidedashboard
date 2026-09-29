<template>
  <div class="flex flex-wrap">
    <spinner v-if="loading" large label="Loading exam..." />

    <empty-state
      v-else-if="!exam"
      class="mx-4"
      title="Exam not found"
      :description="loadError || 'It may have been removed, or belong to another school.'"
      icon="fas fa-file-alt"
    >
      <template #action>
        <router-link
          to="/admin/exams"
          class="bg-blueGray-800 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg"
        >
          Back to exams
        </router-link>
      </template>
    </empty-state>

    <template v-else>
      <!-- Header -->
      <div class="w-full px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <div class="flex flex-wrap items-center">
              <div class="relative w-full px-4 max-w-full flex-grow flex-1">
                <div class="flex items-center flex-wrap">
                  <h3 class="font-semibold text-lg text-blueGray-700">
                    {{ exam.title }}
                  </h3>
                  <status-badge class="ml-2" :status="exam.status" />
                </div>
                <p class="text-sm text-blueGray-500 mt-1">
                  {{ exam.subject.name }} &middot; {{ exam.schoolClass.name }} &middot;
                  {{ exam.term.name }} {{ exam.term.year }} &middot;
                  {{ exam.totalMarks }} marks
                </p>
                <p class="text-sm text-blueGray-400 mt-1">
                  Created by {{ teacher }} on {{ longDate(exam.createdAt) }}
                </p>
              </div>
              <div class="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
                <router-link
                  to="/admin/exams"
                  class="text-blueGray-600 font-bold uppercase text-xs px-4 py-2 rounded"
                >
                  <i class="fas fa-arrow-left mr-1"></i> All exams
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pipeline -->
      <div class="w-full px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <h3 class="font-semibold text-lg text-blueGray-700 px-4">
              Pipeline
            </h3>
            <p class="text-sm text-blueGray-500 px-4 mt-1">{{ stepNote }}</p>
          </div>
          <div class="px-8 py-6 overflow-x-auto">
            <!-- Vue 2 cannot key a <template v-for>, so each step and its line
                 are one keyed element. -->
            <div class="flex items-start min-w-max">
              <div
                v-for="(step, index) in steps"
                :key="step"
                class="flex items-start"
              >
                <div class="flex flex-col items-center w-24">
                  <span
                    class="w-8 h-8 rounded-full inline-flex items-center justify-center text-xs font-bold"
                    :class="stepClass(index)"
                  >
                    <i v-if="index < stepIndex" class="fas fa-check"></i>
                    <template v-else>{{ index + 1 }}</template>
                  </span>
                  <span
                    class="text-xs mt-2 text-center"
                    :class="index <= stepIndex ? 'text-blueGray-700 font-bold' : 'text-blueGray-400'"
                  >
                    {{ step }}
                  </span>
                </div>
                <div
                  v-if="index < steps.length - 1"
                  class="w-16 h-1 mt-4 rounded"
                  :class="index < stepIndex ? 'bg-emerald-500' : 'bg-blueGray-200'"
                ></div>
              </div>
            </div>

            <div
              v-if="exam.warnings.length"
              class="mt-6 bg-amber-50 border-l-4 border-amber-500 px-4 py-3 rounded"
            >
              <p class="text-xs font-bold uppercase text-amber-700 mb-1">
                Extraction warnings
              </p>
              <ul class="list-disc list-inside text-sm text-amber-700">
                <li v-for="(warning, index) in exam.warnings" :key="index">
                  {{ warning }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Counts -->
      <div class="w-full md:w-6/12 px-4">
        <stat-card
          label="Scripts"
          :value="scriptTotal"
          icon="fas fa-file-signature"
          icon-color="bg-lightBlue-500"
          hint="Uploaded for this exam"
        />
      </div>
      <div class="w-full md:w-6/12 px-4">
        <stat-card
          label="Needs review"
          :value="reviewCount"
          icon="fas fa-exclamation-circle"
          icon-color="bg-amber-500"
          hint="Answers a teacher still has to look at"
        />
      </div>

      <!-- Class insights, only once the exam is finalized -->
      <div v-if="exam.status === STATUS.FINALIZED" class="w-full px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <h3 class="font-semibold text-lg text-blueGray-700 px-4">
              Class insights
            </h3>
            <p class="text-sm text-blueGray-500 px-4 mt-1">
              What {{ exam.schoolClass.name }} found hard, across every script.
            </p>
          </div>

          <spinner v-if="loadingInsights" :label="'Loading insights...'" />

          <div v-else-if="!insight" class="px-8 pb-8">
            <empty-state
              title="Insights are not ready yet"
              description="They are generated in the background once an exam is finalized. Check back in a moment."
              icon="fas fa-hourglass-half"
            />
          </div>

          <div v-else class="px-8 py-6 flex flex-wrap">
            <div class="w-full lg:w-6/12 px-4 mb-6">
              <h6 class="text-blueGray-400 text-sm font-bold uppercase mb-3">
                Hardest questions
              </h6>
              <p v-if="!hardest.length" class="text-sm text-blueGray-400">
                Nothing stood out.
              </p>
              <ul v-else class="list-none">
                <li
                  v-for="item in hardest"
                  :key="item.number"
                  class="flex items-start mb-3"
                >
                  <span
                    class="bg-blueGray-800 text-white text-xs font-bold rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 flex-none"
                  >
                    {{ item.number }}
                  </span>
                  <span class="text-sm text-blueGray-600">
                    <span v-if="item.average" class="font-bold">
                      Average {{ round(item.average) }}
                    </span>
                    <span v-if="item.average && item.reason"> &middot; </span>
                    <span v-if="item.reason">{{ item.reason }}</span>
                  </span>
                </li>
              </ul>
            </div>

            <div class="w-full lg:w-6/12 px-4 mb-6">
              <h6 class="text-blueGray-400 text-sm font-bold uppercase mb-3">
                Common mistakes
              </h6>
              <p v-if="!mistakes.length" class="text-sm text-blueGray-400">
                Nothing stood out.
              </p>
              <ul v-else class="list-none">
                <li
                  v-for="(item, index) in mistakes"
                  :key="index"
                  class="mb-3 pb-3 border-b border-blueGray-100 last:border-0"
                >
                  <p class="text-sm text-blueGray-600">{{ item.description }}</p>
                  <p class="text-xs text-blueGray-400 mt-1">
                    <span v-if="item.question_numbers && item.question_numbers.length">
                      Q{{ item.question_numbers.join(", Q") }}
                    </span>
                    <span v-if="item.error_type && item.error_type !== 'none'">
                      &middot; {{ item.error_type }}
                    </span>
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { gql } from "@/api/client";
import EmptyState from "@/components/ui/EmptyState.vue";
import Spinner from "@/components/ui/Spinner.vue";
import StatCard from "@/components/crud/StatCard.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";

/**
 * The pipeline as a reader sees it. `extracting` and `needs_confirmation` are
 * both "Extracted" -- one is still running, the other is waiting on a teacher.
 */
const STATUS = {
  DRAFT: "draft",
  EXTRACTING: "extracting",
  NEEDS_CONFIRMATION: "needs_confirmation",
  READY: "ready",
  MARKING: "marking",
  REVIEW: "review",
  FINALIZED: "finalized",
};

const STEPS = ["Draft", "Extracted", "Ready", "Marking", "Review", "Finalized"];

const STEP_INDEX = {
  [STATUS.DRAFT]: 0,
  [STATUS.EXTRACTING]: 1,
  [STATUS.NEEDS_CONFIRMATION]: 1,
  [STATUS.READY]: 2,
  [STATUS.MARKING]: 3,
  [STATUS.REVIEW]: 4,
  [STATUS.FINALIZED]: 5,
};

const STEP_NOTE = {
  [STATUS.DRAFT]: "The paper has been created but no pages have been read yet.",
  [STATUS.EXTRACTING]: "The questions and marking scheme are being read from the uploads.",
  [STATUS.NEEDS_CONFIRMATION]:
    "Extraction finished. A teacher still has to confirm the questions before marking can start.",
  [STATUS.READY]: "Questions are confirmed and the exam is ready for scripts to be marked.",
  [STATUS.MARKING]: "Scripts are being marked.",
  [STATUS.REVIEW]: "Marking finished. Answers the model was unsure about are waiting for a teacher.",
  [STATUS.FINALIZED]: "Every mark is locked and the reports have been produced.",
};

const EXAM = `
  query ($id: ID!) {
    exam(id: $id) {
      id
      title
      status
      totalMarks
      warnings
      createdAt
      subject { id name }
      schoolClass { id name }
      term { id name year }
      createdBy { id firstName lastName email }
    }
  }
`;

const SCRIPTS = `
  query ($examId: ID!) { scripts(examId: $examId, limit: 1) { total } }
`;

// Only the count is read: the queue itself carries student-level detail, and
// this page shows aggregates.
const REVIEW_QUEUE = `
  query ($examId: ID!) { reviewQueue(examId: $examId, limit: 1) { total } }
`;

const CLASS_INSIGHT = `
  query ($examId: ID!) {
    classInsights(examId: $examId) {
      id
      hardestQuestions
      commonMistakes
      language
    }
  }
`;

export default {
  name: "admin-exam-detail",
  components: { EmptyState, Spinner, StatCard, StatusBadge },
  data() {
    return {
      STATUS,
      exam: null,
      loading: true,
      loadError: "",
      scriptTotal: "—",
      reviewCount: "—",
      insight: null,
      loadingInsights: false,
    };
  },
  computed: {
    examId() {
      return this.$route.params.id;
    },
    steps() {
      return STEPS;
    },
    stepIndex() {
      const found = STEP_INDEX[this.exam.status];
      return found === undefined ? 0 : found;
    },
    stepNote() {
      return STEP_NOTE[this.exam.status] || "";
    },
    teacher() {
      const user = this.exam.createdBy;
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
      return name || user.email;
    },
    hardest() {
      return (this.insight && this.insight.hardestQuestions) || [];
    },
    mistakes() {
      return (this.insight && this.insight.commonMistakes) || [];
    },
  },
  created() {
    this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      this.loadError = "";
      try {
        const data = await gql(EXAM, { id: this.examId });
        this.exam = data.exam;
        if (!this.exam) return;
        await Promise.all([this.loadScripts(), this.loadReviewQueue()]);
        if (this.exam.status === STATUS.FINALIZED) await this.loadInsights();
      } catch (error) {
        this.loadError = error.message;
      } finally {
        this.loading = false;
      }
    },

    async loadScripts() {
      try {
        const data = await gql(SCRIPTS, { examId: this.examId });
        this.scriptTotal = data.scripts.total;
      } catch (error) {
        this.scriptTotal = "—";
      }
    },

    async loadReviewQueue() {
      try {
        const data = await gql(REVIEW_QUEUE, { examId: this.examId });
        this.reviewCount = data.reviewQueue.total;
      } catch (error) {
        this.reviewCount = "—";
      }
    },

    async loadInsights() {
      this.loadingInsights = true;
      try {
        const data = await gql(CLASS_INSIGHT, { examId: this.examId });
        this.insight = data.classInsights;
      } catch (error) {
        // The card falls back to its "not ready yet" state.
        this.insight = null;
      } finally {
        this.loadingInsights = false;
      }
    },

    stepClass(index) {
      if (index < this.stepIndex) return "bg-emerald-500 text-white";
      if (index === this.stepIndex) return "bg-blueGray-800 text-white";
      return "bg-blueGray-200 text-blueGray-500";
    },

    round(value) {
      return Number.isInteger(value) ? value : Number(value).toFixed(1);
    },

    longDate(value) {
      if (!value) return "—";
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
    },
  },
};
</script>
