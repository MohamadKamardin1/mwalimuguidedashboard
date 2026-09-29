<template>
  <div class="flex flex-wrap">
    <div class="w-full px-4">
      <h3 class="font-semibold text-lg text-blueGray-700">Reports</h3>
      <p class="text-sm text-blueGray-400">
        What the exams are saying, once the marking is finished and locked.
      </p>
    </div>

    <div v-if="loading" class="w-full px-4">
      <skeleton-list variant="cards" :count="4" label="Loading your reports" />
      <skeleton-list :count="4" label="Loading recent reports" />
    </div>

    <div v-else-if="error" class="w-full px-4">
      <empty-state
        title="Could not load your reports"
        :description="error"
        icon="fas fa-exclamation-triangle"
      >
        <template #action>
          <button
            type="button"
            class="h-11 bg-blueGray-800 text-white text-xs font-bold uppercase px-4 rounded shadow"
            @click="load()"
          >
            Try again
          </button>
        </template>
      </empty-state>
    </div>

    <!-- Nothing has been finalized: there is genuinely no report to read. -->
    <div v-else-if="!finalizedExams.length" class="w-full px-4">
      <empty-state
        title="Reports appear after the first exam is finalised"
        description="Mark the scripts, settle the marks a teacher has to decide, then finalise the exam. The assessment, class, student and progress reports are written then."
        icon="fas fa-chart-bar"
      >
        <template #action>
          <router-link
            to="/teacher/exams"
            class="h-11 inline-flex items-center bg-emerald-500 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg"
          >
            Go to my exams
          </router-link>
        </template>
      </empty-state>
    </div>

    <template v-else>
      <div class="w-full px-4">
        <report-filters
          :value="filters"
          :assignments="assignments"
          :terms="terms"
          :exams="finalizedExams"
          @input="applyFilters"
        />
      </div>

      <!-- The suggestion strip: the single most useful thing to open now. -->
      <div v-if="suggestion" class="w-full px-4">
        <div class="bg-lightBlue-50 border-l-4 border-lightBlue-500 rounded px-4 py-3 mb-4">
          <div class="flex flex-wrap items-center">
            <span class="flex-1 min-w-0 text-sm text-lightBlue-700">
              <i class="fas fa-lightbulb mr-2" aria-hidden="true"></i>{{ suggestion.text }}
            </span>
            <router-link
              :to="suggestion.to"
              class="h-11 inline-flex items-center bg-lightBlue-500 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg mt-2 sm:mt-0"
            >
              {{ suggestion.action }}
            </router-link>
          </div>
        </div>
      </div>

      <!-- The four doors. -->
      <div class="w-full px-4">
        <div class="flex flex-wrap -mx-2">
          <div v-for="card in cards" :key="card.key" class="w-full md:w-6/12 px-2 mb-4">
            <router-link :to="card.to" class="block h-full">
              <div
                class="relative flex flex-col min-w-0 h-full break-words rounded shadow-lg bg-white hover:shadow-xl ease-linear transition-all duration-150"
              >
                <div class="flex-auto p-5">
                  <div class="flex flex-wrap items-start">
                    <div class="flex-1 min-w-0 pr-3">
                      <h4 class="font-semibold text-lg text-blueGray-700">
                        {{ card.title }}
                      </h4>
                      <p class="text-sm text-blueGray-500 mt-1">{{ card.purpose }}</p>
                    </div>
                    <div
                      class="flex-none text-white p-3 inline-flex items-center justify-center w-12 h-12 shadow-lg rounded-full"
                      :class="card.iconColor"
                    >
                      <i :class="card.icon" aria-hidden="true"></i>
                    </div>
                  </div>

                  <p class="mt-4 text-sm text-blueGray-600">
                    <span class="font-bold text-blueGray-700">{{ card.count }}</span>
                    {{ card.countLabel }}
                  </p>
                </div>
              </div>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Recent reports, in the order they were written. -->
      <div class="w-full lg:w-7/12 px-4">
        <div class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white">
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <h3 class="font-semibold text-lg text-blueGray-700 px-4">
              Recent reports
            </h3>
          </div>

          <div v-if="!recent.length" class="px-8 pb-8">
            <p class="text-sm text-blueGray-400">
              Nothing matches those filters.
            </p>
          </div>

          <div v-else class="px-8 pb-4">
            <div
              v-for="row in recent"
              :key="row.id"
              class="py-3 border-b border-blueGray-100 last:border-0"
            >
              <div class="flex flex-wrap items-center">
                <div class="flex-1 min-w-0 pr-2">
                  <p class="text-sm font-bold text-blueGray-700">{{ row.title }}</p>
                  <p class="text-xs text-blueGray-400 mt-1">
                    {{ row.className }} &middot; {{ row.subjectName }} &middot;
                    {{ row.date }}
                  </p>
                </div>
                <status-badge class="flex-none mr-2" :status="row.status" />
                <router-link
                  :to="row.to"
                  class="h-11 inline-flex items-center text-xs font-bold uppercase text-lightBlue-600 hover:text-lightBlue-800 px-3"
                >
                  Open
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- What is still open, on the right. -->
      <div class="w-full lg:w-5/12 px-4">
        <div class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white">
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <h3 class="font-semibold text-lg text-blueGray-700 px-4">Worth a look</h3>
          </div>
          <div class="px-8 pb-6">
            <p v-for="(line, index) in highlights" :key="index" class="text-sm text-blueGray-600 py-2 border-b border-blueGray-100 last:border-0">
              <i class="fas fa-circle text-xs text-lightBlue-400 mr-2" aria-hidden="true"></i>{{ line }}
            </p>
            <p v-if="!highlights.length" class="text-sm text-blueGray-400">
              Nothing stands out yet. The class reports fill in as more exams are
              finalised.
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { gql } from "@/api/client";
import ReportFilters from "@/components/reports/ReportFilters.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import SkeletonList from "@/components/ui/SkeletonList.vue";
import { formatDate } from "@/lib/insights";

/**
 * The school's subject row and the curriculum subject are different tables.
 * `classReport` and `classProgress` take a curriculum subject id, while an
 * assignment carries the school's own row: the two are joined on the code.
 */
function curriculumIdFor(curriculum, code) {
  const wanted = String(code || "").toUpperCase();
  const found = (curriculum || []).find(
    (item) => String(item.code || "").toUpperCase() === wanted
  );
  return found ? found.id : "";
}

import { useAuthStore } from "@/stores/auth";
import { useSetupStore } from "@/stores/setup";

/** Everything the hub needs to describe itself, in one pass. */
const HUB = `
  query ($teacherId: ID) {
    exams(status: "finalized", limit: 100) {
      items {
        id title status createdAt
        subject { id name code }
        schoolClass { id name }
        term { id name year }
      }
    }
    teacherAssignments(teacherId: $teacherId, limit: 100) {
      items {
        id
        schoolClass { id name }
        subject { id name code }
        term { id name year }
      }
    }
    academicTerms(limit: 50) { items { id name year } }
    curriculumSubjects { id name code }
    students(limit: 1) { total }
  }
`;

export default {
  name: "teacher-reports",
  components: { EmptyState, ReportFilters, SkeletonList, StatusBadge },
  data() {
    return {
      loading: true,
      error: "",
      exams: [],
      assignments: [],
      terms: [],
      studentTotal: 0,
    };
  },
  setup() {
    return {
      auth: useAuthStore(),
      setup: useSetupStore(),
    };
  },
  computed: {
    /** Reports only exist for exams that have been locked. */
    finalizedExams() {
      const me = this.auth.user;
      return this.exams
        .map((exam) => ({
          id: exam.id,
          title: exam.title,
          status: exam.status,
          classId: exam.schoolClass.id,
          className: exam.schoolClass.name,
          subjectId: exam.subject.id,
          subjectName: exam.subject.name,
          termId: exam.term.id,
          createdAt: exam.createdAt,
          // Only the exams this teacher can see: the API already scopes them.
          mine: !me || true,
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    /** The choice, as it appears in the URL. */
    filters() {
      return {
        classSubject: `${this.$route.query.classId || ""}|${this.$route.query.subjectId || ""}`.replace(/^\|$/, ""),
        termId: this.$route.query.termId || "",
        examId: this.$route.query.examId || "",
      };
    },

    /** Each door opens its picker, carrying the filters as they stand. */
    query() {
      const query = {};
      for (const key of ["classId", "subjectId", "termId", "examId"]) {
        if (this.$route.query[key]) query[key] = this.$route.query[key];
      }
      return query;
    },

    cards() {
      const classCount = new Set(this.finalizedExams.map((e) => e.classId)).size;
      return [
        {
          key: "assessment",
          title: "Assessment report",
          purpose: "How one exam went: the spread, the grades, and every question's statistics.",
          count: this.finalizedExams.length,
          countLabel: `finalized exam${this.finalizedExams.length === 1 ? "" : "s"}`,
          icon: "fas fa-file-signature",
          iconColor: "bg-lightBlue-500",
          to: { name: "report-assessment-picker", query: this.query },
        },
        {
          key: "class",
          title: "Class report",
          purpose: "A class's term: the trend, the skill heatmap, and who needs a look.",
          count: classCount,
          countLabel: `class${classCount === 1 ? "" : "es"} with results`,
          icon: "fas fa-users",
          iconColor: "bg-emerald-500",
          to: { name: "report-class-picker", query: this.query },
        },
        {
          key: "student",
          title: "Student report",
          purpose: "One student on one exam, in words their parent can read.",
          count: this.studentTotal,
          countLabel: "students on roll",
          icon: "fas fa-user-graduate",
          iconColor: "bg-amber-500",
          to: { name: "report-student-picker", query: this.query },
        },
        {
          key: "progress",
          title: "Progress report",
          purpose: "Movement over the term: what is improving and what is not.",
          count: this.finalizedExams.length,
          countLabel: "exams to measure against",
          icon: "fas fa-chart-line",
          iconColor: "bg-blueGray-700",
          to: { name: "report-progress-picker", query: this.query },
        },
      ];
    },

    recent() {
      return this.finalizedExams.slice(0, 6).map((exam) => ({
        id: exam.id,
        title: exam.title,
        className: exam.className,
        subjectName: exam.subjectName,
        date: formatDate(exam.createdAt),
        status: exam.status,
        to: {
          name: "report-assessment",
          params: { examId: exam.id },
          query: this.query,
        },
      }));
    },

    /** The next useful thing, said out loud. */
    suggestion() {
      const exam = this.recent[0];
      if (!exam) return null;
      return {
        text: `${exam.className} ${exam.subjectName} — “${exam.title}” is finalized. The assessment report is ready.`,
        action: "View assessment",
        to: exam.to,
      };
    },

    highlights() {
      const lines = [];
      const byClass = new Map();
      for (const exam of this.finalizedExams) {
        byClass.set(exam.classId, (byClass.get(exam.classId) || 0) + 1);
      }
      const multi = [...byClass.entries()].filter(([, count]) => count > 1);
      for (const [classId, count] of multi) {
        const name = this.finalizedExams.find((e) => e.classId === classId).className;
        lines.push(
          `${name} has ${count} finalized exams, so the progress report has something to compare.`
        );
      }
      if (!lines.length && this.finalizedExams.length) {
        lines.push(
          "One finalized exam so far. A progress report needs a second one to show movement."
        );
      }
      return lines.slice(0, 4);
    },
  },
  created() {
    this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        await this.setup.ensure();
        const data = await gql(HUB, {
          teacherId: this.auth.user ? this.auth.user.id : null,
        });
        this.exams = data.exams.items;
        this.assignments = data.teacherAssignments.items.map((item) => ({
          id: item.id,
          classId: item.schoolClass.id,
          className: item.schoolClass.name,
          subjectId: curriculumIdFor(data.curriculumSubjects, item.subject.code),
          subjectName: item.subject.name,
          subjectCode: item.subject.code,
          termId: item.term.id,
        }));
        this.terms = data.academicTerms.items;
        // Assignments name the school's subject; the reports want the curriculum's.
        this.studentTotal = data.students.total;
      } catch (failure) {
        this.error = failure.message;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Filters live in the URL, so a report is a link.
     *
     * `replace` rather than `push`: changing a dropdown is not a navigation,
     * and the back button should leave the page rather than walk back through
     * every filter the teacher tried.
     */
    applyFilters(next) {
      const query = {};
      const [classId, subjectId] = (next.classSubject || "").split("|");
      if (classId) query.classId = classId;
      if (subjectId) query.subjectId = subjectId;
      if (next.termId) query.termId = next.termId;
      if (next.examId) query.examId = next.examId;
      this.$router.replace({ query });
    },
  },
};
</script>
