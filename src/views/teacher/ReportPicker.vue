<template>
  <div class="flex flex-wrap">
    <div class="w-full px-4">
      <div class="flex flex-wrap items-center mb-4">
        <div class="flex-1 min-w-0 pr-3">
          <h3 class="font-semibold text-lg text-blueGray-700">{{ title }}</h3>
          <p class="text-sm text-blueGray-400">{{ purpose }}</p>
        </div>
        <router-link
          :to="{ name: '/teacher/reports', query: $route.query }"
          class="h-11 inline-flex items-center text-blueGray-600 text-xs font-bold uppercase px-4 rounded hover:bg-blueGray-100"
        >
          <i class="fas fa-arrow-left mr-1" aria-hidden="true"></i> All reports
        </router-link>
      </div>
    </div>

    <div v-if="loading" class="w-full px-4">
      <skeleton-list variant="cards" :count="2" label="Loading what you can report on" />
      <skeleton-list :count="3" label="Loading the list" />
    </div>

    <div v-else-if="error" class="w-full px-4">
      <empty-state
        title="Could not load this list"
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

    <template v-else>
      <div class="w-full px-4">
        <report-filters
          :value="filters"
          :assignments="assignments"
          :terms="terms"
          :exams="exams"
          @input="applyFilters"
        />
      </div>

      <!-- Assessment: one exam. -->
      <div v-if="kind === 'assessment'" class="w-full md:w-8/12 px-4">
        <div class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white">
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <h3 class="font-semibold text-lg text-blueGray-700 px-4">Choose an exam</h3>
            <p class="text-sm text-blueGray-500 px-4 mt-1">
              Only finalized exams have a report.
            </p>
          </div>
          <div v-if="!matchingExams.length" class="px-8 pb-8">
            <empty-state
              title="No finalized exam matches"
              description="Widen the filters above, or finalise an exam first."
              icon="fas fa-file-signature"
            />
          </div>
          <div v-else class="px-8 pb-4">
            <button
              v-for="exam in matchingExams"
              :key="exam.id"
              type="button"
              class="w-full text-left py-3 border-b border-blueGray-100 last:border-0 hover:bg-blueGray-50"
              @click="open({ name: 'report-assessment', params: { examId: exam.id } })"
            >
              <div class="flex flex-wrap items-center">
                <span class="flex-1 min-w-0 text-sm font-bold text-blueGray-700">
                  {{ exam.title }}
                </span>
                <span class="flex-none text-xs text-blueGray-400 ml-2">
                  {{ exam.className }} &middot; {{ exam.subjectName }}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Class: class, subject and term. -->
      <div v-else-if="kind === 'class'" class="w-full md:w-8/12 px-4">
        <div class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white">
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <h3 class="font-semibold text-lg text-blueGray-700 px-4">Choose a class</h3>
            <p class="text-sm text-blueGray-500 px-4 mt-1">
              The report covers one class, one subject, one term.
            </p>
          </div>
          <div v-if="!assignments.length" class="px-8 pb-8">
            <empty-state
              title="No class to report on"
              description="Your administrator has to assign you to a class and a subject first."
              icon="fas fa-users"
            />
          </div>
          <div v-else class="px-8 pb-4">
            <button
              v-for="item in assignments"
              :key="item.id"
              type="button"
              class="w-full text-left py-3 border-b border-blueGray-100 last:border-0 hover:bg-blueGray-50"
              @click="
                open({
                  name: 'report-class',
                  params: { classId: item.classId },
                  query: { subjectId: item.subjectId, termId: filters.termId || item.termId },
                })
              "
            >
              <span class="text-sm font-bold text-blueGray-700">{{ item.className }}</span>
              <span class="text-xs text-blueGray-400 ml-2">{{ item.subjectName }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Student: pick the exam, then the student. -->
      <div v-else-if="kind === 'student'" class="w-full md:w-8/12 px-4">
        <div class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white">
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <h3 class="font-semibold text-lg text-blueGray-700 px-4">Choose a student</h3>
            <p class="text-sm text-blueGray-500 px-4 mt-1">
              One exam, one student. The list is everyone who sat that paper,
              and whether their report has been written and read.
            </p>
          </div>

          <div v-if="!filters.examId" class="px-8 pb-8 pt-4">
            <empty-state
              title="Choose an exam first"
              description="A student report is about one exam. Pick one above and the register will appear."
              icon="fas fa-file-signature"
            />
          </div>

          <template v-else>
            <div class="px-8 pb-2 pt-4">
              <form-field
                v-model="search"
                label="Search"
                placeholder="Name or admission number"
                hint="Only students who sat the exam you picked."
              />
            </div>

            <div v-if="loadingReports" class="px-8 pb-8">
              <skeleton-list :count="3" label="Loading the register" />
            </div>
            <div v-else-if="!filteredReports.length" class="px-8 pb-8">
              <p class="text-sm text-blueGray-400">
                {{ examReports.length ? "No student matches." : "No student sat this paper yet." }}
              </p>
            </div>
            <div v-else class="px-8 pb-4">
              <button
                v-for="row in filteredReports"
                :key="row.studentId"
                type="button"
                class="w-full text-left py-3 border-b border-blueGray-100 last:border-0 hover:bg-blueGray-50"
                @click="
                  open({
                    name: 'report-student',
                    params: { studentId: row.studentId },
                    query: { examId: filters.examId },
                  })
                "
              >
                <div class="flex flex-wrap items-center">
                  <span class="flex-1 min-w-0 text-sm font-bold text-blueGray-700">
                    {{ row.studentName }}
                  </span>
                  <span class="flex-none ml-2">
                    <status-badge
                      :status="row.status || 'pending'"
                      :label="row.status ? '' : 'No report yet'"
                    />
                  </span>
                </div>
                <div class="flex flex-wrap items-center mt-1">
                  <span class="text-xs text-blueGray-400">{{ row.admissionNo }}</span>
                  <span v-if="row.percent !== null" class="text-xs text-blueGray-400 ml-2">
                    {{ marks(row.totalMarks, row.maxMarks) }} &middot; {{ percent(row.percent / 100) }}
                  </span>
                  <span class="flex-1"></span>
                  <span
                    class="text-xs font-semibold"
                    :class="row.viewedAt ? 'text-emerald-600' : 'text-amber-600'"
                  >
                    <i
                      class="fas mr-1"
                      :class="row.viewedAt ? 'fa-check' : 'fa-clock'"
                      aria-hidden="true"
                    ></i>
                    {{ row.viewedAt ? "Read" : "Not read yet" }}
                  </span>
                </div>
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Progress: either a whole class or one student. -->
      <div v-else class="w-full px-4">
        <div class="flex flex-wrap -mx-2">
          <div class="w-full md:w-6/12 px-2">
            <div class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white">
              <div class="rounded-t mb-0 px-4 py-3 border-0">
                <h4 class="font-semibold text-base text-blueGray-700 px-4">
                  A whole class
                </h4>
                <p class="text-sm text-blueGray-500 px-4 mt-1">
                  Every skill, exam by exam, and how many gaps opened or closed.
                </p>
              </div>
              <div class="px-8 pb-6">
                <button
                  v-for="item in assignments"
                  :key="item.id"
                  type="button"
                  class="w-full text-left py-3 border-b border-blueGray-100 last:border-0 hover:bg-blueGray-50"
                  @click="
                    open({
                      name: 'report-progress-class',
                      params: { classId: item.classId },
                      query: { subjectId: item.subjectId, termId: filters.termId || item.termId },
                    })
                  "
                >
                  <span class="text-sm font-bold text-blueGray-700">{{ item.className }}</span>
                  <span class="text-xs text-blueGray-400 ml-2">{{ item.subjectName }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="w-full md:w-6/12 px-2">
            <div class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white">
              <div class="rounded-t mb-0 px-4 py-3 border-0">
                <h4 class="font-semibold text-base text-blueGray-700 px-4">
                  One student
                </h4>
                <p class="text-sm text-blueGray-500 px-4 mt-1">
                  Their run of exams against the class average.
                </p>
              </div>
              <div class="px-8 pb-2">
                <form-field
                  v-model="search"
                  label="Search"
                  placeholder="Name or admission number"
                />
              </div>
              <div class="px-8 pb-6 max-h-96 overflow-y-auto">
                <button
                  v-for="student in filteredStudents.slice(0, 40)"
                  :key="student.id"
                  type="button"
                  class="w-full text-left py-3 border-b border-blueGray-100 last:border-0 hover:bg-blueGray-50"
                  @click="
                    open({
                      name: 'report-progress-student',
                      params: { studentId: student.id },
                      query: { subjectId: filters.subjectId },
                    })
                  "
                >
                  <span class="text-sm font-bold text-blueGray-700">{{ student.fullName }}</span>
                  <span class="text-xs text-blueGray-400 ml-2">{{ student.admissionNo }}</span>
                </button>
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
import FormField from "@/components/crud/FormField.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import ReportFilters from "@/components/reports/ReportFilters.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import SkeletonList from "@/components/ui/SkeletonList.vue";
import { curriculumIdFor, filtersFromQuery, queryFromFilters } from "@/lib/reportQuery";
import { marks, percent } from "@/lib/scale";
import { useAuthStore } from "@/stores/auth";

/**
 * One picker for every report, because they differ only in what they ask for.
 * Which question is asked comes from the route's `meta.picker`, so adding a
 * report means adding a route rather than another screen.
 */

const FINALIZED = `
  query {
    exams(status: "finalized", limit: 100) {
      items {
        id title
        subject { id name }
        schoolClass { id name }
        term { id }
        createdAt
      }
    }
  }
`;

const ASSIGNMENTS = `
  query ($teacherId: ID) {
    teacherAssignments(teacherId: $teacherId, limit: 100) {
      items {
        id
        schoolClass { id name }
        subject { id name code }
        term { id name year }
      }
    }
  }
`;

const TERMS = `query { academicTerms(limit: 50) { items { id name year } } }`;
const CURRICULUM = `query { curriculumSubjects { id name code } }`;
const STUDENTS = `
  query ($classId: ID) {
    students(classId: $classId, isActive: true, limit: 200) {
      items { id fullName admissionNo }
    }
  }
`;

/**
 * Everyone who sat one exam, with their report's state.
 *
 * The student list is driven by the exam rather than the class: a report only
 * exists for a student who sat that paper, and "6 of 40" has to count the same
 * people the arrows walk through.
 */
const EXAM_REPORTS = `
  query ($examId: ID!) {
    examReports(examId: $examId) {
      studentId studentName admissionNo
      totalMarks maxMarks percent
      status viewedAt
    }
  }
`;

/**
 * The school's subject row and the curriculum subject are different tables.
 * `classReport` and `classProgress` take a curriculum subject id, while an
 * assignment carries the school's own row: the two are joined on the code.
 */
const COPY = {
  assessment: {
    title: "Assessment report",
    purpose: "How one exam went: the spread, the grades, and every question's statistics.",
  },
  class: {
    title: "Class report",
    purpose: "A class's term: the trend, the skill heatmap, and who needs a look.",
  },
  student: {
    title: "Student report",
    purpose: "One student on one exam, in words their parent can read.",
  },
  progress: {
    title: "Progress report",
    purpose: "Movement over the term: what is improving and what is not.",
  },
};

export default {
  name: "report-picker",
  components: { EmptyState, FormField, ReportFilters, SkeletonList, StatusBadge },
  data() {
    return {
      loading: true,
      loadingReports: false,
      error: "",
      exams: [],
      assignments: [],
      terms: [],
      students: [],
      examReports: [],
      search: "",
    };
  },
  setup() {
    return { auth: useAuthStore() };
  },
  computed: {
    kind() {
      return this.$route.meta.picker || "assessment";
    },
    title() {
      return (COPY[this.kind] || COPY.assessment).title;
    },
    purpose() {
      return (COPY[this.kind] || COPY.assessment).purpose;
    },
    filters() {
      return filtersFromQuery(this.$route.query);
    },
    matchingExams() {
      const [classId, subjectId] = (this.filters.classSubject || "").split("|");
      return this.exams.filter(
        (exam) =>
          (!classId || exam.classId === classId) &&
          (!subjectId || exam.subjectId === subjectId) &&
          (!this.filters.termId || exam.termId === this.filters.termId)
      );
    },
    filteredStudents() {
      const needle = this.search.trim().toLowerCase();
      if (!needle) return this.students;
      return this.students.filter(
        (student) =>
          student.fullName.toLowerCase().includes(needle) ||
          (student.admissionNo || "").toLowerCase().includes(needle)
      );
    },
    filteredReports() {
      const needle = this.search.trim().toLowerCase();
      if (!needle) return this.examReports;
      return this.examReports.filter(
        (row) =>
          row.studentName.toLowerCase().includes(needle) ||
          (row.admissionNo || "").toLowerCase().includes(needle)
      );
    },
  },
  watch: {
    // Picking a class changes whose students are listed.
    "filters.classSubject"() {
      this.loadStudents();
    },
    // Picking an exam changes who sat it.
    "filters.examId"() {
      this.loadExamReports();
    },
  },
  created() {
    this.load();
  },
  methods: {
    marks,
    percent,
    async load() {
      this.loading = true;
      this.error = "";
      try {
        const [exams, assignments, terms, curriculum] = await Promise.all([
          gql(FINALIZED),
          gql(ASSIGNMENTS, { teacherId: this.auth.user ? this.auth.user.id : null }),
          gql(TERMS),
          gql(CURRICULUM),
        ]);
        this.exams = exams.exams.items.map((exam) => ({
          id: exam.id,
          title: exam.title,
          classId: exam.schoolClass.id,
          className: exam.schoolClass.name,
          subjectId: exam.subject.id,
          subjectName: exam.subject.name,
          termId: exam.term.id,
          createdAt: exam.createdAt,
        }));
        this.assignments = assignments.teacherAssignments.items.map((item) => ({
          id: item.id,
          classId: item.schoolClass.id,
          className: item.schoolClass.name,
          subjectId: curriculumIdFor(curriculum.curriculumSubjects, item.subject.code),
          subjectName: item.subject.name,
          termId: item.term.id,
        }));
        this.terms = terms.academicTerms.items;
        await Promise.all([this.loadStudents(), this.loadExamReports()]);
      } catch (failure) {
        this.error = failure.message;
      } finally {
        this.loading = false;
      }
    },

    /** With no class picked, every student the teacher can see. */
    async loadStudents() {
      try {
        const [classId] = (this.filters.classSubject || "").split("|");
        const data = await gql(STUDENTS, { classId: classId || null });
        this.students = data.students.items;
      } catch (error) {
        this.students = [];
      }
    },

    /** The register for the chosen exam, or nothing when none is chosen. */
    async loadExamReports() {
      const examId = this.filters.examId;
      if (!examId) {
        this.examReports = [];
        return;
      }
      this.loadingReports = true;
      try {
        const data = await gql(EXAM_REPORTS, { examId });
        this.examReports = data.examReports;
      } catch (error) {
        this.examReports = [];
      } finally {
        this.loadingReports = false;
      }
    },

    applyFilters(next) {
      this.$router.replace({ query: queryFromFilters(next, this.$route.query) });
    },

    /** Carries the filters into the report, so it opens on what was chosen. */
    open(location) {
      const query = { ...(location.query || {}) };
      for (const [key, value] of Object.entries(query)) {
        if (!value) delete query[key];
      }
      this.$router.push({ ...location, query });
    },
  },
};
</script>
