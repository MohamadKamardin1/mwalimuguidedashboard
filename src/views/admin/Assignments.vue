<template>
  <div class="flex flex-wrap">
    <!--
      Nothing here can work without these four. Rather than render a broken
      grid, name what is missing and link to the screen that creates it. The
      gate waits for the first read, or it would flash "set up the basics" at
      a school that already has everything.
    -->
    <spinner v-if="!checked" large label="Loading assignments..." />

    <div v-else-if="missing.length" class="w-full px-4">
      <empty-state
        title="Set up the basics first"
        :description="missingText"
        icon="fas fa-clipboard-list"
      >
        <template #action>
          <router-link
            v-for="item in missing"
            :key="item.to"
            :to="item.to"
            class="bg-emerald-500 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg mr-2 mb-2 inline-block"
          >
            <i class="fas fa-plus mr-1"></i>{{ item.label }}
          </router-link>
        </template>
      </empty-state>
    </div>

    <template v-else>
      <!-- Filters -->
      <div class="w-full px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="flex-auto p-4">
            <div class="flex flex-wrap items-end">
              <div class="w-full md:w-4/12 px-2">
                <select-field
                  v-model="termId"
                  label="Term"
                  :options="termOptions"
                />
              </div>
              <div class="w-full md:w-4/12 px-2">
                <select-field
                  v-model="classFilter"
                  label="Class"
                  placeholder="All classes"
                  :options="classOptions"
                />
              </div>
              <div class="w-full md:w-4/12 px-2">
                <select-field
                  v-model="teacherFilter"
                  label="Teacher"
                  placeholder="All teachers"
                  :options="teacherOptions"
                />
              </div>
            </div>
            <p class="px-2 mt-1 text-xs text-blueGray-400">
              The class and teacher filters narrow the matrix. The teacher's
              workload below always covers the whole term.
            </p>
          </div>
        </div>
      </div>

      <!-- Matrix -->
      <div v-if="isMatrix" class="w-full mb-12 px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <div class="flex flex-wrap items-center">
              <div class="relative w-full px-4 max-w-full flex-grow flex-1">
                <h3 class="font-semibold text-lg text-blueGray-700">
                  Assignments
                </h3>
              </div>
              <div
                class="relative w-full px-4 max-w-full flex-grow flex-1 text-right"
              >
                <ul class="flex flex-wrap list-none justify-end">
                  <li v-for="tab in tabs" :key="tab.key">
                    <button
                      type="button"
                      class="text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                      :class="
                        tab.key === activeTab
                          ? 'bg-blueGray-800 text-white'
                          : 'bg-blueGray-100 text-blueGray-600'
                      "
                      @click="activeTab = tab.key"
                    >
                      <i class="mr-1" :class="tab.icon"></i>{{ tab.label }}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <spinner v-if="loadingMatrix" large label="Loading the timetable..." />
          <div v-else-if="matrixError" class="px-8 pb-8">
            <empty-state
              title="Could not load the timetable"
              :description="matrixError"
              icon="fas fa-exclamation-triangle"
            />
          </div>

          <template v-else>
            <!-- Wide screens: the grid of classes by subjects. -->
            <div class="hidden md:block w-full overflow-x-auto pb-4">
              <table class="items-center w-full bg-transparent border-collapse">
                <thead>
                  <tr>
                    <th
                      class="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    >
                      Class
                    </th>
                    <th
                      v-for="subject in subjects"
                      :key="subject.id"
                      :title="subject.name"
                      class="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    >
                      {{ subject.code || subject.name }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="schoolClass in visibleClasses" :key="schoolClass.id">
                    <td
                      class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4"
                    >
                      <span class="font-bold text-blueGray-700">
                        {{ schoolClass.name }}
                      </span>
                    </td>
                    <td
                      v-for="subject in subjects"
                      :key="subject.id"
                      class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4"
                    >
                      <button
                        v-if="teacherAt(schoolClass.id, subject.id)"
                        type="button"
                        class="text-blueGray-700 hover:text-emerald-500 text-left"
                        @click="openAssign(schoolClass, subject)"
                      >
                        {{ teacherName(teacherAt(schoolClass.id, subject.id)) }}
                      </button>
                      <button
                        v-else
                        type="button"
                        class="text-emerald-500 hover:text-emerald-600 font-semibold"
                        @click="openAssign(schoolClass, subject)"
                      >
                        <i class="fas fa-plus mr-1"></i>Assign
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p
                v-if="!visibleClasses.length"
                class="px-8 py-6 text-sm text-blueGray-500"
              >
                No classes match that filter.
              </p>
            </div>

            <!--
              On a phone a wide grid is unusable, so the same data is shown as
              a list grouped by class.
            -->
            <div class="md:hidden px-4 pb-6">
              <div
                v-for="schoolClass in visibleClasses"
                :key="schoolClass.id"
                class="mb-4 border border-solid border-blueGray-100 rounded"
              >
                <div class="px-4 py-2 bg-blueGray-50 rounded-t">
                  <h6 class="font-bold text-blueGray-700 text-sm">
                    {{ schoolClass.name }}
                  </h6>
                </div>
                <ul class="list-none">
                  <li
                    v-for="subject in subjects"
                    :key="subject.id"
                    class="flex items-center justify-between px-4 py-3 border-t border-solid border-blueGray-100"
                  >
                    <span class="text-sm text-blueGray-600">
                      {{ subject.name }}
                    </span>
                    <button
                      v-if="teacherAt(schoolClass.id, subject.id)"
                      type="button"
                      class="text-sm font-bold text-blueGray-700 hover:text-emerald-500"
                      @click="openAssign(schoolClass, subject)"
                    >
                      {{ teacherName(teacherAt(schoolClass.id, subject.id)) }}
                    </button>
                    <button
                      v-else
                      type="button"
                      class="text-sm font-semibold text-emerald-500"
                      @click="openAssign(schoolClass, subject)"
                    >
                      <i class="fas fa-plus mr-1"></i>Assign
                    </button>
                  </li>
                </ul>
              </div>
              <p
                v-if="!visibleClasses.length"
                class="py-6 text-sm text-blueGray-500"
              >
                No classes match that filter.
              </p>
            </div>
          </template>
        </div>
      </div>

      <!-- By teacher -->
      <div v-else class="w-full mb-12 px-4">
        <data-table
          title="By teacher"
          :columns="workloadColumns"
          :rows="workloadRows"
          :loading="teachers.loading"
          :error="teachers.error"
          loading-text="Loading teachers..."
          empty-title="No teachers yet"
          empty-text="Add teachers at your school, then assign them to classes and subjects."
          empty-icon="fas fa-chalkboard-teacher"
          searchable
          search-placeholder="Search by name or email"
          :search="teachers.search"
          @update:search="teachers.search = $event"
          :pagination="{ page: teachers.page, pageSize: teachers.pageSize, total: teachers.total }"
          @page-change="teachers.goToPage"
          @refresh="teachers.refresh"
        >
          <template #actions>
            <ul class="flex flex-wrap list-none justify-end">
              <li v-for="tab in tabs" :key="tab.key">
                <button
                  type="button"
                  class="text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                  :class="
                    tab.key === activeTab
                      ? 'bg-blueGray-800 text-white'
                      : 'bg-blueGray-100 text-blueGray-600'
                  "
                  @click="activeTab = tab.key"
                >
                  <i class="mr-1" :class="tab.icon"></i>{{ tab.label }}
                </button>
              </li>
            </ul>
          </template>

          <template #cell-name="{ row }">
            <span class="font-bold text-blueGray-700">{{ row.name }}</span>
            <span class="block text-blueGray-400">{{ row.email }}</span>
          </template>

          <template #cell-classes="{ row }">{{ row.classCount }}</template>
          <template #cell-subjects="{ row }">{{ row.subjectCount }}</template>

          <template #cell-load="{ row }">
            <span
              v-for="item in row.items"
              :key="item.id"
              class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-800 bg-blueGray-200 mr-1 mb-1"
            >
              {{ item.label }}
            </span>
            <span v-if="!row.items.length" class="text-blueGray-400">
              No assignments
            </span>
          </template>

          <template #row-actions="{ row }">
            <table-dropdown
              :items="loadActions(row)"
              @select="(action) => runLoadAction(action, row)"
            />
          </template>
        </data-table>
      </div>
    </template>

    <!-- Assign / change -->
    <form-modal
      :open="assignModal.open"
      title="Assign a teacher"
      submit-label="Save assignment"
      busy-label="Saving..."
      :busy="saving"
      :error="submitError"
      @submit="saveAssignment"
      @close="assignModal.open = false"
    >
      <template #default="{ errors }">
        <div class="mb-4 px-1">
          <p class="text-xs uppercase font-bold text-blueGray-500">Class</p>
          <p class="text-blueGray-700">{{ assignModal.className }}</p>
          <p class="text-xs uppercase font-bold text-blueGray-500 mt-3">
            Subject
          </p>
          <p class="text-blueGray-700">{{ assignModal.subjectName }}</p>
        </div>

        <select-field
          v-model="assignModal.teacherId"
          label="Teacher"
          placeholder="Choose a teacher"
          required
          :options="teacherSelectOptions"
          :error="fieldErrors.teacherId || errors.teacherId"
        />

        <button
          v-if="assignModal.existingId"
          type="button"
          class="text-red-500 hover:text-red-600 text-xs font-bold uppercase mt-2"
          @click="askRemove"
        >
          <i class="fas fa-trash mr-1"></i>Remove this assignment
        </button>
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
import { reactive } from "vue";

import { gql } from "@/api/client";
import ConfirmDialog from "@/components/crud/ConfirmDialog.vue";
import DataTable from "@/components/crud/DataTable.vue";
import FormModal from "@/components/crud/FormModal.vue";
import SelectField from "@/components/crud/SelectField.vue";
import { usePagedList } from "@/components/crud/usePagedList";
import TableDropdown from "@/components/Dropdowns/TableDropdown.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";
import { useSetupStore } from "@/stores/setup";

const PAGE_SIZE = 10;
const OPTION_LIMIT = 200;
const ASSIGNMENT_LIMIT = 500;

const TERM_OPTIONS = `
  query {
    academicTerms(limit: ${OPTION_LIMIT}) {
      items { id name year isCurrent }
    }
  }
`;

const CLASSES = `
  query {
    classes(limit: ${OPTION_LIMIT}) {
      total
      items { id name level year }
    }
  }
`;

const TEACHER_OPTIONS = `
  query {
    users(role: "teacher", isActive: true, limit: ${OPTION_LIMIT}) {
      total
      items { id firstName lastName }
    }
  }
`;

const TEACHERS = `
  query Teachers($search: String, $offset: Int!, $limit: Int!) {
    users(role: "teacher", search: $search, offset: $offset, limit: $limit) {
      total
      items { id email firstName lastName }
    }
  }
`;

const ASSIGNMENTS = `
  query Assignments($termId: ID, $limit: Int!) {
    teacherAssignments(termId: $termId, limit: $limit) {
      total
      items {
        id
        isActive
        teacher { id firstName lastName }
        schoolClass { id name }
        subject { id name code }
        term { id name year }
      }
    }
  }
`;

const CREATE_ASSIGNMENT = `
  mutation ($teacherId: ID!, $classId: ID!, $subjectId: ID!, $termId: ID!) {
    createTeacherAssignment(
      teacherId: $teacherId
      classId: $classId
      subjectId: $subjectId
      termId: $termId
    ) { id }
  }
`;

const SET_ASSIGNMENT_ACTIVE = `
  mutation ($id: ID!, $isActive: Boolean!) {
    updateTeacherAssignment(id: $id, isActive: $isActive) { id isActive }
  }
`;

const DEACTIVATE_ASSIGNMENT = `
  mutation ($id: ID!) {
    deactivateTeacherAssignment(id: $id) { id isActive }
  }
`;

/**
 * Every row for one teacher+class+subject+term, active or not. The unique
 * constraint covers the inactive rows too, so a retry after a removal has to
 * find and revive the old row rather than insert a new one.
 */
const CELL_ROWS = `
  query CellRows($termId: ID, $classId: ID, $subjectId: ID, $teacherId: ID) {
    teacherAssignments(
      termId: $termId
      classId: $classId
      subjectId: $subjectId
      teacherId: $teacherId
      isActive: null
      limit: 50
    ) {
      items { id isActive }
    }
  }
`;

const WORKLOAD_COLUMNS = [
  { key: "name", label: "Teacher", slot: "cell-name" },
  { key: "classes", label: "Classes", slot: "cell-classes" },
  { key: "subjects", label: "Subjects", slot: "cell-subjects" },
  { key: "load", label: "Assignments", slot: "cell-load" },
];

function fullName(person) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email;
}

export default {
  name: "admin-assignments",
  components: {
    ConfirmDialog,
    DataTable,
    FormModal,
    SelectField,
    TableDropdown,
    EmptyState,
    Spinner,
  },

  setup() {
    // Teachers are a genuine paged, searchable endpoint, so the shared
    // composable drives this list. The workload beside each one is computed
    // from the term's assignments, which the page already holds.
    const teachers = reactive(usePagedList(fetchTeachers, { pageSize: PAGE_SIZE }));
    return { teachers };
  },

  data() {
    return {
      activeTab: "matrix",
      termId: "",
      classFilter: "",
      teacherFilter: "",
      terms: [],
      classes: [],
      teacherChoices: [],
      assignments: [],
      loadingMatrix: false,
      matrixChecked: false,
      matrixError: "",
      saving: false,
      submitError: null,
      fieldErrors: {},
      assignModal: {
        open: false,
        classId: "",
        subjectId: "",
        className: "",
        subjectName: "",
        teacherId: "",
        existingId: "",
      },
      confirm: {
        open: false,
        title: "",
        message: "",
        label: "Confirm",
        danger: false,
        busy: false,
      },
      pendingAction: null,
      workloadColumns: WORKLOAD_COLUMNS,
      tabs: [
        { key: "matrix", label: "Matrix", icon: "fas fa-th" },
        { key: "teachers", label: "By teacher", icon: "fas fa-users" },
      ],
    };
  },

  computed: {
    setupStore() {
      return useSetupStore();
    },
    isMatrix() {
      return this.activeTab === "matrix";
    },
    /** Both reads have landed, so "missing" is a fact and not just "not yet". */
    checked() {
      return this.matrixChecked && this.setupStore.loaded;
    },
    subjects() {
      return this.setupStore.activeSubjects;
    },
    /** What the page needs before a timetable means anything. */
    missing() {
      const items = [];
      if (!this.setupStore.currentTerm) {
        items.push({ label: "Add a term", to: "/admin/setup" });
      }
      if (!this.subjects.length) {
        items.push({ label: "Add a subject", to: "/admin/setup" });
      }
      if (!this.classes.length) {
        items.push({ label: "Add a class", to: "/admin/classes" });
      }
      if (!this.teacherChoices.length) {
        items.push({ label: "Add a teacher", to: "/admin/teachers" });
      }
      return items;
    },
    missingText() {
      const names = [];
      if (!this.setupStore.currentTerm) names.push("a current term");
      if (!this.subjects.length) names.push("subjects");
      if (!this.classes.length) names.push("classes");
      if (!this.teacherChoices.length) names.push("teachers");
      return `Assignments need ${names.join(", ")}. Create them first, then come back.`;
    },
    termOptions() {
      return this.terms.map((term) => ({
        value: term.id,
        label: `${term.name} ${term.year}${term.isCurrent ? " (current)" : ""}`,
      }));
    },
    classOptions() {
      return this.classes.map((schoolClass) => ({
        value: schoolClass.id,
        label: schoolClass.name,
      }));
    },
    teacherOptions() {
      return this.teacherChoices.map((teacher) => ({
        value: teacher.id,
        label: fullName(teacher),
      }));
    },
    teacherSelectOptions() {
      return this.teacherOptions;
    },
    visibleClasses() {
      if (!this.classFilter) return this.classes;
      return this.classes.filter((c) => c.id === this.classFilter);
    },
    /** cell key -> the active assignment in that class+subject, if any. */
    cells() {
      const map = new Map();
      for (const assignment of this.assignments) {
        if (!assignment.isActive) continue;
        if (this.teacherFilter && assignment.teacher.id !== this.teacherFilter) continue;
        map.set(`${assignment.schoolClass.id}|${assignment.subject.id}`, assignment);
      }
      return map;
    },
    /** One row per teacher: what they teach and how much of it. */
    workloadRows() {
      return this.teachers.rows.map((teacher) => {
        const mine = this.assignments.filter(
          (a) => a.isActive && a.teacher.id === teacher.id
        );
        return {
          id: teacher.id,
          email: teacher.email,
          name: fullName(teacher),
          classCount: new Set(mine.map((a) => a.schoolClass.id)).size,
          subjectCount: new Set(mine.map((a) => a.subject.id)).size,
          items: mine.map((a) => ({
            id: a.id,
            label: `${a.schoolClass.name} · ${a.subject.code || a.subject.name}`,
          })),
        };
      });
    },
  },

  watch: {
    termId(value) {
      this.loadAssignments(value);
    },
  },

  async mounted() {
    await this.setupStore.ensure();
    this.termId = this.setupStore.currentTermId || "";
    await this.loadMatrix();
  },

  methods: {
    fullName,

    async loadMatrix() {
      this.loadingMatrix = true;
      this.matrixError = "";
      try {
        const [terms, classes, teachers] = await Promise.all([
          gql(TERM_OPTIONS),
          gql(CLASSES),
          gql(TEACHER_OPTIONS),
        ]);
        this.terms = terms.academicTerms.items;
        this.classes = classes.classes.items;
        this.teacherChoices = teachers.users.items;
        await this.loadAssignments(this.termId);
      } catch (error) {
        this.matrixError = error.message;
      } finally {
        this.loadingMatrix = false;
        this.matrixChecked = true;
      }
    },

    async loadAssignments(termId) {
      if (!termId) {
        this.assignments = [];
        return;
      }
      const data = await gql(ASSIGNMENTS, { termId, limit: ASSIGNMENT_LIMIT });
      this.assignments = data.teacherAssignments.items;
    },

    teacherAt(classId, subjectId) {
      return this.cells.get(`${classId}|${subjectId}`) || null;
    },
    teacherName(assignment) {
      return fullName(assignment.teacher);
    },

    openAssign(schoolClass, subject) {
      const existing = this.teacherAt(schoolClass.id, subject.id);
      this.submitError = null;
      this.fieldErrors = {};
      this.assignModal = {
        open: true,
        classId: schoolClass.id,
        subjectId: subject.id,
        className: schoolClass.name,
        subjectName: subject.name,
        teacherId: existing ? existing.teacher.id : "",
        existingId: existing ? existing.id : "",
      };
    },

    async saveAssignment() {
      this.submitError = null;
      this.fieldErrors = {};
      if (!this.assignModal.teacherId) {
        this.fieldErrors = { teacherId: "Choose a teacher." };
        return;
      }
      if (!this.termId) {
        this.submitError = { message: "Pick a term first." };
        return;
      }

      const { classId, subjectId, teacherId, existingId } = this.assignModal;
      if (existingId && this.teacherAt(classId, subjectId)?.teacher.id === teacherId) {
        this.assignModal.open = false;
        return;
      }

      this.saving = true;
      try {
        await this.putTeacherInCell({ classId, subjectId, teacherId });
        // Only once the new teacher is safely in place, so a failure never
        // leaves the cell empty.
        if (existingId) {
          await gql(DEACTIVATE_ASSIGNMENT, { id: existingId });
        }
        toastSuccess("Assignment saved.");
        this.assignModal.open = false;
        await this.afterChange();
      } catch (error) {
        this.applyAssignError(error);
      } finally {
        this.saving = false;
      }
    },

    /**
     * There is no mutation that changes an assignment's teacher, and the
     * unique constraint also covers deactivated rows. So: revive this
     * teacher's old row for the cell if one exists, otherwise create it.
     */
    async putTeacherInCell({ classId, subjectId, teacherId }) {
      const existing = await gql(CELL_ROWS, {
        termId: this.termId,
        classId,
        subjectId,
        teacherId,
      });
      const row = existing.teacherAssignments.items[0];
      if (row) {
        await gql(SET_ASSIGNMENT_ACTIVE, { id: row.id, isActive: true });
        return;
      }
      try {
        await gql(CREATE_ASSIGNMENT, {
          teacherId,
          classId,
          subjectId,
          termId: this.termId,
        });
      } catch (error) {
        // A clash here means the row appeared between the read and the write.
        if (!/already teaches/i.test(error.message)) throw error;
        const retry = await gql(CELL_ROWS, {
          termId: this.termId,
          classId,
          subjectId,
          teacherId,
        });
        const found = retry.teacherAssignments.items[0];
        if (!found) throw error;
        await gql(SET_ASSIGNMENT_ACTIVE, { id: found.id, isActive: true });
      }
    },

    /** The API attaches no field to a failure, so the message is the clue. */
    applyAssignError(error) {
      const message = error.message || "";
      if (/teacher/i.test(message)) {
        this.fieldErrors = { teacherId: message };
        return;
      }
      this.submitError = error;
    },

    askRemove() {
      const { existingId, className, subjectName } = this.assignModal;
      this.assignModal.open = false;
      const assignment = this.assignments.find((a) => a.id === existingId);
      this.ask({
        title: "Remove assignment",
        message: `${className} · ${subjectName} is left without a teacher. The record is kept, and the same teacher can be put back later.`,
        label: "Remove",
        danger: true,
        run: () => this.removeAssignment(assignment || { id: existingId }),
      });
    },

    async removeAssignment(assignment) {
      await gql(DEACTIVATE_ASSIGNMENT, { id: assignment.id });
      toastSuccess("Assignment removed.");
      await this.afterChange();
    },

    /** The by-teacher list: one remove entry per assignment they hold. */
    loadActions(row) {
      if (!row.items.length) return [{ label: "No assignments", action: "none" }];
      return row.items.map((item) => ({
        label: `Remove · ${item.label}`,
        action: item.id,
        icon: "fas fa-trash",
        danger: true,
      }));
    },

    runLoadAction(action, row) {
      if (action === "none") return undefined;
      const assignment = this.assignments.find((a) => a.id === action);
      if (!assignment) return undefined;
      return this.ask({
        title: "Remove assignment",
        message: `${row.name} stops teaching ${assignment.schoolClass.name} · ${assignment.subject.name}. The record is kept, and they can be put back later.`,
        label: "Remove",
        danger: true,
        run: () => this.removeAssignment(assignment),
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

    /** Refresh the timetable and the teacher list after any change. */
    async afterChange() {
      await Promise.all([this.loadAssignments(this.termId), this.teachers.refresh()]);
    },
  },
};

async function fetchTeachers({ offset, pageSize, search }) {
  const data = await gql(TEACHERS, {
    search: search || null,
    offset,
    limit: pageSize,
  });
  return { items: data.users.items, total: data.users.total };
}
</script>
