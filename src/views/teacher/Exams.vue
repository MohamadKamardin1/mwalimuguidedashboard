<template>
  <div class="flex flex-wrap">
    <div class="w-full px-4">
      <div class="flex flex-wrap items-center mb-4">
        <div class="flex-1">
          <h3 class="font-semibold text-lg text-blueGray-700">My exams</h3>
          <p class="text-sm text-blueGray-400">
            Every exam you own, newest first. Open one to carry on where it stopped.
          </p>
        </div>
        <router-link
          to="/teacher/exams/new"
          class="h-11 inline-flex items-center bg-emerald-500 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg mt-3 sm:mt-0"
        >
          <i class="fas fa-plus mr-1"></i> New exam
        </router-link>
      </div>
    </div>

    <!-- Desktop: the shared table. -->
    <div class="hidden md:block w-full mb-12 px-4">
      <data-table
        title=""
        :columns="columns"
        :rows="rows"
        :loading="loading"
        :error="error"
        loading-text="Loading your exams..."
        empty-title="No exams yet"
        :empty-text="emptyText"
        empty-icon="fas fa-file-alt"
        searchable
        search-placeholder="Search by title"
        :search="search"
        :pagination="{ page, pageSize, total }"
        @update:search="search = $event"
        @page-change="goToPage"
        @refresh="refresh"
      >
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
            v-model="filters.status"
            :options="statusOptions"
            placeholder="Any status"
            tone="teal"
            flush
            class="flex-1 min-w-0"
          />
          <select-field
            v-model="filters.termId"
            :options="termOptions"
            placeholder="Any term"
            tone="amber"
            flush
            class="flex-1 min-w-0"
          />
        </template>

        <template #cell-title="{ row }">
          <router-link
            :to="{ name: 'teacher-exam', params: { id: row.id } }"
            class="font-bold text-lightBlue-600 hover:text-lightBlue-800"
          >
            {{ row.title }}
          </router-link>
          <p class="text-xs text-blueGray-400">{{ row.subject.name }}</p>
        </template>

        <template #cell-class="{ row }">{{ row.schoolClass.name }}</template>

        <template #cell-term="{ row }">{{ row.term.name }} {{ row.term.year }}</template>

        <template #cell-status="{ row }">
          <status-badge :status="row.status" />
        </template>

        <template #cell-progress="{ row }">
          <div class="flex items-center min-w-0">
            <div class="flex-1 bg-blueGray-200 rounded-full h-1 mr-2">
              <div
                class="h-1 rounded-full"
                :class="progressColor(row.status)"
                :style="{ width: progressPercent(row.status) + '%' }"
              ></div>
            </div>
            <span class="text-xs text-blueGray-400 flex-none">
              {{ stepLabel(row.status) }}
            </span>
          </div>
        </template>

        <template #cell-date="{ row }">{{ formatDate(row.createdAt) }}</template>

        <template #empty-action>
          <router-link
            v-if="!hasFilters && !search"
            to="/teacher/exams/new"
            class="h-11 inline-flex items-center bg-emerald-500 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg"
          >
            Create your first exam
          </router-link>
        </template>
      </data-table>
    </div>

    <!-- Mobile: the same rows as cards, because a seven-column table cannot
         be read at 375px. -->
    <div class="md:hidden w-full px-4">
      <spinner v-if="loading" large label="Loading your exams..." />

      <empty-state
        v-else-if="error"
        title="Could not load your exams"
        :description="error"
        icon="fas fa-exclamation-triangle"
      >
        <template #action>
          <button
            type="button"
            class="h-11 bg-blueGray-800 text-white text-xs font-bold uppercase px-4 rounded"
            @click="refresh"
          >
            Try again
          </button>
        </template>
      </empty-state>

      <empty-state
        v-else-if="!rows.length"
        title="No exams yet"
        :description="emptyText"
        icon="fas fa-file-alt"
      >
        <template #action>
          <router-link
            to="/teacher/exams/new"
            class="h-11 inline-flex items-center bg-emerald-500 text-white text-xs font-bold uppercase px-4 rounded shadow"
          >
            Create your first exam
          </router-link>
        </template>
      </empty-state>

      <template v-else>
        <div
          v-for="row in rows"
          :key="row.id"
          class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white"
        >
          <router-link
            :to="{ name: 'teacher-exam', params: { id: row.id } }"
            class="block px-4 py-4"
          >
            <div class="flex flex-wrap items-start">
              <div class="flex-1 min-w-0 pr-2">
                <p class="font-bold text-blueGray-700">{{ row.title }}</p>
                <p class="text-xs text-blueGray-400 mt-1">
                  {{ row.schoolClass.name }} &middot; {{ row.subject.name }}
                </p>
              </div>
              <status-badge class="flex-none" :status="row.status" />
            </div>

            <div class="flex items-center mt-3">
              <div class="flex-1 bg-blueGray-200 rounded-full h-1 mr-2">
                <div
                  class="h-1 rounded-full"
                  :class="progressColor(row.status)"
                  :style="{ width: progressPercent(row.status) + '%' }"
                ></div>
              </div>
              <span class="text-xs text-blueGray-400 flex-none">
                {{ stepLabel(row.status) }}
              </span>
            </div>

            <p class="text-xs text-blueGray-400 mt-3">
              {{ row.term.name }} {{ row.term.year }} &middot; {{ formatDate(row.createdAt) }}
            </p>
          </router-link>
        </div>

        <pagination
          v-if="total > pageSize"
          :page="page"
          :page-size="pageSize"
          :total="total"
          @change="goToPage"
        />
      </template>
    </div>
  </div>
</template>

<script>
import { gql } from "@/api/client";
import DataTable from "@/components/crud/DataTable.vue";
import Pagination from "@/components/crud/Pagination.vue";
import SelectField from "@/components/crud/SelectField.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import { usePagedList } from "@/components/crud/usePagedList";
import { currentStep, progressColor, progressPercent } from "@/components/teacher/examPipeline";
import EmptyState from "@/components/ui/EmptyState.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { formatDate } from "@/lib/insights";
import { useAuthStore } from "@/stores/auth";
import { useSetupStore } from "@/stores/setup";

const PAGE_SIZE = 10;
// A teacher owns a handful of exams; the whole set is read once so that the
// title search can work at all -- `exams` has no `search` argument.
const FETCH_LIMIT = 100;

const EXAMS = `
  query MyExams($classId: ID, $termId: ID, $status: String, $limit: Int!) {
    exams(classId: $classId, termId: $termId, status: $status, limit: $limit) {
      items {
        id title status createdAt totalMarks
        subject { id name }
        schoolClass { id name }
        term { id name year }
        createdBy { id }
      }
    }
  }
`;

const TERMS = `query { academicTerms(limit: 100) { items { id name year } } }`;

// `classes` would answer this too; the assignments are what the teacher
// actually teaches, so the filter offers only those.
const ASSIGNED_CLASSES = `
  query ($teacherId: ID) {
    teacherAssignments(teacherId: $teacherId, limit: 100) {
      items { id schoolClass { id name } }
    }
  }
`;

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "extracting", label: "Extracting" },
  { value: "needs_confirmation", label: "Needs confirmation" },
  { value: "ready", label: "Ready" },
  { value: "marking", label: "Marking" },
  { value: "review", label: "Review" },
  { value: "finalized", label: "Finalized" },
];

export default {
  name: "teacher-exams",
  components: { DataTable, EmptyState, Pagination, SelectField, Spinner, StatusBadge },
  data() {
    return {
      columns: [
        { key: "title", label: "Exam", slot: "cell-title" },
        { key: "class", label: "Class", slot: "cell-class" },
        { key: "term", label: "Term", slot: "cell-term" },
        { key: "status", label: "Status", slot: "cell-status" },
        { key: "progress", label: "Progress", slot: "cell-progress" },
        { key: "date", label: "Created", slot: "cell-date" },
      ],
      statusOptions: STATUSES.map((item) => ({ value: item.value, label: item.label })),
      termOptions: [],
      classOptions: [],
    };
  },
  setup() {
    const auth = useAuthStore();
    const setup = useSetupStore();

    // Filters run on the server; the title search runs here, over the rows the
    // server returned. `total` is therefore the searched count.
    async function fetchExams({ offset, pageSize, search, filters }) {
      const data = await gql(EXAMS, {
        classId: filters.classId || null,
        termId: filters.termId || null,
        status: filters.status || null,
        limit: FETCH_LIMIT,
      });

      const mine = data.exams.items.filter(
        (exam) => !auth.user || exam.createdBy.id === auth.user.id
      );
      const needle = search.trim().toLowerCase();
      const matched = needle
        ? mine.filter((exam) => exam.title.toLowerCase().includes(needle))
        : mine;

      return {
        items: matched.slice(offset, offset + pageSize),
        total: matched.length,
      };
    }

    const list = usePagedList(fetchExams, {
      pageSize: PAGE_SIZE,
      filters: { classId: "", status: "", termId: "" },
    });

    // Spread so the template can use `rows`, `search`, `filters` and the rest
    // directly, the same way the admin lists do.
    return { ...list, setup, auth };
  },
  computed: {
    hasFilters() {
      return Boolean(this.filters.classId || this.filters.status || this.filters.termId);
    },
    emptyText() {
      if (this.search) return "No exam title matches that.";
      if (this.hasFilters) return "No exam matches those filters.";
      return "Create one to get started.";
    },
  },
  async created() {
    await this.setup.ensure();
    if (this.setup.currentTermId) {
      // Default to the term in progress; the teacher can widen it.
      this.filters.termId = this.setup.currentTermId;
    }
    await this.loadLookups();
  },
  methods: {
    progressPercent,
    progressColor,
    formatDate,

    stepLabel(status) {
      return currentStep(status).label;
    },

    async loadLookups() {
      try {
        const [terms, assignments] = await Promise.all([
          gql(TERMS),
          gql(ASSIGNED_CLASSES, { teacherId: this.auth.user ? this.auth.user.id : null }),
        ]);
        this.termOptions = terms.academicTerms.items.map((term) => ({
          value: term.id,
          label: `${term.name} ${term.year}`,
        }));

        const seen = new Map();
        for (const item of assignments.teacherAssignments.items) {
          seen.set(item.schoolClass.id, item.schoolClass.name);
        }
        this.classOptions = [...seen].map(([value, label]) => ({ value, label }));
      } catch (error) {
        // Without lookups the two filters simply stay empty.
      }
    },
  },
};
</script>
