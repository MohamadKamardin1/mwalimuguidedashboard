<template>
  <!--
    Class and subject, term, then exam. Every report reads through these, so
    the choice is written into the URL rather than kept in the component: a
    teacher can bookmark "Form 2A, Mathematics, Term 1", send it to a colleague,
    and land on the same report.
  -->
  <div
    class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white print:hidden"
  >
    <div class="px-4 pt-4">
      <div class="flex flex-wrap items-center gap-2">
        <select-field
          v-model="classSubject"
          :options="classSubjectOptions"
          placeholder="Choose a class and subject"
          tone="lightBlue"
          flush
          class="flex-1 min-w-0"
          aria-label="Class and subject"
        />
        <select-field
          v-model="termId"
          :options="termOptions"
          placeholder="Any term"
          tone="emerald"
          flush
          class="flex-1 min-w-0"
          aria-label="Term"
        />
        <select-field
          v-model="examId"
          :options="examOptions"
          placeholder="All finalized exams"
          tone="amber"
          flush
          class="flex-1 min-w-0"
          aria-label="Exam"
        />
        <button
          v-if="dirty"
          type="button"
          class="h-11 text-xs font-bold uppercase text-blueGray-500 hover:text-blueGray-700 px-3 flex-none"
          @click="clear"
        >
          Clear
        </button>
      </div>
    </div>

    <p class="px-4 py-3 text-xs text-blueGray-400">
      <template v-if="!assignments.length">
        You are not assigned to a class this term, so there is nothing to report on yet.
      </template>
      <template v-else-if="!exams.length">
        No finalized exam for this choice yet. Reports are written once an exam
        is finalized.
      </template>
      <template v-else>
        {{ exams.length }} finalized exam{{ exams.length === 1 ? "" : "s" }} to
        report on. What you pick here carries into whichever report you open.
      </template>
    </p>
  </div>
</template>

<script>
import SelectField from "@/components/crud/SelectField.vue";

export default {
  name: "report-filters",
  components: { SelectField },
  props: {
    /** `[{ id, classId, className, subjectId, subjectName, subjectCode, termId }]` */
    assignments: { type: Array, default: () => [] },
    terms: { type: Array, default: () => [] },
    /** `[{ id, title, classId, subjectId, termId }]`, already finalized. */
    exams: { type: Array, default: () => [] },
    /** The current query, one key per control. */
    value: { type: Object, default: () => ({}) },
  },
  emits: ["input"],
  computed: {
    /** `classId|subjectId` in one control: a teacher picks them together. */
    classSubjectOptions() {
      return this.assignments.map((item) => ({
        value: `${item.classId}|${item.subjectId}`,
        label: `${item.className} — ${item.subjectName}`,
      }));
    },
    termOptions() {
      return this.terms.map((term) => ({
        value: term.id,
        label: `${term.name} ${term.year}`,
      }));
    },
    /** Only the exams that match what is picked above, so the list stays short. */
    examOptions() {
      return this.filteredExams.map((exam) => ({ value: exam.id, label: exam.title }));
    },
    filteredExams() {
      const [classId, subjectId] = (this.value.classSubject || "").split("|");
      return this.exams.filter(
        (exam) =>
          (!classId || exam.classId === classId) &&
          (!subjectId || exam.subjectId === subjectId) &&
          (!this.value.termId || exam.termId === this.value.termId)
      );
    },
    dirty() {
      return Boolean(this.value.classSubject || this.value.termId || this.value.examId);
    },

    classSubject: model("classSubject"),
    termId: model("termId"),
    examId: model("examId"),
  },
  methods: {
    clear() {
      this.$emit("input", { classSubject: "", termId: "", examId: "" });
    },
  },
};

/** One v-model per key of the `value` object. */
function model(key) {
  return {
    get() {
      return this.value[key] || "";
    },
    set(next) {
      // Changing a filter invalidates the exam below it.
      const patch = { [key]: next };
      if (key === "classSubject" || key === "termId") patch.examId = "";
      this.$emit("input", { ...this.value, ...patch });
    },
  };
}
</script>
