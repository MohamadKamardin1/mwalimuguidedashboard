<template>
  <div class="px-2 sm:px-4 pb-40">
    <!-- Top bar -->
    <div
      class="sticky top-0 z-20 bg-blueGray-100 pt-2 pb-2"
      style="padding-top: calc(0.5rem + env(safe-area-inset-top))"
    >
      <div class="bg-white rounded shadow p-3">
        <div class="flex flex-wrap items-center justify-between mb-2">
          <div>
            <h3 class="font-semibold text-blueGray-700">
              {{ progressLabel }}
            </h3>
            <p class="text-xs text-blueGray-400">
              {{ queue.length }} in the queue · {{ highConfidenceCount }} confident
            </p>
          </div>
          <div class="flex items-center">
            <button
              type="button"
              class="text-xs font-bold uppercase px-3 py-2 rounded mr-1"
              :class="showTable ? 'bg-blueGray-800 text-white' : 'bg-blueGray-100 text-blueGray-600'"
              @click="showTable = !showTable"
            >
              <i class="fas fa-list mr-1"></i>All answers
            </button>
            <button
              v-if="highConfidenceCount"
              type="button"
              class="bg-emerald-500 text-white text-xs font-bold uppercase px-3 py-2 rounded shadow"
              @click="confirmAll.open = true"
            >
              Accept all confident ({{ highConfidenceCount }})
            </button>
          </div>
        </div>

        <div class="flex flex-wrap">
          <button
            v-for="chip in filters"
            :key="chip.key"
            type="button"
            class="text-xs font-bold uppercase px-3 py-2 rounded mr-1 mb-1"
            :class="filter === chip.key ? 'bg-blueGray-800 text-white' : 'bg-blueGray-100 text-blueGray-600'"
            @click="setFilter(chip.key)"
          >
            {{ chip.label }}
            <span class="text-blueGray-300">{{ chip.count }}</span>
          </button>
        </div>
      </div>
    </div>

    <spinner v-if="loading" large label="Loading the review queue..." />

    <div v-else-if="error" class="w-full">
      <empty-state
        title="Could not load the review queue"
        :description="error"
        icon="fas fa-exclamation-triangle"
      />
    </div>

    <!-- Cleared -->
    <div v-else-if="!queue.length" class="w-full">
      <empty-state
        title="Every answer has a mark"
        :description="`Nothing is waiting for you. ${exam.title} is ready to be finalised, which locks the marks and builds the class insights.`"
        icon="fas fa-check-circle"
      >
        <template #action>
          <button
            type="button"
            class="bg-emerald-500 text-white text-sm font-bold uppercase px-5 py-3 rounded shadow hover:shadow-lg"
            @click="confirmFinalize.open = true"
          >
            <i class="fas fa-flag-checkered mr-2"></i>Finalize exam
          </button>
        </template>
      </empty-state>
    </div>

    <!-- Nothing matches the filter -->
    <div v-else-if="!filtered.length" class="w-full">
      <empty-state
        title="Nothing in this filter"
        :description="`The queue has ${queue.length} item(s), but none match this filter.`"
        icon="fas fa-filter"
      >
        <template #action>
          <button
            type="button"
            class="bg-blueGray-800 text-white text-sm font-bold uppercase px-5 py-3 rounded shadow"
            @click="setFilter('all')"
          >
            Show all
          </button>
        </template>
      </empty-state>
    </div>

    <!-- Table view: jump anywhere -->
    <div v-else-if="showTable" class="bg-white rounded shadow overflow-x-auto">
      <table class="items-center w-full bg-transparent border-collapse">
        <thead>
          <tr>
            <th
              v-for="head in ['Student', 'Question', 'Marks', 'Why', 'Status']"
              :key="head"
              class="px-4 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100"
            >
              {{ head }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, position) in filtered"
            :key="item.answerId"
            class="cursor-pointer hover:bg-blueGray-50"
            @click="jumpTo(position)"
          >
            <td class="border-t-0 px-4 py-3 text-sm text-blueGray-700">
              {{ item.studentName }}
            </td>
            <td class="border-t-0 px-4 py-3 text-sm text-blueGray-600">
              {{ item.questionNumber }}
            </td>
            <td class="border-t-0 px-4 py-3 text-sm text-blueGray-600">
              {{ formatMark(item.awardedMarks) }} / {{ item.maxMarks }}
            </td>
            <td class="border-t-0 px-4 py-3 text-xs text-blueGray-500">
              {{ concern(item) }}
            </td>
            <td class="border-t-0 px-4 py-3">
              <confidence-badge :value="item.confidence" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- One answer at a time -->
    <template v-else>
      <div :key="current.answerId" class="review-card">
        <!-- Question -->
        <div class="bg-white rounded shadow p-4 mb-3">
          <p class="text-xs uppercase font-bold text-blueGray-400 mb-1">
            {{ current.studentName }} · Question {{ current.questionNumber }}
            · {{ current.maxMarks }} mark{{ current.maxMarks === 1 ? "" : "s" }}
          </p>
          <math-text :text="current.questionText" class="text-blueGray-700 text-sm block" />
        </div>

        <!-- Answer: image beside transcription -->
        <div class="flex flex-wrap">
          <div class="w-full lg:w-7/12 mb-3">
            <div class="bg-white rounded shadow p-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs uppercase font-bold text-blueGray-400">
                  What they wrote
                </span>
                <span class="flex items-center">
                  <button
                    type="button"
                    class="text-blueGray-500 px-3 py-3"
                    aria-label="Zoom out"
                    @click="zoomBy(-0.25)"
                  >
                    <i class="fas fa-search-minus"></i>
                  </button>
                  <span class="text-xs text-blueGray-500 w-10 text-center">
                    {{ Math.round(zoom * 100) }}%
                  </span>
                  <button
                    type="button"
                    class="text-blueGray-500 px-3 py-3"
                    aria-label="Zoom in"
                    @click="zoomBy(0.25)"
                  >
                    <i class="fas fa-search-plus"></i>
                  </button>
                </span>
              </div>

              <div
                class="overflow-hidden bg-blueGray-100 rounded select-none"
                :style="{ height: imageHeight, touchAction: 'none' }"
                @pointerdown="startPan"
                @pointermove="movePan"
                @pointerup="endPan"
                @pointerleave="endPan"
              >
                <img
                  v-if="currentPage"
                  :src="currentPage"
                  alt=""
                  class="block mx-auto"
                  :style="imageStyle"
                  draggable="false"
                />
              </div>
              <p class="text-xs text-blueGray-400 mt-1">
                Drag to move, use the buttons to zoom.
                <template v-if="current.pageUrls.length > 1">
                  Page {{ pageIndex + 1 }} of {{ current.pageUrls.length }}.
                </template>
              </p>
            </div>
          </div>

          <div class="w-full lg:w-5/12 mb-3">
            <div class="bg-white rounded shadow p-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs uppercase font-bold text-blueGray-400">
                  What the AI read
                </span>
                <button
                  type="button"
                  class="text-xs font-bold uppercase px-2 py-2"
                  :class="currentFlagged ? 'text-red-500' : 'text-blueGray-500'"
                  :title="currentFlagged ? 'Flagged — read the image' : 'Flag a misread'"
                  @click="flagTranscription"
                >
                  <i class="fas fa-flag mr-1"></i>
                  {{ currentFlagged ? "Flagged" : "Transcription is wrong" }}
                </button>
              </div>

              <math-text
                v-if="current.transcribedText"
                :text="current.transcribedText"
                class="text-blueGray-700 text-sm block"
              />
              <p v-else class="text-sm text-blueGray-400">
                Nothing was read from this answer.
              </p>

              <div v-if="current.workingSteps && current.workingSteps.length" class="mt-3">
                <h6 class="text-xs uppercase font-bold text-blueGray-400 mb-1">Working</h6>
                <math-text
                  v-for="(step, i) in current.workingSteps"
                  :key="i"
                  :text="step"
                  class="text-sm text-blueGray-600 block"
                />
              </div>

              <p v-if="currentFlagged" class="text-xs text-red-500 mt-2">
                Flagged as misread. The reading is not saved back to the server,
                so mark from the image itself.
              </p>
            </div>
          </div>
        </div>

        <!-- AI panel -->
        <div class="mb-3">
          <mark-panel
            :item="current"
            :rubric="rubricForCurrent"
            :marks="marks"
            :busy="busy"
            @update:marks="onRubricChange"
          />
        </div>

        <!-- Override stepper -->
        <div v-if="showOverride" class="bg-white rounded shadow p-4 mb-3">
          <h6 class="text-xs uppercase font-bold text-blueGray-500 mb-2">
            Your mark
          </h6>
          <div class="flex items-center mb-3">
            <button
              type="button"
              class="bg-blueGray-100 text-blueGray-700 text-xl font-bold w-12 h-12 rounded"
              aria-label="One mark less"
              @click="stepMarks(-1)"
            >
              −
            </button>
            <span class="text-2xl font-bold text-blueGray-700 w-20 text-center">
              {{ formatMark(marks) }}
            </span>
            <button
              type="button"
              class="bg-blueGray-100 text-blueGray-700 text-xl font-bold w-12 h-12 rounded"
              aria-label="One mark more"
              @click="stepMarks(1)"
            >
              +
            </button>
            <span class="text-blueGray-400 ml-2">/ {{ current.maxMarks }}</span>
          </div>
          <input
            v-model="reason"
            type="text"
            placeholder="Why are you changing it? (optional)"
            class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
          />
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap">
          <!--
            Only where there is a mark to accept. An answer the model has not
            reached yet -- marking is per answer and runs for a while -- is in
            this queue because it has no final mark, not because it is waiting
            to be reviewed. Accepting it fails with "this answer has not been
            marked yet", so the button is not offered.
          -->
          <button
            v-if="wasMarked"
            type="button"
            class="flex-1 min-w-half bg-emerald-500 text-white text-sm font-bold uppercase px-5 py-4 rounded shadow hover:shadow-lg mr-2 mb-2 disabled:opacity-50"
            :disabled="busy"
            @click="accept"
          >
            <i class="fas fa-check mr-2"></i>Accept
            <span class="block text-xs font-normal normal-case opacity-75">(Enter)</span>
          </button>

          <button
            type="button"
            class="flex-1 min-w-half text-sm font-bold uppercase px-5 py-4 rounded shadow mr-2 mb-2 disabled:opacity-50"
            :class="showOverride ? 'bg-blueGray-800 text-white' : 'bg-blueGray-200 text-blueGray-700'"
            :disabled="busy"
            @click="toggleOverride"
          >
            <i class="fas fa-pen mr-2"></i>Override
          </button>

          <button
            v-if="showOverride"
            type="button"
            class="flex-1 min-w-half bg-blueGray-800 text-white text-sm font-bold uppercase px-5 py-4 rounded shadow mr-2 mb-2 disabled:opacity-50"
            :disabled="busy"
            @click="override"
          >
            <i class="fas fa-save mr-2"></i>Save mark
          </button>

          <button
            type="button"
            class="flex-1 min-w-half bg-blueGray-200 text-blueGray-700 text-sm font-bold uppercase px-5 py-4 rounded shadow mr-2 mb-2 disabled:opacity-50"
            :disabled="busy"
            @click="skip"
          >
            <i class="fas fa-forward mr-2"></i>Skip
            <span class="block text-xs font-normal normal-case opacity-75">(N)</span>
          </button>
        </div>

        <p class="text-xs text-blueGray-400">
          Keyboard: Enter accepts · ↑ ↓ change the mark · N next · P previous
          <template v-if="index > 0"> · Backspace goes back</template>
        </p>
      </div>
    </template>

    <!-- Undo -->
    <div v-if="undo" class="fixed bottom-4 left-0 right-0 z-30 flex justify-center px-4">
      <div class="bg-blueGray-800 text-white rounded shadow-lg px-4 py-3 flex items-center max-w-lg">
        <span class="text-sm mr-4">{{ undo.label }}</span>
        <button
          type="button"
          class="text-emerald-300 hover:text-emerald-200 text-xs font-bold uppercase px-3 py-2"
          @click="runUndo"
        >
          Undo
        </button>
      </div>
    </div>

    <confirm-dialog
      :open="confirmAll.open"
      title="Accept every confident answer"
      :message="`${highConfidenceCount} answer(s) the model was sure about will be accepted as marked. You can still change any of them afterwards.`"
      confirm-label="Accept them"
      :busy="confirmAll.busy"
      @confirm="acceptAll"
      @cancel="confirmAll.open = false"
    />

    <confirm-dialog
      :open="confirmFinalize.open"
      title="Finalize the exam"
      :message="`Every mark is locked and the class insights are built. This cannot be undone.`"
      confirm-label="Finalize"
      :busy="confirmFinalize.busy"
      @confirm="finalize"
      @cancel="confirmFinalize.open = false"
    />
  </div>
</template>

<script>
import { gql } from "@/api/client";
import ConfirmDialog from "@/components/crud/ConfirmDialog.vue";
import ConfidenceBadge from "@/components/teacher/ConfidenceBadge.vue";
import MathText from "@/components/teacher/MathText.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";

import MarkPanel from "./review/MarkPanel.vue";

const QUEUE = `
  query ReviewQueue($examId: ID!, $limit: Int!) {
    reviewQueue(examId: $examId, limit: $limit) {
      total
      items {
        answerId
        scriptId
        studentName
        questionNumber
        questionText
        maxMarks
        transcribedText
        workingSteps
        finalAnswer
        isBlank
        legibilityScore
        pageUrls
        awardedMarks
        confidence
        errorType
        reasoning
        rubricBreakdown
        errorCarriedForward
      }
    }
  }
`;

const QUESTIONS = `
  query Questions($examId: ID!) {
    questions(examId: $examId) {
      id
      number
      rubricItems { id description marks kind order }
    }
  }
`;

const ACCEPT = `mutation ($answerId: ID!) { acceptMark(answerId: $answerId) { id marks } }`;

const OVERRIDE = `
  mutation ($answerId: ID!, $marks: Float!, $reason: String!) {
    overrideMark(answerId: $answerId, marks: $marks, reason: $reason) { id marks }
  }
`;

const ACCEPT_ALL = `mutation ($examId: ID!) { acceptAllHighConfidence(examId: $examId) }`;

const FINALIZE = `mutation ($examId: ID!) { finalizeExam(examId: $examId) { id status } }`;

const QUEUE_LIMIT = 200;
/** CLAUDE.md's green band: at or above this the model was sure. */
const CONFIDENT = 0.8;
/** Below this the model was guessing. */
const LOW_CONFIDENCE = 0.5;
/** The reason stored when the teacher does not give one, since the API wants one. */
const DEFAULT_REASON = "Changed by the teacher during review.";
/** How long the undo bar stays up. */
const UNDO_MS = 5000;

export default {
  name: "exam-step-review",
  components: { ConfirmDialog, ConfidenceBadge, MathText, EmptyState, Spinner, MarkPanel },
  props: {
    exam: { type: Object, required: true },
    counts: { type: Object, default: null },
  },
  emits: ["changed"],

  data() {
    return {
      queue: [],
      rubricByNumber: new Map(),
      loading: true,
      error: "",
      busy: false,
      filter: "all",
      index: 0,
      marks: null,
      reason: "",
      showOverride: false,
      showTable: false,
      flagged: new Set(),
      pageIndex: 0,
      zoom: 1,
      pan: { x: 0, y: 0 },
      panning: null,
      undo: null,
      undoTimer: null,
      confirmAll: { open: false, busy: false },
      confirmFinalize: { open: false, busy: false },
    };
  },

  computed: {
    filtered() {
      if (this.filter === "all") return this.queue;
      return this.queue.filter((item) => this.matches(item, this.filter));
    },
    current() {
      return this.filtered[this.index] || null;
    },
    currentPage() {
      if (!this.current) return null;
      return this.current.pageUrls[this.pageIndex] || null;
    },
    rubricForCurrent() {
      return (this.current && this.rubricByNumber.get(this.current.questionNumber)) || [];
    },
    progressLabel() {
      if (!this.filtered.length) return "Nothing to review";
      return `${this.index + 1} of ${this.filtered.length} to review`;
    },
    highConfidenceCount() {
      return this.queue.filter((item) => (item.confidence || 0) >= CONFIDENT).length;
    },
    filters() {
      return [
        { key: "all", label: "All", count: this.queue.length },
        { key: "low", label: "Low confidence", count: this.countMatching("low") },
        { key: "illegible", label: "Illegible", count: this.countMatching("illegible") },
        { key: "conceptual", label: "Conceptual errors", count: this.countMatching("conceptual") },
      ];
    },
    /** Whether the answer on screen is the one flagged as misread. */
    currentFlagged() {
      return Boolean(this.current) && this.flagged.has(this.current.answerId);
    },
    imageHeight() {
      // Reading the image is the fallback when the reading is wrong, so it gets
      // more room then. Touch target stays well past 44px either way.
      return this.currentFlagged ? "60vh" : "40vh";
    },
    imageStyle() {
      return {
        width: `${Math.round(this.zoom * 100)}%`,
        transform: `translate(${this.pan.x}px, ${this.pan.y}px)`,
        cursor: this.panning ? "grabbing" : "grab",
      };
    },
  },

  watch: {
    // A new answer resets everything that belonged to the last one.
    current: {
      immediate: true,
      handler(item) {
        this.showOverride = false;
        this.reason = "";
        this.pageIndex = 0;
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.marks = item ? item.awardedMarks : null;
      },
    },
  },

  async mounted() {
    window.addEventListener("keydown", this.onKeydown);
    await this.load();
  },

  beforeUnmount() {
    window.removeEventListener("keydown", this.onKeydown);
    clearTimeout(this.undoTimer);
  },

  methods: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        const [queue, questions] = await Promise.all([
          gql(QUEUE, { examId: this.exam.id, limit: QUEUE_LIMIT }),
          gql(QUESTIONS, { examId: this.exam.id }),
        ]);
        this.queue = queue.reviewQueue.items;
        const map = new Map();
        for (const question of questions.questions) {
          map.set(question.number, question.rubricItems || []);
        }
        this.rubricByNumber = map;
        if (this.index >= this.filtered.length) this.index = Math.max(this.filtered.length - 1, 0);
      } catch (failure) {
        this.error = failure.message;
      } finally {
        this.loading = false;
      }
    },

    // --- filters -------------------------------------------------------------

    countMatching(key) {
      return this.queue.filter((item) => this.matches(item, key)).length;
    },

    matches(item, key) {
      if (key === "low") return (item.confidence || 0) < LOW_CONFIDENCE;
      if (key === "illegible") {
        return item.errorType === "illegible" || (item.legibilityScore || 1) < LOW_CONFIDENCE;
      }
      if (key === "conceptual") return item.errorType === "conceptual";
      return true;
    },

    setFilter(key) {
      this.filter = key;
      this.index = 0;
    },

    /** A one-line reason for the table's "Why" column. */
    concern(item) {
      if (item.errorType && item.errorType !== "none") return item.errorType.replace(/_/g, " ");
      if ((item.legibilityScore || 1) < LOW_CONFIDENCE) return "hard to read";
      if ((item.confidence || 0) < LOW_CONFIDENCE) return "unsure";
      return "—";
    },

    jumpTo(position) {
      this.index = position;
      this.showTable = false;
    },

    stepMarks(delta) {
      const max = this.current ? this.current.maxMarks : 0;
      const next = (this.marks || 0) + delta;
      this.marks = Math.min(max, Math.max(0, next));
    },

    onRubricChange(value) {
      // A rubric edit replaces the draft mark and opens the stepper, so the
      // teacher can see the number the toggles produced.
      this.marks = value;
      this.showOverride = true;
    },

    toggleOverride() {
      this.showOverride = !this.showOverride;
      if (this.showOverride && this.marks === null && this.current) {
        this.marks = this.current.awardedMarks || 0;
      }
    },

    zoomBy(delta) {
      this.zoom = Math.min(3, Math.max(0.5, this.zoom + delta));
    },

    startPan(event) {
      this.panning = { x: event.clientX, y: event.clientY };
      if (event.target.setPointerCapture) event.target.setPointerCapture(event.pointerId);
    },
    movePan(event) {
      if (!this.panning) return;
      this.pan = {
        x: this.pan.x + (event.clientX - this.panning.x),
        y: this.pan.y + (event.clientY - this.panning.y),
      };
      this.panning = { x: event.clientX, y: event.clientY };
    },
    endPan() {
      this.panning = null;
    },

    flagTranscription() {
      const next = new Set(this.flagged);
      if (next.has(this.current.answerId)) next.delete(this.current.answerId);
      else {
        next.add(this.current.answerId);
        toastSuccess("Flagged as misread. Mark from the image.");
      }
      this.flagged = next;
    },

    // --- actions -------------------------------------------------------------

    /** True when the model left a mark that could be accepted. */
    wasMarked() {
      return Boolean(this.current) && this.current.awardedMarks !== null
        && this.current.awardedMarks !== undefined;
    },

    async accept() {
      if (!this.current || this.busy) return;
      const item = this.current;
      this.busy = true;
      try {
        await gql(ACCEPT, { answerId: item.answerId });
        this.removed(item, "Accepted.");
      } catch (failure) {
        toastError(failure.message);
      } finally {
        this.busy = false;
      }
    },

    async override() {
      if (!this.current || this.busy) return;
      const item = this.current;
      const marks = this.marks === null ? item.awardedMarks || 0 : this.marks;
      // The API insists on a reason; the input is optional, so a default stands in.
      const reason = this.reason.trim() || DEFAULT_REASON;
      const previous = item.awardedMarks;

      this.busy = true;
      try {
        await gql(OVERRIDE, { answerId: item.answerId, marks, reason });
        this.removed(item, `Mark changed to ${this.formatMark(marks)}.`, {
          answerId: item.answerId,
          marks: previous,
          label: `Changed to ${this.formatMark(marks)}`,
        });
      } catch (failure) {
        toastError(failure.message);
      } finally {
        this.busy = false;
      }
    },

    skip() {
      this.advance(1);
    },

    previous() {
      this.advance(-1);
    },

    advance(delta) {
      const next = this.index + delta;
      if (next < 0 || next >= this.filtered.length) return;
      this.index = next;
    },

    /** Take the item out of the queue and stay in place, so the next slides up. */
    removed(item, message, undoable) {
      const position = this.queue.indexOf(item);
      if (position !== -1) this.queue.splice(position, 1);
      if (this.index >= this.filtered.length) this.index = Math.max(this.filtered.length - 1, 0);
      toastSuccess(message);
      if (undoable) this.startUndo(undoable);
      this.$emit("changed");
    },

    /**
     * Undo is offered for a mark change, which can be put back by overriding
     * again. An accepted mark has no reversal in the API, so it gets no undo.
     */
    startUndo(payload) {
      clearTimeout(this.undoTimer);
      this.undo = payload;
      this.undoTimer = setTimeout(() => {
        this.undo = null;
      }, UNDO_MS);
    },

    async runUndo() {
      const pending = this.undo;
      this.undo = null;
      clearTimeout(this.undoTimer);
      if (!pending) return;
      try {
        await gql(OVERRIDE, {
          answerId: pending.answerId,
          marks: pending.marks === null ? 0 : pending.marks,
          reason: "Undone by the teacher.",
        });
        toastSuccess("Undone.");
        await this.load();
      } catch (failure) {
        toastError(failure.message);
      }
    },

    async acceptAll() {
      this.confirmAll.busy = true;
      try {
        const data = await gql(ACCEPT_ALL, { examId: this.exam.id });
        toastSuccess(`Accepted ${data.acceptAllHighConfidence} answer(s).`);
        this.confirmAll.open = false;
        await this.load();
        this.$emit("changed");
      } catch (failure) {
        toastError(failure.message);
        this.confirmAll.open = false;
      } finally {
        this.confirmAll.busy = false;
      }
    },

    async finalize() {
      this.confirmFinalize.busy = true;
      try {
        await gql(FINALIZE, { examId: this.exam.id });
        toastSuccess("Exam finalised. The class insights are being built.");
        this.confirmFinalize.open = false;
        this.$emit("changed");
      } catch (failure) {
        // The server refuses when any answer is still without a mark.
        toastError(failure.message);
        this.confirmFinalize.open = false;
      } finally {
        this.confirmFinalize.busy = false;
      }
    },

    formatMark(value) {
      if (value === null || value === undefined) return "—";
      return Number.isInteger(value) ? String(value) : value.toFixed(1);
    },

    // --- keyboard ------------------------------------------------------------

    onKeydown(event) {
      // Never steal a key from a field the teacher is typing in.
      const tag = (event.target && event.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key;
      if (key === "Enter") {
        event.preventDefault();
        if (this.showOverride) this.override();
        // Nothing to accept where the model left no mark: open the panel for
        // marking it by hand instead of failing on the server.
        else if (this.wasMarked) this.accept();
        else this.toggleOverride();
        return;
      }
      if (key === "ArrowUp" || key === "ArrowRight") {
        event.preventDefault();
        if (!this.showOverride) this.toggleOverride();
        else this.stepMarks(1);
        return;
      }
      if (key === "ArrowDown" || key === "ArrowLeft") {
        event.preventDefault();
        if (this.showOverride) this.stepMarks(-1);
        return;
      }
      if (key === "n" || key === "N") {
        event.preventDefault();
        this.skip();
        return;
      }
      if (key === "p" || key === "P" || key === "Backspace") {
        event.preventDefault();
        this.previous();
      }
    },
  },
};
</script>

<style scoped>
/* The next card slides up as the last one leaves, which is what makes a run
   of these feel like a queue rather than a page reload. */
.review-card {
  animation: review-slide 220ms ease-out;
}

@keyframes review-slide {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.min-w-half {
  min-width: 45%;
}
</style>
