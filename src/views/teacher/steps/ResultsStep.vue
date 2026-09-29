<template>
  <div class="px-4 pb-4">
    <!-- ------------------------------------------------ before finalizing -->
    <template v-if="!finalized">
      <div class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white">
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <h3 class="font-semibold text-lg text-blueGray-700">Before you finalize</h3>
          <p class="text-sm text-blueGray-500">
            Finalising locks every mark, so this is the last chance to put
            anything right.
          </p>
        </div>

        <div class="px-4 pb-4">
          <div v-if="loading" class="py-4">
            <spinner inline label="Checking the exam..." />
          </div>

          <template v-else>
            <!-- Blockers -->
            <div v-if="blockers.length" class="mb-4">
              <h6 class="text-xs uppercase font-bold text-red-500 mb-2">
                {{ blockers.length }} thing{{ blockers.length === 1 ? "" : "s" }} to sort out
              </h6>
              <div
                v-for="blocker in blockers"
                :key="blocker.key"
                class="flex items-start justify-between bg-red-50 border-l-4 border-red-400 rounded px-4 py-3 mb-2"
              >
                <div class="flex-1">
                  <p class="text-sm text-red-700 font-bold">{{ blocker.label }}</p>
                  <p class="text-xs text-red-500">{{ blocker.detail }}</p>
                </div>
                <router-link
                  :to="blocker.to"
                  class="text-xs font-bold uppercase text-white bg-red-500 hover:bg-red-600 px-3 py-2 rounded ml-3 whitespace-nowrap"
                >
                  {{ blocker.action }}
                </router-link>
              </div>
            </div>

            <div v-else class="bg-emerald-50 border-l-4 border-emerald-400 rounded px-4 py-3 mb-4">
              <p class="text-sm text-emerald-700 font-bold">
                Nothing is blocking finalisation
              </p>
              <p class="text-xs text-emerald-600">
                Every script has a student and every answer has a mark.
              </p>
            </div>

            <!-- Summary -->
            <div class="flex flex-wrap">
              <div v-for="figure in summaryFigures" :key="figure.label" class="w-6/12 md:w-3/12 py-2 pr-3">
                <span class="text-xl font-bold block text-blueGray-600">{{ figure.value }}</span>
                <span class="text-xs text-blueGray-400">{{ figure.label }}</span>
              </div>
            </div>

            <p v-if="loadingResults" class="text-xs text-blueGray-400 mt-2">
              <i class="fas fa-circle-notch fa-spin mr-1"></i>
              Reading the marked scripts...
            </p>

            <button
              type="button"
              class="mt-3 bg-emerald-500 text-white text-sm font-bold uppercase px-5 py-3 rounded shadow hover:shadow-lg disabled:opacity-50"
              :disabled="blockers.length > 0 || loadingResults"
              @click="confirmFinalize.open = true"
            >
              <i class="fas fa-flag-checkered mr-2"></i>Finalize exam
            </button>
            <p v-if="blockers.length" class="text-xs text-blueGray-400 mt-1">
              Blocked until the items above are cleared.
            </p>
          </template>
        </div>
      </div>
    </template>

    <!-- ------------------------------------------------------ insights chain -->
    <div v-else class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white">
      <div class="p-4">
        <h3 class="font-semibold text-lg text-blueGray-700">Building the insights</h3>
        <p class="text-sm text-blueGray-500 mb-3">
          Marks are locked. The skills, the class insights and the written
          reports are being produced behind this.
        </p>

        <ul class="list-none">
          <li v-for="stage in chain" :key="stage.label" class="flex items-start py-1">
            <span class="mr-2 mt-1 w-4 text-center">
              <i v-if="stage.done" class="fas fa-check-circle text-emerald-500 text-sm"></i>
              <i v-else class="fas fa-circle-notch fa-spin text-lightBlue-500 text-sm"></i>
            </span>
            <span class="text-sm" :class="stage.done ? 'text-blueGray-700' : 'text-blueGray-500'">
              {{ stage.label }}
            </span>
          </li>
        </ul>

        <p v-if="chainDone" class="text-sm text-emerald-600 mt-2">
          <i class="fas fa-check-circle mr-1"></i>Everything is ready.
        </p>
        <p class="text-xs text-blueGray-400 mt-2">
          <i class="fas fa-info-circle mr-1"></i>
          The API does not return this run's job id, so these follow the data
          being written rather than a progress figure.
        </p>
      </div>
    </div>

    <!-- --------------------------------------------------------------- stats -->
    <div v-if="finalized || ranked.length" class="flex flex-wrap mb-2">
      <div v-for="card in statCards" :key="card.label" class="w-6/12 md:w-4/12 xl:w-2/12 px-1 mb-2">
        <div class="bg-white rounded shadow p-3">
          <span class="text-xl font-bold block text-blueGray-600">{{ card.value }}</span>
          <span class="text-xs uppercase text-blueGray-400">{{ card.label }}</span>
        </div>
      </div>
    </div>

    <!-- --------------------------------------------------------------- table -->
    <div
      v-if="finalized || ranked.length"
      class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white"
    >
      <div class="rounded-t mb-0 px-4 py-3 border-0">
        <div class="flex flex-wrap items-center">
          <div class="relative w-full px-4 max-w-full flex-grow flex-1">
            <h3 class="font-semibold text-lg text-blueGray-700">
              Class results
              <span class="text-blueGray-400 text-sm font-normal">
                ({{ ranked.length }} script{{ ranked.length === 1 ? "" : "s" }})
              </span>
            </h3>
          </div>
          <div class="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
            <router-link
              :to="{ name: 'report-assessment', params: { examId: exam.id } }"
              class="h-11 inline-flex items-center text-blueGray-600 hover:text-blueGray-800 text-xs font-bold uppercase px-3 mr-1"
            >
              <i class="fas fa-file-signature mr-1"></i>Assessment report
            </router-link>
            <router-link
              :to="{ name: 'report-batch', params: { examId: exam.id } }"
              class="h-11 inline-flex items-center text-blueGray-600 hover:text-blueGray-800 text-xs font-bold uppercase px-3 mr-1"
            >
              <i class="fas fa-print mr-1"></i>Print all student reports
            </router-link>
            <button
              type="button"
              class="bg-blueGray-800 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg disabled:opacity-50"
              :disabled="!filtered.length"
              @click="exportCsv"
            >
              <i class="fas fa-file-csv mr-1"></i>Export CSV
            </button>
          </div>
        </div>

        <div class="px-4 pt-2">
          <input
            v-model="search"
            type="search"
            placeholder="Search by name or admission number"
            class="border-0 px-3 py-2 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full md:w-6/12"
          />
        </div>
      </div>

      <div v-if="loading" class="px-8 pb-8">
        <spinner inline label="Loading results..." />
      </div>

      <div v-else-if="error" class="px-8 pb-8">
        <empty-state title="Could not load the results" :description="error" icon="fas fa-exclamation-triangle" />
      </div>

      <div v-else-if="!ranked.length" class="px-8 pb-8">
        <empty-state
          title="No marked scripts yet"
          description="Results appear once the scripts have been marked."
          icon="fas fa-chart-bar"
        />
      </div>

      <template v-else>
        <div class="block w-full overflow-x-auto">
          <table class="items-center w-full bg-transparent border-collapse">
            <thead>
              <tr>
                <th
                  v-for="column in columns"
                  :key="column.key"
                  class="px-4 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100 cursor-pointer select-none"
                  @click="sortBy(column.key)"
                >
                  {{ column.label }}
                  <i v-if="sortKey === column.key" :class="sortDir === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'"></i>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in filtered"
                :key="row.scriptId"
                class="cursor-pointer hover:bg-blueGray-50"
                @click="openRow(row)"
              >
                <td class="border-t-0 px-4 py-3 text-sm text-blueGray-400">{{ row.rank }}</td>
                <td class="border-t-0 px-4 py-3">
                  <span class="text-sm font-bold text-blueGray-700 block">{{ row.studentName }}</span>
                  <span class="text-xs text-blueGray-400">{{ row.admissionNo }}</span>
                </td>
                <td class="border-t-0 px-4 py-3 text-sm text-blueGray-700">
                  {{ row.total }} <span class="text-blueGray-400">/ {{ row.maxMarks }}</span>
                </td>
                <td class="border-t-0 px-4 py-3 text-sm" :class="bandClass(row.percent)">
                  {{ row.percent === null ? "—" : `${row.percent}%` }}
                </td>
                <td class="border-t-0 px-4 py-3 text-sm font-bold text-blueGray-700">
                  {{ row.grade || "—" }}
                </td>
                <td class="border-t-0 px-4 py-3">
                  <span
                    v-if="row.gap"
                    class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-amber-800 bg-amber-200"
                  >
                    {{ row.gap }}
                  </span>
                  <span v-else class="text-blueGray-400">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="!filtered.length" class="px-8 py-6 text-sm text-blueGray-500">
          Nothing matches that search.
        </p>
      </template>
    </div>

    <!-- ----------------------------------------------------------------- absent -->
    <div
      v-if="(finalized || ranked.length) && absent.length"
      class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white"
    >
      <div class="p-4">
        <h6 class="text-xs uppercase font-bold text-blueGray-500 mb-2">
          Nothing handed in ({{ absent.length }})
        </h6>
        <span
          v-for="student in absent"
          :key="student.id"
          class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-800 bg-blueGray-200 mr-1 mb-1"
        >
          {{ student.fullName }}
        </span>
        <p class="text-xs text-blueGray-400 mt-2">
          These students have no script for this exam, so they have no result.
        </p>
      </div>
    </div>

    <script-drawer
      v-if="drawer.row"
      :row="drawer.row"
      :result="drawer.result"
      :pages="drawer.pages"
      :loading="drawer.loading"
      :error="drawer.error"
      @close="drawer.row = null"
      @zoom="openPage"
    />

    <!-- Page viewer -->
    <div v-if="viewer.row" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 bg-blueGray-800 bg-opacity-60" @click="viewer.row = null"></div>
        <div class="relative w-full max-w-3xl bg-white shadow-xl rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs text-blueGray-400">
              Page {{ viewer.index + 1 }} of {{ viewer.row.pages.length }}
            </p>
            <button type="button" class="text-blueGray-400 px-2 py-2" aria-label="Close" @click="viewer.row = null">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <img v-if="viewerPage" :src="viewerPage.url" alt="" class="mx-auto block max-w-full" />
        </div>
      </div>
    </div>

    <confirm-dialog
      :open="confirmFinalize.open"
      title="Finalize the exam"
      :message="`Every mark is locked and cannot be changed afterwards. The class insights and each student's report are then produced.`"
      confirm-label="Finalize and lock"
      :busy="confirmFinalize.busy"
      @confirm="finalize"
      @cancel="confirmFinalize.open = false"
    />
  </div>
</template>

<script>
import { gql } from "@/api/client";
import ConfirmDialog from "@/components/crud/ConfirmDialog.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";

import {
  CSV_COLUMNS,
  asPercent,
  csvFilename,
  downloadCsv,
  gradeFor,
  summarise,
  toCsv,
  withRanks,
} from "@/lib/results";

import ScriptDrawer from "./results/ScriptDrawer.vue";

const STATS = `
  query ExamStats($examId: ID!) {
    examStats(examId: $examId) {
      scripts
      unmatchedScripts
      groupedScripts
      markedScripts
      finalizedScripts
      answers
      awaitingReview
      average
    }
  }
`;

const SCRIPTS = `
  query Scripts($examId: ID!) {
    scripts(examId: $examId, limit: 200) {
      total
      items {
        id
        status
        student { id fullName admissionNo }
        pages { id order url }
      }
    }
  }
`;

const RESULT = `
  query ScriptResult($scriptId: ID!) {
    scriptResult(scriptId: $scriptId) {
      scriptId
      studentName
      totalMarks
      maxMarks
      answers {
        answerId
        questionNumber
        maxMarks
        marks
        source
        reviewed
        isBlank
        confidence
        reasoning
      }
    }
  }
`;

const GAPS = `
  query Gaps($examId: ID!) {
    gapGroups(examId: $examId) {
      id
      label
      skill { id name }
      students { id }
    }
  }
`;

const CLASS_STUDENTS = `
  query ClassStudents($classId: ID) {
    students(classId: $classId, limit: 200) { total items { id fullName admissionNo } }
  }
`;

const INSIGHTS = `query ($examId: ID!) { classInsights(examId: $examId) { id createdAt } }`;
const REPORT = `
  query ($studentId: ID!, $examId: ID!) { studentReport(studentId: $studentId, examId: $examId) { id } }
`;
const PROGRESS = `query ($studentId: ID!) { studentProgress(studentId: $studentId) { rows { id } } }`;

const FINALIZE = `mutation ($examId: ID!) { finalizeExam(examId: $examId) { id status } }`;

/** How many scripts the page will read results for, one call each. */
const RESULT_LIMIT = 60;
/** How often the insights chain is re-checked while it runs. */
const CHAIN_INTERVAL = 3000;

const COLUMNS = [
  { key: "rank", label: "#" },
  { key: "studentName", label: "Student" },
  { key: "total", label: "Marks" },
  { key: "percent", label: "%" },
  { key: "grade", label: "Grade" },
  { key: "gap", label: "Main gap" },
];

export default {
  name: "exam-step-results",
  components: { ConfirmDialog, EmptyState, Spinner, ScriptDrawer },
  props: {
    exam: { type: Object, required: true },
    counts: { type: Object, default: null },
  },
  emits: ["changed"],

  data() {
    return {
      stats: null,
      scripts: [],
      results: new Map(),
      gapByStudent: new Map(),
      students: [],
      loading: true,
      loadingResults: false,
      error: "",
      search: "",
      sortKey: "rank",
      sortDir: "asc",
      drawer: { row: null, result: null, pages: [], loading: false, error: "" },
      viewer: { row: null, index: 0 },
      confirmFinalize: { open: false, busy: false },
      chain: [],
      chainTimer: null,
      columns: COLUMNS,
    };
  },

  computed: {
    finalized() {
      return this.exam.status === "finalized";
    },
    /** One row per script that belongs to a student. */
    rows() {
      return this.scripts
        .filter((script) => script.student)
        .map((script) => {
          const result = this.results.get(script.id);
          const total = result ? result.totalMarks : 0;
          const maxMarks = result ? result.maxMarks : 0;
          const percent = asPercent(total, maxMarks);
          return {
            scriptId: script.id,
            studentId: script.student.id,
            studentName: script.student.fullName,
            admissionNo: script.student.admissionNo,
            pages: script.pages || [],
            total,
            maxMarks,
            percent,
            grade: gradeFor(percent),
            gap: this.gapByStudent.get(script.student.id) || "",
          };
        });
    },
    ranked() {
      return withRanks(this.rows);
    },
    filtered() {
      const term = this.search.trim().toLowerCase();
      const rows = term
        ? this.ranked.filter((row) =>
            `${row.studentName} ${row.admissionNo}`.toLowerCase().includes(term)
          )
        : [...this.ranked];

      const direction = this.sortDir === "asc" ? 1 : -1;
      const key = this.sortKey;
      return rows.sort((a, b) => {
        const left = a[key];
        const right = b[key];
        if (left === null || left === undefined) return 1;
        if (right === null || right === undefined) return -1;
        if (typeof left === "number" && typeof right === "number") return (left - right) * direction;
        return String(left).localeCompare(String(right)) * direction;
      });
    },
    summary() {
      return summarise(this.ranked);
    },
    statCards() {
      const s = this.summary;
      const percent = (value) => (value === null ? "—" : `${value}%`);
      return [
        { label: "Average", value: percent(s.average) },
        { label: "Median", value: percent(s.median) },
        { label: "Highest", value: percent(s.highest) },
        { label: "Lowest", value: percent(s.lowest) },
        { label: "Pass rate", value: percent(s.passRate) },
        { label: "Scripts", value: this.ranked.length },
      ];
    },
    /** Answers counted by who settled the mark. */
    markSources() {
      let ai = 0;
      let teacher = 0;
      for (const result of this.results.values()) {
        for (const answer of result.answers) {
          if (answer.source === "teacher") teacher += 1;
          else ai += 1;
        }
      }
      return { ai, teacher };
    },
    absent() {
      if (!this.students.length) return [];
      const present = new Set(this.scripts.filter((s) => s.student).map((s) => s.student.id));
      return this.students.filter((student) => !present.has(student.id));
    },
    summaryFigures() {
      return [
        { label: "Scripts", value: this.stats ? this.stats.scripts : this.scripts.length },
        { label: "Marked scripts", value: this.stats ? this.stats.markedScripts : 0 },
        { label: "AI marks", value: this.markSources.ai },
        { label: "Teacher-corrected", value: this.markSources.teacher },
        { label: "Absent", value: this.absent.length },
      ];
    },
    blockers() {
      const items = [];
      const stats = this.stats;
      if (stats && stats.awaitingReview > 0) {
        items.push({
          key: "review",
          label: `${stats.awaitingReview} answer${stats.awaitingReview === 1 ? "" : "s"} still need a mark`,
          detail: "An unmarked answer would leave a question out of the student's total.",
          action: "Open review",
          to: { name: "teacher-exam-review", params: { id: this.exam.id } },
        });
      }
      if (stats && stats.unmatchedScripts > 0) {
        items.push({
          key: "unmatched",
          label: `${stats.unmatchedScripts} script${stats.unmatchedScripts === 1 ? "" : "s"} without a student`,
          detail: "A script with no student cannot be given a total.",
          action: "Match scripts",
          to: { name: "teacher-exam-scripts", params: { id: this.exam.id } },
        });
      }
      if (stats && stats.scripts === 0) {
        items.push({
          key: "scripts",
          label: "No scripts have been uploaded",
          detail: "There is nothing to produce results from yet.",
          action: "Upload scripts",
          to: { name: "teacher-exam-scripts", params: { id: this.exam.id } },
        });
      }
      return items;
    },
    chainDone() {
      return this.chain.length > 0 && this.chain.every((stage) => stage.done);
    },
    viewerPage() {
      if (!this.viewer.row) return null;
      return this.viewer.row.pages[this.viewer.index] || null;
    },
  },

  async mounted() {
    await this.load();
    if (this.finalized) this.startChain();
  },

  beforeUnmount() {
    clearInterval(this.chainTimer);
  },

  methods: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        const [stats, scripts, gaps, students] = await Promise.all([
          gql(STATS, { examId: this.exam.id }),
          gql(SCRIPTS, { examId: this.exam.id }),
          gql(GAPS, { examId: this.exam.id }).catch(() => null),
          gql(CLASS_STUDENTS, {
            classId: this.exam.schoolClass && this.exam.schoolClass.id,
          }).catch(() => null),
        ]);

        this.stats = stats.examStats;
        this.scripts = scripts.scripts.items;
        this.students = students ? students.students.items : [];

        const map = new Map();
        if (gaps) {
          for (const group of gaps.gapGroups) {
            for (const student of group.students) {
              if (!map.has(student.id)) map.set(student.id, group.label || group.skill.name);
            }
          }
        }
        this.gapByStudent = map;
      } catch (failure) {
        this.error = failure.message;
      } finally {
        this.loading = false;
      }
      await this.loadResults();
    },

    /**
     * One `scriptResult` call per script, because the API has no bulk results
     * query. Capped, so a large class does not fire hundreds of requests.
     */
    async loadResults() {
      const wanted = this.scripts
        .filter((script) => script.student)
        .slice(0, RESULT_LIMIT);
      if (!wanted.length) return;

      this.loadingResults = true;
      try {
        const results = await Promise.all(
          wanted.map((script) =>
            gql(RESULT, { scriptId: script.id })
              .then((data) => [script.id, data.scriptResult])
              .catch(() => null)
          )
        );
        const map = new Map();
        for (const entry of results) {
          if (entry) map.set(entry[0], entry[1]);
        }
        this.results = map;
      } finally {
        this.loadingResults = false;
      }
    },

    sortBy(key) {
      if (this.sortKey === key) {
        this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
        return;
      }
      this.sortKey = key;
      // A rank reads best lowest-first; everything else highest-first.
      this.sortDir = key === "rank" || key === "studentName" ? "asc" : "desc";
    },

    bandClass(percent) {
      if (percent === null) return "text-blueGray-400";
      if (percent >= 75) return "text-emerald-600 font-bold";
      if (percent >= PASS_BAND) return "text-amber-600";
      return "text-red-500 font-bold";
    },

    openRow(row) {
      this.drawer = {
        row,
        result: this.results.get(row.scriptId) || null,
        pages: row.pages,
        loading: false,
        error: "",
      };
    },

    openPage(index) {
      this.viewer = { row: this.drawer.row, index };
    },

    exportCsv() {
      const csv = toCsv(this.filtered, CSV_COLUMNS);
      downloadCsv(csvFilename(this.exam.title), csv);
      toastSuccess(`Exported ${this.filtered.length} row(s).`);
    },

    async finalize() {
      this.confirmFinalize.busy = true;
      try {
        await gql(FINALIZE, { examId: this.exam.id });
        toastSuccess("Exam finalised. The insights are being built.");
        this.confirmFinalize.open = false;
        this.$emit("changed");
        this.startChain();
      } catch (failure) {
        // The server refuses while any answer is still without a mark.
        toastError(failure.message);
        this.confirmFinalize.open = false;
      } finally {
        this.confirmFinalize.busy = false;
      }
    },

    // --- the insights chain ---------------------------------------------------

    /**
     * The three stages, followed by watching the data rather than a job.
     *
     * `finalizeExam` returns the exam, not the `build_insights` job it starts,
     * and there is no query to find an exam's jobs, so the only thing this
     * page can observe is the output appearing.
     */
    startChain() {
      clearInterval(this.chainTimer);
      this.checkChain();
      this.chainTimer = setInterval(this.checkChain, CHAIN_INTERVAL);
    },

    async checkChain() {
      const studentId = this.rows.length ? this.rows[0].studentId : "";

      const [progress, insights, report] = await Promise.all([
        studentId
          ? gql(PROGRESS, { studentId }).catch(() => null)
          : Promise.resolve(null),
        gql(INSIGHTS, { examId: this.exam.id }).catch(() => null),
        studentId
          ? gql(REPORT, { studentId, examId: this.exam.id }).catch(() => null)
          : Promise.resolve(null),
      ]);

      this.chain = [
        {
          label: "Computing skills",
          done: Boolean(progress && progress.studentProgress.rows.length),
        },
        {
          label: "Building class insights",
          done: Boolean(insights && insights.classInsights),
        },
        {
          label: "Writing reports",
          done: Boolean(report && report.studentReport),
        },
      ];

      if (this.chainDone) clearInterval(this.chainTimer);
    },
  },
};

/** Under this the table flags the mark, matching the amber grade band. */
const PASS_BAND = 45;
</script>
