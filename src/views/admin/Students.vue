<template>
  <div class="flex flex-wrap">
    <div class="w-full mb-12 px-4">
      <data-table
        title="Students"
        :columns="columns"
        :rows="rows"
        :loading="loading"
        :error="error"
        loading-text="Loading students..."
        empty-title="No students yet"
        :empty-text="emptyText"
        empty-icon="fas fa-user-graduate"
        searchable
        search-placeholder="Search by name or admission number"
        clickable
        :search="search"
        :pagination="{ page, pageSize, total }"
        @update:search="search = $event"
        @page-change="goToPage"
        @refresh="refresh"
        @row-click="openProfile"
      >
        <template #actions>
          <router-link
            :to="{ path: '/admin/students/import' }"
            class="bg-blueGray-800 text-white active:bg-blueGray-600 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 ease-linear transition-all duration-150 inline-block"
          >
            <i class="fas fa-file-upload mr-1"></i> Import CSV
          </router-link>
          <button
            type="button"
            class="bg-emerald-500 text-white active:bg-emerald-600 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none ease-linear transition-all duration-150"
            @click="openCreate"
          >
            <i class="fas fa-user-plus mr-1"></i> Add student
          </button>
        </template>

        <!-- Each filter takes an equal share of the row, next to the search box. -->
        <template #filters>
          <select-field
            v-model="filters.classId"
            :options="classOptions"
            placeholder="Any class"
            tone="lightBlue"
            flush
            class="flex-1 min-w-0"
          />
          <select-field
            v-model="filters.isActive"
            :options="statusOptions"
            placeholder="Any status"
            tone="emerald"
            flush
            class="flex-1 min-w-0"
          />
        </template>

        <template #cell-admission="{ row }">
          <span class="font-bold text-blueGray-700">{{ row.admissionNo }}</span>
        </template>

        <template #cell-gender="{ row }">{{ genderLabel(row.gender) }}</template>

        <template #cell-class="{ row }">
          <span v-if="currentClass(row)">{{ currentClass(row).name }}</span>
          <span v-else class="text-blueGray-400">Not enrolled</span>
        </template>

        <template #cell-status="{ row }">
          <status-badge :status="row.isActive ? 'active' : 'inactive'" />
        </template>

        <template #row-actions="{ row }">
          <table-dropdown :items="actionsFor(row)" @select="runAction($event, row)" />
        </template>

        <template #empty-action>
          <button
            v-if="!search && !hasFilters"
            type="button"
            class="bg-emerald-500 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg ease-linear transition-all duration-150"
            @click="openCreate"
          >
            Add the first student
          </button>
        </template>
      </data-table>
    </div>

    <!-- Add / edit -->
    <form-modal
      :open="modalOpen"
      :title="editing ? 'Edit student' : 'Add a student'"
      :submit-label="editing ? 'Save changes' : 'Create student'"
      :busy-label="editing ? 'Saving...' : 'Creating...'"
      :submit-icon="editing ? 'fa-check' : 'fa-user-plus'"
      width="lg"
      :busy="saving"
      :error="submitError"
      @submit="submit"
      @close="modalOpen = false"
    >
      <template #default="{ errors }">
        <div class="flex flex-wrap">
          <div class="w-full md:w-6/12 px-4">
            <form-field
              v-model="form.admissionNo"
              label="Admission number"
              placeholder="A001"
              required
              :error="fieldErrors.admissionNo || errors.admissionNo"
            />
          </div>
          <div class="w-full md:w-6/12 px-4">
            <form-field
              v-model="form.fullName"
              label="Full name"
              placeholder="Amina Yusuf"
              required
              :error="fieldErrors.fullName || errors.fullName"
            />
          </div>
          <div class="w-full md:w-6/12 px-4">
            <select-field
              v-model="form.gender"
              label="Gender"
              :options="genderOptions"
              placeholder="Choose..."
              required
              :error="fieldErrors.gender || errors.gender"
            />
          </div>
          <div class="w-full md:w-6/12 px-4">
            <form-field
              v-model="form.dateOfBirth"
              label="Date of birth"
              type="date"
              hint="Optional."
            />
          </div>
          <div class="w-full px-4">
            <select-field
              v-model="form.classId"
              label="Class"
              :options="classOptions"
              :placeholder="term ? 'Do not enrol yet' : 'No current term'"
              :disabled="!term"
              :hint="
                term
                  ? `Enrols them into this class for ${term.name}.`
                  : 'This school has no current term, so nobody can be enrolled.'
              "
            />
          </div>
        </div>
      </template>
    </form-modal>

    <!-- Profile -->
    <drawer
      :open="profileOpen"
      :title="profile ? profile.fullName : ''"
      :subtitle="profile ? `Admission ${profile.admissionNo}` : ''"
      width="lg"
      @close="profileOpen = false"
    >
      <template v-if="profile">
        <h6 class="text-blueGray-400 text-sm mb-4 font-bold uppercase">
          Profile
        </h6>
        <ul class="list-none mb-6">
          <li class="py-2 border-b border-solid border-blueGray-200 flex justify-between">
            <span class="text-sm text-blueGray-500">Admission number</span>
            <span class="text-sm font-semibold text-blueGray-700">{{ profile.admissionNo }}</span>
          </li>
          <li class="py-2 border-b border-solid border-blueGray-200 flex justify-between">
            <span class="text-sm text-blueGray-500">Gender</span>
            <span class="text-sm font-semibold text-blueGray-700">{{ genderLabel(profile.gender) }}</span>
          </li>
          <li class="py-2 border-b border-solid border-blueGray-200 flex justify-between">
            <span class="text-sm text-blueGray-500">Date of birth</span>
            <span class="text-sm font-semibold text-blueGray-700">
              {{ profile.dateOfBirth || "Not recorded" }}
            </span>
          </li>
          <li class="py-2 flex justify-between items-center">
            <span class="text-sm text-blueGray-500">Status</span>
            <status-badge :status="profile.isActive ? 'active' : 'inactive'" />
          </li>
        </ul>

        <h6 class="text-blueGray-400 text-sm mb-4 font-bold uppercase">
          Enrolment history
        </h6>

        <spinner v-if="loadingHistory" inline label="Loading..." />

        <p v-else-if="!history.length" class="text-sm text-blueGray-500">
          Not enrolled in any class yet.
        </p>

        <table v-else class="items-center w-full bg-transparent border-collapse">
          <thead>
            <tr>
              <th :class="headClass">Class</th>
              <th :class="headClass">Term</th>
              <th :class="headClass">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in history" :key="row.id">
              <td :class="cellClass">{{ row.schoolClass.name }}</td>
              <td :class="cellClass">{{ row.term.name }} {{ row.term.year }}</td>
              <td :class="cellClass">
                <status-badge :status="row.isActive ? 'active' : 'past'" />
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </drawer>

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
import { ref, watch } from "vue";

import { gql } from "@/api/client";
import ConfirmDialog from "@/components/crud/ConfirmDialog.vue";
import DataTable from "@/components/crud/DataTable.vue";
import Drawer from "@/components/crud/Drawer.vue";
import FormField from "@/components/crud/FormField.vue";
import FormModal from "@/components/crud/FormModal.vue";
import SelectField from "@/components/crud/SelectField.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import { usePagedList } from "@/components/crud/usePagedList";
import TableDropdown from "@/components/Dropdowns/TableDropdown.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { toastSuccess } from "@/components/ui/Toast.vue";

const PAGE_SIZE = 10;

const HEAD =
  "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100";
const CELL =
  "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-blueGray-600";

const STUDENTS = `
  query Students($search: String, $classId: ID, $isActive: Boolean, $offset: Int!, $limit: Int!) {
    students(search: $search, classId: $classId, isActive: $isActive, offset: $offset, limit: $limit) {
      total
      items { id fullName admissionNo gender dateOfBirth isActive }
    }
  }
`;

const CLASSES = `
  query { classes(limit: 200) { items { id name level year isActive } } }
`;

const CURRENT_TERM = `
  query { academicTerms(isCurrent: true, limit: 1) { items { id name } } }
`;

// One student's enrolment for the current term: at most one row, so `limit: 1`
// is exact rather than a sample.
const CURRENT_ENROLMENT = `
  query ($studentId: ID, $termId: ID) {
    enrollments(studentId: $studentId, termId: $termId, limit: 1) {
      items { id schoolClass { id name } }
    }
  }
`;

const HISTORY = `
  query ($studentId: ID) {
    enrollments(studentId: $studentId, isActive: null, limit: 50) {
      items {
        id
        isActive
        schoolClass { id name }
        term { id name year }
      }
    }
  }
`;

const CREATE_STUDENT = `
  mutation ($fullName: String!, $admissionNo: String!, $gender: String!, $dateOfBirth: Date) {
    createStudent(
      fullName: $fullName
      admissionNo: $admissionNo
      gender: $gender
      dateOfBirth: $dateOfBirth
    ) { id }
  }
`;

const UPDATE_STUDENT = `
  mutation ($id: ID!, $fullName: String, $admissionNo: String, $gender: String, $dateOfBirth: Date) {
    updateStudent(
      id: $id
      fullName: $fullName
      admissionNo: $admissionNo
      gender: $gender
      dateOfBirth: $dateOfBirth
    ) { id }
  }
`;

const SET_ACTIVE = `
  mutation ($id: ID!, $isActive: Boolean) {
    updateStudent(id: $id, isActive: $isActive) { id isActive }
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

async function fetchStudents({ offset, pageSize, search, filters }) {
  const data = await gql(STUDENTS, {
    search: search || null,
    classId: filters.classId || null,
    // "" means either; the API wants a real boolean or nothing.
    isActive: filters.isActive === "" ? null : filters.isActive === "true",
    offset,
    limit: pageSize,
  });
  return { items: data.students.items, total: data.students.total };
}

export default {
  name: "admin-students",
  components: {
    ConfirmDialog,
    DataTable,
    Drawer,
    FormField,
    FormModal,
    SelectField,
    Spinner,
    StatusBadge,
    TableDropdown,
  },
  setup() {
    const list = usePagedList(fetchStudents, {
      pageSize: PAGE_SIZE,
      filters: { classId: "", isActive: "" },
    });
    /** student id -> { id, name } of their class this term. */
    const enrolments = ref({});

    watch(
      list.rows,
      async (rows) => {
        if (!rows.length || !list.filters.value.termId) {
          enrolments.value = {};
          return;
        }
        const termId = list.filters.value.termId;
        const found = await Promise.all(
          rows.map(async (row) => {
            try {
              const data = await gql(CURRENT_ENROLMENT, { studentId: row.id, termId });
              const [enrolment] = data.enrollments.items;
              return [row.id, enrolment ? { id: enrolment.id, ...enrolment.schoolClass } : null];
            } catch (error) {
              return [row.id, null];
            }
          })
        );
        enrolments.value = Object.fromEntries(found);
      },
      { immediate: true }
    );

    return { ...list, enrolments };
  },
  data() {
    return {
      columns: [
        { key: "admissionNo", label: "Admission no.", slot: "cell-admission" },
        { key: "fullName", label: "Full name" },
        { key: "gender", label: "Gender", slot: "cell-gender" },
        { key: "class", label: "Current class", slot: "cell-class" },
        { key: "status", label: "Status", slot: "cell-status" },
      ],
      genderOptions: [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
      ],
      statusOptions: [
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" },
      ],
      classOptions: [],
      term: null,
      headClass: HEAD,
      cellClass: CELL,
      profile: null,
      profileOpen: false,
      history: [],
      loadingHistory: false,
      modalOpen: false,
      editing: null,
      originalEnrolmentId: null,
      saving: false,
      submitError: null,
      fieldErrors: {},
      form: { admissionNo: "", fullName: "", gender: "", dateOfBirth: "", classId: "" },
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
    hasFilters() {
      return Boolean(this.filters.classId || this.filters.isActive);
    },
    emptyText() {
      if (this.search) return "No student matches that name or number.";
      if (this.hasFilters) return "No student matches those filters.";
      return "Add students one at a time, or import a CSV.";
    },
  },
  created() {
    this.loadClasses();
  },
  methods: {
    genderLabel(gender) {
      if (gender === "male") return "Male";
      if (gender === "female") return "Female";
      return gender || "—";
    },

    currentClass(row) {
      return this.enrolments[row.id] || null;
    },

    async loadClasses() {
      try {
        const [classes, terms] = await Promise.all([
          gql(CLASSES),
          gql(CURRENT_TERM),
        ]);
        this.classOptions = classes.classes.items.map((c) => ({
          value: c.id,
          label: `${c.name} (${c.year})`,
        }));
        const [current] = terms.academicTerms.items;
        this.term = current || null;

        // The per-row class lookup needs the term, so the list loads after it.
        this.filters.termId = this.term ? this.term.id : "";
      } catch (error) {
        // The list still works without the class column filled in.
      }
    },

    openCreate() {
      this.editing = null;
      this.originalEnrolmentId = null;
      this.form = {
        admissionNo: "",
        fullName: "",
        gender: "",
        dateOfBirth: "",
        classId: "",
      };
      this.fieldErrors = {};
      this.submitError = null;
      this.modalOpen = true;
    },

    async openEdit(row) {
      this.editing = row;
      const current = this.currentClass(row);
      this.originalEnrolmentId = current ? current.id : null;
      this.form = {
        admissionNo: row.admissionNo,
        fullName: row.fullName,
        gender: row.gender,
        dateOfBirth: row.dateOfBirth || "",
        classId: current ? current.id : "",
      };
      this.fieldErrors = {};
      this.submitError = null;
      this.modalOpen = true;
    },

    validate() {
      const errors = {};
      if (!this.form.admissionNo.trim()) errors.admissionNo = "An admission number is required.";
      if (!this.form.fullName.trim()) errors.fullName = "A name is required.";
      if (!this.form.gender) errors.gender = "Choose a gender.";
      this.fieldErrors = errors;
      return Object.keys(errors).length === 0;
    },

    async submit() {
      this.submitError = null;
      if (!this.validate()) return;

      this.saving = true;
      const payload = {
        fullName: this.form.fullName.trim(),
        admissionNo: this.form.admissionNo.trim(),
        gender: this.form.gender,
        dateOfBirth: this.form.dateOfBirth || null,
      };

      try {
        if (this.editing) {
          await gql(UPDATE_STUDENT, { id: this.editing.id, ...payload });
          await this.syncEnrolment(this.editing.id);
          toastSuccess("Student updated.");
        } else {
          const data = await gql(CREATE_STUDENT, payload);
          if (this.form.classId && this.term) {
            await gql(ENROL, {
              studentId: data.createStudent.id,
              classId: this.form.classId,
              termId: this.term.id,
            });
          }
          toastSuccess("Student created.");
        }
        this.modalOpen = false;
        await this.refresh();
      } catch (error) {
        this.submitError = error;
      } finally {
        this.saving = false;
      }
    },

    /** Moving a student between classes means closing one enrolment, opening another. */
    async syncEnrolment(studentId) {
      if (!this.term) return;
      if (this.form.classId === (this.currentClass(this.editing) || {}).id) return;

      if (this.originalEnrolmentId) {
        await gql(UNENROL, { id: this.originalEnrolmentId });
      }
      if (this.form.classId) {
        await gql(ENROL, { studentId, classId: this.form.classId, termId: this.term.id });
      }
    },

    async openProfile(row) {
      this.profile = row;
      this.profileOpen = true;
      this.history = [];
      this.loadingHistory = true;
      try {
        const data = await gql(HISTORY, { studentId: row.id });
        this.history = data.enrollments.items;
      } catch (error) {
        this.history = [];
      } finally {
        this.loadingHistory = false;
      }
    },

    actionsFor(row) {
      return [
        { label: "View profile", action: "view", icon: "fas fa-id-card" },
        { label: "Edit", action: "edit", icon: "fas fa-pencil-alt" },
        {
          label: row.isActive ? "Deactivate" : "Activate",
          action: row.isActive ? "deactivate" : "activate",
          icon: row.isActive ? "fas fa-user-slash" : "fas fa-user-check",
          danger: row.isActive,
        },
      ];
    },

    runAction(action, row) {
      if (action === "view") return this.openProfile(row);
      if (action === "edit") return this.openEdit(row);

      const activating = action === "activate";
      this.ask({
        title: activating ? "Activate this student?" : "Deactivate this student?",
        message: activating
          ? `${row.fullName} will be counted as an active student again.`
          : `${row.fullName} will stop appearing in class lists. Their marks and history are kept.`,
        label: activating ? "Activate" : "Deactivate",
        danger: !activating,
        run: async () => {
          await gql(SET_ACTIVE, { id: row.id, isActive: activating });
          toastSuccess(activating ? "Student activated." : "Student deactivated.");
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
      } finally {
        this.confirm.busy = false;
        this.pendingAction = null;
      }
    },
  },
};
</script>
