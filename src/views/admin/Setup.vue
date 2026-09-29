<template>
  <div class="flex flex-wrap">
    <!--
      Only shown once the cache has actually been read, so a slow first load
      never flashes "no current term" at an admin who has one.
    -->
    <div v-if="showNoTermBanner" class="w-full px-4">
      <div
        class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-amber-200"
      >
        <div class="flex-auto p-4 flex items-start">
          <i
            class="fas fa-exclamation-triangle mr-3 mt-1 text-amber-600"
          ></i>
          <div>
            <h6 class="text-amber-700 font-bold">No current term</h6>
            <p class="text-sm text-amber-700 mt-1">
              Set a current term before creating exams or assignments.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="w-full mb-12 px-4">
      <!--
        One table for both tabs: the columns and the row data come from
        whichever tab is active, so there is a single set of slots below.
      -->
      <data-table
        :title="title"
        :columns="columns"
        :rows="list.rows"
        :loading="list.loading"
        :error="list.error"
        :loading-text="loadingText"
        :empty-title="emptyTitle"
        :empty-text="emptyText"
        :empty-icon="emptyIcon"
        :searchable="searchable"
        :search-placeholder="searchPlaceholder"
        :search="searchText"
        @update:search="searchText = $event"
        :pagination="{ page: list.page, pageSize: list.pageSize, total: list.total }"
        @page-change="list.goToPage"
        @refresh="list.refresh"
      >
        <template #actions>
          <div class="flex flex-wrap items-center justify-end">
            <!--
              Always present, not just in the empty state: without it there is
              no way to add a second row.
            -->
            <button
              type="button"
              class="bg-emerald-500 text-white active:bg-emerald-600 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-2 mb-1 ease-linear transition-all duration-150"
              @click="openForm()"
            >
              <i class="fas fa-plus mr-1"></i>
              {{ isTerms ? "Add term" : "Add subject" }}
            </button>
            <ul class="flex flex-wrap list-none">
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
        </template>

        <template #cell-status="{ row }">
          <status-badge
            :status="activeTab === 'terms' ? termState(row) : subjectState(row)"
          />
        </template>

        <!-- The API sends ISO dates; the table shows them readable. -->
        <template #cell-startDate="{ row }">{{ formatDate(row.startDate) }}</template>
        <template #cell-endDate="{ row }">{{ formatDate(row.endDate) }}</template>

        <template #row-actions="{ row }">
          <table-dropdown
            :items="rowActions(row)"
            @select="(action) => runRowAction(action, row)"
          />
        </template>

        <template v-if="activeTab === 'terms'" #empty-action>
          <button
            type="button"
            class="bg-emerald-500 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg"
            @click="openTermForm(null)"
          >
            <i class="fas fa-plus mr-1"></i> Add the first term
          </button>
        </template>
        <template v-else #empty-action>
          <button
            type="button"
            class="bg-emerald-500 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg"
            @click="openSubjectForm(null)"
          >
            <i class="fas fa-plus mr-1"></i> Add the first subject
          </button>
        </template>

        <template v-if="activeTab === 'subjects'" #filters>
          <label class="inline-flex items-center text-xs font-bold uppercase text-blueGray-500 cursor-pointer">
            <input v-model="showInactive" type="checkbox" class="form-checkbox mr-2" />
            Show inactive
          </label>
        </template>
      </data-table>
    </div>

    <!-- Term form -->
    <form-modal
      :open="termForm.open"
      :title="termForm.id ? 'Edit term' : 'Add a term'"
      :submit-label="termForm.id ? 'Save changes' : 'Create term'"
      busy-label="Saving..."
      :busy="saving"
      :error="submitError"
      @submit="submitTerm"
      @close="termForm.open = false"
    >
      <template #default="{ errors }">
        <form-field
          v-model="termForm.name"
          label="Name"
          placeholder="Term 1"
          required
          :error="fieldErrors.name || errors.name"
        />
        <form-field
          v-model="termForm.year"
          label="Year"
          type="number"
          placeholder="2026"
          required
          :error="fieldErrors.year || errors.year"
        />
        <form-field
          v-model="termForm.startDate"
          label="Start date"
          type="date"
          required
          :error="fieldErrors.startDate || errors.startDate"
        />
        <form-field
          v-model="termForm.endDate"
          label="End date"
          type="date"
          required
          hint="The term's last day."
          :error="fieldErrors.endDate || errors.endDate"
        />
      </template>
    </form-modal>

    <!-- Subject form -->
    <form-modal
      :open="subjectForm.open"
      :title="subjectForm.id ? 'Edit subject' : 'Add a subject'"
      :submit-label="subjectForm.id ? 'Save changes' : 'Create subject'"
      busy-label="Saving..."
      :busy="saving"
      :error="submitError"
      @submit="submitSubject"
      @close="subjectForm.open = false"
    >
      <template #default="{ errors }">
        <form-field
          v-model="subjectForm.name"
          label="Name"
          placeholder="Mathematics"
          required
          :error="fieldErrors.name || errors.name"
        />
        <form-field
          :model-value="subjectForm.code"
          label="Code"
          placeholder="MATH"
          required
          hint="Capital letters, e.g. MATH. Must be unique in your school."
          :error="fieldErrors.code || errors.code"
          @update:model-value="onCodeInput"
        />
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
import DataTable from "@/components/crud/DataTable.vue";
import FormField from "@/components/crud/FormField.vue";
import FormModal from "@/components/crud/FormModal.vue";
import { mapApiError } from "@/components/crud/errors";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import { usePagedList } from "@/components/crud/usePagedList";
import ConfirmDialog from "@/components/crud/ConfirmDialog.vue";
import TableDropdown from "@/components/Dropdowns/TableDropdown.vue";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";
import { useSetupStore } from "@/stores/setup";

const PAGE_SIZE = 10;

const TERMS = `
  query Terms($offset: Int!, $limit: Int!) {
    academicTerms(offset: $offset, limit: $limit) {
      total
      items { id name year startDate endDate isCurrent isActive }
    }
  }
`;

// `isActive: null` means "no filter", so deactivated subjects stay visible --
// the Active column is how the admin finds them again.
const SUBJECTS = `
  query Subjects($search: String, $offset: Int!, $limit: Int!, $isActive: Boolean) {
    subjects(search: $search, isActive: $isActive, offset: $offset, limit: $limit) {
      total
      items { id name code isActive }
    }
  }
`;

const CREATE_TERM = `
  mutation ($name: String!, $year: Int!, $startDate: Date!, $endDate: Date!) {
    createAcademicTerm(name: $name, year: $year, startDate: $startDate, endDate: $endDate) {
      id
    }
  }
`;

const UPDATE_TERM = `
  mutation ($id: ID!, $name: String, $year: Int, $startDate: Date, $endDate: Date) {
    updateAcademicTerm(id: $id, name: $name, year: $year, startDate: $startDate, endDate: $endDate) {
      id
    }
  }
`;

const SET_TERM_CURRENT = `
  mutation ($id: ID!, $isCurrent: Boolean!) {
    updateAcademicTerm(id: $id, isCurrent: $isCurrent) { id isCurrent }
  }
`;

const CREATE_SUBJECT = `
  mutation ($name: String!, $code: String!) {
    createSubject(name: $name, code: $code) { id }
  }
`;

const UPDATE_SUBJECT = `
  mutation ($id: ID!, $name: String, $code: String) {
    updateSubject(id: $id, name: $name, code: $code) { id }
  }
`;

const DEACTIVATE_SUBJECT = `
  mutation ($id: ID!) {
    deactivateSubject(id: $id) { id isActive }
  }
`;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** The Date scalar is an ISO yyyy-mm-dd string. */
function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const TERM_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "year", label: "Year" },
  { key: "startDate", label: "Start" },
  { key: "endDate", label: "End" },
  { key: "status", label: "Status", slot: "cell-status" },
];

const SUBJECT_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "code", label: "Code" },
  { key: "status", label: "Status", slot: "cell-status" },
];

export default {
  name: "admin-setup",
  components: {
    DataTable,
    FormField,
    FormModal,
    StatusBadge,
    ConfirmDialog,
    TableDropdown,
  },

  setup() {
    // Both lists are created here so each keeps its own page/search state as
    // the admin switches tabs. `reactive` so `terms.rows` reads as the array
    // rather than the ref.
    const terms = reactive(
      usePagedList(fetchTerms, { pageSize: PAGE_SIZE })
    );
    const subjects = reactive(
      // The initial filter is passed in rather than assigned after mount, so
      // the deep watcher does not fire a second, duplicate first request.
      usePagedList(fetchSubjects, {
        pageSize: PAGE_SIZE,
        filters: { showInactive: false },
      })
    );
    return { terms, subjects };
  },

  data() {
    return {
      activeTab: "terms",
      showInactive: false,
      saving: false,
      submitError: null,
      fieldErrors: {},
      termForm: { open: false, id: null, name: "", year: "", startDate: "", endDate: "" },
      subjectForm: { open: false, id: null, name: "", code: "" },
      confirm: { open: false, title: "", message: "", label: "Confirm", danger: false, busy: false },
      pendingAction: null,
      tabs: [
        { key: "terms", label: "Terms", icon: "fas fa-calendar-alt" },
        { key: "subjects", label: "Subjects", icon: "fas fa-book" },
      ],
    };
  },

  computed: {
    setupStore() {
      return useSetupStore();
    },
    isTerms() {
      return this.activeTab === "terms";
    },
    list() {
      return this.isTerms ? this.terms : this.subjects;
    },
    title() {
      return this.isTerms ? "Terms" : "Subjects";
    },
    columns() {
      return this.isTerms ? TERM_COLUMNS : SUBJECT_COLUMNS;
    },
    searchable() {
      // academicTerms has no search argument, so the box would do nothing.
      return !this.isTerms;
    },
    searchPlaceholder() {
      return "Search by name or code";
    },
    /** The active list's search, so one v-model serves both tabs. */
    searchText: {
      get() {
        return this.list.search;
      },
      set(value) {
        this.list.search = value;
      },
    },
    loadingText() {
      return this.isTerms ? "Loading terms..." : "Loading subjects...";
    },
    emptyTitle() {
      return this.isTerms ? "No terms yet" : "No subjects yet";
    },
    emptyText() {
      if (this.isTerms) {
        return "Add the school year's terms, then mark the one running now as current.";
      }
      return "Add the subjects your school teaches. Exams and assignments are built on them.";
    },
    emptyIcon() {
      return this.isTerms ? "fas fa-calendar-alt" : "fas fa-book";
    },
    showNoTermBanner() {
      const store = this.setupStore;
      return store.loaded && !store.hasCurrentTerm && !store.error;
    },
  },

  watch: {
    // The subject list asks the server to filter; the checkbox drives that.
    showInactive(value) {
      this.subjects.filters.showInactive = value;
    },
  },

  mounted() {
    // Other pages read this cache, so it is filled as soon as the page opens.
    this.setupStore.ensure();
  },

  methods: {
    formatDate,

    // "Current" wins outright; otherwise the term is judged against today.
    termState(row) {
      if (row.isCurrent) return "current";
      return row.startDate > today() ? "upcoming" : "past";
    },
    subjectState(row) {
      return row.isActive ? "active" : "inactive";
    },

    rowActions(row) {
      if (this.isTerms) {
        const items = [
          { label: "Edit", action: "edit", icon: "fas fa-pen" },
        ];
        if (!row.isCurrent) {
          items.push({
            label: "Set as current",
            action: "current",
            icon: "fas fa-check-circle",
          });
        }
        return items;
      }
      const items = [{ label: "Edit", action: "edit", icon: "fas fa-pen" }];
      if (row.isActive) {
        items.push({
          label: "Deactivate",
          action: "deactivate",
          icon: "fas fa-ban",
          danger: true,
        });
      } else {
        // The API exposes no way back: there is `deactivateSubject` but no
        // `activateSubject`, and `updateSubject` cannot set `isActive`.
        items.push({
          label: "Activate (not supported by the API)",
          action: "activate",
          icon: "fas fa-undo",
        });
      }
      return items;
    },

    runRowAction(action, row) {
      if (this.isTerms) {
        if (action === "edit") return this.openTermForm(row);
        if (action === "current") return this.askSetCurrent(row);
        return undefined;
      }
      if (action === "edit") return this.openSubjectForm(row);
      if (action === "deactivate") return this.askDeactivateSubject(row);
      if (action === "activate") {
        return toastError(
          "The API has no activateSubject mutation, so a subject cannot be reactivated yet."
        );
      }
      return undefined;
    },

    /** Shared confirm runner: keeps the pending action until it resolves. */
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

    // --- terms --------------------------------------------------------------

    /** The header's Add button, for whichever tab is showing. */
    openForm() {
      if (this.isTerms) this.openTermForm(null);
      else this.openSubjectForm(null);
    },

    openTermForm(row) {
      this.submitError = null;
      this.fieldErrors = {};
      this.termForm = row
        ? {
            open: true,
            id: row.id,
            name: row.name,
            year: String(row.year),
            startDate: row.startDate,
            endDate: row.endDate,
          }
        : { open: true, id: null, name: "", year: "", startDate: "", endDate: "" };
    },

    validateTerm() {
      const errors = {};
      const year = Number(this.termForm.year);
      if (!this.termForm.name.trim()) errors.name = "Give the term a name.";
      if (!this.termForm.year) errors.year = "A year is required.";
      else if (!Number.isInteger(year) || year < 1900 || year > 2200) {
        errors.year = "Enter a year like 2026.";
      }
      if (!this.termForm.startDate) errors.startDate = "Pick a start date.";
      if (!this.termForm.endDate) errors.endDate = "Pick an end date.";
      else if (this.termForm.startDate && this.termForm.endDate <= this.termForm.startDate) {
        errors.endDate = "The end date must be after the start date.";
      }
      return errors;
    },

    async submitTerm() {
      this.submitError = null;
      const errors = this.validateTerm();
      this.fieldErrors = errors;
      if (Object.keys(errors).length) return;

      this.saving = true;
      try {
        const variables = {
          name: this.termForm.name.trim(),
          year: Number(this.termForm.year),
          startDate: this.termForm.startDate,
          endDate: this.termForm.endDate,
        };
        if (this.termForm.id) {
          await gql(UPDATE_TERM, { id: this.termForm.id, ...variables });
          toastSuccess("Term saved.");
        } else {
          await gql(CREATE_TERM, variables);
          toastSuccess("Term created.");
        }
        this.termForm.open = false;
        await this.afterChange();
      } catch (error) {
        this.applyTermError(error);
      } finally {
        this.saving = false;
      }
    },

    /**
     * The API reports failures as a plain message with no field attached, so
     * a message that names the term is kept inline on the name field and
     * anything else is shown as a general error by the modal.
     */
    applyTermError(error) {
      const { general } = mapApiError(error);
      if (general && /named|already exists|conflicts/i.test(general)) {
        this.fieldErrors = { ...this.fieldErrors, name: general };
        return;
      }
      this.submitError = error;
    },

    askSetCurrent(row) {
      this.ask({
        title: "Set as current term",
        message: `"${row.name} ${row.year}" becomes the current term. Its exams and assignments are the ones staff work on. Only one term can be current, so any other current term is cleared.`,
        label: "Set as current",
        danger: false,
        run: () => this.setCurrent(row),
      });
    },

    /**
     * The API does not enforce a single current term: `updateAcademicTerm`
     * only sets the flag, so without this the school ends up with two. This
     * clear-then-set order means the failure mode is "no current term" (loud,
     * via the banner) rather than two terms silently both being current.
     */
    async setCurrent(row) {
      const previous = this.setupStore.currentTerm;
      if (previous && previous.id !== row.id) {
        await gql(SET_TERM_CURRENT, { id: previous.id, isCurrent: false });
      }
      await gql(SET_TERM_CURRENT, { id: row.id, isCurrent: true });
      toastSuccess(`"${row.name} ${row.year}" is now the current term.`);
      await this.afterChange();
    },

    // --- subjects -----------------------------------------------------------

    openSubjectForm(row) {
      this.submitError = null;
      this.fieldErrors = {};
      this.subjectForm = row
        ? { open: true, id: row.id, name: row.name, code: row.code }
        : { open: true, id: null, name: "", code: "" };
    },

    validateSubject() {
      const errors = {};
      if (!this.subjectForm.name.trim()) errors.name = "Give the subject a name.";
      if (!this.subjectForm.code.trim()) errors.code = "A code is required.";
      else if (this.subjectForm.code !== this.subjectForm.code.toUpperCase()) {
        errors.code = "Use capital letters only.";
      }
      return errors;
    },

    /** Codes are stored as given, so they are capitalised as they are typed. */
    onCodeInput(value) {
      this.subjectForm.code = value.toUpperCase();
    },

    async submitSubject() {
      this.submitError = null;
      const errors = this.validateSubject();
      this.fieldErrors = errors;
      if (Object.keys(errors).length) return;

      this.saving = true;
      try {
        const name = this.subjectForm.name.trim();
        const code = this.subjectForm.code.trim().toUpperCase();
        if (this.subjectForm.id) {
          await gql(UPDATE_SUBJECT, { id: this.subjectForm.id, name, code });
          toastSuccess("Subject saved.");
        } else {
          await gql(CREATE_SUBJECT, { name, code });
          toastSuccess("Subject created.");
        }
        this.subjectForm.open = false;
        await this.afterChange();
      } catch (error) {
        this.applySubjectError(error);
      } finally {
        this.saving = false;
      }
    },

    /** A code clash is the one failure the message names, so it goes inline. */
    applySubjectError(error) {
      const { general } = mapApiError(error);
      if (general && /code/i.test(general)) {
        this.fieldErrors = { ...this.fieldErrors, code: general };
        return;
      }
      this.submitError = error;
    },

    askDeactivateSubject(row) {
      this.ask({
        title: "Deactivate subject",
        message: `"${row.name}" is hidden from new exams and assignments. It stays in the list and keeps its past results.`,
        label: "Deactivate",
        danger: true,
        run: () => this.deactivateSubject(row),
      });
    },

    async deactivateSubject(row) {
      await gql(DEACTIVATE_SUBJECT, { id: row.id });
      toastSuccess(`"${row.name}" deactivated.`);
      await this.afterChange();
    },

    // --- shared -------------------------------------------------------------

    /** Refresh the visible list and drop the cache the other pages read. */
    async afterChange() {
      this.setupStore.invalidate();
      await Promise.all([this.list.refresh(), this.setupStore.fetchAll()]);
    },
  },
};

async function fetchTerms({ offset, pageSize }) {
  const data = await gql(TERMS, { offset, limit: pageSize });
  return { items: data.academicTerms.items, total: data.academicTerms.total };
}

async function fetchSubjects({ offset, pageSize, search, filters }) {
  const data = await gql(SUBJECTS, {
    search: search || null,
    // `null` is the API's "either state"; the checkbox decides.
    isActive: filters.showInactive ? null : true,
    offset,
    limit: pageSize,
  });
  return { items: data.subjects.items, total: data.subjects.total };
}
</script>
