<template>
  <div class="flex flex-wrap">
    <div class="w-full mb-12 px-4">
      <data-table
        title="Classes"
        :columns="columns"
        :rows="rows"
        :loading="loading"
        :error="error"
        loading-text="Loading classes..."
        empty-title="No classes yet"
        :empty-text="emptyText"
        empty-icon="fas fa-door-open"
        searchable
        search-placeholder="Search by name"
        :search="search"
        :pagination="{ page, pageSize, total }"
        @update:search="search = $event"
        @page-change="goToPage"
        @refresh="refresh"
      >
        <template #actions>
          <button
            type="button"
            class="bg-emerald-500 text-white active:bg-emerald-600 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none ease-linear transition-all duration-150"
            @click="openCreate"
          >
            <i class="fas fa-plus mr-1"></i> Add class
          </button>
        </template>

        <!-- Each filter takes an equal share of the row, next to the search box. -->
        <template #filters>
          <select-field
            v-model="filters.level"
            :options="levelOptions"
            placeholder="Any level"
            tone="lightBlue"
            flush
            class="flex-1 min-w-0"
          />
          <select-field
            v-model="filters.year"
            :options="yearOptions"
            placeholder="Any year"
            tone="emerald"
            flush
            class="flex-1 min-w-0"
          />
        </template>

        <template #cell-name="{ row }">
          <router-link
            :to="{ name: 'class-detail', params: { id: row.id } }"
            class="font-bold text-lightBlue-600 hover:text-lightBlue-800"
          >
            {{ row.name }}
          </router-link>
        </template>

        <template #cell-level="{ row }">Level {{ row.level }}</template>

        <template #cell-students="{ row }">{{ counted(row, "students") }}</template>

        <template #cell-teachers="{ row }">{{ counted(row, "teachers") }}</template>

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
            Add the first class
          </button>
        </template>
      </data-table>
    </div>

    <form-modal
      :open="modalOpen"
      :title="editing ? 'Edit class' : 'Add a class'"
      :submit-label="editing ? 'Save changes' : 'Create class'"
      :busy-label="editing ? 'Saving...' : 'Creating...'"
      :submit-icon="editing ? 'fa-check' : 'fa-plus'"
      :busy="saving"
      :error="submitError"
      @submit="submit"
      @close="modalOpen = false"
    >
      <template #default="{ errors }">
        <div class="flex flex-wrap">
          <div class="w-full px-4">
            <form-field
              v-model="form.name"
              label="Name"
              placeholder="Form 2A"
              required
              hint="What the class is called on the timetable."
              :error="fieldErrors.name || errors.name"
            />
          </div>
          <div class="w-full md:w-6/12 px-4">
            <select-field
              v-model="form.level"
              label="Level"
              :options="levelOptions"
              required
              hint="The form, or the primary standard."
              :error="fieldErrors.level || errors.level"
            />
          </div>
          <div class="w-full md:w-6/12 px-4">
            <form-field
              v-model="form.year"
              label="Year"
              type="number"
              required
              :error="fieldErrors.year || errors.year"
            />
          </div>
        </div>
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
import { ref, watch } from "vue";

import { gql } from "@/api/client";
import ConfirmDialog from "@/components/crud/ConfirmDialog.vue";
import DataTable from "@/components/crud/DataTable.vue";
import FormField from "@/components/crud/FormField.vue";
import FormModal from "@/components/crud/FormModal.vue";
import SelectField from "@/components/crud/SelectField.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import { usePagedList } from "@/components/crud/usePagedList";
import TableDropdown from "@/components/Dropdowns/TableDropdown.vue";
import { toastSuccess } from "@/components/ui/Toast.vue";

const PAGE_SIZE = 10;
const THIS_YEAR = new Date().getFullYear();

const CLASSES = `
  query Classes($level: Int, $year: Int, $search: String, $offset: Int!, $limit: Int!) {
    classes(level: $level, year: $year, search: $search, offset: $offset, limit: $limit) {
      total
      items { id name level year isActive }
    }
  }
`;

const CREATE_CLASS = `
  mutation ($name: String!, $level: Int!, $year: Int!) {
    createClass(name: $name, level: $level, year: $year) { id }
  }
`;

const UPDATE_CLASS = `
  mutation ($id: ID!, $name: String, $level: Int, $year: Int) {
    updateClass(id: $id, name: $name, level: $level, year: $year) { id }
  }
`;

const DEACTIVATE_CLASS = `
  mutation ($id: ID!) { deactivateClass(id: $id) { id isActive } }
`;

// One tiny query per class per count: the schema has no aggregate field, and
// asking for a single row still returns the exact `total`.
async function countFor(field, query, classId) {
  try {
    const data = await gql(query, { classId });
    return data[field].total;
  } catch (error) {
    return null;
  }
}

const ENROLLMENT_COUNT = `
  query ($classId: ID) { enrollments(classId: $classId, limit: 1) { total } }
`;
const ASSIGNMENT_COUNT = `
  query ($classId: ID) { teacherAssignments(classId: $classId, limit: 1) { total } }
`;

async function fetchClasses({ offset, pageSize, search, filters }) {
  const data = await gql(CLASSES, {
    level: filters.level ? Number(filters.level) : null,
    year: filters.year ? Number(filters.year) : null,
    search: search || null,
    offset,
    limit: pageSize,
  });
  return { items: data.classes.items, total: data.classes.total };
}

export default {
  name: "admin-classes",
  components: {
    ConfirmDialog,
    DataTable,
    FormField,
    FormModal,
    SelectField,
    StatusBadge,
    TableDropdown,
  },
  setup() {
    const list = usePagedList(fetchClasses, {
      pageSize: PAGE_SIZE,
      filters: { level: "", year: "" },
    });
    const counts = ref({});

    watch(
      list.rows,
      async (rows) => {
        if (!rows.length) {
          counts.value = {};
          return;
        }
        const measured = await Promise.all(
          rows.map(async (row) => [
            row.id,
            {
              students: await countFor("enrollments", ENROLLMENT_COUNT, row.id),
              teachers: await countFor("teacherAssignments", ASSIGNMENT_COUNT, row.id),
            },
          ])
        );
        counts.value = Object.fromEntries(measured);
      },
      { immediate: true }
    );

    return { ...list, counts };
  },
  data() {
    return {
      columns: [
        { key: "name", label: "Name", slot: "cell-name" },
        { key: "level", label: "Level", slot: "cell-level" },
        { key: "year", label: "Year" },
        { key: "students", label: "Students", slot: "cell-students", align: "right" },
        { key: "teachers", label: "Teachers", slot: "cell-teachers", align: "right" },
        { key: "status", label: "Status", slot: "cell-status" },
      ],
      levelOptions: [1, 2, 3, 4, 5, 6, 7].map((n) => ({
        value: String(n),
        label: `Level ${n}`,
      })),
      yearOptions: [THIS_YEAR + 1, THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2].map((y) => ({
        value: String(y),
        label: String(y),
      })),
      modalOpen: false,
      editing: null,
      saving: false,
      submitError: null,
      fieldErrors: {},
      form: { name: "", level: "", year: String(THIS_YEAR) },
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
      return Boolean(this.filters.level || this.filters.year);
    },
    emptyText() {
      if (this.search) return "No class matches that name.";
      if (this.hasFilters) return "No class matches those filters.";
      return "Add a class to start enrolling students into it.";
    },
  },
  methods: {
    counted(row, kind) {
      const found = this.counts[row.id];
      // null means the count could not be read; do not show a misleading zero.
      return found && found[kind] !== null ? found[kind] : "—";
    },

    openCreate() {
      this.editing = null;
      this.form = { name: "", level: "", year: String(THIS_YEAR) };
      this.fieldErrors = {};
      this.submitError = null;
      this.modalOpen = true;
    },

    openEdit(row) {
      this.editing = row;
      this.form = {
        name: row.name,
        level: String(row.level),
        year: String(row.year),
      };
      this.fieldErrors = {};
      this.submitError = null;
      this.modalOpen = true;
    },

    validate() {
      const errors = {};
      if (!this.form.name.trim()) {
        errors.name = "A name is required.";
      }
      if (!this.form.level) {
        errors.level = "Choose a level.";
      }
      if (!this.form.year) {
        errors.year = "A year is required.";
      }
      this.fieldErrors = errors;
      return Object.keys(errors).length === 0;
    },

    async submit() {
      this.submitError = null;
      if (!this.validate()) return;

      this.saving = true;
      const payload = {
        name: this.form.name.trim(),
        level: Number(this.form.level),
        year: Number(this.form.year),
      };

      try {
        if (this.editing) {
          await gql(UPDATE_CLASS, { id: this.editing.id, ...payload });
          toastSuccess("Class updated.");
        } else {
          await gql(CREATE_CLASS, payload);
          toastSuccess("Class created.");
        }
        this.modalOpen = false;
        await this.refresh();
      } catch (error) {
        this.submitError = error;
      } finally {
        this.saving = false;
      }
    },

    actionsFor(row) {
      const actions = [
        { label: "Open", action: "open", icon: "fas fa-arrow-right" },
        { label: "Edit", action: "edit", icon: "fas fa-pencil-alt" },
      ];
      // There is no reactivate mutation, so the option is only offered on an
      // active class rather than shown and failing.
      if (row.isActive) {
        actions.push({
          label: "Deactivate",
          action: "deactivate",
          icon: "fas fa-ban",
          danger: true,
        });
      }
      return actions;
    },

    runAction(action, row) {
      if (action === "open") {
        this.$router.push({ name: "class-detail", params: { id: row.id } });
        return;
      }
      if (action === "edit") {
        this.openEdit(row);
        return;
      }
      this.ask({
        title: "Deactivate this class?",
        message: `${row.name} will stop appearing in lists. Students, enrolments and assignments are kept.`,
        label: "Deactivate",
        danger: true,
        run: async () => {
          await gql(DEACTIVATE_CLASS, { id: row.id });
          toastSuccess("Class deactivated.");
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
