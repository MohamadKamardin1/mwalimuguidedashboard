<template>
  <report-page
    :title="progress ? progress.className : 'Class progress'"
    :subtitle="subtitle"
    :loading="loading"
    :error="error"
    @reload="load"
  >
    <template #toolbar>
      <report-toolbar
        :back-to="{ name: 'report-progress-picker', query: $route.query }"
        back-label="Progress"
        @print="print"
        @export="exportCsv"
      />
    </template>

    <template v-if="progress">
      <div class="w-full px-4">
        <verdict-card :summary="verdict" :evidence="evidence" :dismissible="false" />
      </div>

      <!-- One exam is a baseline, not a trend. Say so, then show it -- and give
           the teacher the class report rather than a dead end. -->
      <div v-if="!enoughData" class="w-full px-4">
        <empty-state
          title="Not enough data yet"
          :description="baselineNotice"
          icon="fas fa-chart-line"
        >
          <template #action>
            <router-link
              :to="{ name: 'report-class', params: { classId }, query: { subjectId, termId } }"
              class="h-11 inline-flex items-center bg-emerald-500 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg"
            >
              Open the class report
            </router-link>
          </template>
        </empty-state>
      </div>

      <!-- 1. The numbers. -->
      <div class="w-full px-4">
        <div class="flex flex-wrap -mx-2">
          <div v-for="kpi in kpis" :key="kpi.label" class="w-6/12 lg:w-3/12 px-2">
            <kpi-row v-bind="kpi" />
          </div>
        </div>
      </div>

      <!-- 2. Every skill over time, up to five at once. -->
      <div class="w-full px-4">
        <chart-card
          title="Skill mastery over time"
          :takeaway="
            picked.length
              ? 'Each line is one skill across the term. A line that stays flat is a lesson that is not landing.'
              : 'Pick up to five skills to follow.'
          "
        >
          <template #actions>
            <span class="text-xs text-blueGray-400">{{ picked.length }} of 5</span>
          </template>

          <div class="flex flex-wrap items-center gap-2 mb-3 print:hidden">
            <button
              v-for="skill in skillChoices"
              :key="skill.skillId"
              type="button"
              class="h-11 px-3 text-xs font-bold rounded inline-flex items-center"
              :class="
                picked.includes(skill.skillId)
                  ? 'bg-blueGray-800 text-white'
                  : 'bg-blueGray-100 text-blueGray-600 hover:bg-blueGray-200 disabled:opacity-40'
              "
              :disabled="!picked.includes(skill.skillId) && picked.length >= 5"
              :aria-pressed="picked.includes(skill.skillId) ? 'true' : 'false'"
              @click="toggleSkill(skill.skillId)"
            >
              <i v-if="picked.includes(skill.skillId)" class="fas fa-check mr-1" aria-hidden="true"></i>
              {{ skill.name }}
            </button>
          </div>

          <trend-chart
            :series="skillSeries"
            :pass-mark="MASTERY_PERCENT"
            :height="18"
            empty-text="Pick a skill to plot."
          />
        </chart-card>
      </div>

      <!-- 3. Who moved, both ways: the two halves of one row, so they read side
           by side on a desk and on paper instead of as one long strip. -->
      <div class="w-full px-4">
        <div class="flex flex-wrap -mx-2">
          <div class="w-full lg:w-6/12 px-2">
            <report-section title="Improved most" takeaway="Worth naming in class.">
              <div class="relative break-words w-full shadow-lg rounded bg-white print:shadow-none print:border print:border-blueGray-200">
                <p v-if="!improvers.length" class="text-sm text-blueGray-400 px-4 py-4">
                  {{ enoughData ? "Nobody moved up between exams." : "This needs a second exam to compare." }}
                </p>
                <div
                  v-for="(student, index) in improvers"
                  :key="student.studentId"
                  class="px-4 py-3 border-b border-blueGray-100 last:border-0"
                >
                  <div class="flex flex-wrap items-center">
                    <span class="w-7 h-7 rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold inline-flex items-center justify-center mr-2 flex-none">
                      {{ index + 1 }}
                    </span>
                    <span class="text-sm font-bold text-blueGray-700 flex-1 min-w-0">{{ student.studentName }}</span>
                    <span class="text-xs font-bold text-emerald-600">{{ points(student.delta) }}</span>
                  </div>
                  <p class="text-xs text-blueGray-400 mt-1 ml-9">
                    {{ pct(student.fromPercent) }} → {{ pct(student.toPercent) }}
                  </p>
                </div>
              </div>
            </report-section>
          </div>

          <div class="w-full lg:w-6/12 px-2">
            <report-section title="Declining" takeaway="These are conversations, not statistics.">
              <div class="relative break-words w-full shadow-lg rounded bg-white print:shadow-none print:border print:border-blueGray-200">
                <p v-if="!declining.length" class="text-sm text-blueGray-400 px-4 py-4">
                  {{ enoughData ? "Nobody moved down between exams." : "This needs a second exam to compare." }}
                </p>
                <div
                  v-for="student in declining"
                  :key="student.studentId"
                  class="px-4 py-3 border-b border-blueGray-100 last:border-0"
                >
                  <div class="flex flex-wrap items-center">
                    <span class="text-sm font-bold text-blueGray-700 flex-1 min-w-0">{{ student.studentName }}</span>
                    <span class="text-xs font-bold text-red-600">{{ points(student.delta) }}</span>
                  </div>
                  <p class="text-xs text-blueGray-400 mt-1">
                    {{ pct(student.fromPercent) }} → {{ pct(student.toPercent) }}
                  </p>
                  <router-link
                    :to="studentRoute(student)"
                    class="h-11 inline-flex items-center text-xs font-bold uppercase text-lightBlue-600 hover:text-lightBlue-800 mt-1"
                  >
                    Open their report <i class="fas fa-arrow-right ml-1" aria-hidden="true"></i>
                  </router-link>
                </div>
              </div>
            </report-section>
          </div>
        </div>
      </div>

      <!-- 4. The shape of the class, then and now. -->
      <div class="w-full px-4">
        <report-section
          title="How the class has shifted"
          :takeaway="shiftTakeaway"
        >
          <div class="relative break-words w-full shadow-lg rounded bg-white p-4 print:shadow-none print:border print:border-blueGray-200">
            <div v-if="!histograms.length" class="text-sm text-blueGray-400 py-4">
              No marked exam to plot.
            </div>

            <template v-else>
              <div class="flex flex-wrap items-center gap-4 mb-3">
                <span v-for="band in histogramKey" :key="band.label" class="inline-flex items-center text-xs text-blueGray-600">
                  <span class="w-4 h-4 rounded mr-1 opacity-70" :class="band.classes"></span>
                  {{ band.label }}
                </span>
              </div>

              <div class="flex items-end h-48">
                <div
                  v-for="(bucket, index) in buckets"
                  :key="bucket.label"
                  class="flex-1 flex flex-col items-center justify-end h-full px-1"
                >
                  <div class="w-full flex items-end justify-center h-full">
                    <div
                      v-for="series in histogramKey"
                      :key="series.key"
                      class="h-full flex items-end px-0.5"
                      style="width: 46%"
                    >
                      <div
                        class="w-full rounded-t ease-linear transition-all duration-300"
                        :class="series.classes"
                        :style="{ height: Math.max(2, bucket[series.key]) + '%' }"
                        :title="`${series.label}, ${bucket.label}: ${bucket[series.key]}%`"
                      ></div>
                    </div>
                  </div>
                  <!-- Every other label on a phone: ten of them are wider than
                       the ten bands they label, and the last one pushed the
                       whole page sideways. All ten come back from `sm` up, and
                       on paper, where the card is wide enough for them.
                       `sm:block`, not `sm:inline`: this build of Tailwind only
                       carries the display utilities the app already used. -->
                  <span
                    class="text-xs text-blueGray-400 mt-1"
                    :class="index % 2 ? 'hidden sm:block' : ''"
                  >
                    {{ bucket.label }}
                  </span>
                </div>
              </div>
              <p class="text-xs text-blueGray-400 mt-3">
                Share of scripts in each ten per cent band, side by side.
              </p>
            </template>
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
import TrendChart from "@/components/reports/TrendChart.vue";
import VerdictCard from "@/components/reports/VerdictCard.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import { pct, percentDelta, points } from "@/lib/scale";
import { exportRows, printPage } from "@/lib/reportIO";

/** The mastery line, as a percentage. Drawn on the skill chart. */
const MASTERY_PERCENT = 60;

/** Five lines is where a chart stops being readable and starts being noise. */
const MAX_LINES = 5;

const PROGRESS = `
  query ($classId: ID!, $subjectId: ID!, $termId: ID!) {
    classProgress(classId: $classId, subjectId: $subjectId, termId: $termId) {
      classId className exams gapsOpened gapsClosed cohortGrowth
      skills {
        skillId code name first latest delta
        points { examId examTitle at average measured }
      }
    }
  }
`;

/** Who moved, both ways. The class report already works this out. */
const REPORT = `
  query ($classId: ID!, $subjectId: ID!, $termId: ID!) {
    classReport(classId: $classId, subjectId: $subjectId, termId: $termId) {
      atRisk { studentId studentName fromPercent toPercent delta reason }
      improvers { studentId studentName fromPercent toPercent delta reason }
      trend { examId title at averagePercent }
    }
  }
`;

/** The first and last exam's own distribution, for the shift. */
const HISTOGRAM = `
  query ($examId: ID!) {
    assessmentReport(examId: $examId) {
      examId title histogram { label count percent }
    }
  }
`;

const PAIR = [
  { key: "first", label: "First exam", classes: "bg-blueGray-400" },
  { key: "latest", label: "Latest exam", classes: "bg-lightBlue-500" },
];

export default {
  name: "class-progress",
  components: { EmptyState, KpiRow, ReportPage, ReportSection, ReportToolbar, TrendChart, VerdictCard },
  data() {
    return {
      MASTERY_PERCENT,
      loading: true,
      error: "",
      progress: null,
      report: null,
      histograms: [],
      picked: [],
    };
  },
  computed: {
    classId() {
      return this.$route.params.classId;
    },
    subjectId() {
      return this.$route.query.subjectId || "";
    },
    termId() {
      return this.$route.query.termId || "";
    },
    subtitle() {
      if (!this.progress) return "";
      return `${this.progress.exams} finalized exam(s)`;
    },
    enoughData() {
      return Boolean(this.progress && this.progress.exams >= 2);
    },
    /** The empty state's own sentence: one exam is a baseline, nothing more. */
    baselineNotice() {
      const exams = this.progress ? this.progress.exams : 0;
      const count = `${exams} exam${exams === 1 ? "" : "s"}`;
      return `Progress appears after the second exam, and this class has sat ${count} so far. What follows is the baseline: nothing below compares one exam with another yet.`;
    },
    skills() {
      return this.progress ? this.progress.skills : [];
    },
    improvers() {
      return this.report ? this.report.improvers : [];
    },
    declining() {
      return this.report ? this.report.atRisk : [];
    },

    /** Most improved and most declined, from the same deltas. */
    mostImproved() {
      return this.rankedByDelta(true)[0] || null;
    },
    mostDeclined() {
      return this.rankedByDelta(false)[0] || null;
    },

    kpis() {
      if (!this.progress) return [];
      const improved = this.mostImproved;
      const declined = this.mostDeclined;
      return [
        {
          label: "Cohort growth",
          value: percentDelta(this.progress.cohortGrowth),
          hint: this.enoughData ? "First exam to latest" : "Needs a second exam",
          icon: "fas fa-chart-line",
          iconColor: "bg-lightBlue-500",
        },
        {
          label: "Gaps opened",
          value: this.progress.gapsOpened,
          hint: `Against ${this.progress.gapsClosed} closed`,
          icon: "fas fa-exclamation-triangle",
          iconColor: "bg-red-500",
        },
        {
          label: "Most improved skill",
          value: improved ? improved.name : "—",
          hint: improved ? points(improved.delta * 100) : "No movement yet",
          icon: "fas fa-arrow-up",
          iconColor: "bg-emerald-500",
        },
        {
          label: "Most declined skill",
          value: declined ? declined.name : "—",
          hint: declined ? points(declined.delta * 100) : "No movement yet",
          icon: "fas fa-arrow-down",
          iconColor: "bg-amber-500",
        },
      ];
    },

    /** The skills on offer, weakest movement first so the list leads with them. */
    skillChoices() {
      return [...this.skills].sort((a, b) => (a.delta || 0) - (b.delta || 0));
    },
    skillSeries() {
      const palette = ["#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#6366F1"];
      return this.picked
        .map((skillId, index) => {
          const skill = this.skills.find((item) => item.skillId === skillId);
          if (!skill) return null;
          return {
            key: skill.skillId,
            name: skill.name,
            colour: palette[index % palette.length],
            points: (skill.points || []).map((point) => ({
              key: point.examId,
              label: point.examTitle,
              value: point.average === null ? null : point.average * 100,
            })),
          };
        })
        .filter(Boolean);
    },

    verdict() {
      if (!this.progress) return "";
      if (!this.enoughData) {
        return `${this.progress.className} has sat ${this.progress.exams} finalized exam so far. That is the baseline; movement is read from the next one.`;
      }
      const growth = this.progress.cohortGrowth || 0;
      const moved = growth > 0.02 ? "up" : growth < -0.02 ? "down" : "level";
      const parts = [
        `Across ${this.progress.exams} exams the cohort is ${moved} ${percentDelta(growth)}.`,
        `${this.progress.gapsOpened} gap(s) opened and ${this.progress.gapsClosed} closed.`,
      ];
      if (this.mostDeclined && this.mostDeclined.delta < 0) {
        parts.push(`${this.mostDeclined.name} is the one slipping.`);
      }
      return parts.join(" ");
    },
    evidence() {
      if (!this.progress) return [];
      const chips = [
        { label: `${this.progress.exams} exam(s)`, classes: "bg-blueGray-200 text-blueGray-700" },
        { label: `${this.skills.length} skill(s)`, classes: "bg-blueGray-200 text-blueGray-700" },
      ];
      if (this.progress.gapsClosed) {
        chips.push({ label: `${this.progress.gapsClosed} closed`, classes: "bg-emerald-200 text-emerald-800" });
      }
      if (this.progress.gapsOpened) {
        chips.push({ label: `${this.progress.gapsOpened} opened`, classes: "bg-red-200 text-red-800" });
      }
      return chips;
    },

    histogramKey() {
      return PAIR;
    },
    /** One row per band, with a share for each exam. */
    buckets() {
      const [first, latest] = this.histograms;
      if (!first) return [];
      return first.histogram.map((bucket, index) => ({
        label: bucket.label,
        first: bucket.percent,
        latest: latest && latest.histogram[index] ? latest.histogram[index].percent : 0,
      }));
    },
    shiftTakeaway() {
      if (this.histograms.length < 2) return "One exam so far, so there is nothing to compare.";
      const [first, latest] = this.histograms;
      // The share above the pass mark is the number a head of department asks
      // for; the bars below are the evidence.
      const share = (report) =>
        report.histogram
          .filter((bucket) => bucket.lower >= 50)
          .reduce((sum, bucket) => sum + bucket.percent, 0);
      const before = share(first);
      const after = share(latest);
      const move = after - before;
      if (Math.abs(move) < 2) {
        return `${Math.round(after)}% of scripts are at or above the pass mark, about the same as the first exam.`;
      }
      return move > 0
        ? `${Math.round(after)}% of scripts now pass, up from ${Math.round(before)}%.`
        : `${Math.round(after)}% of scripts now pass, down from ${Math.round(before)}%.`;
    },
  },
  created() {
    this.load();
  },
  methods: {
    pct,
    points,

    /** The skills with a movement, biggest first (or smallest). */
    rankedByDelta(descending) {
      return [...this.skills]
        .filter((skill) => skill.delta !== null && skill.delta !== undefined)
        .sort((a, b) => (descending ? b.delta - a.delta : a.delta - b.delta));
    },

    async load() {
      this.loading = true;
      this.error = "";
      try {
        const [progress, report] = await Promise.all([
          gql(PROGRESS, {
            classId: this.classId,
            subjectId: this.subjectId,
            termId: this.termId,
          }),
          gql(REPORT, {
            classId: this.classId,
            subjectId: this.subjectId,
            termId: this.termId,
          }).catch(() => null),
        ]);
        this.progress = progress.classProgress;
        this.report = report ? report.classReport : null;

        // Open on the skills that moved most, both ways, so the chart says
        // something before anything is pressed.
        if (!this.picked.length) {
          this.picked = [...this.skills]
            .filter((skill) => skill.delta !== null)
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
            .slice(0, 3)
            .map((skill) => skill.skillId);
        }
        await this.loadHistograms();
      } catch (failure) {
        // The report shell renders this verbatim, so it has to be a sentence a
        // teacher can act on with the technical detail after it.
        this.error = `We could not load this report. ${failure.message}`;
        this.progress = null;
      } finally {
        this.loading = false;
      }
    },

    /** The first and the latest exam, which is what "shift" compares. */
    async loadHistograms() {
      const trend = this.report && this.report.trend ? this.report.trend : [];
      const plotted = trend.filter((point) => point.averagePercent !== null);
      if (plotted.length < 2) {
        this.histograms = [];
        return;
      }
      const ends = [plotted[0].examId, plotted[plotted.length - 1].examId];
      try {
        const reports = await Promise.all(
          ends.map((examId) => gql(HISTOGRAM, { examId }))
        );
        this.histograms = reports.map((data) => data.assessmentReport);
      } catch (error) {
        this.histograms = [];
      }
    },

    toggleSkill(skillId) {
      if (this.picked.includes(skillId)) {
        this.picked = this.picked.filter((id) => id !== skillId);
        return;
      }
      if (this.picked.length >= MAX_LINES) return;
      this.picked = [...this.picked, skillId];
    },

    studentRoute(student) {
      return {
        name: "report-student",
        params: { studentId: student.studentId },
        query: { subjectId: this.subjectId, termId: this.termId },
      };
    },

    print() {
      printPage();
    },

    exportCsv() {
      exportRows(`${this.progress.className} — cohort progress.csv`, [
        ["Skill", "First %", "Latest %", "Change"],
        ...this.skills.map((skill) => [
          skill.name,
          skill.first === null ? "" : Math.round(skill.first * 100),
          skill.latest === null ? "" : Math.round(skill.latest * 100),
          Math.round((skill.delta || 0) * 100),
        ]),
        [],
        ["Student", "From %", "To %", "Change", "Direction"],
        ...this.improvers.map((student) => [
          student.studentName,
          Math.round(student.fromPercent),
          Math.round(student.toPercent),
          Math.round(student.delta),
          "improving",
        ]),
        ...this.declining.map((student) => [
          student.studentName,
          Math.round(student.fromPercent),
          Math.round(student.toPercent),
          Math.round(student.delta),
          "declining",
        ]),
      ]);
    },
  },
};
</script>
