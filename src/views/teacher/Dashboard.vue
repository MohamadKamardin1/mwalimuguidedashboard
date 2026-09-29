<template>
  <div class="flex flex-wrap">
    <div v-if="loading" class="w-full px-4">
      <skeleton-list variant="cards" :count="3" label="Loading your dashboard" />
      <skeleton-list :count="4" label="Loading your exams" />
    </div>

    <div v-else-if="error" class="w-full px-4">
      <empty-state
        title="Could not load your dashboard"
        :description="error"
        icon="fas fa-exclamation-triangle"
      >
        <template #action>
          <button
            type="button"
            class="h-11 bg-blueGray-800 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg"
            @click="load()"
          >
            Try again
          </button>
        </template>
      </empty-state>
    </div>

    <!-- Nothing is assigned yet: there is no dashboard to show. -->
    <div v-else-if="!assignments.length" class="w-full px-4">
      <empty-state
        title="No classes assigned yet"
        description="Your school admin has to assign you to a class and a subject before exams can appear here. Once that is done, this page fills in on its own."
        icon="fas fa-chalkboard-teacher"
      >
        <template #action>
          <router-link
            to="/teacher/classes"
            class="h-11 inline-flex items-center bg-blueGray-800 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg"
          >
            See my classes
          </router-link>
        </template>
      </empty-state>
    </div>

    <template v-else>
      <!-- Greeting -->
      <div class="w-full px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="px-8 py-6">
            <div class="flex flex-wrap items-center">
              <div class="w-full lg:flex-1 lg:pr-4">
                <h3 class="font-semibold text-xl text-blueGray-700">
                  {{ greeting }}, {{ firstName }}
                </h3>
                <p class="text-sm text-blueGray-500 mt-1">
                  <span v-if="term">{{ term.name }} {{ term.year }}</span>
                  <span v-else>No current term is set</span>
                  <span v-if="term"> &middot; {{ summary }}</span>
                </p>
              </div>

              <div class="w-full lg:w-auto mt-4 lg:mt-0 flex flex-wrap">
                <button
                  v-if="continueExam"
                  type="button"
                  class="w-full sm:w-auto h-11 bg-blueGray-100 text-blueGray-700 text-xs font-bold uppercase px-4 rounded shadow hover:bg-blueGray-200 mr-0 sm:mr-2 mb-2 sm:mb-0"
                  @click="open(continueExam.id)"
                >
                  <i class="fas fa-play mr-1"></i> Continue where I left off
                </button>
                <router-link
                  to="/teacher/exams/new"
                  class="w-full sm:w-auto h-11 inline-flex items-center justify-center bg-emerald-500 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg"
                >
                  <i class="fas fa-plus mr-1"></i> New exam
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Needs your attention -->
      <div class="w-full lg:w-7/12 px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <h3 class="font-semibold text-lg text-blueGray-700 px-4">
              Needs your attention
            </h3>
          </div>

          <div v-if="!attention.length" class="px-8 pb-8">
            <empty-state
              title="Nothing is waiting on you"
              description="Every exam you own is either finished or waiting on the class, not on you."
              icon="fas fa-mug-hot"
            />
          </div>

          <div v-else class="px-8 pb-4">
            <div
              v-for="item in attention"
              :key="item.key"
              class="flex flex-wrap items-center py-3 border-b border-blueGray-100 last:border-0"
            >
              <span
                class="w-10 h-10 rounded-full flex-none inline-flex items-center justify-center text-white mr-3"
                :class="item.iconColor"
              >
                <i :class="item.icon"></i>
              </span>
              <div class="flex-1 min-w-0 pr-2">
                <p class="text-sm font-bold text-blueGray-700">{{ item.title }}</p>
                <p class="text-xs text-blueGray-500 mt-1">{{ item.detail }}</p>
              </div>
              <router-link
                :to="item.route"
                class="w-full sm:w-auto h-11 inline-flex items-center justify-center bg-blueGray-800 text-white text-xs font-bold uppercase px-4 mt-2 sm:mt-0 rounded shadow hover:shadow-lg"
                @click="markSeen(item)"
              >
                {{ item.actionLabel }}
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- My exams -->
      <div class="w-full lg:w-5/12 px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <div class="flex flex-wrap items-center">
              <div class="relative w-full px-4 max-w-full flex-grow flex-1">
                <h3 class="font-semibold text-lg text-blueGray-700">My exams</h3>
              </div>
              <div class="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
                <router-link
                  to="/teacher/exams"
                  class="text-xs font-bold uppercase text-blueGray-600 hover:text-blueGray-800"
                >
                  All exams <i class="fas fa-arrow-right ml-1"></i>
                </router-link>
              </div>
            </div>
          </div>

          <div v-if="!recent.length" class="px-8 pb-8">
            <empty-state
              title="No exams yet"
              description="Create one and it will show up here."
              icon="fas fa-file-alt"
            />
          </div>

          <div v-else class="px-8 pb-6">
            <button
              v-for="exam in recent"
              :key="exam.id"
              type="button"
              class="w-full text-left py-3 border-b border-blueGray-100 last:border-0"
              @click="open(exam.id)"
            >
              <div class="flex flex-wrap items-center">
                <span class="flex-1 min-w-0 text-sm font-bold text-blueGray-700 truncate">
                  {{ exam.title }}
                </span>
                <status-badge class="flex-none ml-2" :status="exam.status" />
              </div>
              <div class="flex items-center mt-2">
                <div class="flex-1 bg-blueGray-200 rounded-full h-1 mr-2">
                  <div
                    class="h-1 rounded-full"
                    :class="progressColor(exam.status)"
                    :style="{ width: progressOf(exam.status) + '%' }"
                  ></div>
                </div>
                <span class="text-xs text-blueGray-400 flex-none">
                  {{ exam.schoolClass.name }}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Reports: the same doors the reports hub opens, one step away. -->
      <div class="w-full px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <div class="flex flex-wrap items-center">
              <div class="relative w-full max-w-full flex-grow flex-1">
                <h3 class="font-semibold text-lg text-blueGray-700 px-4">Reports</h3>
              </div>
              <div class="relative w-full max-w-full flex-grow flex-1 text-right">
                <router-link
                  :to="{ name: '/teacher/reports' }"
                  class="text-xs font-bold uppercase text-blueGray-600 hover:text-blueGray-800"
                >
                  All reports <i class="fas fa-arrow-right ml-1"></i>
                </router-link>
              </div>
            </div>
          </div>

          <div class="px-8 pb-6 flex flex-wrap items-center">
            <p class="text-sm text-blueGray-500 flex-1 min-w-0 pr-2">
              The assessment, class, student and progress reports, once an exam
              has been finalised.
            </p>
            <router-link
              v-if="latestFinalizedExam"
              :to="{ name: 'report-batch', params: { examId: latestFinalizedExam.id } }"
              class="w-full sm:w-auto h-11 inline-flex items-center justify-center bg-blueGray-100 text-blueGray-700 text-xs font-bold uppercase px-4 mt-2 sm:mt-0 rounded shadow hover:bg-blueGray-200"
            >
              <i class="fas fa-print mr-1"></i> Print all student reports
            </router-link>
          </div>
        </div>
      </div>

      <!-- My classes -->
      <div class="w-full px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <h3 class="font-semibold text-lg text-blueGray-700 px-4">My classes</h3>
          </div>

          <div class="px-8 pb-8 flex flex-wrap">
            <div
              v-for="item in myClasses"
              :key="item.id"
              class="w-full md:w-6/12 xl:w-4/12 px-0 md:px-2 mb-4"
            >
              <div class="border border-blueGray-100 rounded p-4 h-full">
                <p class="font-bold text-blueGray-700">{{ item.name }}</p>
                <p class="text-xs text-blueGray-500 mt-1">{{ item.subjects }}</p>
                <p class="text-sm text-blueGray-600 mt-3">
                  <i class="fas fa-user-graduate text-blueGray-300 mr-1"></i>
                  {{ item.students === null ? "—" : item.students }} students
                </p>
                <p class="text-xs text-blueGray-400 mt-2">
                  <template v-if="item.lastExam">
                    Last exam: {{ item.lastExam.title }} &middot;
                    {{ formatScore(item.average) }}
                  </template>
                  <template v-else>No exam finalized for this class yet.</template>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { gql } from "@/api/client";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import {
  currentStep,
  progressColor,
  progressPercent,
  routeFor,
} from "@/components/teacher/examPipeline";
import EmptyState from "@/components/ui/EmptyState.vue";
import SkeletonList from "@/components/ui/SkeletonList.vue";
import { examAverage, formatScore } from "@/lib/insights";
import { useAuthStore } from "@/stores/auth";

const ME = `query { me { id firstName lastName email school { id name } } }`;
const CURRENT_TERM = `query { academicTerms(isCurrent: true, limit: 1) { items { id name year } } }`;

// The schema has no "exams I own" filter, so the school's exams come back and
// `createdBy` is matched here. Capped: a teacher's own exams are a small slice.
const SCHOOL_EXAMS = `
  query {
    exams(limit: 200) {
      total
      items {
        id title status createdAt totalMarks
        subject { id name }
        schoolClass { id name }
        term { id name year }
        createdBy { id }
        files { id }
      }
    }
  }
`;

const MY_ASSIGNMENTS = `
  query ($teacherId: ID) {
    teacherAssignments(teacherId: $teacherId, limit: 50) {
      items { id schoolClass { id name } subject { id name } }
    }
  }
`;

const CLASS_STUDENTS = `query ($classId: ID) { enrollments(classId: $classId, limit: 1) { total } }`;
const REVIEW_QUEUE = `query ($examId: ID!) { reviewQueue(examId: $examId, limit: 1) { total } }`;
const EXAM_SCRIPTS = `
  query ($examId: ID!) { scripts(examId: $examId, limit: 200) { items { id student { id } } } }
`;

const RECENT_COUNT = 4;

/** How often the feed re-reads itself while the page is open. */
const REFRESH_INTERVAL = 60000;
const VIEWED_KEY = "zanzibar.viewedReports";

function readViewed() {
  try {
    const raw = JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (error) {
    return [];
  }
}

export default {
  name: "teacher-dashboard",
  components: { EmptyState, SkeletonList, StatusBadge },
  data() {
    return {
      loading: true,
      error: "",
      me: null,
      term: null,
      exams: [],
      assignments: [],
      recent: [],
      myClasses: [],
      attention: [],
      viewed: readViewed(),
    };
  },
  computed: {
    firstName() {
      return (this.me && (this.me.firstName || this.me.email)) || "there";
    },
    greeting() {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 17) return "Good afternoon";
      return "Good evening";
    },
    summary() {
      if (!this.attention.length) return "nothing needs your attention";
      return `${this.attention.length} thing${this.attention.length === 1 ? "" : "s"} need${
        this.attention.length === 1 ? "s" : ""
      } your attention`;
    },
    continueExam() {
      // The newest exam that is not finished, with the step it is sitting on.
      const exam = this.exams
        .filter((item) => item.status !== "finalized")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      return exam ? { id: exam.id } : null;
    },
    /** The newest finalized exam this term: what a batch of reports prints. */
    latestFinalizedExam() {
      if (!this.term) return null;
      return (
        this.exams.find(
          (exam) =>
            exam.status === "finalized" && exam.term && exam.term.id === this.term.id
        ) || null
      );
    },
  },
  created() {
    this.load();
  },
  mounted() {
    // An exam can move on while this page sits open -- marking finishes, a
    // colleague confirms something. Re-read when the tab comes back and once a
    // minute besides, quietly: the numbers changing under the teacher is
    // better than a spinner over a page they are reading.
    document.addEventListener("visibilitychange", this.onVisibility);
    this.timer = setInterval(() => this.refresh(true), REFRESH_INTERVAL);
  },
  beforeUnmount() {
    document.removeEventListener("visibilitychange", this.onVisibility);
    clearInterval(this.timer);
  },
  methods: {
    formatScore,

    /** Re-read without blanking the page, for the focus and timer refreshes. */
    refresh(quiet = true) {
      return this.load(quiet);
    },

    onVisibility() {
      if (!document.hidden) this.refresh(true);
    },

    /** `quiet` keeps what is on screen while the new numbers come in. */
    async load(quiet = false) {
      if (!quiet) this.loading = true;
      this.error = "";
      try {
        const auth = useAuthStore();
        const me = auth.user || (await gql(ME)).me;
        this.me = me;

        const [terms, examData, assignmentData] = await Promise.all([
          gql(CURRENT_TERM),
          gql(SCHOOL_EXAMS),
          gql(MY_ASSIGNMENTS, { teacherId: me.id }),
        ]);

        const [currentTerm] = terms.academicTerms.items;
        this.term = currentTerm || null;
        this.assignments = assignmentData.teacherAssignments.items;

        // Only the exams this teacher made.
        this.exams = examData.exams.items
          .filter((exam) => exam.createdBy.id === me.id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        this.recent = this.exams.slice(0, RECENT_COUNT);

        await Promise.all([this.buildAttention(), this.buildClasses()]);
      } catch (failure) {
        // A failed background refresh must not wipe a page that is working.
        if (!quiet) this.error = failure.message;
      } finally {
        this.loading = false;
      }
    },

    /** One pass over the teacher's exams, turned into an ordered to-do list. */
    async buildAttention() {
      const found = [];

      await Promise.all(
        this.exams.map(async (exam) => {
          const needsScripts = exam.status !== "draft" || exam.files.length > 0;
          const needsQueue = ["ready", "marking", "review", "finalized"].includes(
            exam.status
          );

          const [scripts, queue] = await Promise.all([
            needsScripts
              ? gql(EXAM_SCRIPTS, { examId: exam.id }).catch(() => null)
              : null,
            needsQueue
              ? gql(REVIEW_QUEUE, { examId: exam.id }).catch(() => null)
              : null,
          ]);

          const unmatched = scripts
            ? scripts.scripts.items.filter((script) => !script.student).length
            : 0;
          const awaiting = queue ? queue.reviewQueue.total : 0;

          // Locked exams are left alone: their marks cannot be changed, so
          // only the report is still worth opening.
          const locked = exam.status === "finalized";

          if (exam.status === "needs_confirmation") {
            found.push({
              key: `${exam.id}-confirm`,
              weight: 1,
              step: "confirm",
              exam,
              icon: "fas fa-clipboard-check",
              iconColor: "bg-amber-500",
              title: `Confirm the questions in ${exam.title}`,
              detail: "Marking cannot start until the extracted questions are confirmed.",
              actionLabel: "Confirm",
            });
          }

          if (awaiting > 0) {
            found.push({
              key: `${exam.id}-review`,
              weight: 2,
              step: "review",
              exam,
              icon: "fas fa-user-check",
              iconColor: "bg-lightBlue-500",
              title: `${awaiting} answer${awaiting === 1 ? "" : "s"} to review`,
              detail: `${exam.title} — the model was unsure about these.`,
              actionLabel: "Review",
            });
          }

          if (unmatched > 0 && !locked) {
            found.push({
              key: `${exam.id}-match`,
              weight: 3,
              step: "scripts",
              exam,
              icon: "fas fa-user-question",
              iconColor: "bg-amber-500",
              title: `${unmatched} script${unmatched === 1 ? "" : "s"} without a student`,
              detail: `${exam.title} — they cannot be marked until each one is matched.`,
              actionLabel: "Match",
            });
          }

          if (exam.status === "draft" && !exam.files.length) {
            found.push({
              key: `${exam.id}-upload`,
              weight: 4,
              step: "files",
              exam,
              icon: "fas fa-file-upload",
              iconColor: "bg-blueGray-500",
              title: `Upload the paper for ${exam.title}`,
              detail: "Nothing has been added to this exam yet.",
              actionLabel: "Upload",
            });
          }

          if (locked && !this.viewed.includes(exam.id)) {
            found.push({
              key: `${exam.id}-report`,
              weight: 5,
              step: "insights",
              exam,
              icon: "fas fa-chart-bar",
              iconColor: "bg-emerald-500",
              title: `Reports are ready for ${exam.title}`,
              detail: "The class insights and student reports have been generated.",
              actionLabel: "Open",
            });
          }
        })
      );

      this.attention = found
        .sort(
          (a, b) =>
            a.weight - b.weight || new Date(b.exam.createdAt) - new Date(a.exam.createdAt)
        )
        .map((item) => ({
          ...item,
          // The item knows its own step; the exam's status only says where
          // the exam is, not what this particular item is asking for.
          route: routeFor(item.step, item.exam.id),
        }));
    },

    async buildClasses() {
      // A teacher can hold two subjects in one class, so group by class.
      const byClass = new Map();
      for (const assignment of this.assignments) {
        const key = assignment.schoolClass.id;
        if (!byClass.has(key)) {
          byClass.set(key, {
            id: key,
            name: assignment.schoolClass.name,
            subjects: [],
            students: null,
            average: null,
            lastExam: null,
          });
        }
        byClass.get(key).subjects.push(assignment.subject.name);
      }

      const classes = [...byClass.values()];
      await Promise.all(
        classes.map(async (item) => {
          try {
            const data = await gql(CLASS_STUDENTS, { classId: item.id });
            item.students = data.enrollments.total;
          } catch (error) {
            item.students = null;
          }

          // The newest finalized exam for this class, pooled across its
          // scripts -- the API has no exam aggregate, so `examAverage` reads
          // the script results itself.
          const finalized = this.exams
            .filter((exam) => exam.schoolClass.id === item.id && exam.status === "finalized")
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
          if (!finalized) return;
          item.lastExam = finalized;
          item.average = await examAverage(finalized.id);
        })
      );

      this.myClasses = classes.map((item) => ({ ...item, subjects: item.subjects.join(", ") }));
    },

    open(examId) {
      const exam = this.exams.find((item) => item.id === examId);
      const step = exam ? currentStep(exam.status).key : "files";
      this.$router.push(routeFor(step, examId));
    },

    markSeen(item) {
      // A finalized exam's report is "seen" once the teacher opens it.
      if (!item.key.endsWith("-report")) return;
      if (this.viewed.includes(item.exam.id)) return;
      this.viewed = [...this.viewed, item.exam.id];
      try {
        localStorage.setItem(VIEWED_KEY, JSON.stringify(this.viewed));
      } catch (error) {
        // Storage may be unavailable; the item simply reappears next time.
      }
    },

    // Straight from the pipeline, so this bar cannot drift from the one on the
    // exams list.
    progressOf: progressPercent,
    progressColor,
  },
};
</script>
