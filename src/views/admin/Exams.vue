<template>
  <div class="flex flex-wrap">
    <div class="w-full mb-12 px-4">
      <data-table
        title="Exams"
        :columns="columns"
        :rows="rows"
        :loading="loading"
        :error="error"
        loading-text="Loading exams..."
        empty-title="No exams yet"
        :empty-text="emptyText"
        empty-icon="fas fa-file-alt"
        :pagination="{ page, pageSize, total }"
        clickable
        @page-change="goToPage"
        @refresh="refresh"
        @row-click="open"
      >
        <!-- Each filter takes an equal share of the row, with its own colour so
             they are told apart at a glance. -->
        <template #filters>
          <select-field
            v-model="filters.termId"
            :options="termOptions"
            placeholder="Any term"
            tone="lightBlue"
            flush
            class="flex-1 min-w-0"
          />
          <select-field
            v-model="filters.classId"
            :options="classOptions"
            placeholder="Any class"
            tone="emerald"
            flush
            class="flex-1 min-w-0"
          />
          <select-field
            v-model="filters.subjectId"
            :options="subjectOptions"
            placeholder="Any subject"
            tone="amber"
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
        </template>

        <template #cell-title="{ row }">
          <router-link
            :to="{ name: 'exam-detail', params: { id: row.id } }"
            class="font-bold text-lightBlue-600 hover:text-lightBlue-800"
          >
            {{ row.title }}
          </router-link>
        </template>

        <template #cell-subject="{ row }">{{ row.subject.name }}</template>

        <template #cell-class="{ row }">{{ row.schoolClass.name }}</template>

        <template #cell-teacher="{ row }">
          {{ teacherName(row.createdBy) }}
        </template>

        <template #cell-term="{ row }">
          {{ row.term.name }} {{ row.term.year }}
        </template>

        <template #cell-status="{ row }">
          <status-badge :status="row.status" />
        </template>

        <template #cell-scripts="{ row }">{{ scriptCount(row) }}</template>

        <template #cell-date="{ row }">{{ shortDate(row.createdAt) }}</template>

        <template #empty-action>
          <router-link
            v-if="!hasFilters"
            to="/admin/exams"
            class="bg-blueGray-800 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg"
          >
            Exams are created by teachers
          </router-link>
        </template>
      </data-table>
    </div>
  </div>
</template>

<script>
import { ref, watch } from "vue";

import { gql } from "@/api/client";
import DataTable from "@/components/crud/DataTable.vue";
import SelectField from "@/components/crud/SelectField.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import { usePagedList } from "@/components/crud/usePagedList";

const PAGE_SIZE = 10;

/** The statuses the backend can hold, in pipeline order. */
const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "extracting", label: "Extracting" },
  { value: "needs_confirmation", label: "Needs confirmation" },
  { value: "ready", label: "Ready" },
  { value: "marking", label: "Marking" },
  { value: "review", label: "Review" },
  { value: "finalized", label: "Finalized" },
];

const EXAMS = `
  query Exams($termId: ID, $classId: ID, $subjectId: ID, $status: String, $offset: Int!, $limit: Int!) {
    exams(
      termId: $termId
      classId: $classId
      subjectId: $subjectId
      status: $status
      offset: $offset
      limit: $limit
    ) {
      total
      items {
        id
        title
        status
        createdAt
        totalMarks
        subject { id name }
        schoolClass { id name }
        term { id name year }
        createdBy { id firstName lastName email }
      }
    }
  }
`;

const LOOKUPS = `
  query {
    academicTerms(limit: 100) { items { id name year } }
    classes(limit: 200) { items { id name } }
    curriculumSubjects { id name code }
  }
`;

// ExamType carries no counts, so each row asks the scripts list for its total --
// exactly as the classes list does for its student and teacher numbers.
//
// Only the total is read. The schema cannot answer "how many are marked":
// Script.status never advances past `extracted`, so a marked count would be
// a column of zeroes.
const SCRIPT_COUNT = `
  query ($examId: ID!) { scripts(examId: $examId, limit: 1) { total } }
`;

async function fetchExams({ offset, pageSize, filters }) {
  const data = await gql(EXAMS, {
    termId: filters.termId || null,
    classId: filters.classId || null,
    subjectId: filters.subjectId || null,
    status: filters.status || null,
    offset,
    limit: pageSize,
  });
  return { items: data.exams.items, total: data.exams.total };
}

function fullName(user) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.email;
}

function shortDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default {
  name: "admin-exams",
  components: { DataTable, SelectField, StatusBadge },
  setup() {
    const list = usePagedList(fetchExams, {
      pageSize: PAGE_SIZE,
      filters: { termId: "", classId: "", subjectId: "", status: "" },
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
          rows.map(async (row) => {
            try {
              const data = await gql(SCRIPT_COUNT, { examId: row.id });
              return [row.id, data.scripts.total];
            } catch (error) {
              // null means "could not read"; a zero would be a lie.
              return [row.id, null];
            }
          })
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
        { key: "title", label: "Title", slot: "cell-title" },
        { key: "subject", label: "Subject", slot: "cell-subject" },
        { key: "class", label: "Class", slot: "cell-class" },
        { key: "teacher", label: "Teacher", slot: "cell-teacher" },
        { key: "term", label: "Term", slot: "cell-term" },
        { key: "status", label: "Status", slot: "cell-status" },
        { key: "scripts", label: "Scripts", slot: "cell-scripts", align: "right" },
        { key: "date", label: "Created", slot: "cell-date" },
      ],
      termOptions: [],
      classOptions: [],
      subjectOptions: [],
      statusOptions: STATUSES.map((s) => ({ value: s.value, label: s.label })),
    };
  },
  computed: {
    hasFilters() {
      return Boolean(
        this.filters.termId || this.filters.classId || this.filters.subjectId || this.filters.status
      );
    },
    emptyText() {
      if (this.hasFilters) return "No exam matches those filters.";
      return "Exams appear here as soon as a teacher creates one.";
    },
  },
  created() {
    this.loadLookups();
  },
  methods: {
    async loadLookups() {
      try {
        const data = await gql(LOOKUPS);
        this.termOptions = data.academicTerms.items.map((t) => ({
          value: t.id,
          label: `${t.name} ${t.year}`,
        }));
        this.classOptions = data.classes.items.map((c) => ({ value: c.id, label: c.name }));
        this.subjectOptions = data.curriculumSubjects.map((s) => ({
          value: s.id,
          label: s.name,
        }));
      } catch (error) {
        // The filters simply stay empty; the list still works without them.
      }
    },

    teacherName(user) {
      return user ? fullName(user) : "—";
    },

    scriptCount(row) {
      const found = this.counts[row.id];
      return found === null || found === undefined ? "—" : found;
    },

    shortDate,

    open(row) {
      this.$router.push({ name: "exam-detail", params: { id: row.id } });
    },
  },
};
</script>
