<template>
  <div class="px-4 pb-4">
    <div v-if="loading" class="w-full">
      <skeleton-list :count="4" label="Loading the extracted questions" />
    </div>

    <div v-else-if="!questions.length" class="w-full">
      <empty-state
        title="No questions yet"
        description="Extraction has not produced any questions for this exam. Run it from the Files step, or add the questions by hand."
        icon="fas fa-clipboard-list"
      >
        <template #action>
          <router-link
            :to="{ name: 'teacher-exam-files', params: { id: examId } }"
            class="h-11 inline-flex items-center bg-blueGray-800 text-white text-xs font-bold uppercase px-4 rounded shadow"
          >
            Go to the files
          </router-link>
        </template>
      </empty-state>
    </div>

    <template v-else>
      <!-- What extraction was unsure about. Never fatal, always visible. -->
      <div
        v-if="restoredCount"
        class="bg-lightBlue-50 border-l-4 border-lightBlue-500 rounded px-4 py-3 mb-4"
      >
        <p class="text-sm text-lightBlue-700">
          <i class="fas fa-undo mr-1"></i>
          {{ restoredCount }} edit(s) from your last visit were kept on this
          device. They save when you leave each field.
        </p>
      </div>

      <div
        v-if="warnings.length"
        class="bg-amber-50 border-l-4 border-amber-500 rounded px-4 py-3 mb-4"
      >
        <p class="text-sm font-bold text-amber-700 mb-1">
          <i class="fas fa-exclamation-triangle mr-1"></i>
          {{ warnings.length }} thing(s) to check
        </p>
        <ul class="list-disc list-inside text-sm text-amber-700">
          <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
        </ul>
      </div>

      <div class="flex flex-wrap">
        <!-- Pages -->
        <div class="w-full lg:w-5/12 order-2 lg:order-1">
          <div class="lg:sticky lg:top-4">
            <div
              class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white"
            >
              <div class="rounded-t mb-0 px-4 py-3 border-0">
                <div class="flex flex-wrap items-center">
                  <h3 class="font-semibold text-lg text-blueGray-700 flex-1 px-4">
                    {{ pageTitle }}
                  </h3>
                  <div class="flex items-center px-4">
                    <button
                      type="button"
                      class="w-11 h-11 text-blueGray-500 hover:text-blueGray-800"
                      aria-label="Zoom out"
                      @click="zoomOut"
                    >
                      <i class="fas fa-search-minus"></i>
                    </button>
                    <span class="text-xs text-blueGray-400 w-12 text-center">
                      {{ Math.round(zoom * 100) }}%
                    </span>
                    <button
                      type="button"
                      class="w-11 h-11 text-blueGray-500 hover:text-blueGray-800"
                      aria-label="Zoom in"
                      @click="zoomIn"
                    >
                      <i class="fas fa-search-plus"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div class="px-4 pb-2 flex flex-wrap">
                <button
                  v-for="(page, index) in pages"
                  :key="page.id"
                  type="button"
                  class="px-3 h-11 text-xs font-bold uppercase rounded mr-1 mb-2"
                  :class="
                    index === pageIndex
                      ? 'bg-blueGray-800 text-white'
                      : 'bg-blueGray-100 text-blueGray-600'
                  "
                  @click="pageIndex = index"
                >
                  {{ page.kind === "scheme" ? "Scheme" : "Paper" }} {{ page.pageNumber }}
                </button>
              </div>

              <div class="px-4 pb-4 overflow-auto max-h-96 lg:max-h-screen-75 bg-blueGray-100">
                <img
                  v-if="currentPage"
                  :src="currentPage.url"
                  :alt="`Page ${currentPage.pageNumber}`"
                  class="mx-auto ease-linear transition-all duration-150"
                  :style="{ width: zoom * 100 + '%' }"
                />
                <p v-else class="text-sm text-blueGray-400 py-6 text-center">
                  No pages to show.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Questions -->
        <div class="w-full lg:w-7/12 order-1 lg:order-2">
          <div class="flex flex-wrap items-center mb-3">
            <div class="flex-1">
              <h3 class="font-semibold text-lg text-blueGray-700">
                {{ questions.length }} question(s)
              </h3>
              <p class="text-sm" :class="totalsMatch ? 'text-blueGray-400' : 'text-red-500'">
                Rubric totals {{ rubricTotal }} of {{ exam.totalMarks }} marks
                <span v-if="!totalsMatch"> — the paper's total does not match</span>
              </p>
            </div>
            <span v-if="savedAt" class="text-xs text-emerald-600">
              <i class="fas fa-check mr-1"></i> Saved
            </span>
          </div>

          <div
            v-for="question in questions"
            :key="question.id"
            class="relative flex flex-col min-w-0 break-words w-full mb-3 shadow rounded bg-white"
            :class="mismatch(question) ? 'ring-2 ring-red-400' : ''"
          >
            <button
              type="button"
              class="w-full text-left px-4 py-3"
              @click="toggle(question.id)"
            >
              <div class="flex flex-wrap items-center">
                <span
                  class="bg-blueGray-800 text-white text-sm font-bold rounded w-9 h-9 inline-flex items-center justify-center mr-3 flex-none"
                >
                  {{ question.number }}
                </span>
                <span class="flex-1 min-w-0 text-sm text-blueGray-700">
                  <math-text :text="question.text" />
                </span>
                <span class="text-xs font-bold text-blueGray-500 ml-2 flex-none">
                  {{ question.maxMarks }} marks
                </span>
                <i
                  class="fas ml-2 text-blueGray-300 flex-none"
                  :class="open.includes(question.id) ? 'fa-chevron-up' : 'fa-chevron-down'"
                ></i>
              </div>
              <div v-if="mismatch(question)" class="text-xs text-red-500 mt-2">
                Rubric adds up to {{ rubricSum(question) }} of {{ question.maxMarks }} marks.
              </div>
            </button>

            <div v-if="open.includes(question.id)" class="px-4 pb-4">
              <div class="flex flex-wrap mb-1">
                <span
                  class="text-xs font-bold uppercase text-blueGray-500 bg-blueGray-100 rounded px-2 py-1 mr-2 mb-2"
                >
                  {{ question.questionType || "untyped" }}
                </span>
                <span
                  v-for="chip in question.skills"
                  :key="chip.id"
                  class="text-xs font-bold text-lightBlue-600 bg-lightBlue-100 rounded px-2 py-1 mr-2 mb-2 inline-flex items-center"
                >
                  {{ chip.skill.code }}
                  <button
                    type="button"
                    class="ml-1 text-lightBlue-400 hover:text-lightBlue-700"
                    :aria-label="`Remove ${chip.skill.code}`"
                    @click="removeSkill(question, chip)"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                </span>
                <select-field
                  :model-value="''"
                  :options="skillOptions(question)"
                  placeholder="Add a skill..."
                  flush
                  class="w-48 mb-2"
                  @update:model-value="addSkill(question, $event)"
                />
              </div>

              <!-- Typed into freely, written on blur: one save per field, not
                   one per keystroke. -->
              <form-field
                :model-value="draft(question).text"
                label="Question"
                @update:model-value="setDraft(question, 'text', $event)"
                @blur="saveQuestion(question)"
              />
              <form-field
                :model-value="draft(question).expectedAnswer"
                label="Expected answer"
                @update:model-value="setDraft(question, 'expectedAnswer', $event)"
                @blur="saveQuestion(question)"
              />
              <form-field
                :model-value="draft(question).maxMarks"
                label="Max marks"
                type="number"
                @update:model-value="setDraft(question, 'maxMarks', Number($event))"
                @blur="saveQuestion(question)"
              />

              <h6 class="text-blueGray-400 text-xs font-bold uppercase mt-3 mb-2">
                Rubric
              </h6>
              <div
                v-for="item in question.rubricItems"
                :key="item.id"
                class="flex flex-wrap items-end mb-2"
              >
                <span
                  class="text-xs font-bold rounded px-2 py-1 mr-2 mb-2 w-8 text-center"
                  :class="kindClass(item.kind)"
                >
                  {{ item.kind }}
                </span>
                <div class="flex-1 min-w-0 mr-2">
                  <input
                    :value="item.description"
                    class="w-full border-0 px-3 h-11 bg-blueGray-50 rounded text-sm text-blueGray-600 focus:outline-none focus:ring"
                    @change="saveRubric(item, { description: $event.target.value })"
                  />
                </div>
                <input
                  :value="item.marks"
                  type="number"
                  min="0"
                  class="w-20 border-0 px-3 h-11 bg-blueGray-50 rounded text-sm text-blueGray-600 mr-2 mb-2 focus:outline-none focus:ring"
                  @change="saveRubric(item, { marks: Number($event.target.value) })"
                />
                <button
                  type="button"
                  class="w-11 h-11 text-blueGray-400 hover:text-red-500 mb-2"
                  aria-label="Delete rubric line"
                  @click="removeRubric(item)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>

              <p class="text-xs mb-2" :class="mismatch(question) ? 'text-red-500' : 'text-blueGray-400'">
                Rubric adds up to {{ rubricSum(question) }} of {{ question.maxMarks }} marks.
              </p>

              <div class="flex flex-wrap items-center">
                <button
                  type="button"
                  class="h-11 text-xs font-bold uppercase text-blueGray-600 hover:text-blueGray-800 mr-2"
                  @click="addRubric(question)"
                >
                  <i class="fas fa-plus mr-1"></i> Add a rubric line
                </button>
                <button
                  type="button"
                  class="h-11 text-xs font-bold uppercase text-red-500 hover:text-red-700"
                  @click="askDeleteQuestion(question)"
                >
                  <i class="fas fa-trash mr-1"></i> Delete question
                </button>
              </div>

              <ai-note
                v-if="question.alternativeMethods.length || question.commonErrors.length"
                label="What to watch for"
              >
                <p v-if="question.alternativeMethods.length" class="mb-1">
                  <span class="font-bold">Other methods:</span>
                  {{ question.alternativeMethods.join("; ") }}
                </p>
                <p v-if="question.commonErrors.length">
                  <span class="font-bold">Common errors:</span>
                  {{ question.commonErrors.join("; ") }}
                </p>
              </ai-note>
            </div>
          </div>

          <button
            type="button"
            class="w-full h-11 bg-blueGray-100 text-blueGray-600 text-xs font-bold uppercase rounded mb-4"
            @click="addQuestion"
          >
            <i class="fas fa-plus mr-1"></i> Add a question
          </button>

          <!-- The step's own primary action. -->
          <div
            class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white"
          >
            <div class="px-4 py-4">
              <p v-if="!canConfirm" class="text-sm text-amber-700 mb-3">
                <i class="fas fa-lock mr-1"></i> {{ blockedReason }}
              </p>
              <div class="flex flex-wrap items-center">
                <button
                  type="button"
                  :disabled="!canConfirm || confirming"
                  class="w-full sm:w-auto h-11 bg-emerald-500 text-white text-xs font-bold uppercase px-5 rounded shadow hover:shadow-lg disabled:opacity-60 mb-2 sm:mb-0 sm:mr-2"
                  @click="confirm"
                >
                  <i v-if="confirming" class="fas fa-circle-notch fa-spin mr-1"></i>
                  {{ confirming ? "Confirming..." : "Confirm and continue" }}
                </button>
                <button
                  type="button"
                  class="w-full sm:w-auto h-11 bg-blueGray-100 text-blueGray-700 text-xs font-bold uppercase px-4 rounded"
                  @click="askRerun"
                >
                  Re-run extraction
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <confirm-dialog
      :open="deleteQuestionOpen"
      title="Delete this question?"
      message="The question and its rubric go together. Anything tagged to it is removed as well."
      confirm-label="Delete"
      danger
      :busy="deletingQuestion"
      @confirm="deleteQuestion"
      @cancel="deleteQuestionOpen = false"
    />

    <confirm-dialog
      :open="rerunOpen"
      title="Re-run the extraction?"
      message="The paper and scheme are read again from scratch. Anything you have edited here is replaced."
      confirm-label="Re-run"
      danger
      :busy="rerunning"
      @confirm="rerun"
      @cancel="rerunOpen = false"
    />
  </div>
</template>

<script>
import { gql } from "@/api/client";
import ConfirmDialog from "@/components/crud/ConfirmDialog.vue";
import FormField from "@/components/crud/FormField.vue";
import SelectField from "@/components/crud/SelectField.vue";
import AiNote from "@/components/teacher/AiNote.vue";
import MathText from "@/components/teacher/MathText.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import SkeletonList from "@/components/ui/SkeletonList.vue";
import { clearDraft, draftNames, readDraft, saveDraft } from "@/lib/drafts";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";

const EXAM = `
  query ($id: ID!) {
    exam(id: $id) {
      id title status totalMarks warnings
      subject { id name code }
      schoolClass { id level }
      files { id kind pageNumber order url }
      questions {
        id number text expectedAnswer maxMarks questionType order isConfirmed
        parent { id }
        alternativeMethods commonErrors
        rubricItems { id description marks kind order }
        skills { id weight skill { id code name } }
      }
    }
  }
`;

const TOPICS = `
  query ($subject: String, $level: Int) {
    topics(subject: $subject, level: $level) {
      id name level
      skills { id code name }
    }
  }
`;

const SAVE_QUESTION = `
  mutation ($id: ID!, $text: String, $expectedAnswer: String, $maxMarks: Int) {
    upsertQuestion(id: $id, text: $text, expectedAnswer: $expectedAnswer, maxMarks: $maxMarks) {
      id
      number text expectedAnswer maxMarks questionType isConfirmed
      alternativeMethods commonErrors
      rubricItems { id description marks kind order }
      skills { id weight skill { id code name } }
    }
  }
`;

const ADD_QUESTION = `
  mutation ($examId: ID!, $number: String!, $maxMarks: Int, $order: Int) {
    upsertQuestion(examId: $examId, number: $number, maxMarks: $maxMarks, order: $order) { id }
  }
`;

const SAVE_RUBRIC = `
  mutation ($id: ID!, $description: String!, $marks: Int!) {
    upsertRubricItem(id: $id, description: $description, marks: $marks) { id }
  }
`;

const ADD_RUBRIC = `
  mutation ($questionId: ID!, $description: String!, $marks: Int!, $order: Int) {
    upsertRubricItem(questionId: $questionId, description: $description, marks: $marks, order: $order) { id }
  }
`;

const SET_SKILLS = `
  mutation ($questionId: ID!, $skills: [QuestionSkillInput!]!) {
    setQuestionSkills(questionId: $questionId, skills: $skills) { id }
  }
`;

const DELETE_RUBRIC = `mutation ($id: ID!) { deleteRubricItem(id: $id) }`;
const DELETE_QUESTION = `mutation ($id: ID!) { deleteQuestion(id: $id) }`;

const CONFIRM = `mutation ($examId: ID!) { confirmExtractedExam(examId: $examId) { id status } }`;
const EXTRACT = `mutation ($examId: ID!) { extractExam(examId: $examId) }`;

const KINDS = {
  M: "text-lightBlue-800 bg-lightBlue-200",
  A: "text-emerald-800 bg-emerald-200",
  U: "text-amber-800 bg-amber-200",
  O: "text-blueGray-800 bg-blueGray-200",
};

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

export default {
  name: "confirm-step",
  components: {
    AiNote,
    ConfirmDialog,
    EmptyState,
    FormField,
    MathText,
    SelectField,
    SkeletonList,
  },
  props: {
    exam: { type: Object, required: true },
  },
  emits: ["changed"],
  data() {
    return {
      loading: true,
      full: null,
      // Edits in progress, keyed by question id. The server value is what the
      // screen falls back to, so a reload always shows the truth.
      drafts: {},
      pages: [],
      pageIndex: 0,
      zoom: 1,
      open: [],
      savedAt: 0,
      confirming: false,
      rerunOpen: false,
      rerunning: false,
      restoredCount: 0,
      deleteQuestionOpen: false,
      deletingQuestion: false,
      pendingQuestion: null,
      skillTopics: [],
    };
  },
  computed: {
    /** `warnings` comes off the exam the shell passed in, and is optional. */
    warnings() {
      return this.exam.warnings || [];
    },
    examId() {
      return this.$route.params.id;
    },
    questions() {
      return this.full ? this.full.questions : [];
    },
    currentPage() {
      return this.pages[this.pageIndex] || null;
    },
    pageTitle() {
      return this.currentPage
        ? this.currentPage.kind === "scheme"
          ? "Marking scheme"
          : "Question paper"
        : "Pages";
    },
    rubricTotal() {
      return this.questions.reduce((sum, question) => sum + this.rubricSum(question), 0);
    },
    totalsMatch() {
      return this.rubricTotal === this.exam.totalMarks;
    },
    /** Every question needs a rubric, and every rubric needs to add up. */
    /** Questions that cannot be marked, and so block confirming. */
    needingRubric() {
      return this.questions.filter((question) => this.needsRubric(question));
    },
    canConfirm() {
      return (
        this.questions.length > 0 &&
        !this.needingRubric.length &&
        !this.questions.some((question) => this.mismatch(question))
      );
    },
    blockedReason() {
      if (!this.questions.length) return "There are no questions to confirm yet.";
      const without = this.needingRubric;
      if (without.length) {
        return `${without.map((q) => q.number).join(", ")} have no rubric yet. Marking needs one for every question.`;
      }
      const off = this.questions.filter((q) => this.mismatch(q));
      if (off.length) {
        return `${off.map((q) => q.number).join(", ")} have a rubric that does not add up to the question's marks.`;
      }
      return "";
    },
  },
  async mounted() {
    this.restoreDrafts();
    await this.load();
  },
  beforeUnmount() {
    // Nothing to flush: every keystroke is already on the device.
  },
  methods: {
    /** `quiet` re-reads without blanking the screen, for after an edit. */
    /** Scoped to the exam, so a draft from another paper cannot leak in. */
    draftPrefix() {
      return `exam:${this.examId}:question:`;
    },

    draftKey(question) {
      return `${this.draftPrefix()}${question.id}`;
    },

    /** Bring back anything typed before the tab was closed. */
    restoreDrafts() {
      const restored = {};
      const prefix = `exam:${this.$route.params.id}:question:`;
      for (const name of draftNames()) {
        if (!name.startsWith(prefix)) continue;
        const found = readDraft(name);
        if (found) restored[name.slice(prefix.length)] = found;
      }
      if (Object.keys(restored).length) {
        this.drafts = { ...this.drafts, ...restored };
        this.restoredCount = Object.keys(restored).length;
      }
    },

    async load(quiet = false) {
      if (!quiet) this.loading = true;
      try {
        const data = await gql(EXAM, { id: this.examId });
        this.full = data.exam;
        this.pages = data.exam ? data.exam.files : [];
        if (!this.open.length && this.questions.length) {
          // Open the first question, so the screen is not a wall of closed rows.
          this.open = [this.questions[0].id];
        }
        await this.loadSkills();
      } catch (error) {
        toastError(error.message);
      } finally {
        this.loading = false;
      }
    },

    async loadSkills() {
      if (!this.full) return;
      try {
        const data = await gql(TOPICS, {
          subject: this.full.subject.code,
          level: this.full.schoolClass.level,
        });
        this.skillTopics = data.topics;
      } catch (error) {
        // Without topics the skill picker stays empty; everything else works.
        this.skillTopics = [];
      }
    },

    /** Skills not already on the question, named by their topic. */
    skillOptions(question) {
      const taken = new Set(question.skills.map((chip) => chip.skill.id));
      return this.skillTopics.flatMap((topic) =>
        topic.skills
          .filter((skill) => !taken.has(skill.id))
          .map((skill) => ({ value: skill.id, label: `${skill.code} — ${skill.name}` }))
      );
    },

    toggle(id) {
      this.open = this.open.includes(id)
        ? this.open.filter((item) => item !== id)
        : [...this.open, id];
    },

    /**
     * Does this question need a rubric before the exam can be confirmed?
     *
     * The same rule the server applies, and it has to be the same one: the
     * server refuses, and this decides whether to offer the button at all. Two
     * copies of a rule is how they drift -- this one used to ask every question
     * for a rubric, including the ones with no marks to award.
     *
     * A part is not asked when it has nothing to award (`a` and `b` under a
     * question that holds the marks), nor when it is a heading whose
     * sub-questions carry the rubric between them.
     */
    needsRubric(question) {
      if (question.rubricItems.length) return false;
      if (!question.maxMarks) return false;
      const children = this.questions.filter(
        (other) => other.parent && other.parent.id === question.id
      );
      return !children.some((child) => child.rubricItems.length);
    },

    rubricSum(question) {
      return question.rubricItems.reduce((sum, item) => sum + item.marks, 0);
    },

    mismatch(question) {
      return this.rubricSum(question) !== question.maxMarks;
    },

    kindClass(kind) {
      return KINDS[kind] || KINDS.O;
    },

    /** A write, then a quiet "Saved" rather than a toast per keystroke. */
    async save(run) {
      try {
        await run();
        this.savedAt = Date.now();
      } catch (error) {
        toastError(error.message);
        // Put the screen back in step with the server.
        await this.load(true);
      }
    },

    draft(question) {
      return (
        this.drafts[question.id] || {
          text: question.text,
          expectedAnswer: question.expectedAnswer,
          maxMarks: question.maxMarks,
        }
      );
    },

    setDraft(question, field, value) {
      const next = { ...this.draft(question), [field]: value };
      this.drafts = { ...this.drafts, [question.id]: next };
      // Written on every change, so a closed tab costs nothing.
      saveDraft(this.draftKey(question), next);
    },

    /** On blur: write it, or drop the draft when nothing actually changed. */
    async saveQuestion(question) {
      const draft = this.draft(question);
      const unchanged =
        draft.text === question.text &&
        draft.expectedAnswer === question.expectedAnswer &&
        draft.maxMarks === question.maxMarks;
      if (unchanged) return;

      await this.save(() =>
        gql(SAVE_QUESTION, {
          id: question.id,
          text: draft.text,
          expectedAnswer: draft.expectedAnswer,
          maxMarks: Number(draft.maxMarks) || 0,
        })
      );

      const remaining = { ...this.drafts };
      delete remaining[question.id];
      this.drafts = remaining;
      // The server has it now, so the safety net can go.
      clearDraft(this.draftKey(question));
      await this.load(true);
    },

    saveRubric(item, changes) {
      if (changes.description !== undefined && changes.description === item.description) return;
      if (changes.marks !== undefined && changes.marks === item.marks) return;
      this.save(() =>
        gql(SAVE_RUBRIC, {
          id: item.id,
          description: changes.description === undefined ? item.description : changes.description,
          marks: changes.marks === undefined ? item.marks : changes.marks,
        })
      );
    },

    addRubric(question) {
      this.save(() =>
        gql(ADD_RUBRIC, {
          questionId: question.id,
          description: "New line",
          marks: 0,
          order: question.rubricItems.length,
        })
      ).then(() => this.load(true));
    },

    addQuestion() {
      const next = String(this.questions.length + 1);
      this.save(() =>
        gql(ADD_QUESTION, {
          examId: this.examId,
          number: next,
          maxMarks: 1,
          order: this.questions.length,
        })
      ).then(() => this.load(true));
    },

    async removeRubric(item) {
      await this.save(() => gql(DELETE_RUBRIC, { id: item.id }));
      await this.load(true);
    },

    askDeleteQuestion(question) {
      this.pendingQuestion = question;
      this.deleteQuestionOpen = true;
    },

    async deleteQuestion() {
      this.deletingQuestion = true;
      try {
        await gql(DELETE_QUESTION, { id: this.pendingQuestion.id });
        toastSuccess(`Question ${this.pendingQuestion.number} deleted.`);
        this.deleteQuestionOpen = false;
        this.pendingQuestion = null;
        await this.load(true);
      } catch (error) {
        toastError(error.message);
      } finally {
        this.deletingQuestion = false;
      }
    },

    addSkill(question, skillId) {
      if (!skillId) return;
      const skills = [
        ...question.skills.map((chip) => ({ skillId: chip.skill.id, weight: chip.weight })),
        { skillId, weight: 1 },
      ];
      this.save(() => gql(SET_SKILLS, { questionId: question.id, skills })).then(() =>
        this.load(true)
      );
    },

    removeSkill(question, chip) {
      const skills = question.skills
        .filter((item) => item.id !== chip.id)
        .map((item) => ({ skillId: item.skill.id, weight: item.weight }));
      this.save(() => gql(SET_SKILLS, { questionId: question.id, skills })).then(() =>
        this.load(true)
      );
    },

    zoomIn() {
      this.zoom = Math.min(ZOOM_MAX, this.zoom + ZOOM_STEP);
    },

    zoomOut() {
      this.zoom = Math.max(ZOOM_MIN, this.zoom - ZOOM_STEP);
    },

    async confirm() {
      this.confirming = true;
      try {
        await gql(CONFIRM, { examId: this.examId });
        toastSuccess("Questions confirmed. Marking can start.");
        this.$emit("changed");
        this.$router.push({ name: "teacher-exam-scripts", params: { id: this.examId } });
      } catch (error) {
        toastError(error.message);
      } finally {
        this.confirming = false;
      }
    },

    askRerun() {
      this.rerunOpen = true;
    },

    async rerun() {
      this.rerunning = true;
      try {
        await gql(EXTRACT, { examId: this.examId });
        toastSuccess("Extraction restarted.");
        this.rerunOpen = false;
        this.$emit("changed");
        this.$router.push({ name: "teacher-exam-files", params: { id: this.examId } });
      } catch (error) {
        toastError(error.message);
      } finally {
        this.rerunning = false;
      }
    },
  },
};
</script>
