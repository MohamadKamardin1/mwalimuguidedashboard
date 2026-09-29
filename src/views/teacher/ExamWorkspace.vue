<template>
  <div class="flex flex-col min-h-full">
    <spinner v-if="loading" large label="Loading exam..." />

    <empty-state
      v-else-if="!exam"
      class="mx-4"
      title="Exam not found"
      :description="error || 'It may have been removed, or belong to another school.'"
      icon="fas fa-file-alt"
    >
      <template #action>
        <router-link
          to="/teacher/exams"
          class="h-11 inline-flex items-center bg-blueGray-800 text-white text-xs font-bold uppercase px-4 rounded shadow"
        >
          Back to my exams
        </router-link>
      </template>
    </empty-state>

    <template v-else>
      <!-- Header -->
      <div class="w-full px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white"
        >
          <div class="px-4 py-4">
            <div class="flex flex-wrap items-start">
              <div class="flex-1 min-w-0 pr-2">
                <div class="flex items-center flex-wrap">
                  <h3 class="font-semibold text-lg text-blueGray-700 mr-2">
                    {{ exam.title }}
                  </h3>
                  <status-badge :status="exam.status" />
                </div>
                <p class="text-sm text-blueGray-500 mt-1">
                  {{ exam.schoolClass.name }} &middot; {{ exam.subject.name }} &middot;
                  {{ exam.term.name }} {{ exam.term.year }} &middot; {{ exam.totalMarks }} marks
                </p>
              </div>

              <div class="flex items-center flex-none mt-2 sm:mt-0">
                <button
                  type="button"
                  class="w-11 h-11 text-blueGray-400 hover:text-blueGray-600"
                  aria-label="Reload this exam"
                  @click="refresh"
                >
                  <i class="fas" :class="refreshing ? 'fa-circle-notch fa-spin' : 'fa-sync-alt'"></i>
                </button>

                <div class="relative">
                  <button
                    type="button"
                    class="w-11 h-11 text-blueGray-400 hover:text-blueGray-600"
                    aria-label="More actions"
                    @click="menuOpen = !menuOpen"
                  >
                    <i class="fas fa-ellipsis-v"></i>
                  </button>

                  <div
                    v-if="menuOpen"
                    class="absolute right-0 mt-1 w-56 bg-white rounded shadow-lg z-50 py-1"
                  >
                    <button
                      type="button"
                      class="w-full text-left px-4 py-3 text-sm text-blueGray-700 hover:bg-blueGray-50"
                      @click="openRename"
                    >
                      <i class="fas fa-pencil-alt mr-2"></i> Edit title
                    </button>
                    <button
                      type="button"
                      class="w-full text-left px-4 py-3 text-sm hover:bg-blueGray-50"
                      :class="canDelete ? 'text-red-600' : 'text-blueGray-300 cursor-not-allowed'"
                      :disabled="!canDelete"
                      :title="canDelete ? 'Delete this draft' : onlyDraftsNote"
                      @click="askDelete"
                    >
                      <i class="fas fa-trash mr-2"></i> Delete draft
                      <span v-if="!canDelete" class="block text-xs text-blueGray-300 mt-1">
                        {{ onlyDraftsNote }}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stepper: across on desktop, a collapsible list on a phone. -->
      <div class="w-full px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white"
        >
          <button
            type="button"
            class="md:hidden w-full flex items-center px-4 py-4 text-left"
            @click="stepsOpen = !stepsOpen"
          >
            <span class="flex-1">
              <span class="text-xs font-bold uppercase text-blueGray-400">Step</span>
              <span class="block font-bold text-blueGray-700">{{ currentStepLabel }}</span>
            </span>
            <i class="fas fa-chevron-down text-blueGray-400" :class="stepsOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
          </button>

          <div v-show="stepsOpen" class="md:hidden px-4 pb-4">
            <button
              v-for="step in steps"
              :key="step.key"
              type="button"
              class="w-full flex items-center py-3 border-b border-blueGray-100 last:border-0 text-left"
              @click="openStep(step)"
            >
              <span
                class="w-8 h-8 rounded-full flex-none inline-flex items-center justify-center text-xs font-bold mr-3"
                :class="dotClass(step)"
              >
                <i v-if="step.state === 'done'" class="fas fa-check"></i>
                <i v-else-if="step.state === 'locked'" class="fas fa-lock"></i>
                <i v-else-if="step.state === 'attention'" class="fas fa-exclamation"></i>
                <template v-else>{{ stepNumber(step) }}</template>
              </span>
              <span class="flex-1 text-sm" :class="step.state === 'locked' ? 'text-blueGray-400' : 'text-blueGray-700 font-bold'">
                {{ step.label }}
              </span>
              <i v-if="step.state === 'current' || step.state === 'attention'" class="fas fa-chevron-right text-blueGray-300"></i>
            </button>
          </div>

          <div class="hidden md:block px-6 py-5 overflow-x-auto">
            <div class="flex items-start min-w-max">
              <div
                v-for="(step, index) in steps"
                :key="step.key"
                class="flex items-start"
              >
                <button
                  type="button"
                  class="flex flex-col items-center w-24"
                  @click="openStep(step)"
                >
                  <span
                    class="w-8 h-8 rounded-full inline-flex items-center justify-center text-xs font-bold"
                    :class="dotClass(step)"
                  >
                    <i v-if="step.state === 'done'" class="fas fa-check"></i>
                    <i v-else-if="step.state === 'locked'" class="fas fa-lock"></i>
                    <i v-else-if="step.state === 'attention'" class="fas fa-exclamation"></i>
                    <template v-else>{{ index + 1 }}</template>
                  </span>
                  <span
                    class="text-xs mt-2 text-center"
                    :class="step.state === 'locked' ? 'text-blueGray-400' : 'text-blueGray-700 font-bold'"
                  >
                    {{ step.label }}
                  </span>
                </button>
                <div
                  v-if="index < steps.length - 1"
                  class="w-12 h-1 mt-4 rounded"
                  :class="index < currentIndex ? 'bg-emerald-500' : 'bg-blueGray-200'"
                ></div>
              </div>
            </div>
          </div>

          <!-- A locked step says why rather than doing nothing. -->
          <div v-if="lockedReason" class="px-4 pb-4">
            <div class="bg-amber-50 border-l-4 border-amber-500 px-4 py-3 rounded">
              <p class="text-sm text-amber-700">
                <i class="fas fa-lock mr-1"></i> {{ lockedReason }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- The step itself -->
      <div class="w-full flex-1">
        <router-view :exam="exam" :counts="counts" @changed="refresh" />
      </div>

      <!--
        Hidden when the teacher is already standing on the step the bar would
        send them to -- the step's own action is then the one action. Kept
        when the recommendation is something the step cannot do itself: an
        outstanding count to act on, or a mutation to run (start marking).
      -->
      <form-modal
        :open="renameOpen"
        title="Rename this exam"
        submit-label="Save"
        busy-label="Saving..."
        :busy="renaming"
        :error="renameError"
        @submit="rename"
        @close="renameOpen = false"
      >
        <form-field
          v-model="renameTitle"
          label="Exam title"
          required
          hint="What the class will call it. The marks are not affected."
        />
      </form-modal>

      <confirm-dialog
        :open="deleteOpen"
        title="Delete this draft?"
        message="The exam, its pages and anything typed into it are removed. This cannot be undone."
        confirm-label="Delete"
        danger
        :busy="deleting"
        @confirm="remove"
        @cancel="deleteOpen = false"
      />

      <next-step-bar
        v-if="!onNextStep || next.mutate || next.variant === 'warning'"
        :label="next.label"
        :description="next.description"
        :action-label="next.actionLabel"
        :on-action="goToNextStep"
        :variant="next.variant"
        :indeterminate="Boolean(next.indeterminate)"
      />
    </template>

    <confirm-dialog
      :open="markingConfirm.open"
      title="Start AI marking"
      :message="markingMessage"
      confirm-label="Start marking"
      :busy="markingConfirm.busy"
      @confirm="startMarking"
      @cancel="markingConfirm.open = false"
    />
  </div>
</template>

<script>
import { gql } from "@/api/client";
import ConfirmDialog from "@/components/crud/ConfirmDialog.vue";
import FormField from "@/components/crud/FormField.vue";
import FormModal from "@/components/crud/FormModal.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import NextStepBar from "@/components/teacher/NextStepBar.vue";
import { currentStep, nextStepFor, stepsFor, STEPS } from "@/components/teacher/examPipeline";
import { rememberJob } from "@/components/teacher/useJob";
import EmptyState from "@/components/ui/EmptyState.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";

// `warnings` is here because the steps read it off the prop this shell hands
// them. GraphQL returns only what is asked for, so a step reading a field the
// shell forgot does not get `undefined` -- it gets no such property, and a
// render error. The note lives out here: a `//` inside the query is a syntax
// error, because GraphQL only knows `#`.
const EXAM = `
  query ($id: ID!) {
    exam(id: $id) {
      id title status totalMarks createdAt
      warnings
      subject { id name }
      schoolClass { id name }
      term { id name year }
      files { id kind }
      questions { id isConfirmed }
    }
  }
`;

const SCRIPTS = `
  query ($examId: ID!) {
    scripts(examId: $examId, limit: 200) { total items { id student { id } } }
  }
`;

const REVIEW_QUEUE = `query ($examId: ID!) { reviewQueue(examId: $examId, limit: 1) { total } }`;

const RENAME = `
  mutation ($id: ID!, $title: String) { updateExam(id: $id, title: $title) { id title } }
`;

const DELETE = `mutation ($id: ID!) { deleteExam(id: $id) }`;

const START_MARKING = `
  mutation ($examId: ID!) {
    startMarking(examId: $examId)
  }
`;

/**
 * A rough seconds-per-script figure for the confirm's estimate.
 *
 * The API returns no estimate, so this is a local guess, worded as one.
 */
const SECONDS_PER_SCRIPT = 20;

export default {
  name: "teacher-exam-workspace",
  components: {
    ConfirmDialog,
    EmptyState,
    FormField,
    FormModal,
    NextStepBar,
    Spinner,
    StatusBadge,
  },
  data() {
    return {
      exam: null,
      loading: true,
      refreshing: false,
      error: "",
      menuOpen: false,
      stepsOpen: false,
      renameOpen: false,
      renameTitle: "",
      renaming: false,
      renameError: "",
      deleteOpen: false,
      deleting: false,
      lockedReason: "",
      counts: { files: 0, unconfirmed: 0, scripts: 0, unmatched: 0, awaiting: 0 },
      // The confirm behind "Start AI marking".
      markingConfirm: { open: false, busy: false },
    };
  },
  computed: {
    examId() {
      return this.$route.params.id;
    },
    steps() {
      return stepsFor(this.exam.status, this.counts);
    },
    currentIndex() {
      return this.steps.findIndex((step) => step.state === "current" || step.state === "attention");
    },
    currentStepLabel() {
      const found = this.steps[this.currentIndex];
      return found ? found.label : "";
    },
    next() {
      return nextStepFor(this.exam, this.counts);
    },
    /**
     * What the confirm says before marking runs.
     *
     * The estimate is computed here: the API does not return one, so it is a
     * rough figure from the script count and is worded as one.
     */
    markingMessage() {
      const total = this.counts.scripts || 0;
      const minutes = Math.max(1, Math.ceil((total * SECONDS_PER_SCRIPT) / 60));
      const roughly = minutes === 1 ? "about a minute" : `about ${minutes} minutes`;
      return `All ${total} script${total === 1 ? "" : "s"} will be marked by the AI, which takes ${roughly}. Every mark is a suggestion you can change during review.`;
    },
    /** Only a draft can go, and only its author's to remove. */
    canDelete() {
      return this.exam.status === "draft";
    },
    onlyDraftsNote() {
      return "Only a draft can be deleted.";
    },
    /** True when the route already showing is the one the bar would open. */
    onNextStep() {
      const step = STEPS.find((item) => item.key === this.next.step);
      return Boolean(step) && this.$route.name === step.route;
    },
  },
  async created() {
    await this.load();
  },
  watch: {
    // Leaving the workspace closes the menu and forgets the last lock message.
    $route() {
      this.menuOpen = false;
      this.lockedReason = "";
    },
  },
  methods: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        const data = await gql(EXAM, { id: this.examId });
        this.exam = data.exam;
        if (!this.exam) return;

        await this.loadCounts();
        this.openDefaultStep();
      } catch (failure) {
        this.error = failure.message;
      } finally {
        this.loading = false;
      }
    },

    /** Re-read the exam and its counts without leaving the page. */
    async refresh() {
      this.refreshing = true;
      try {
        const data = await gql(EXAM, { id: this.examId });
        this.exam = data.exam;
        if (this.exam) await this.loadCounts();
      } catch (failure) {
        this.error = failure.message;
      } finally {
        this.refreshing = false;
      }
    },

    async loadCounts() {
      const [scripts, queue] = await Promise.all([
        gql(SCRIPTS, { examId: this.examId }).catch(() => null),
        gql(REVIEW_QUEUE, { examId: this.examId }).catch(() => null),
      ]);

      const items = scripts ? scripts.scripts.items : [];
      this.counts = {
        files: this.exam.files.length,
        unconfirmed: this.exam.questions.filter((question) => !question.isConfirmed).length,
        scripts: scripts ? scripts.scripts.total : 0,
        unmatched: items.filter((script) => !script.student).length,
        awaiting: queue ? queue.reviewQueue.total : 0,
      };
    },

    /** A bare /teacher/exams/:id opens on whichever step the exam is at. */
    openDefaultStep() {
      if (this.$route.name !== "teacher-exam") return;
      const step = currentStep(this.exam.status);
      this.$router.replace({ name: step.route, params: { id: this.examId } });
    },

    openRename() {
      this.menuOpen = false;
      this.renameTitle = this.exam.title;
      this.renameError = "";
      this.renameOpen = true;
    },

    async rename() {
      const title = this.renameTitle.trim();
      if (!title) {
        this.renameError = "Give the exam a title.";
        return;
      }
      this.renaming = true;
      try {
        await gql(RENAME, { id: this.examId, title });
        this.exam = { ...this.exam, title };
        this.renameOpen = false;
        toastSuccess("Exam renamed.");
        this.$emit("changed");
      } catch (error) {
        this.renameError = error.message;
      } finally {
        this.renaming = false;
      }
    },

    askDelete() {
      if (!this.canDelete) return;
      this.menuOpen = false;
      this.deleteOpen = true;
    },

    async remove() {
      this.deleting = true;
      try {
        await gql(DELETE, { id: this.examId });
        toastSuccess("Draft deleted.");
        this.$router.push({ name: "/teacher/exams" });
      } catch (error) {
        toastError(error.message);
        this.deleteOpen = false;
      } finally {
        this.deleting = false;
      }
    },

    openStep(step) {
      this.menuOpen = false;
      if (step.state === "locked") {
        this.lockedReason = step.reason || "This step is not open yet.";
        return;
      }
      this.lockedReason = "";
      this.$router.push({ name: step.route, params: { id: this.examId } });
    },

    goToNextStep() {
      // A recommendation can be a mutation rather than a step. Marking whole
      // classes of scripts is not reversible, so it is confirmed first.
      if (this.next.mutate === "startMarking") {
        this.markingConfirm = { open: true, busy: false };
        return;
      }
      const step = STEPS.find((item) => item.key === this.next.step);
      if (step) this.$router.push({ name: step.route, params: { id: this.examId } });
    },

    async startMarking() {
      this.markingConfirm.busy = true;
      try {
        const data = await gql(START_MARKING, { examId: this.examId });
        this.rememberMarkingJob(data.startMarking);
        this.markingConfirm.open = false;
        await this.refresh();
        this.$router.push({ name: "teacher-exam-marking", params: { id: this.examId } });
      } catch (failure) {
        toastError(failure.message);
        this.markingConfirm.open = false;
      } finally {
        this.markingConfirm.busy = false;
      }
    },

    rememberMarkingJob(jobId) {
      if (!jobId) return;
      // The marking step picks this up rather than starting a second run.
      rememberJob(`exam:${this.examId}:marking`, jobId, {
        examId: this.examId,
        step: "marking",
        label: "Marking the answers",
      });
    },

    stepNumber(step) {
      return STEPS.findIndex((item) => item.key === step.key) + 1;
    },

    dotClass(step) {
      if (step.state === "done") return "bg-emerald-500 text-white";
      if (step.state === "attention") return "bg-amber-500 text-white";
      if (step.state === "current") return "bg-blueGray-800 text-white";
      // Reachable but not where the exam is: outlined, unlike a locked step.
      if (step.state === "open") return "bg-white text-blueGray-600 border border-solid border-blueGray-300";
      return "bg-blueGray-200 text-blueGray-500";
    },
  },
};
</script>
