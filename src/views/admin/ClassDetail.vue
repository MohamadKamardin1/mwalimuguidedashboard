<template>
  <div class="flex flex-wrap">
    <spinner v-if="loadingClass" large label="Loading class..." />

    <empty-state
      v-else-if="!klass"
      class="mx-4"
      title="Class not found"
      :description="loadError || 'It may have been removed, or belong to another school.'"
      icon="fas fa-door-closed"
    >
      <template #action>
        <router-link
          to="/admin/classes"
          class="bg-blueGray-800 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg"
        >
          Back to classes
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
                <div class="flex items-center">
                  <h3 class="font-semibold text-lg text-blueGray-700">
                    {{ klass.name }}
                  </h3>
                  <status-badge
                    class="ml-2"
                    :status="klass.isActive ? 'active' : 'inactive'"
                  />
                </div>
                <p class="text-sm text-blueGray-500 mt-1">
                  Level {{ klass.level }} &middot; {{ klass.year }}
                </p>
              </div>
              <div class="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
                <router-link
                  :to="importUrl"
                  class="bg-blueGray-800 text-white active:bg-blueGray-600 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none ease-linear transition-all duration-150 inline-block"
                >
                  <i class="fas fa-file-upload mr-1"></i> Import students (CSV)
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Counts -->
      <div class="w-full md:w-4/12 px-4">
        <stat-card
          label="Students"
          :value="studentTotal"
          icon="fas fa-user-graduate"
          icon-color="bg-emerald-500"
          :hint="term ? term.name : 'No current term'"
        />
      </div>
      <div class="w-full md:w-4/12 px-4">
        <stat-card
          label="Teachers"
          :value="assignments.length"
          icon="fas fa-chalkboard-teacher"
          icon-color="bg-lightBlue-500"
        />
      </div>
      <div class="w-full md:w-4/12 px-4">
        <stat-card
          label="Subjects taught"
          :value="subjectCount"
          icon="fas fa-book"
          icon-color="bg-blueGray-700"
        />
      </div>

      <!-- Students -->
      <div class="w-full xl:w-7/12 px-4">
        <data-table
          title="Students"
          :columns="studentColumns"
          :rows="rows"
          :loading="loading"
          :error="error"
          loading-text="Loading students..."
          empty-title="Nobody enrolled yet"
          :empty-text="
            term
              ? 'Add students to this class, or import a CSV from your class list.'
              : 'This school has no current term, so students cannot be enrolled.'
          "
          empty-icon="fas fa-user-graduate"
          :pagination="{ page, pageSize, total }"
          @page-change="goToPage"
          @refresh="refresh"
        >
          <template #actions>
            <button
              type="button"
              :disabled="!term"
              class="bg-emerald-500 text-white active:bg-emerald-600 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none disabled:opacity-60 ease-linear transition-all duration-150"
              @click="openAddStudents"
            >
              <i class="fas fa-user-plus mr-1"></i> Add students
            </button>
          </template>

          <template #cell-name="{ row }">
            <span class="font-bold text-blueGray-700">{{ row.student.fullName }}</span>
          </template>

          <template #cell-admission="{ row }">{{ row.student.admissionNo }}</template>

          <template #row-actions="{ row }">
            <table-dropdown
              :items="[{ label: 'Remove from class', action: 'remove', icon: 'fas fa-user-minus', danger: true }]"
              @select="askRemove(row)"
            />
          </template>
        </data-table>
      </div>

      <!-- Teachers -->
      <div class="w-full xl:w-5/12 px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <div class="flex flex-wrap items-center">
              <div class="relative w-full px-4 max-w-full flex-grow flex-1">
                <h3 class="font-semibold text-lg text-blueGray-700">Teachers</h3>
              </div>
              <div class="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
                <router-link
                  :to="assignmentsUrl"
                  class="text-xs font-bold uppercase text-blueGray-700 hover:text-blueGray-500 ease-linear transition-all duration-150"
                >
                  Manage assignments
                  <i class="fa fa-angle-double-right ml-1"></i>
                </router-link>
              </div>
            </div>
          </div>

          <spinner v-if="loadingAssignments" label="Loading teachers..." />

          <div v-else-if="!assignments.length" class="px-8 pb-8">
            <empty-state
              title="No teachers assigned"
              description="Assign a teacher to a subject on the Assignments page."
              icon="fas fa-chalkboard-teacher"
            />
          </div>

          <div v-else class="block w-full overflow-x-auto">
            <table class="items-center w-full bg-transparent border-collapse">
              <thead>
                <tr>
                  <th :class="headClass">Teacher</th>
                  <th :class="headClass">Subject</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="assignment in assignments" :key="assignment.id">
                  <td :class="cellClass">
                    <span class="font-bold text-blueGray-700">
                      {{ displayName(assignment.teacher) }}
                    </span>
                  </td>
                  <td :class="cellClass">
                    {{ assignment.subject.name }}
                    <span class="text-blueGray-400">({{ assignment.subject.code }})</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Add students -->
    <form-modal
      :open="addOpen"
      title="Add students"
      submit-label="Enrol selected"
      busy-label="Enrolling..."
      submit-icon="fa-user-plus"
      width="lg"
      :busy="enrolling"
      :error="enrollError"
      @submit="enrolSelected"
      @close="addOpen = false"
    >
      <template #default>
        <form-field
          v-model="candidateSearch"
          label="Find a student"
          placeholder="Search by name or admission number"
          hint="Students already in this class are shown but cannot be picked."
        />

        <spinner v-if="loadingCandidates" inline label="Searching..." />

        <p
          v-else-if="!candidates.length"
          class="px-4 py-6 text-center text-sm text-blueGray-500"
        >
          No student matches that search.
        </p>

        <div
          v-else
          class="mx-4 max-h-80 overflow-y-auto rounded border border-blueGray-200 bg-white"
        >
          <label
            v-for="student in candidates"
            :key="student.id"
            class="flex items-center px-4 py-3 border-b border-solid border-blueGray-100 last:border-b-0"
            :class="enrolled.has(student.id) ? 'opacity-60' : 'cursor-pointer hover:bg-blueGray-50'"
          >
            <input
              type="checkbox"
              class="form-checkbox h-5 w-5 text-emerald-500 mr-3"
              :disabled="enrolled.has(student.id)"
              :checked="selected.includes(student.id)"
              @change="toggle(student)"
            />
            <span class="text-sm font-semibold text-blueGray-700">
              {{ student.fullName }}
            </span>
            <span class="ml-2 text-xs text-blueGray-400">
              {{ student.admissionNo }}
            </span>
            <status-badge
              v-if="enrolled.has(student.id)"
              class="ml-auto"
              status="active"
              label="In this class"
            />
          </label>
        </div>

        <p class="mx-4 mt-3 text-xs text-blueGray-500">
          {{ selected.length }} selected
        </p>
      </template>
    </form-modal>

    <confirm-dialog
      :open="confirm.open"
      :title="confirm.title"
      :message="confirm.message"
      :confirm-label="confirm.label"
      :danger="confirm.danger"
      :busy="confirm.busy"
      @confirm="runConfirm"
      @cancel="confirm.open = false"
    />
  </div>
</template>

<script>
import { useRoute } from "vue-router";

import { gql } from "@/api/client";
import ConfirmDialog from "@/components/crud/ConfirmDialog.vue";
import DataTable from "@/components/crud/DataTable.vue";
import FormField from "@/components/crud/FormField.vue";
import FormModal from "@/components/crud/FormModal.vue";
import StatCard from "@/components/crud/StatCard.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import { usePagedList } from "@/components/crud/usePagedList";
import TableDropdown from "@/components/Dropdowns/TableDropdown.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";

const PAGE_SIZE = 10;
const SEARCH_DELAY = 300;
// The backend caps a page at 200; used to mark who is already enrolled.
const ENROLLED_LIMIT = 200;

const HEAD =
  "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100";
const CELL =
  "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-blueGray-600";

const CLASS = `
  query ($id: ID!) { class(id: $id) { id name level year isActive } }
`;

const CURRENT_TERM = `
  query { academicTerms(isCurrent: true, limit: 1) { items { id name } } }
`;

const ASSIGNMENTS = `
  query ($classId: ID) {
    teacherAssignments(classId: $classId, limit: 50) {
      total
      items {
        id
        teacher { id firstName lastName email }
        subject { id name code }
      }
    }
  }
`;

const ENROLLMENTS = `
  query ($classId: ID, $termId: ID, $offset: Int!, $limit: Int!) {
    enrollments(classId: $classId, termId: $termId, offset: $offset, limit: $limit) {
      total
      items {
        id
        student { id fullName admissionNo }
      }
    }
  }
`;

const ENROLLED_IDS = `
  query ($classId: ID, $limit: Int!) {
    enrollments(classId: $classId, limit: $limit) {
      items { id student { id } }
    }
  }
`;

const STUDENTS = `
  query ($search: String, $offset: Int!, $limit: Int!) {
    students(search: $search, offset: $offset, limit: $limit) {
      total
      items { id fullName admissionNo }
    }
  }
`;

const ENROL = `
  mutation ($studentId: ID!, $classId: ID!, $termId: ID!) {
    createEnrollment(studentId: $studentId, classId: $classId, termId: $termId) { id }
  }
`;

const UNENROL = `
  mutation ($id: ID!) { deactivateEnrollment(id: $id) { id isActive } }
`;

export default {
  name: "admin-class-detail",
  components: {
    ConfirmDialog,
    DataTable,
    EmptyState,
    FormField,
    FormModal,
    Spinner,
    StatCard,
    StatusBadge,
    TableDropdown,
  },
  setup() {
    const route = useRoute();
    const classId = route.params.id;

    const students = usePagedList(
      async ({ offset, pageSize, filters }) => {
        // The term is fetched after mount; until then there is nothing to list.
        if (!filters.termId) return { items: [], total: 0 };
        const data = await gql(ENROLLMENTS, {
          classId,
          termId: filters.termId,
          offset,
          limit: pageSize,
        });
        return { items: data.enrollments.items, total: data.enrollments.total };
      },
      { pageSize: PAGE_SIZE, filters: { termId: "" } }
    );

    return { ...students, classId };
  },
  data() {
    return {
      klass: null,
      loadingClass: true,
      loadError: "",
      term: null,
      assignments: [],
      loadingAssignments: true,
      headClass: HEAD,
      cellClass: CELL,
      studentColumns: [
        { key: "name", label: "Student", slot: "cell-name" },
        { key: "admission", label: "Admission no.", slot: "cell-admission" },
      ],
      addOpen: false,
      candidateSearch: "",
      candidates: [],
      loadingCandidates: false,
      enrolled: new Set(),
      selected: [],
      enrolling: false,
      enrollError: null,
      confirm: {
        open: false,
        title: "",
        message: "",
        label: "Confirm",
        danger: false,
        busy: false,
      },
      pendingAction: null,
    };
  },
  computed: {
    studentTotal() {
      return this.total;
    },
    subjectCount() {
      return new Set(this.assignments.map((a) => a.subject.id)).size;
    },
    assignmentsUrl() {
      // The assignments page does not exist yet; it will read this filter.
      return { path: "/admin/assignments", query: { classId: this.classId } };
    },
    importUrl() {
      // The import flow opens with this class already chosen.
      return { path: "/admin/students/import", query: { classId: this.classId } };
    },
  },
  watch: {
    candidateSearch() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.loadCandidates(), SEARCH_DELAY);
    },
  },
  created() {
    this.loadClass();
  },
  methods: {
    displayName(user) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
      return name || user.email;
    },

    async loadClass() {
      this.loadingClass = true;
      try {
        const data = await gql(CLASS, { id: this.classId });
        this.klass = data.class;
        if (!this.klass) {
          this.loadError = "That class does not exist in your school.";
          return;
        }
        await Promise.all([this.loadTerm(), this.loadAssignments()]);
      } catch (error) {
        this.loadError = error.message;
      } finally {
        this.loadingClass = false;
      }
    },

    async loadTerm() {
      const data = await gql(CURRENT_TERM);
      const [current] = data.academicTerms.items;
      this.term = current || null;
      // Setting the filter is what kicks the students list into loading.
      this.filters.termId = this.term ? this.term.id : "";
    },

    async loadAssignments() {
      this.loadingAssignments = true;
      try {
        const data = await gql(ASSIGNMENTS, { classId: this.classId });
        this.assignments = data.teacherAssignments.items;
      } catch (error) {
        toastError(error.message);
      } finally {
        this.loadingAssignments = false;
      }
    },

    async openAddStudents() {
      this.addOpen = true;
      this.selected = [];
      this.enrollError = null;
      this.candidateSearch = "";
      this.candidates = [];
      await Promise.all([this.loadEnrolledIds(), this.loadCandidates()]);
    },

    /** Who is already in this class, so they can be ruled out. */
    async loadEnrolledIds() {
      try {
        const data = await gql(ENROLLED_IDS, {
          classId: this.classId,
          limit: ENROLLED_LIMIT,
        });
        this.enrolled = new Set(
          data.enrollments.items.map((enrollment) => enrollment.student.id)
        );
      } catch (error) {
        this.enrolled = new Set();
      }
    },

    async loadCandidates() {
      this.loadingCandidates = true;
      try {
        const data = await gql(STUDENTS, {
          search: this.candidateSearch.trim() || null,
          offset: 0,
          limit: 50,
        });
        this.candidates = data.students.items;
      } catch (error) {
        this.enrollError = error;
      } finally {
        this.loadingCandidates = false;
      }
    },

    toggle(student) {
      if (this.enrolled.has(student.id)) return;
      const at = this.selected.indexOf(student.id);
      if (at === -1) {
        this.selected.push(student.id);
      } else {
        this.selected.splice(at, 1);
      }
    },

    async enrolSelected() {
      this.enrollError = null;
      if (!this.selected.length) {
        this.enrollError = "Pick at least one student to enrol.";
        return;
      }

      this.enrolling = true;
      try {
        for (const studentId of this.selected) {
          await gql(ENROL, {
            studentId,
            classId: this.classId,
            termId: this.term.id,
          });
        }
        toastSuccess(
          `${this.selected.length} student${this.selected.length === 1 ? "" : "s"} enrolled.`
        );
        this.addOpen = false;
        this.selected = [];
        await this.refresh();
      } catch (error) {
        this.enrollError = error;
      } finally {
        this.enrolling = false;
      }
    },

    askRemove(enrollment) {
      const name = enrollment.student.fullName;
      this.ask({
        title: "Remove this student from the class?",
        message: `${name} will no longer be enrolled in ${this.klass.name} for ${this.term ? this.term.name : "this term"}. Their marks and history are kept.`,
        label: "Remove",
        danger: true,
        run: async () => {
          await gql(UNENROL, { id: enrollment.id });
          toastSuccess(`${name} removed from the class.`);
          await this.refresh();
        },
      });
    },

    ask({ title, message, label, danger, run }) {
      this.confirm = { open: true, title, message, label, danger, busy: false };
      this.pendingAction = run;
    },

    async runConfirm() {
      this.confirm.busy = true;
      try {
        await this.pendingAction();
        this.confirm.open = false;
      } catch (error) {
        toastError(error.message);
        this.confirm.open = false;
      } finally {
        this.confirm.busy = false;
        this.pendingAction = null;
      }
    },
  },
};
</script>
