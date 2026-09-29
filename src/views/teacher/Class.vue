<template>
  <div class="flex flex-wrap">
    <spinner v-if="loading" large label="Loading this class..." />

    <div v-else-if="error" class="w-full px-4">
      <empty-state
        title="Could not load this class"
        :description="error"
        icon="fas fa-exclamation-triangle"
      />
    </div>

    <template v-else>
      <!-- Header -->
      <div class="w-full px-4">
        <div class="flex flex-wrap items-center mb-4">
          <div class="flex-1">
            <h3 class="font-semibold text-lg text-blueGray-700">
              {{ className }}
            </h3>
            <p class="text-sm text-blueGray-400">
              {{ subjectName }} · {{ totalStudents }} student{{
                totalStudents === 1 ? "" : "s"
              }}
            </p>
          </div>
          <div v-if="subjectChoices.length > 1" class="w-full md:w-64 mt-2 md:mt-0">
            <select-field v-model="subjectId" label="Subject" :options="subjectChoices" />
          </div>
        </div>

        <!-- The reports this class and subject already feed. -->
        <div class="flex flex-wrap items-center mb-2">
          <router-link
            :to="{
              name: 'report-class',
              params: { classId },
              query: { subjectId: curriculumSubjectId, termId },
            }"
            class="h-11 inline-flex items-center text-blueGray-600 hover:text-blueGray-800 text-xs font-bold uppercase px-4 rounded hover:bg-blueGray-100"
          >
            <i class="fas fa-users mr-1"></i> Class report
          </router-link>
          <router-link
            :to="{
              name: 'report-progress-class',
              params: { classId },
              query: { subjectId: curriculumSubjectId, termId },
            }"
            class="h-11 inline-flex items-center text-blueGray-600 hover:text-blueGray-800 text-xs font-bold uppercase px-4 rounded hover:bg-blueGray-100"
          >
            <i class="fas fa-chart-line mr-1"></i> Class progress
          </router-link>
        </div>
      </div>

      <!-- Stats -->
      <div class="w-full px-4">
        <div class="flex flex-wrap">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="w-6/12 xl:w-3/12 px-2 mb-4"
          >
            <div
              class="relative flex flex-col min-w-0 break-words bg-white rounded shadow-lg p-4"
            >
              <span class="text-xs uppercase font-bold text-blueGray-400">
                {{ stat.label }}
              </span>
              <span
                class="text-2xl font-bold"
                :class="stat.classes || 'text-blueGray-700'"
              >
                {{ stat.value }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="w-full mb-12 px-4">
        <ul class="flex flex-wrap list-none mb-2">
          <li v-for="tab in tabs" :key="tab.key">
            <button
              type="button"
              class="text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
              :class="
                tab.key === activeTab
                  ? 'bg-blueGray-800 text-white'
                  : 'bg-white text-blueGray-600'
              "
              @click="activeTab = tab.key"
            >
              <i class="mr-1" :class="tab.icon"></i>{{ tab.label }}
            </button>
          </li>
        </ul>

        <!-- Students -->
        <data-table
          v-if="activeTab === 'students'"
          title="Students"
          :columns="studentColumns"
          :rows="students.rows"
          :loading="students.loading"
          :error="students.error"
          loading-text="Loading students..."
          empty-title="No students in this class"
          empty-text="Nobody is enrolled yet. Your administrator adds students to this class."
          empty-icon="fas fa-user-graduate"
          searchable
          search-placeholder="Search by name or admission number"
          :search="students.search"
          @update:search="students.search = $event"
          :pagination="{ page: students.page, pageSize: students.pageSize, total: students.total }"
          @page-change="students.goToPage"
          @refresh="students.refresh"
        >
          <template #cell-name="{ row }">
            <router-link
              :to="{ name: 'teacher-student', params: { id: row.id } }"
              class="font-bold text-blueGray-700 hover:text-emerald-500"
            >
              {{ row.fullName }}
            </router-link>
          </template>

          <template #cell-score="{ row }">
            <span :class="masteryBand(row.lastScore).text" class="font-bold">
              {{ formatScore(row.lastScore) }}
            </span>
          </template>

          <template #cell-trend="{ row }">
            <span :class="TREND[row.trend].classes" :title="TREND[row.trend].label">
              <i :class="TREND[row.trend].icon"></i>
            </span>
          </template>

          <template #cell-gap="{ row }">
            <span
              v-if="row.gap"
              class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-amber-800 bg-amber-200"
            >
              {{ row.gap }}
            </span>
            <span v-else class="text-blueGray-400">—</span>
          </template>
        </data-table>

        <!-- Exams -->
        <div v-else-if="activeTab === 'exams'">
          <div
            class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
          >
            <div class="rounded-t mb-0 px-4 py-3 border-0">
              <div class="flex flex-wrap items-center">
                <div class="relative w-full px-4 max-w-full flex-grow flex-1">
                  <h3 class="font-semibold text-lg text-blueGray-700">Exams</h3>
                </div>
                <div class="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
                  <router-link
                    :to="{ name: 'teacher-exam-new', query: { classId, subjectId, termId } }"
                    class="bg-emerald-500 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg inline-block"
                  >
                    <i class="fas fa-plus mr-1"></i>New exam
                  </router-link>
                </div>
              </div>
            </div>

            <div v-if="!exams.length" class="px-8 pb-8">
              <empty-state
                title="No exams yet"
                description="Create the first exam for this class and subject."
                icon="fas fa-file-alt"
              />
            </div>

            <div v-else class="block w-full overflow-x-auto">
              <table class="items-center w-full bg-transparent border-collapse">
                <thead>
                  <tr>
                    <th
                      v-for="head in ['Exam', 'Status', 'Created']"
                      :key="head"
                      class="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    >
                      {{ head }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="exam in exams" :key="exam.id">
                    <td
                      class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4"
                    >
                      <router-link
                        :to="{ name: 'teacher-exam', params: { id: exam.id } }"
                        class="font-bold text-blueGray-700 hover:text-emerald-500"
                      >
                        {{ exam.title }}
                      </router-link>
                    </td>
                    <td
                      class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4"
                    >
                      <status-badge :status="exam.status" />
                    </td>
                    <td
                      class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-blueGray-600"
                    >
                      {{ formatDate(exam.createdAt) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Insights -->
        <div v-else>
          <div
            class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
          >
            <div class="rounded-t mb-0 px-4 py-3 border-0">
              <div class="flex flex-wrap items-center">
                <div class="relative w-full px-4 max-w-full flex-grow flex-1">
                  <h3 class="font-semibold text-lg text-blueGray-700">Insights</h3>
                  <p v-if="lastFinalized" class="text-xs text-blueGray-400">
                    {{ lastFinalized.title }} ·
                    {{ formatDate(lastFinalized.createdAt) }}
                  </p>
                </div>
                <div
                  v-if="lastFinalized"
                  class="relative w-full px-4 max-w-full flex-grow flex-1 text-right"
                >
                  <router-link
                    :to="{ name: 'teacher-exam', params: { id: lastFinalized.id } }"
                    class="text-emerald-500 hover:text-emerald-600 text-xs font-bold uppercase"
                  >
                    Full insights <i class="fas fa-arrow-right ml-1"></i>
                  </router-link>
                </div>
              </div>
            </div>

            <div v-if="insightsLoading" class="px-8 pb-8">
              <spinner inline label="Loading insights..." />
            </div>

            <div v-else-if="!lastFinalized" class="px-8 pb-8">
              <empty-state
                title="No finalized exam yet"
                description="Class insights appear once an exam for this class has been marked and finalized."
                icon="fas fa-chart-bar"
              />
            </div>

            <div v-else-if="!insights" class="px-8 pb-8">
              <empty-state
                title="No insights for this exam"
                description="The analysis for this exam has not been generated yet."
                icon="fas fa-chart-bar"
              />
            </div>

            <div v-else class="flex-auto px-4 lg:px-10 py-8 pt-0">
              <ai-note label="Class summary" :text="insightsSummary" />
              <div class="flex flex-wrap mt-4">
                <div
                  v-for="group in insightGroups"
                  :key="group.title"
                  class="w-full lg:w-4/12 px-2 mb-4"
                >
                  <h6 class="text-xs uppercase font-bold text-blueGray-500 mb-2">
                    {{ group.title }}
                  </h6>
                  <ul v-if="group.items.length" class="list-none">
                    <li
                      v-for="(item, index) in group.items"
                      :key="index"
                      class="text-sm text-blueGray-600 mb-1 flex items-start"
                    >
                      <i class="fas fa-circle text-blueGray-300 text-xs mt-1 mr-2"></i>
                      <span>{{ item }}</span>
                    </li>
                  </ul>
                  <p v-else class="text-sm text-blueGray-400">Nothing flagged.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { reactive } from "vue";

import { gql } from "@/api/client";
import DataTable from "@/components/crud/DataTable.vue";
import SelectField from "@/components/crud/SelectField.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import AiNote from "@/components/teacher/AiNote.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { usePagedList } from "@/components/crud/usePagedList";
import { useSetupStore } from "@/stores/setup";

import {
  TREND,
  examAverage,
  formatDate,
  formatScore,
  latestScore,
  masteryBand,
  perExamSeries,
  toLines,
  trendOf,
} from "@/lib/insights";

const PAGE_SIZE = 10;
const LIMIT = 100;

const MY_CLASS = `
  query MyClass($classId: ID) {
    teacherAssignments(classId: $classId, limit: ${LIMIT}) {
      items {
        id
        schoolClass { id name level }
        subject { id name code }
        term { id name year isCurrent }
      }
    }
  }
`;

// `exams` can only filter by the curriculum subject's id, and the assignment
// carries the school's own subject row. The exam exposes its subject's code,
// so the two are matched on the code here instead of a second lookup.
const CLASS_EXAMS = `
  query ClassExams($classId: ID, $termId: ID) {
    exams(classId: $classId, termId: $termId, limit: ${LIMIT}) {
      total
      items {
        id
        title
        status
        createdAt
        subject { id name code }
      }
    }
  }
`;

// `classReport` and `classProgress` take a curriculum subject id, while an
// assignment carries the school's own subject row. The two are joined on the
// code, the same small lookup the reports hub already uses.
const CURRICULUM = `query { curriculumSubjects { id name code } }`;

function curriculumIdFor(curriculum, code) {
  const wanted = String(code || "").toUpperCase();
  const found = (curriculum || []).find(
    (item) => String(item.code || "").toUpperCase() === wanted
  );
  return found ? found.id : "";
}

const CLASS_INSIGHTS = `
  query ClassInsights($examId: ID!) {
    classInsights(examId: $examId) {
      id
      hardestQuestions
      commonMistakes
      reteachRecommendations
      createdAt
    }
  }
`;

const STUDENT_PAGE = `
  query StudentPage($classId: ID, $search: String, $offset: Int!, $limit: Int!) {
    students(classId: $classId, search: $search, offset: $offset, limit: $limit) {
      total
      items { id fullName admissionNo }
    }
  }
`;

const STUDENT_PROGRESS = `
  query StudentProgress($studentId: ID!) {
    studentProgress(studentId: $studentId) {
      rows {
        id
        score
        marksEarned
        marksPossible
        recordedAt
        examId
      }
    }
  }
`;

const STUDENT_COLUMNS = [
  { key: "name", label: "Student", slot: "cell-name" },
  { key: "admissionNo", label: "Admission no" },
  { key: "score", label: "Last score", slot: "cell-score" },
  { key: "trend", label: "Trend", slot: "cell-trend" },
  { key: "gap", label: "Main gap", slot: "cell-gap" },
];

export default {
  name: "teacher-class",
  components: { DataTable, SelectField, StatusBadge, AiNote, EmptyState, Spinner },

  setup() {
    const students = reactive(
      usePagedList(fetchStudents, {
        pageSize: PAGE_SIZE,
        filters: { classId: "", subjectCode: "", termId: "" },
      })
    );
    return { students };
  },

  data() {
    return {
      activeTab: "students",
      loading: true,
      error: "",
      className: "",
      subjectId: "",
      subjectCode: "",
      subjectName: "",
      termId: "",
      subjectChoices: [],
      totalStudents: 0,
      exams: [],
      curriculum: [],
      lastFinalized: null,
      lastAverage: null,
      insights: null,
      insightsLoading: false,
      TREND,
      studentColumns: STUDENT_COLUMNS,
      tabs: [
        { key: "students", label: "Students", icon: "fas fa-user-graduate" },
        { key: "exams", label: "Exams", icon: "fas fa-file-alt" },
        { key: "insights", label: "Insights", icon: "fas fa-chart-bar" },
      ],
    };
  },

  computed: {
    setupStore() {
      return useSetupStore();
    },
    classId() {
      return this.$route.params.id;
    },
    /** The subject the class page is showing, as the reports want it. */
    curriculumSubjectId() {
      // The chosen assignment is the subject on screen; `subjectCode` alone can
      // be blank when the URL carries an id this page cannot resolve.
      const chosen =
        this.assignments.find((row) => row.subject.id === this.subjectId) ||
        this.assignments[0];
      return curriculumIdFor(this.curriculum, chosen ? chosen.subject.code : "");
    },
    stats() {
      return [
        { label: "Students", value: this.totalStudents },
        { label: "Exams", value: this.exams.length },
        {
          label: "Finalized",
          value: this.exams.filter((exam) => exam.status === "finalized").length,
        },
        {
          label: "Last average",
          value: formatScore(this.lastAverage),
          classes: this.lastAverage === null ? "text-blueGray-400" : masteryBand(this.lastAverage).text,
        },
      ];
    },
    insightsSummary() {
      if (!this.insights) return "";
      const counts = [
        ["hardest question", toLines(this.insights.hardestQuestions).length],
        ["common mistake", toLines(this.insights.commonMistakes).length],
        ["reteaching point", toLines(this.insights.reteachRecommendations).length],
      ].filter(([, count]) => count > 0);
      if (!counts.length) return "Nothing was flagged for this exam.";
      return `Flagged ${counts
        .map(([name, count]) => `${count} ${name}${count === 1 ? "" : "s"}`)
        .join(", ")}.`;
    },
    insightGroups() {
      if (!this.insights) return [];
      return [
        { title: "Hardest questions", items: toLines(this.insights.hardestQuestions).slice(0, 5) },
        { title: "Common mistakes", items: toLines(this.insights.commonMistakes).slice(0, 5) },
        { title: "Reteach", items: toLines(this.insights.reteachRecommendations).slice(0, 5) },
      ];
    },
  },

  watch: {
    subjectId(value) {
      const chosen = this.assignments.find((row) => row.subject.id === value);
      this.subjectName = chosen ? chosen.subject.name : "";
      this.subjectCode = chosen ? chosen.subject.code : "";
      this.students.filters.subjectCode = this.subjectCode;
      this.loadExams();
    },
    activeTab(value) {
      if (value === "insights" && !this.insights) this.loadInsights();
    },
  },

  async mounted() {
    await this.setupStore.ensure();
    await this.load();
  },

  methods: {
    formatDate,
    formatScore,
    masteryBand,

    async load() {
    this.loading = true;
    this.error = "";
    try {
      const [data, curriculum] = await Promise.all([
        gql(MY_CLASS, { classId: this.classId }),
        // Only for the report links: a missing list must not fail the page.
        gql(CURRICULUM).catch(() => null),
      ]);
      this.curriculum = curriculum ? curriculum.curriculumSubjects : [];
      this.assignments = data.teacherAssignments.items;
      if (!this.assignments.length) {
        this.error = "You are not assigned to this class.";
        return;
      }

      const first = this.assignments[0];
      this.className = first.schoolClass.name;
      this.termId = this.$route.query.termId || this.setupStore.currentTermId || first.term.id;
      this.subjectChoices = this.assignments.map((row) => ({
        value: row.subject.id,
        label: `${row.subject.name} (${row.subject.code})`,
      }));
      this.subjectId = this.$route.query.subjectId || first.subject.id;

      const chosen = this.assignments.find((r) => r.subject.id === this.subjectId) || first;
      this.subjectName = chosen.subject.name;
      this.subjectCode = chosen.subject.code;

      this.students.filters.classId = this.classId;
      this.students.filters.subjectCode = this.subjectCode;
      this.students.filters.termId = this.termId;

      await this.loadExams();
    } catch (error) {
      this.error = error.message;
    } finally {
      this.loading = false;
    }
  },

  async loadExams() {
    try {
      const [rows, students] = await Promise.all([
        gql(CLASS_EXAMS, { classId: this.classId, termId: this.termId }),
        gql(STUDENT_PAGE, { classId: this.classId, offset: 0, limit: 1 }),
      ]);

      this.exams = rows.exams.items.filter(
        (exam) => exam.subject.code.toUpperCase() === this.subjectCode.toUpperCase()
      );
      this.totalStudents = students.students.total;

      this.lastFinalized =
        this.exams
          .filter((exam) => exam.status === "finalized")
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] || null;

      // The header shows the average, so it is fetched with the exams and not
      // only when the Insights tab is opened.
      this.lastAverage = this.lastFinalized ? await examAverage(this.lastFinalized.id) : null;

      if (this.activeTab === "insights" && !this.insights) await this.loadInsights();
    } catch (error) {
      this.error = error.message;
    }
  },

  async loadInsights() {
    if (!this.lastFinalized) return;
    this.insightsLoading = true;
    try {
      const data = await gql(CLASS_INSIGHTS, { examId: this.lastFinalized.id });
      this.insights = data.classInsights;
    } catch (error) {
      this.error = error.message;
    } finally {
      this.insightsLoading = false;
    }
    },
  },
};

async function fetchStudents({ offset, pageSize, search, filters }) {
  const page = await gql(STUDENT_PAGE, {
    classId: filters.classId || null,
    search: search || null,
    offset,
    limit: pageSize,
  });

  // One query for the class's gaps, not one per student.
  const gapByStudent = await fetchGaps(filters);

  const items = await Promise.all(
    page.students.items.map(async (student) => {
      const progress = await gql(STUDENT_PROGRESS, { studentId: student.id });
      const series = perExamSeries(progress.studentProgress.rows);
      return {
        id: student.id,
        fullName: student.fullName,
        admissionNo: student.admissionNo,
        lastScore: latestScore(series),
        trend: trendOf(series),
        gap: gapByStudent.get(student.id) || "",
      };
    })
  );

  return { items, total: page.students.total };
}

/**
 * The student's main current gap: whoever appears in the first gap group for
 * the class's latest finalized exam.
 */
async function fetchGaps(filters) {
  const map = new Map();
  if (!filters.classId || !filters.subjectCode) return map;
  try {
    const rows = await gql(
      `query Gaps($classId: ID, $termId: ID) {
        exams(classId: $classId, termId: $termId, status: "finalized", limit: 100) {
          items { id subject { id code } }
        }
      }`,
      { classId: filters.classId, termId: filters.termId || null }
    );

    const exam = rows.exams.items
      .filter((e) => e.subject.code.toUpperCase() === filters.subjectCode.toUpperCase())[0];
    if (!exam) return map;

    const groups = await gql(
      `query Gaps($examId: ID!) {
        gapGroups(examId: $examId) {
          id
          label
          skill { id name }
          students { id }
        }
      }`,
      { examId: exam.id }
    );

    for (const group of groups.gapGroups) {
      for (const student of group.students) {
        if (!map.has(student.id)) map.set(student.id, group.label || group.skill.name);
      }
    }
  } catch (error) {
    // A missing insight must not take the whole table down with it.
    return map;
  }
  return map;
}
</script>
