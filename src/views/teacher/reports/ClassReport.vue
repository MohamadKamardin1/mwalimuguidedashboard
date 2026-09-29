<template>
  <report-page
    :title="report ? report.className : 'Class report'"
    :subtitle="subtitle"
    :loading="loading"
    :error="error"
    @reload="load()"
  >
    <template #toolbar>
      <div class="print:hidden">
        <report-toolbar
          :back-to="{ name: 'report-class-picker', query: $route.query }"
          back-label="Classes"
          @print="print"
          @export="exportCsv"
        />
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <button
            type="button"
            class="h-11 inline-flex items-center bg-blueGray-100 text-blueGray-700 text-xs font-bold uppercase px-4 rounded hover:bg-blueGray-200"
            @click="printHeatmap"
          >
            <i class="fas fa-file-invoice mr-1" aria-hidden="true"></i> Print the heatmap sideways
          </button>
          <span class="text-xs text-blueGray-400">
            The heatmap is wider than a portrait page, so it prints on its side.
          </span>
        </div>
      </div>
    </template>

    <template v-if="report">
      <!-- 1. Who this is about, and what to do first. -->
      <div class="w-full px-4">
        <verdict-card :summary="verdict" :evidence="evidence" :dismissible="false" />
      </div>

      <!-- Filters. They live in the URL, so a report is a link. -->
      <div class="w-full px-4 print:hidden">
        <div class="relative break-words w-full mb-4 shadow-lg rounded bg-white px-4 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <select-field
              v-model="subjectId"
              :options="subjectOptions"
              placeholder="Subject"
              tone="lightBlue"
              flush
              class="flex-1 min-w-0"
              aria-label="Subject"
            />
            <select-field
              v-model="termId"
              :options="termOptions"
              placeholder="Term"
              tone="emerald"
              flush
              class="flex-1 min-w-0"
              aria-label="Term"
            />
            <select-field
              v-model="examId"
              :options="examOptions"
              placeholder="Every exam in the term"
              tone="amber"
              flush
              class="flex-1 min-w-0"
              :disabled="latestOnly"
              aria-label="Exam"
            />
            <label class="h-11 inline-flex items-center text-xs font-bold uppercase text-blueGray-600 cursor-pointer px-2 flex-none">
              <input
                v-model="latestOnly"
                type="checkbox"
                class="form-checkbox mr-2"
                @change="onLatestToggle"
              />
              Only the latest exam
            </label>
          </div>
          <p class="text-xs text-blueGray-400 mt-2">
            <template v-if="latestOnly">
              Reading {{ latestExam ? latestExam.title : "the latest finalized exam" }} on its own.
            </template>
            <template v-else>
              Reading {{ plottedExams }} finalized exam(s) together. A heatmap of
              one exam is a snapshot; of several, it is the term.
            </template>
          </p>
        </div>
      </div>

      <!-- 2. The numbers a head of department asks for. -->
      <div class="w-full px-4">
        <div class="flex flex-wrap -mx-2">
          <div v-for="kpi in kpis" :key="kpi.label" class="w-6/12 lg:w-3/12 px-2">
            <kpi-row v-bind="kpi" />
          </div>
        </div>
      </div>

      <!-- 3. The trend, against the pass mark. -->
      <div class="w-full px-4">
        <chart-card title="How the class has moved" :takeaway="trendTakeaway">
          <trend-chart :series="trendSeries" @select-point="focusExam" />
        </chart-card>
      </div>

      <!-- 4. The hero: every student, every skill. -->
      <div class="w-full px-4">
        <report-section
          title="Every student, every skill"
          takeaway="A column of red is a lesson to reteach; a row of red is a student to talk to."
        >
          <div class="relative break-words w-full shadow-lg rounded bg-white p-4 print:shadow-none print:border print:border-blueGray-200">
            <heatmap
              :rows="report.heatmap"
              :groups="groupsBySkill"
              caption="Skill scores by student"
              @select-student="openStudent"
            />
          </div>
        </report-section>
      </div>

      <!-- 5. The two ends of the skill list. -->
      <div class="w-full lg:w-6/12 px-4">
        <report-section title="Weakest skills" :takeaway="weakestTakeaway">
          <div class="relative break-words w-full shadow-lg rounded bg-white p-4 print:shadow-none print:border print:border-blueGray-200">
            <skill-bar
              v-for="skill in weakest"
              :key="skill.skillId"
              :name="skill.name"
              :score="skill.average"
              :measured="skill.measured"
            />
            <p v-if="!weakest.length" class="text-sm text-blueGray-400">
              No skill has been measured yet.
            </p>
          </div>
        </report-section>
      </div>

      <div class="w-full lg:w-6/12 px-4">
        <report-section title="Strongest skills" takeaway="What is already working, and worth building on.">
          <div class="relative break-words w-full shadow-lg rounded bg-white p-4 print:shadow-none print:border print:border-blueGray-200">
            <skill-bar
              v-for="skill in strongest"
              :key="skill.skillId"
              :name="skill.name"
              :score="skill.average"
              :measured="skill.measured"
            />
            <p v-if="!strongest.length" class="text-sm text-blueGray-400">
              No skill has been measured yet.
            </p>
          </div>
        </report-section>
      </div>

      <!-- 6 and 7. Who to talk to. -->
      <div class="w-full lg:w-6/12 px-4">
        <report-section
          title="Students needing attention"
          takeaway="Named with the reason, so the conversation starts somewhere."
        >
          <div class="relative break-words w-full shadow-lg rounded bg-white print:shadow-none print:border print:border-blueGray-200">
            <p v-if="!report.atRisk.length" class="text-sm text-blueGray-400 py-4 px-4">
              Nobody dropped between exams.
            </p>
            <div
              v-for="student in report.atRisk"
              :key="student.studentId"
              class="px-4 py-3 border-b border-blueGray-100 last:border-0"
            >
              <div class="flex flex-wrap items-center">
                <span class="text-sm font-bold text-blueGray-700 flex-1 min-w-0">
                  {{ student.studentName }}
                </span>
                <span
                  class="text-xs font-bold uppercase rounded px-2 py-1 mr-2"
                  :class="reasonChip(student).classes"
                >
                  {{ reasonChip(student).label }}
                </span>
                <span class="text-xs font-bold" :class="student.delta < 0 ? 'text-red-600' : 'text-blueGray-500'">
                  {{ points(student.delta) }}
                </span>
              </div>
              <p class="text-xs text-blueGray-400 mt-1">{{ student.reason }}</p>
              <router-link
                :to="studentRoute(student)"
                class="h-9 inline-flex items-center text-xs font-bold uppercase text-lightBlue-600 hover:text-lightBlue-800 mt-1"
              >
                Open their report <i class="fas fa-arrow-right ml-1" aria-hidden="true"></i>
              </router-link>
            </div>
          </div>
        </report-section>
      </div>

      <div class="w-full lg:w-6/12 px-4">
        <report-section title="Top improvers" takeaway="Worth saying out loud in class.">
          <div class="relative break-words w-full shadow-lg rounded bg-white print:shadow-none print:border print:border-blueGray-200">
            <p v-if="!report.improvers.length" class="text-sm text-blueGray-400 py-4 px-4">
              Nobody moved up between exams yet.
            </p>
            <div
              v-for="(student, index) in report.improvers"
              :key="student.studentId"
              class="px-4 py-3 border-b border-blueGray-100 last:border-0"
            >
              <div class="flex flex-wrap items-center">
                <span
                  class="w-7 h-7 rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold inline-flex items-center justify-center mr-2 flex-none"
                >
                  {{ index + 1 }}
                </span>
                <span class="text-sm font-bold text-blueGray-700 flex-1 min-w-0">
                  {{ student.studentName }}
                </span>
                <span class="text-xs font-bold text-emerald-600">{{ points(student.delta) }}</span>
              </div>
              <p class="text-xs text-blueGray-400 mt-1 ml-9">{{ student.reason }}</p>
            </div>
          </div>
        </report-section>
      </div>

      <!-- 8. What to reteach, from the latest exam's own insight. -->
      <div class="w-full px-4">
        <report-section
          title="Groups to work with"
          takeaway="Students who share the same weak skill, from the latest exam."
        >
          <div class="relative break-words w-full shadow-lg rounded bg-white p-4 print:shadow-none print:border print:border-blueGray-200">
            <p v-if="!gapGroups.length" class="text-sm text-blueGray-400">
              No group fell below the line on the latest exam.
            </p>
            <div v-else class="flex flex-wrap -mx-2">
              <div v-for="group in gapGroups" :key="group.id" class="w-full md:w-6/12 px-2 mb-3">
                <div class="border border-blueGray-100 rounded p-3 h-full">
                  <p class="text-sm font-bold text-blueGray-700">{{ group.skill.name }}</p>
                  <p class="text-xs text-blueGray-400 mt-1">
                    {{ group.students.length }} student(s) ·
                    <span class="font-bold">{{ group.errorType }}</span>
                  </p>
                  <p class="text-xs text-blueGray-500 mt-2 truncate">
                    {{ group.students.map((student) => student.fullName).join(", ") }}
                  </p>
                  <router-link
                    :to="insightsRoute"
                    class="h-9 inline-flex items-center text-xs font-bold uppercase text-lightBlue-600 hover:text-lightBlue-800 mt-2"
                  >
                    Generate practice <i class="fas fa-arrow-right ml-1" aria-hidden="true"></i>
                  </router-link>
                </div>
              </div>
            </div>
            <p v-if="gapGroups.length" class="text-xs text-blueGray-400 mt-2">
              Practice sets and study guides are written on the exam's Insights step.
            </p>
          </div>
        </report-section>
      </div>

      <!-- 9. Sitting the paper, which explains most of the rest. -->
      <div class="w-full px-4">
        <report-section
          title="Who sat the paper"
          takeaway="A missing script depresses every number on this page."
        >
          <div class="relative break-words w-full shadow-lg rounded bg-white print:shadow-none print:border print:border-blueGray-200">
            <!-- The same rows as cards below `md`: four columns of numbers
                 squeeze the exam title, which is the part that matters. -->
            <div class="md:hidden divide-y divide-blueGray-100">
              <div v-for="row in report.attendance" :key="row.examId" class="px-4 py-3">
                <p class="text-sm font-bold text-blueGray-700">{{ row.title }}</p>
                <div class="flex flex-wrap gap-4 mt-2">
                  <div>
                    <p class="text-xs uppercase font-bold text-blueGray-400">Enrolled</p>
                    <p class="text-sm text-blueGray-600">{{ row.enrolled }}</p>
                  </div>
                  <div>
                    <p class="text-xs uppercase font-bold text-blueGray-400">Sat</p>
                    <p class="text-sm text-blueGray-600">{{ row.submitted }}</p>
                  </div>
                  <div>
                    <p class="text-xs uppercase font-bold text-blueGray-400">Missing</p>
                    <p class="text-sm font-bold" :class="row.missing ? 'text-red-600' : 'text-blueGray-400'">
                      {{ row.missing }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="hidden md:block overflow-x-auto">
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th class="px-4 py-3 text-left text-xs uppercase font-bold text-blueGray-500 border-b border-blueGray-100">Exam</th>
                    <th class="px-4 py-3 text-right text-xs uppercase font-bold text-blueGray-500 border-b border-blueGray-100">Enrolled</th>
                    <th class="px-4 py-3 text-right text-xs uppercase font-bold text-blueGray-500 border-b border-blueGray-100">Sat</th>
                    <th class="px-4 py-3 text-right text-xs uppercase font-bold text-blueGray-500 border-b border-blueGray-100">Missing</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in report.attendance" :key="row.examId" class="hover:bg-blueGray-50">
                    <td class="px-4 py-3 border-b border-blueGray-100 text-blueGray-700">{{ row.title }}</td>
                    <td class="px-4 py-3 border-b border-blueGray-100 text-right text-blueGray-600">{{ row.enrolled }}</td>
                    <td class="px-4 py-3 border-b border-blueGray-100 text-right text-blueGray-600">{{ row.submitted }}</td>
                    <td
                      class="px-4 py-3 border-b border-blueGray-100 text-right font-bold"
                      :class="row.missing ? 'text-red-600' : 'text-blueGray-400'"
                    >
                      {{ row.missing }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </report-section>
      </div>
    </template>
  </report-page>
</template>

<script>
import { gql } from "@/api/client";
import Heatmap from "@/components/reports/Heatmap.vue";
import KpiRow from "@/components/reports/KpiRow.vue";
import ReportPage from "@/components/reports/ReportPage.vue";
import ReportSection from "@/components/reports/ReportSection.vue";
import ReportToolbar from "@/components/reports/ReportToolbar.vue";
import SkillBar from "@/components/reports/SkillBar.vue";
import TrendChart from "@/components/reports/TrendChart.vue";
import VerdictCard from "@/components/reports/VerdictCard.vue";
import SelectField from "@/components/crud/SelectField.vue";
import { bandFor, pct, percent, points } from "@/lib/scale";
import { exportRows, printLandscape, printPage } from "@/lib/reportIO";

/** The pass mark the backend grades on. Drawn on the chart, not re-decided. */
const PASS_MARK = 50;

const REPORT = `
  query ($classId: ID!, $subjectId: ID!, $termId: ID!, $examIds: [ID!]) {
    classReport(classId: $classId, subjectId: $subjectId, termId: $termId, examIds: $examIds) {
      classId className exams
      trend { examId title at averagePercent markedScripts passed }
      skills { skillId code name average measured }
      heatmap { studentId studentName admissionNo cells { skillId code name score } }
      atRisk { studentId studentName fromPercent toPercent delta reason }
      improvers { studentId studentName fromPercent toPercent delta reason }
      gapGroups { id label errorType skill { id code name } students { id fullName } }
      attendance { examId title enrolled submitted missing }
    }
  }
`;

/** What the filters need to offer: subjects for this class, terms, exams. */
const CONTEXT = `
  query ($classId: ID, $teacherId: ID) {
    teacherAssignments(teacherId: $teacherId, limit: 100) {
      items { id schoolClass { id } subject { id name code } term { id name year } }
    }
    exams(classId: $classId, limit: 100) {
      items { id title status createdAt term { id } subject { id } }
    }
    academicTerms(limit: 50) { items { id name year } }
    curriculumSubjects { id name code }
  }
`;

const INSIGHT = `
  query ($examId: ID!) {
    classInsights(examId: $examId) {
      id hardestQuestions commonMistakes reteachRecommendations language
    }
  }
`;

/** The school's subject row and the curriculum one are joined on the code. */
function curriculumIdFor(curriculum, code) {
  const wanted = String(code || "").toUpperCase();
  const found = (curriculum || []).find(
    (item) => String(item.code || "").toUpperCase() === wanted
  );
  return found ? found.id : "";
}

export default {
  name: "class-report",
  components: {
    Heatmap,
    KpiRow,
    ReportPage,
    ReportSection,
    ReportToolbar,
    SelectField,
    SkillBar,
    TrendChart,
    VerdictCard,
  },
  data() {
    return {
      loading: true,
      error: "",
      report: null,
      insight: null,
      assignments: [],
      classExams: [],
      terms: [],
      curriculum: [],
      latestOnly: false,
    };
  },
  computed: {
    classId() {
      return this.$route.params.classId;
    },
    subjectId: model("subjectId"),
    termId: model("termId"),
    examId: model("examId"),

    /** The class's own exams, newest first. */
    classExamList() {
      return [...this.classExams].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    },
    latestExam() {
      const [newest] = this.classExamList.filter((exam) => exam.status === "finalized");
      return newest || null;
    },
    examOptions() {
      return this.classExamList
        .filter((exam) => exam.status === "finalized")
        .map((exam) => ({ value: exam.id, label: exam.title }));
    },
    subjectOptions() {
      const seen = new Map();
      for (const item of this.assignments) {
        if (item.classId !== this.classId) continue;
        seen.set(item.curriculumSubjectId, item.subjectName);
      }
      // Every curriculum subject is offered as a fallback, so a teacher who has
      // not been assigned this class can still read its report.
      if (!seen.size) {
        for (const subject of this.curriculum) seen.set(subject.id, subject.name);
      }
      return [...seen].map(([value, label]) => ({ value, label }));
    },
    termOptions() {
      return this.terms.map((term) => ({ value: term.id, label: `${term.name} ${term.year}` }));
    },

    /** What the report is actually reading, in words. */
    subtitle() {
      if (!this.report) return "";
      const scope = this.latestOnly
        ? "the latest exam only"
        : `${this.report.exams} finalized exam(s)`;
      return `${scope} · ${this.subjectLabel}`;
    },
    subjectLabel() {
      const found = this.subjectOptions.find((option) => option.value === this.subjectId);
      return found ? found.label : "this subject";
    },
    plottedExams() {
      return this.report ? this.report.exams : 0;
    },

    /** The exam the insight and gap groups come from. */
    insightExamId() {
      if (this.examId) return this.examId;
      return this.latestExam ? this.latestExam.id : "";
    },
    gapGroups() {
      return (this.report && this.report.gapGroups) || [];
    },
    insightsRoute() {
      return {
        name: "teacher-exam-insights",
        params: { id: this.insightExamId || this.classId },
      };
    },

    /** 1. One sentence, from the model's summary plus the arithmetic. */
    verdict() {
      if (!this.report) return "";
      const latest = this.report.trend[this.report.trend.length - 1];
      const average = latest ? pct(latest.averagePercent) : "—";
      const parts = [
        `${this.report.className} is averaging ${average} across ${this.report.exams} finalized exam(s).`,
      ];

      const priority = this.priority;
      if (priority) parts.push(`Priority: ${priority.title}.`);
      else if (this.weakest.length) {
        parts.push(`Priority: reteach ${this.weakest[0].name}, the weakest skill at ${percent(this.weakest[0].average)}.`);
      }

      const slipping = this.report.atRisk.length;
      if (slipping) parts.push(`${slipping} student(s) moved down.`);
      return parts.join(" ");
    },
    /** The model's own first recommendation, if it wrote one. */
    priority() {
      const raw = (this.insight && this.insight.reteachRecommendations) || [];
      const [first] = raw;
      if (!first) return null;
      if (typeof first === "string") return { title: first, action: "" };
      return {
        title: first.title || "",
        action: first.action || "",
        skillCode: first.skill_code || "",
      };
    },
    evidence() {
      if (!this.report) return [];
      const chips = [
        { label: `${this.report.exams} exam(s)`, classes: "bg-blueGray-200 text-blueGray-700" },
        { label: `${this.report.heatmap.length} student(s)`, classes: "bg-blueGray-200 text-blueGray-700" },
      ];
      if (this.report.atRisk.length) {
        chips.push({ label: `${this.report.atRisk.length} slipping`, classes: "bg-red-200 text-red-800" });
      }
      if (this.report.improvers.length) {
        chips.push({ label: `${this.report.improvers.length} improving`, classes: "bg-emerald-200 text-emerald-800" });
      }
      return chips;
    },

    /** 2. The five numbers, each with what it moved from. */
    kpis() {
      if (!this.report) return [];

      const scored = this.report.trend.filter((point) => point.averagePercent !== null);
      const latest = scored[scored.length - 1];
      const previous = scored[scored.length - 2];
      const move =
        latest && previous ? (latest.averagePercent - previous.averagePercent) / 100 : null;

      const passRate = latest && latest.markedScripts
        ? latest.passed / latest.markedScripts
        : null;
      const lastAttendance = this.report.attendance[this.report.attendance.length - 1];
      const submission = lastAttendance && lastAttendance.enrolled
        ? lastAttendance.submitted / lastAttendance.enrolled
        : null;

      return [
        {
          label: "Class average",
          value: latest ? pct(latest.averagePercent) : "—",
          delta: move,
          deltaLabel: previous ? `since ${previous.title}` : "no earlier exam",
          icon: "fas fa-chart-line",
          iconColor: "bg-lightBlue-500",
        },
        {
          label: "Pass rate",
          value: passRate === null ? "—" : percent(passRate),
          hint: latest ? `${latest.passed} of ${latest.markedScripts} at or above ${PASS_MARK}%` : "",
          icon: "fas fa-check",
          iconColor: "bg-emerald-500",
        },
        {
          label: "Needing attention",
          value: this.report.atRisk.length,
          hint: "Moved down between exams",
          icon: "fas fa-exclamation-triangle",
          iconColor: "bg-red-500",
        },
        {
          label: "Submission rate",
          value: submission === null ? "—" : percent(submission),
          hint: lastAttendance
            ? `${lastAttendance.submitted} of ${lastAttendance.enrolled} sat the last paper`
            : "",
          icon: "fas fa-file-signature",
          iconColor: "bg-amber-500",
        },
      ];
    },

    /** One line: the class average, exam by exam. */
    trendSeries() {
      const points = (this.report ? this.report.trend : []).map((point) => ({
        key: point.examId,
        label: point.title,
        value: point.averagePercent,
        note: `${point.passed} of ${point.markedScripts} passed`,
      }));
      return [
        { key: "class", name: "Class average", colour: "#0EA5E9", points },
      ];
    },

    trendTakeaway() {
      const scored = (this.report && this.report.trend ? this.report.trend : []).filter(
        (point) => point.averagePercent !== null
      );
      if (scored.length < 2) return "The first finalized exam is the starting line.";
      const move = scored[scored.length - 1].averagePercent - scored[0].averagePercent;
      if (Math.abs(move) <= 2) return "The class has held steady across the term.";
      const latest = scored[scored.length - 1];
      const side = latest.averagePercent >= PASS_MARK ? "above" : "below";
      return `The class is ${points(move)} since the first exam, and now sits ${side} the pass mark.`;
    },

    rankedSkills() {
      if (!this.report) return [];
      return this.report.skills
        .filter((skill) => skill.average !== null)
        .sort((a, b) => a.average - b.average);
    },
    weakest() {
      return this.rankedSkills.slice(0, 6);
    },
    strongest() {
      return [...this.rankedSkills].reverse().slice(0, 6);
    },
    weakestTakeaway() {
      if (!this.weakest.length) return "";
      const worst = this.weakest[0];
      return `${worst.name} is the weakest, at ${percent(worst.average)} across ${worst.measured} answer(s).`;
    },

    /** Skill id -> the reteach group it formed, for the heatmap popover. */
    groupsBySkill() {
      const map = {};
      for (const group of this.gapGroups) {
        map[group.skill.id] = {
          errorType: group.errorType,
          size: group.students.length,
        };
      }
      return map;
    },
  },
  created() {
    this.load();
  },
  watch: {
    // Every filter writes to the URL, and the URL is what loads the report.
    "$route.query"() {
      this.loadReport();
    },
  },
  methods: {
    bandFor,
    pct,
    percent,
    points,

    async load() {
      this.loading = true;
      this.error = "";
      try {
        await this.loadContext();
        await this.loadReport();
      } catch (failure) {
        this.error = failure.message;
        this.loading = false;
      }
    },

    /** The lists the filters offer. Only read once per visit. */
    async loadContext() {
      const data = await gql(CONTEXT, {
        classId: this.classId,
        teacherId: null,
        examId: null,
      });
      this.curriculum = data.curriculumSubjects;
      this.assignments = data.teacherAssignments.items.map((item) => ({
        id: item.id,
        classId: item.schoolClass.id,
        subjectName: item.subject.name,
        curriculumSubjectId: curriculumIdFor(data.curriculumSubjects, item.subject.code),
        termId: item.term.id,
      }));
      this.classExams = data.exams.items;
      this.terms = data.academicTerms.items;
      this.latestOnly = this.$route.query.latest === "1";

      // First visit with nothing chosen: open on the newest exam's term and the
      // class's own subject, so the page is never blank by default.
      if (!this.$route.query.termId && this.latestExam) {
        this.termId = this.latestExam.term.id;
      }
      if (!this.$route.query.subjectId) {
        const mine = this.assignments.find((item) => item.classId === this.classId);
        if (mine) this.subjectId = mine.curriculumSubjectId;
      }
    },

    async loadReport() {
      if (!this.subjectId || !this.termId) {
        this.loading = false;
        return;
      }
      this.loading = true;
      this.error = "";
      try {
        // "Only the latest" is the exam filter with one id in it, which is what
        // `examIds` already means -- no second code path.
        const examIds = this.latestOnly
          ? this.latestExam
            ? [this.latestExam.id]
            : []
          : this.examId
          ? [this.examId]
          : null;

        const data = await gql(REPORT, {
          classId: this.classId,
          subjectId: this.subjectId,
          termId: this.termId,
          examIds,
        });
        this.report = data.classReport;
        await this.loadInsight();
      } catch (failure) {
        this.error = failure.message;
        this.report = null;
      } finally {
        this.loading = false;
      }
    },

    async loadInsight() {
      const examId = this.insightExamId;
      if (!examId) {
        this.insight = null;
        return;
      }
      try {
        const data = await gql(INSIGHT, { examId });
        this.insight = data.classInsights;
      } catch (error) {
        // The insight is a bonus; the arithmetic stands without it.
        this.insight = null;
      }
    },

    /** One key of the query, written back to the URL. */
    setQuery(key, value) {
      const query = { ...this.$route.query };
      if (value) query[key] = value;
      else delete query[key];
      if (key !== "examId") delete query.examId;
      this.$router.replace({ query });
    },

    onLatestToggle() {
      const query = { ...this.$route.query };
      if (this.latestOnly) query.latest = "1";
      else delete query.latest;
      delete query.examId;
      this.$router.replace({ query });
    },

    focusExam(examId) {
      this.latestOnly = false;
      this.setQuery("examId", examId);
    },

    reasonChip(student) {
      // The API names the reason; the chip colours it by what it says.
      const reason = String(student.reason || "").toLowerCase();
      if (reason.includes("gap") || reason.includes("repeat")) {
        return { label: "Repeated gap", classes: "bg-amber-200 text-amber-800" };
      }
      if (student.delta <= -10) {
        return { label: "Dropped", classes: "bg-red-200 text-red-800" };
      }
      if (student.toPercent !== null && student.toPercent < PASS_MARK) {
        return { label: "Below pass", classes: "bg-red-200 text-red-800" };
      }
      return { label: "Watch", classes: "bg-blueGray-200 text-blueGray-700" };
    },

    studentRoute(student) {
      const query = { examId: this.insightExamId, subjectId: this.subjectId };
      return {
        name: "report-student",
        params: { studentId: student.studentId },
        query: Object.fromEntries(Object.entries(query).filter(([, value]) => value)),
      };
    },

    openStudent(row) {
      this.$router.push(this.studentRoute(row));
    },

    print() {
      printPage();
    },

    /** Sideways, because forty students across a dozen skills is wide. */
    printHeatmap() {
      printLandscape();
    },

    exportCsv() {
      const cells = this.report.heatmap[0] ? this.report.heatmap[0].cells : [];
      exportRows(`${this.report.className} — skill matrix.csv`, [
        ["Student", "Admission no", ...cells.map((cell) => cell.code), "Average"],
        ...this.report.heatmap.map((row) => {
          const scores = row.cells.map((cell) =>
            cell.score === null ? "" : Math.round(cell.score * 100)
          );
          const real = scores.filter((score) => score !== "");
          return [
            row.studentName,
            row.admissionNo,
            ...scores,
            real.length ? Math.round(real.reduce((a, b) => a + b, 0) / real.length) : "",
          ];
        }),
      ]);
    },
  },
};

/** One v-model per query key, so the URL stays the single source of truth. */
function model(key) {
  return {
    get() {
      return this.$route.query[key] || "";
    },
    set(value) {
      this.setQuery(key, value);
    },
  };
}
</script>
