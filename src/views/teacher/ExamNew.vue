<template>
  <div class="flex flex-wrap">
    <div class="w-full px-4">
      <div class="flex flex-wrap items-center mb-4">
        <div class="flex-1">
          <h3 class="font-semibold text-lg text-blueGray-700">New exam</h3>
          <p class="text-sm text-blueGray-400">
            Name it and pick the class it is for. You can upload the paper on the
            next screen.
          </p>
        </div>
        <router-link
          to="/teacher/exams"
          class="h-11 inline-flex items-center text-blueGray-600 text-xs font-bold uppercase px-4 mt-3 sm:mt-0"
        >
          <i class="fas fa-arrow-left mr-1"></i> My exams
        </router-link>
      </div>
    </div>

    <spinner v-if="loading" large label="Loading your classes..." />

    <div v-else-if="!assignmentOptions.length" class="w-full md:w-8/12 px-4">
      <empty-state
        title="No class to set an exam for"
        description="You are not assigned to a class this term. Your school administrator has to assign you to a class and a subject before you can create an exam."
        icon="fas fa-chalkboard-teacher"
      >
        <template #action>
          <router-link
            to="/teacher/classes"
            class="h-11 inline-flex items-center bg-blueGray-800 text-white text-xs font-bold uppercase px-4 rounded shadow"
          >
            See my classes
          </router-link>
        </template>
      </empty-state>
    </div>

    <div v-else class="w-full lg:w-8/12 px-4">
      <div
        class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
      >
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <h3 class="font-semibold text-lg text-blueGray-700 px-4">Exam details</h3>
        </div>

        <div class="px-8 py-6">
          <div
            v-if="submitError"
            class="bg-red-50 border-l-4 border-red-500 px-4 py-3 rounded mb-4"
          >
            <p class="text-sm text-red-700">{{ submitError }}</p>
          </div>

          <div
            v-if="!setup.currentTermId"
            class="bg-amber-50 border-l-4 border-amber-500 px-4 py-3 rounded mb-4"
          >
            <p class="text-sm text-amber-700">
              No term is set as current, so pick one below. Ask your administrator
              if the term is missing.
            </p>
          </div>

          <div
            v-if="unlinked.length"
            class="bg-amber-50 border-l-4 border-amber-500 px-4 py-3 rounded mb-4"
          >
            <p class="text-sm text-amber-700">
              Not offered below because the subject is not linked to the curriculum:
              {{ unlinked.join("; ") }}. An administrator has to match the subject
              code on the Subjects &amp; Terms page.
            </p>
          </div>

          <form @submit.prevent="submit">
            <form-field
              v-model="form.title"
              label="Exam title"
              placeholder="Form 2A Midterm"
              required
              hint="What the class will call it, e.g. “Midterm 1”."
              :error="fieldErrors.title"
            />

            <select-field
              v-model="form.assignment"
              label="Class and subject"
              :options="assignmentOptions"
              placeholder="Choose a class..."
              required
              hint="Only the classes you teach this term."
              :error="fieldErrors.assignment"
            />

            <div class="flex flex-wrap">
              <div class="w-full md:w-6/12">
                <select-field
                  v-model="form.termId"
                  label="Term"
                  :options="termOptions"
                  required
                  :error="fieldErrors.termId"
                />
              </div>
              <div class="w-full md:w-6/12 md:pl-4">
                <form-field
                  v-model="form.totalMarks"
                  label="Total marks"
                  type="number"
                  required
                  hint="The paper's full mark, as printed on it."
                  :error="fieldErrors.totalMarks"
                />
              </div>
            </div>

            <div class="flex flex-wrap items-center mt-2">
              <button
                type="submit"
                :disabled="saving"
                class="w-full sm:w-auto h-11 bg-emerald-500 text-white text-xs font-bold uppercase px-5 rounded shadow hover:shadow-lg disabled:opacity-60 ease-linear transition-all duration-150"
              >
                <i v-if="saving" class="fas fa-circle-notch fa-spin mr-1"></i>
                <i v-else class="fas fa-plus mr-1"></i>
                {{ saving ? "Creating..." : "Create and open" }}
              </button>
              <p class="text-xs text-blueGray-400 mt-3 sm:mt-0 sm:ml-4">
                You land in the workspace straight away.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { gql } from "@/api/client";
import FormField from "@/components/crud/FormField.vue";
import SelectField from "@/components/crud/SelectField.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";
import { useAuthStore } from "@/stores/auth";
import { useSetupStore } from "@/stores/setup";

const ASSIGNMENTS = `
  query ($teacherId: ID, $termId: ID) {
    teacherAssignments(teacherId: $teacherId, termId: $termId, limit: 100) {
      items {
        id
        schoolClass { id name }
        subject { id name code }
        term { id name year }
      }
    }
  }
`;

// `createExam` takes a *curriculum* subject, while an assignment carries the
// school's own subject row. The two are joined on the subject code.
const CURRICULUM = `query { curriculumSubjects { id name code } }`;

const CREATE_EXAM = `
  mutation ($title: String!, $subjectId: ID!, $classId: ID!, $termId: ID!, $totalMarks: Int!) {
    createExam(
      title: $title
      subjectId: $subjectId
      classId: $classId
      termId: $termId
      totalMarks: $totalMarks
    ) { id }
  }
`;

export default {
  name: "teacher-exam-new",
  components: { EmptyState, FormField, SelectField, Spinner },
  data() {
    return {
      loading: true,
      saving: false,
      assignments: [],
      unlinked: [],
      termOptions: [],
      submitError: "",
      fieldErrors: {},
      form: { title: "", assignment: "", termId: "", totalMarks: "" },
    };
  },
  computed: {
    auth() {
      return useAuthStore();
    },
    setup() {
      return useSetupStore();
    },
    /** One option per class the teacher teaches, carrying both ids. */
    assignmentOptions() {
      return this.assignments.map((item) => ({
        value: `${item.schoolClass.id}|${item.curriculumSubjectId}`,
        label: `${item.schoolClass.name} — ${item.subject.name}`,
      }));
    },
    chosen() {
      if (!this.form.assignment) return null;
      const [classId, subjectId] = this.form.assignment.split("|");
      return { classId, subjectId };
    },
  },
  async created() {
    await this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        await this.setup.ensure();

        const [data, curriculum] = await Promise.all([
          gql(ASSIGNMENTS, {
            teacherId: this.auth.user ? this.auth.user.id : null,
            // Ask for this term's assignments when there is a term, so the list
            // matches the term the exam will belong to.
            termId: this.setup.currentTermId,
          }),
          gql(CURRICULUM),
        ]);

        // Join each assignment's subject to the curriculum by code.
        const byCode = new Map(
          curriculum.curriculumSubjects.map((item) => [item.code.toUpperCase(), item.id])
        );
        const linked = [];
        const unlinked = [];
        for (const item of data.teacherAssignments.items) {
          const curriculumSubjectId = byCode.get(item.subject.code.toUpperCase());
          if (curriculumSubjectId) {
            linked.push({ ...item, curriculumSubjectId });
          } else {
            unlinked.push(`${item.schoolClass.name} — ${item.subject.name}`);
          }
        }
        this.assignments = linked;
        this.unlinked = unlinked;

        const terms = new Map();
        for (const item of this.assignments) {
          terms.set(item.term.id, `${item.term.name} ${item.term.year}`);
        }
        this.termOptions = [...terms].map(([value, label]) => ({ value, label }));

        this.form.termId = this.setup.currentTermId || this.termOptions[0]?.value || "";

        // One class only: choose it, so the form is one click from done.
        if (this.assignments.length === 1) {
          const only = this.assignments[0];
          this.form.assignment = `${only.schoolClass.id}|${only.subject.id}`;
        }
      } catch (error) {
        this.submitError = error.message;
      } finally {
        this.loading = false;
      }
    },

    validate() {
      const errors = {};
      if (!this.form.title.trim()) errors.title = "Give the exam a title.";
      if (!this.form.assignment) errors.assignment = "Choose the class this exam is for.";
      if (!this.form.termId) errors.termId = "Choose a term.";
      const marks = Number(this.form.totalMarks);
      if (!this.form.totalMarks || !Number.isFinite(marks) || marks <= 0) {
        errors.totalMarks = "Enter the paper's total marks.";
      }
      this.fieldErrors = errors;
      return Object.keys(errors).length === 0;
    },

    async submit() {
      this.submitError = "";
      if (!this.validate()) return;

      this.saving = true;
      try {
        const data = await gql(CREATE_EXAM, {
          title: this.form.title.trim(),
          classId: this.chosen.classId,
          subjectId: this.chosen.subjectId,
          termId: this.form.termId,
          totalMarks: Number(this.form.totalMarks),
        });
        toastSuccess("Exam created. Upload the paper next.");
        // Straight into the workspace, on its first step.
        this.$router.push({ name: "teacher-exam", params: { id: data.createExam.id } });
      } catch (error) {
        this.submitError = error.message;
        toastError(error.message);
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>
