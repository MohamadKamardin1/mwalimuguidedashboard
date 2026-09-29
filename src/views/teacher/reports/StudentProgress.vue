<template>
  <report-page
    :title="progress ? progress.studentName : 'Progress report'"
    :subtitle="subtitle"
    :loading="loading"
    :error="error"
    @reload="load"
  >
    <template #toolbar>
      <div class="print:hidden">
        <report-toolbar
          :back-to="{ name: 'report-progress-picker', query: $route.query }"
          back-label="Progress"
          @print="print"
          @export="exportCsv"
        />
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <select-field
            v-model="fromTermId"
            :options="termOptions"
            placeholder="From the beginning"
            tone="emerald"
            flush
            class="w-48"
            aria-label="Show exams from this term onwards"
          />
        </div>
      </div>
    </template>

    <template v-if="progress">
      <!-- 1. What the run of exams says, before the detail. -->
      <div class="w-full px-4">
        <verdict-card :summary="verdict" :evidence="evidence" :dismissible="false" />
      </div>

      <!-- A single exam is a baseline, not a trend. Say so, then show it -- and
           offer the student's own report rather than a dead end. -->
      <div v-if="!enoughData" class="w-full px-4">
        <empty-state
          title="Not enough data yet"
          :description="baselineNotice"
          icon="fas fa-chart-line"
        >
          <template #action>
            <router-link
              :to="studentReportRoute"
              class="h-11 inline-flex items-center bg-emerald-500 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg"
            >
              {{ latestExamId ? "Open their report" : "Pick one of their exams" }}
            </router-link>
          </template>
        </empty-state>
      </div>

      <!-- 2. The numbers. -->
      <div class="w-full px-4">
        <div class="flex flex-wrap -mx-2">
          <div v-for="kpi in kpis" :key="kpi.label" class="w-6/12 lg:w-1/5 px-2">
            <kpi-row v-bind="kpi" />
          </div>
        </div>
      </div>

      <!-- 3. The score, with the class beside it. -->
      <div class="w-full px-4">
        <chart-card title="Every exam, against the class" :takeaway="trendTakeaway">
          <p v-if="partialHistory" class="text-xs text-blueGray-400 mb-2">
            {{ examsWithHistory }} exams have been marked against
            {{ firstName }}'s skills; {{ exams.length }} of them produced a
            script to score. Only the ones with marks can be plotted.
          </p>
          <trend-chart
            :series="scoreSeries"
            :pass-mark="PASS_MARK"
            :height="16"
            empty-text="No marked exam yet."
            @select-point="openExam"
          />
        </chart-card>
      </div>

      <!-- 4. The skill journey. -->
      <div class="w-full px-4">
        <report-section
          title="Skill by skill"
          :takeaway="
            enoughData
              ? 'Each skill across the term. What is declining and what is still open comes first.'
              : 'Where each skill stands after the first exam.'
          "
        >
          <div class="flex flex-wrap items-center gap-2 mb-3 print:hidden">
            <button
              v-for="chip in statusFilters"
              :key="chip.key"
              type="button"
              class="h-11 px-3 text-xs font-bold uppercase rounded"
              :class="filter === chip.key ? 'bg-blueGray-800 text-white' : 'bg-blueGray-100 text-blueGray-600 hover:bg-blueGray-200'"
              :aria-pressed="filter === chip.key ? 'true' : 'false'"
              @click="filter = chip.key"
            >
              {{ chip.label }}
              <span class="ml-1 opacity-75">{{ countOf(chip.key) }}</span>
            </button>
          </div>

          <div class="relative break-words w-full shadow-lg rounded bg-white print:shadow-none print:border print:border-blueGray-200">
            <p v-if="!visibleSkills.length" class="text-sm text-blueGray-400 p-4">
              No skill with that status.
            </p>
            <div
              v-for="skill in visibleSkills"
              :key="skill.skillId"
              class="px-4 py-3 border-b border-blueGray-100 last:border-0"
            >
              <div class="flex flex-wrap items-center">
                <!-- On a phone the name takes the row to itself rather than
                     being clipped to "Exp..." beside the chart and the
                     numbers; the fixed-width parts wrap underneath. -->
                <div class="w-full min-w-0 pr-2 lg:flex-1">
                  <p class="text-sm font-bold text-blueGray-700 truncate">{{ skill.name }}</p>
                  <p class="text-xs text-blueGray-400">{{ skill.topic }}</p>
                </div>

                <div class="w-24 flex-none mr-3 print:hidden">
                  <sparkline :values="skill.scores" />
                </div>

                <div class="flex-none text-right mr-3 w-28">
                  <p class="text-xs text-blueGray-400">
                    {{ percent(skill.first) }} → <span class="font-bold text-blueGray-700">{{ percent(skill.latest) }}</span>
                  </p>
                  <p class="text-xs font-bold" :class="statusFor(skill.status).text">
                    {{ points(skill.delta * 100) }}
                  </p>
                </div>

                <span
                  class="text-xs font-bold uppercase rounded px-2 py-1 flex-none"
                  :class="statusFor(skill.status).classes"
                >
                  {{ statusFor(skill.status).label }}
                </span>
              </div>
            </div>
          </div>
        </report-section>
      </div>

      <!-- 5. One thing that went right, one thing to do about what did not:
           two halves of one row, so they sit side by side on a desk and on
           paper rather than as one long strip. -->
      <div class="w-full px-4">
        <div class="flex flex-wrap -mx-2">
          <div class="w-full lg:w-6/12 px-2">
            <report-section title="Gaps closed">
              <div class="relative break-words w-full shadow-lg rounded bg-white p-4 print:shadow-none print:border print:border-blueGray-200">
                <p v-if="!closed.length" class="text-sm text-blueGray-400">
                  No skill has crossed the mastery line yet. The first one is worth
                  marking out loud.
                </p>
                <div v-else class="bg-emerald-50 border-l-4 border-emerald-500 rounded px-3 py-2 mb-3">
                  <p class="text-sm font-bold text-emerald-800">
                    {{ closed.length }} skill{{ closed.length === 1 ? "" : "s" }} closed
                  </p>
                </div>
                <div v-for="skill in closed" :key="skill.skillId" class="py-2 border-b border-blueGray-100 last:border-0">
                  <p class="text-sm font-bold text-emerald-700">{{ skill.name }}</p>
                  <p class="text-xs text-blueGray-500 mt-1">
                    {{ percent(skill.first) }} → {{ percent(skill.latest) }}, past the
                    {{ percent(MASTERY_TARGET) }} line.
                  </p>
                </div>
              </div>
            </report-section>
          </div>

          <div class="w-full lg:w-6/12 px-2">
            <report-section title="Still struggling">
              <div class="relative break-words w-full shadow-lg rounded bg-white p-4 print:shadow-none print:border print:border-blueGray-200">
                <p v-if="!struggling.length" class="text-sm text-blueGray-400">
                  Nothing is open or slipping. Worth saying out loud too.
                </p>
                <div v-for="skill in struggling" :key="skill.skillId" class="py-3 border-b border-blueGray-100 last:border-0">
                  <div class="flex flex-wrap items-center">
                    <p class="text-sm font-bold text-blueGray-700 flex-1 min-w-0">{{ skill.name }}</p>
                    <span
                      class="text-xs font-bold uppercase rounded px-2 py-1 flex-none"
                      :class="statusFor(skill.status).classes"
                    >
                      {{ statusFor(skill.status).label }}
                    </span>
                  </div>
                  <p class="text-xs text-blueGray-500 mt-1">
                    Now at {{ percent(skill.latest) }}, under the
                    {{ percent(MASTERY_TARGET) }} line.
                  </p>
                  <router-link
                    :to="practiceRoute(skill)"
                    class="h-11 inline-flex items-center text-xs font-bold uppercase text-lightBlue-600 hover:text-lightBlue-800 mt-1"
                  >
                    <i class="fas fa-book-open mr-1" aria-hidden="true"></i>
                    Generate practice for this skill
                  </router-link>
                </div>
              </div>
            </report-section>
          </div>
        </div>
      </div>

      <!-- 6. The run of exams, newest last, each a way into its own report. -->
      <div class="w-full px-4">
        <report-section
          title="Exam by exam"
          takeaway="Each one, with the gap that cost the most marks."
        >
          <div class="flex flex-wrap -mx-2">
            <div v-for="exam in exams" :key="exam.examId" class="w-full md:w-6/12 xl:w-4/12 px-2 mb-3">
              <div class="relative break-words bg-white rounded shadow-lg p-4 h-full flex flex-col print:shadow-none print:border print:border-blueGray-200">
                <div class="flex flex-wrap items-center mb-1">
                  <span class="text-xs font-bold uppercase text-blueGray-400 flex-1">
                    {{ day(exam.at) }}
                  </span>
                  <span class="text-lg font-bold" :class="bandForPct(exam.score).text">
                    {{ pct(exam.score) }}
                  </span>
                </div>
                <p class="font-bold text-blueGray-700">{{ exam.title }}</p>
                <p class="text-xs text-blueGray-500 mt-1 flex-1">
                  {{ exam.marks }} of {{ exam.maxMarks }} marks.
                  <span v-if="exam.classAverage !== null">
                    Class averaged {{ pct(exam.classAverage) }}.
                  </span>
                </p>
                <p
                  v-if="examGap(exam.examId)"
                  class="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1 mt-2"
                >
                  <i class="fas fa-exclamation-circle mr-1" aria-hidden="true"></i>
                  Weakest after this one: {{ examGap(exam.examId) }}
                </p>
                <router-link
                  :to="{ name: 'report-assessment', params: { examId: exam.examId } }"
                  class="h-11 inline-flex items-center text-xs font-bold uppercase text-lightBlue-600 hover:text-lightBlue-800 mt-2"
                >
                  Open the exam report <i class="fas fa-arrow-right ml-1" aria-hidden="true"></i>
                </router-link>
              </div>
            </div>
          </div>
        </report-section>
      </div>
    </template>
  </report-page>
</template>

<script>
import { gql } from "@/api/client";
import KpiRow from "@/components/reports/KpiRow.vue";
import ReportPage from "@/components/reports/ReportPage.vue";
import ReportSection from "@/components/reports/ReportSection.vue";
import ReportToolbar from "@/components/reports/ReportToolbar.vue";
import Sparkline from "@/components/reports/Sparkline.vue";
import TrendChart from "@/components/reports/TrendChart.vue";
import VerdictCard from "@/components/reports/VerdictCard.vue";
import SelectField from "@/components/crud/SelectField.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import { openOrDeclining, orderOf, statusFor, SKILL_STATUS } from "@/lib/progressStatus";
import { bandForPct, pct, percent, percentDelta, points } from "@/lib/scale";
import { exportRows, printPage } from "@/lib/reportIO";

/** The mastery line the backend grades a skill against, as a share. */
const MASTERY_TARGET = 0.6;
const PASS_MARK = 50;

const PROGRESS = `
  query ($studentId: ID!, $subjectId: ID, $fromTermId: ID) {
    studentProgress(studentId: $studentId, subjectId: $subjectId, fromTermId: $fromTermId) {
      studentId studentName admissionNo overallGrowth
      exams { examId title at marks maxMarks score classAverage classSize }
      skills {
        skillId code name topic level status first latest delta
        points { examId at score }
      }
    }
  }
`;

const CONTEXT = `
  query {
    academicTerms(limit: 50) { items { id name year startDate } }
  }
`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default {
  name: "student-progress",
  components: {
    EmptyState,
    KpiRow,
    ReportPage,
    ReportSection,
    ReportToolbar,
    SelectField,
    Sparkline,
    TrendChart,
    VerdictCard,
  },
  data() {
    return {
      MASTERY_TARGET,
      PASS_MARK,
      loading: true,
      error: "",
      progress: null,
      terms: [],
      filter: "all",
    };
  },
  computed: {
    studentId() {
      return this.$route.params.studentId;
    },
    fromTermId: model("fromTermId"),

    firstName() {
      if (!this.progress) return "they";
      return this.progress.studentName.split(" ")[0];
    },
    subtitle() {
      if (!this.progress) return "";
      return `${this.progress.admissionNo} · ${this.examsWithHistory} exam(s)`;
    },
    termOptions() {
      return this.terms.map((term) => ({ value: term.id, label: `${term.name} ${term.year}` }));
    },

    /** The exams with marks: what the score line can actually plot. */
    exams() {
      return this.progress ? this.progress.exams : [];
    },
    /**
     * Every exam this student has any history for.
     *
     * `exams` above only holds exams with a marked script, while a skill's own
     * history can run longer -- `studentProgress` builds its exam set from the
     * mastery rows and then narrows the score series to exams that have marks.
     * A student with three exams of skill history but one marked script would
     * otherwise be told they have not sat enough exams.
     */
    examsWithHistory() {
      const ids = new Set(this.exams.map((exam) => exam.examId));
      for (const skill of this.skills) {
        for (const point of skill.points || []) ids.add(point.examId);
      }
      return ids.size;
    },
    /** One exam is a baseline. Progress needs two to mean anything. */
    enoughData() {
      return this.examsWithHistory >= 2;
    },
    /** The empty state's own sentence: a first exam is a baseline, nothing more. */
    baselineNotice() {
      const exams = `${this.examsWithHistory} exam${this.examsWithHistory === 1 ? "" : "s"}`;
      return `Progress appears after the second exam, and ${this.firstName} has sat ${exams} so far. What follows is the baseline: nothing below compares one exam with another yet.`;
    },
    /**
     * The exam to open the student's own report on.
     *
     * A marked script is the best answer, but a student can have skill history
     * without one, so the latest skill point is the fallback rather than no
     * exam at all.
     */
    latestExamId() {
      if (this.exams.length) return this.exams[this.exams.length - 1].examId;
      const points = this.skills.flatMap((skill) => skill.points || []);
      return points.length ? points[points.length - 1].examId : "";
    },
    /**
     * Where the empty state sends a teacher. With no exam to hand there is no
     * report to open, so the picker is the honest destination.
     */
    studentReportRoute() {
      if (!this.latestExamId) {
        return { name: "report-student-picker", query: { studentId: this.studentId } };
      }
      return {
        name: "report-student",
        params: { studentId: this.studentId },
        query: { examId: this.latestExamId },
      };
    },
    /**
     * True when the skill history is longer than the score history -- worth
     * saying, because the score line will look short for no visible reason.
     */
    partialHistory() {
      return this.examsWithHistory > this.exams.length;
    },
    skills() {
      return this.progress ? this.progress.skills : [];
    },

    /** Declining and open first, then the rest by their own order. */
    orderedSkills() {
      return [...this.skills].sort((left, right) => {
        const a = orderOf(left.status);
        const b = orderOf(right.status);
        if (a !== b) return a - b;
        return (left.latest || 0) - (right.latest || 0);
      });
    },
    visibleSkills() {
      const rows = this.filter === "all"
        ? this.orderedSkills
        : this.orderedSkills.filter((skill) => skill.status === this.filter);
      return rows.map((skill) => ({
        ...skill,
        // Nulls are dropped rather than drawn as zero: an exam the student
        // missed is not a score of nothing.
        scores: (skill.points || []).map((point) => point.score),
      }));
    },
    /** The chips, in the map's own order: the work still owed first. */
    statusFilters() {
      const statuses = Object.keys(SKILL_STATUS).sort((a, b) => orderOf(a) - orderOf(b));
      return [
        { key: "all", label: "All" },
        ...statuses.map((key) => ({ key, label: statusFor(key).label })),
      ];
    },

    closed() {
      return this.skills.filter((skill) => skill.status === "CLOSED");
    },
    struggling() {
      return this.skills.filter((skill) => openOrDeclining(skill.status));
    },

    /** Two lines: the student, and the class they are in. */
    scoreSeries() {
      const points = this.exams.map((exam) => ({
        key: exam.examId,
        label: exam.title,
        value: exam.score,
        note: `${exam.marks}/${exam.maxMarks}`,
      }));
      const classPoints = this.exams.map((exam) => ({
        key: exam.examId,
        label: exam.title,
        value: exam.classAverage,
      }));
      const series = [
        { key: "student", name: this.firstName, colour: "#0EA5E9", points },
      ];
      // Only worth a second line once there is a class average to draw.
      if (classPoints.some((point) => point.value !== null)) {
        series.push({ key: "class", name: "Class average", colour: "#94A3B8", points: classPoints });
      }
      return series;
    },

    verdict() {
      if (!this.progress) return "";
      const name = this.firstName;
      if (!this.enoughData) {
        const latest = this.exams[this.exams.length - 1];
        return `${name} has sat ${this.exams.length} exam so far, scoring ${pct(latest ? latest.score : null)}. That is the baseline — progress is read from the next one.`;
      }
      const growth = this.progress.overallGrowth || 0;
      const moved = growth > 0.02 ? "up" : growth < -0.02 ? "down" : "level";
      const parts = [
        `${name} is ${moved} ${percentDelta(growth)} across ${this.exams.length} exams.`,
      ];
      if (this.closed.length) {
        parts.push(`${this.closed.length} skill(s) have crossed the mastery line.`);
      }
      if (this.struggling.length) {
        parts.push(`${this.struggling.length} still need work, starting with ${this.struggling[0].name}.`);
      }
      return parts.join(" ");
    },
    evidence() {
      if (!this.progress) return [];
      const latest = this.exams[this.exams.length - 1];
      const chips = [
        { label: `${this.exams.length} exam(s)`, classes: "bg-blueGray-200 text-blueGray-700" },
        { label: `${this.skills.length} skill(s) tracked`, classes: "bg-blueGray-200 text-blueGray-700" },
      ];
      if (latest) {
        chips.push({
          label: `Latest ${pct(latest.score)}`,
          classes: `${bandForPct(latest.score).soft} ${bandForPct(latest.score).text}`,
        });
      }
      if (this.closed.length) {
        chips.push({ label: `${this.closed.length} closed`, classes: "bg-emerald-200 text-emerald-800" });
      }
      return chips;
    },

    kpis() {
      if (!this.progress) return [];
      const latest = this.exams[this.exams.length - 1];
      const first = this.exams[0];
      const growth =
        latest && first && this.enoughData ? (latest.score - first.score) / 100 : null;

      return [
        {
          label: "Latest score",
          value: latest ? pct(latest.score) : "—",
          hint: latest ? `Class averaged ${pct(latest.classAverage)}` : "",
          icon: "fas fa-percent",
          iconColor: "bg-lightBlue-500",
        },
        {
          label: "Exams taken",
          value: this.examsWithHistory,
          hint: this.partialHistory
            ? `${this.exams.length} with a script`
            : `${this.skills.length} skill(s) tracked`,
          icon: "fas fa-file-signature",
          iconColor: "bg-blueGray-600",
        },
        {
          label: "Growth",
          value: this.enoughData ? percentDelta(growth) : "—",
          delta: growth,
          deltaLabel: this.enoughData ? "since the first exam" : "needs a second exam",
          icon: "fas fa-chart-line",
          iconColor: "bg-emerald-500",
        },
        {
          label: "Skills closed",
          value: this.closed.length,
          hint: `Crossed ${percent(MASTERY_TARGET)}`,
          icon: "fas fa-check-double",
          iconColor: "bg-emerald-500",
        },
        {
          label: "Still open",
          value: this.struggling.length,
          hint: "Open or declining",
          icon: "fas fa-exclamation-triangle",
          iconColor: "bg-amber-500",
        },
      ];
    },

    trendTakeaway() {
      if (!this.enoughData) {
        return "One exam is a starting point. The line arrives with the second.";
      }
      const first = this.exams[0];
      const latest = this.exams[this.exams.length - 1];
      const move = latest.score - first.score;
      if (Math.abs(move) <= 2) return "Holding steady against the class.";
      return move > 0
        ? `Up ${points(move)} since ${first.title}.`
        : `Down ${points(move)} since ${first.title}.`;
    },
  },
  created() {
    this.load();
  },
  watch: {
    "$route.query"() {
      this.load();
    },
  },
  methods: {
    bandForPct,
    pct,
    percent,
    points,
    statusFor,

    countOf(key) {
      if (key === "all") return this.skills.length;
      return this.skills.filter((skill) => skill.status === key).length;
    },

    day(iso) {
      if (!iso) return "—";
      const [year, month, date] = String(iso).slice(0, 10).split("-").map(Number);
      if (!year || !month || !date) return String(iso);
      return `${date} ${MONTHS[month - 1]} ${year}`;
    },

    /**
     * The biggest gap on an exam, taken from the skill that ended lowest after
     * it. The API gives the skill history, not a per-exam breakdown, so this is
     * the honest reading: "the skill this exam left weakest".
     */
    examGap(examId) {
      let worst = null;
      for (const skill of this.skills) {
        const point = (skill.points || []).find((entry) => entry.examId === examId);
        if (!point || point.score === null) continue;
        if (!worst || point.score < worst.score) {
          worst = { name: skill.name, score: point.score };
        }
      }
      if (!worst || worst.score >= MASTERY_TARGET) return "";
      return `${worst.name} (${percent(worst.score)})`;
    },

    /** Practice is written per skill from the exam's Insights step. */
    practiceRoute(skill) {
      const examId = this.exams.length ? this.exams[this.exams.length - 1].examId : "";
      return {
        name: "teacher-exam-insights",
        params: { id: examId },
        query: { skill: skill.code },
      };
    },

    openExam(examId) {
      this.$router.push({ name: "report-assessment", params: { examId } });
    },

    async load() {
      this.loading = true;
      this.error = "";
      try {
        const [data, context] = await Promise.all([
          gql(PROGRESS, {
            studentId: this.studentId,
            // A student's progress is one subject's story; the screen
            // does not narrow it further.
            subjectId: null,
            fromTermId: this.fromTermId || null,
          }),
          this.terms.length ? Promise.resolve(null) : gql(CONTEXT),
        ]);
        this.progress = data.studentProgress;
        if (context) this.terms = context.academicTerms.items;
      } catch (failure) {
        // The report shell renders this verbatim, so it has to be a sentence a
        // teacher can act on with the technical detail after it.
        this.error = `We could not load this report. ${failure.message}`;
        this.progress = null;
      } finally {
        this.loading = false;
      }
    },

    print() {
      printPage();
    },

    exportCsv() {
      exportRows(`${this.progress.studentName} — progress.csv`, [
        ["Exam", "Date", "Marks", "Max", "Score %", "Class average %", "Biggest gap"],
        ...this.exams.map((exam) => [
          exam.title,
          this.day(exam.at),
          exam.marks,
          exam.maxMarks,
          Math.round(exam.score),
          exam.classAverage === null ? "" : Math.round(exam.classAverage),
          this.examGap(exam.examId),
        ]),
        [],
        ["Skill", "Topic", "Status", "First %", "Latest %", "Change"],
        ...this.orderedSkills.map((skill) => [
          skill.name,
          skill.topic,
          statusFor(skill.status).label,
          skill.first === null ? "" : Math.round(skill.first * 100),
          skill.latest === null ? "" : Math.round(skill.latest * 100),
          Math.round((skill.delta || 0) * 100),
        ]),
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
      const query = { ...this.$route.query };
      if (value) query[key] = value;
      else delete query[key];
      this.$router.replace({ query });
    },
  };
}
</script>
