<template>
  <div class="flex flex-wrap">
    <!-- Shown once, straight after an account is created or reset. -->
    <div v-if="issued" class="w-full px-4">
      <one-time-secret-panel
        :title="issued.title"
        :email="issued.email"
        :password="issued.password"
      />
    </div>

    <div class="w-full mb-12 px-4">
      <data-table
        title="Teachers"
        :columns="columns"
        :rows="rows"
        :loading="loading"
        :error="error"
        loading-text="Loading teachers..."
        empty-title="No teachers yet"
        :empty-text="emptyText"
        empty-icon="fas fa-chalkboard-teacher"
        searchable
        search-placeholder="Search by name or email"
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
            @click="openAdd"
          >
            <i class="fas fa-user-plus mr-1"></i> Add teacher
          </button>
        </template>

        <template #cell-name="{ row }">
          <span class="font-bold text-blueGray-700">{{ displayName(row) }}</span>
        </template>

        <template #cell-classes="{ row }">{{ counts[row.id] || 0 }}</template>

        <template #cell-status="{ row }">
          <status-badge :status="row.isActive ? 'active' : 'inactive'" />
          <status-badge
            v-if="row.mustChangePassword"
            status="warning"
            label="Password"
            class="ml-1"
          />
        </template>

        <template #row-actions="{ row }">
          <table-dropdown :items="actionsFor(row)" @select="runAction($event, row)" />
        </template>

        <template #empty-action>
          <button
            v-if="!search"
            type="button"
            class="bg-emerald-500 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg ease-linear transition-all duration-150"
            @click="openAdd"
          >
            Add the first teacher
          </button>
        </template>
      </data-table>
    </div>

    <form-modal
      :open="adding"
      title="Add a teacher"
      submit-label="Create teacher"
      busy-label="Creating..."
      submit-icon="fa-user-plus"
      :busy="saving"
      :error="submitError"
      @submit="submitAdd"
      @close="adding = false"
    >
      <template #default="{ errors }">
        <h6 class="text-blueGray-400 text-sm mb-6 px-4 font-bold uppercase">
          Teacher information
        </h6>

        <div class="flex flex-wrap">
          <div class="w-full px-4">
            <form-field
              v-model="form.name"
              label="Full name"
              placeholder="Amina Yusuf"
              required
              :error="fieldErrors.name || errors.name"
            />
          </div>

          <div class="w-full px-4">
            <form-field
              v-model="form.email"
              label="Email address"
              type="email"
              placeholder="amina@school.tz"
              required
              :error="fieldErrors.email || errors.email"
            />
          </div>
        </div>

        <div class="mx-4 mt-2 flex items-start rounded bg-blueGray-200 px-4 py-3">
          <i class="fas fa-info-circle text-blueGray-500 mt-1 mr-3"></i>
          <p class="text-xs text-blueGray-600">
            The first password is generated for you and shown once. They will be
            asked to choose their own the first time they sign in.
          </p>
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
import OneTimeSecretPanel from "@/components/crud/OneTimeSecretPanel.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import { usePagedList } from "@/components/crud/usePagedList";
import TableDropdown from "@/components/Dropdowns/TableDropdown.vue";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";

const PAGE_SIZE = 10;
// The backend caps a page at 200; one request covers the count for a whole
// school rather than one call per row.
const COUNT_LIMIT = 200;

const TEACHERS = `
  query Teachers($role: String, $search: String, $offset: Int!, $limit: Int!) {
    users(role: $role, search: $search, offset: $offset, limit: $limit) {
      total
      items { id email firstName lastName isActive mustChangePassword }
    }
  }
`;

const ASSIGNMENTS = `
  query {
    teacherAssignments(limit: ${COUNT_LIMIT}) {
      items { teacher { id } }
    }
  }
`;

const CREATE_TEACHER = `
  mutation ($email: String!, $role: String!, $firstName: String!, $lastName: String!) {
    createUser(
      email: $email
      role: $role
      firstName: $firstName
      lastName: $lastName
    ) {
      temporaryPassword
      user { id email }
    }
  }
`;

const RESET_PASSWORD = `
  mutation ($userId: ID!) {
    resetUserPassword(userId: $userId) {
      temporaryPassword
      user { id email }
    }
  }
`;

const SET_ACTIVE = `
  mutation ($userId: ID!, $isActive: Boolean!) {
    setUserActive(userId: $userId, isActive: $isActive) { id isActive }
  }
`;

/** The shape `usePagedList` expects, whatever the query behind it. */
async function fetchTeachers({ offset, pageSize, search }) {
  const data = await gql(TEACHERS, {
    role: "teacher",
    search: search || null,
    offset,
    limit: pageSize,
  });
  return { items: data.users.items, total: data.users.total };
}

/** How many classes each teacher on this page is assigned to. */
async function fetchCounts() {
  try {
    const data = await gql(ASSIGNMENTS);
    const counts = {};
    for (const assignment of data.teacherAssignments.items) {
      const id = assignment.teacher.id;
      counts[id] = (counts[id] || 0) + 1;
    }
    return counts;
  } catch (error) {
    // A count is decoration; the list should still render without it.
    return {};
  }
}

export default {
  name: "admin-teachers",
  components: {
    ConfirmDialog,
    DataTable,
    FormField,
    FormModal,
    OneTimeSecretPanel,
    StatusBadge,
    TableDropdown,
  },
  setup() {
    const list = usePagedList(fetchTeachers, { pageSize: PAGE_SIZE });
    const counts = ref({});

    // Recounted whenever the page changes, including after a create or reset.
    watch(
      list.rows,
      async (rows) => {
        counts.value = rows.length ? await fetchCounts() : {};
      },
      { immediate: true }
    );

    return { ...list, counts };
  },
  data() {
    return {
      columns: [
        { key: "name", label: "Name", slot: "cell-name" },
        { key: "email", label: "Email" },
        { key: "classes", label: "Classes", slot: "cell-classes" },
        { key: "status", label: "Status", slot: "cell-status" },
      ],
      issued: null,
      adding: false,
      saving: false,
      submitError: null,
      fieldErrors: {},
      form: { name: "", email: "" },
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
    emptyText() {
      return this.search
        ? "Nobody matches that search."
        : "Add the teachers at your school and hand each of them their first password.";
    },
  },
  methods: {
    displayName(teacher) {
      const name = [teacher.firstName, teacher.lastName].filter(Boolean).join(" ");
      return name || teacher.email;
    },

    openAdd() {
      this.form = { name: "", email: "" };
      this.fieldErrors = {};
      this.submitError = null;
      this.adding = true;
    },

    /** Checked here because the API has no field-level errors to rely on. */
    validate() {
      const errors = {};
      if (!this.form.name.trim()) {
        errors.name = "A name is required.";
      }
      const email = this.form.email.trim();
      if (!email) {
        errors.email = "An email address is required.";
      } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        errors.email = "That does not look like an email address.";
      }
      this.fieldErrors = errors;
      return Object.keys(errors).length === 0;
    },

    async submitAdd() {
      this.submitError = null;
      if (!this.validate()) return;

      this.saving = true;

      // The API keeps first and last name apart; split on the first space.
      const name = this.form.name.trim();
      const cut = name.indexOf(" ");
      const firstName = cut === -1 ? name : name.slice(0, cut);
      const lastName = cut === -1 ? "" : name.slice(cut + 1);

      try {
        const data = await gql(CREATE_TEACHER, {
          email: this.form.email.trim(),
          role: "teacher",
          firstName,
          lastName,
        });
        this.adding = false;
        this.issued = {
          title: "Teacher created. Copy their password now",
          email: data.createUser.user.email,
          password: data.createUser.temporaryPassword,
        };
        toastSuccess("Teacher created.");
        await this.refresh();
      } catch (error) {
        // Kept in the modal so the typed values survive the failure.
        this.submitError = error;
      } finally {
        this.saving = false;
      }
    },

    actionsFor(teacher) {
      return [
        { label: "Reset password", action: "reset", icon: "fas fa-key" },
        {
          label: teacher.isActive ? "Deactivate" : "Activate",
          action: teacher.isActive ? "deactivate" : "activate",
          icon: teacher.isActive ? "fas fa-user-slash" : "fas fa-user-check",
          danger: teacher.isActive,
        },
      ];
    },

    runAction(action, teacher) {
      if (action === "reset") {
        this.ask({
          title: "Reset this teacher's password?",
          message: `${this.displayName(teacher)} will not be able to sign in with their old password. You will be shown the new one once.`,
          label: "Reset password",
          danger: true,
          run: () => this.resetPassword(teacher),
        });
        return;
      }

      const activating = action === "activate";
      this.ask({
        title: activating ? "Activate this account?" : "Deactivate this account?",
        message: activating
          ? `${this.displayName(teacher)} will be able to sign in again.`
          : `${this.displayName(teacher)} will not be able to sign in. Their marks and history are kept.`,
        label: activating ? "Activate" : "Deactivate",
        danger: !activating,
        run: () => this.setActive(teacher, activating),
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

    async resetPassword(teacher) {
      const data = await gql(RESET_PASSWORD, { userId: teacher.id });
      this.issued = {
        title: "Password reset. Copy the new one now",
        email: data.resetUserPassword.user.email,
        password: data.resetUserPassword.temporaryPassword,
      };
      toastSuccess("Password reset.");
      await this.refresh();
    },

    async setActive(teacher, isActive) {
      await gql(SET_ACTIVE, { userId: teacher.id, isActive });
      toastSuccess(isActive ? "Account activated." : "Account deactivated.");
      await this.refresh();
    },
  },
};
</script>
