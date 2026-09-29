<template>
  <div class="flex flex-wrap">
    <spinner v-if="loading" large label="Loading this student..." />

    <div v-else-if="error" class="w-full px-4">
      <empty-state
        title="Could not load this student"
        :description="error"
        icon="fas fa-exclamation-triangle"
      />
    </div>

    <template v-else>
      <!-- Profile header -->
      <div class="w-full px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="flex-auto p-6">
            <div class="flex flex-wrap items-center">
              <div
                class="shadow-lg rounded-full h-16 w-16 flex items-center justify-center bg-emerald-500 text-white text-xl font-bold mr-4"
              >
                {{ initials }}
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-xl text-blueGray-700">
                  {{ student.fullName }}
                </h3>
                <p class="text-sm text-blueGray-400">
                  {{ student.admissionNo }}
                  <template v-if="className"> · {{ className }}</template>
                </p>
              </div>
              <router-link
                v-if="classId"
                :to="{ name: 'teacher-class', params: { id: classId } }"
                class="text-blueGray-500 hover:text-blueGray-700 text-xs font-bold uppercase"
              >
                <i class="fas fa-arrow-left mr-1"></i>Back to class
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Mastery progress -->
      <div class="w-full lg:w-7/12 px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-blueGray-700"
        >
          <div class="rounded-t mb-0 px-4 py-3 bg-transparent">
            <h6 class="uppercase text-blueGray-100 mb-1 text-xs font-semibold">
              Mastery progress
            </h6>
            <h2 class="text-white text-xl font-semibold">
              {{ series.length ? formatScore(latest) : "No results yet" }}
            </h2>
          </div>
          <div class="p-4 flex-auto">
            <div v-if="!series.length" class="text-blueGray-200 text-sm py-8 text-center">
              No marked exams yet, so there is nothing to plot.
            </div>
            <div v-else class="relative h-350-px">
              <canvas ref="chart" :id="`progress-${student.id}`"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Latest report -->
      <div class="w-full lg:w-5/12 px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <div class="flex flex-wrap items-center">
              <div class="relative w-full max-w-full flex-grow flex-1">
                <h3 class="font-semibold text-lg text-blueGray-700">
                  Latest report
                </h3>
                <p v-if="reportExam" class="text-xs text-blueGray-400">
                  {{ reportExam.title }} · {{ formatDate(reportExam.createdAt) }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex-auto px-4 pb-6">
            <div v-if="reportLoading" class="py-4">
              <spinner inline label="Loading report..." />
            </div>

            <div v-else-if="!reportExam" class="py-4">
              <empty-state
                title="No finalized exam yet"
                description="A report is written once an exam has been marked and finalized."
                icon="fas fa-file-alt"
              />
            </div>

            <div v-else-if="!report" class="py-4">
              <empty-state
                title="No report for this exam"
                description="The report for this student has not been generated yet."
                icon="fas fa-file-alt"
              />
            </div>

            <template v-else>
              <ai-note label="Report summary" :text="report.summary" />
              <router-link
                :to="{ name: 'teacher-exam', params: { id: report.examId } }"
                class="text-emerald-500 hover:text-emerald-600 text-xs font-bold uppercase"
              >
                Full report <i class="fas fa-arrow-right ml-1"></i>
              </router-link>
            </template>

            <!-- The written reports for this student, once there is an exam
                 to report on. -->
            <div
              v-if="reportExam"
              class="flex flex-wrap items-center mt-3 pt-3 border-t border-blueGray-100"
            >
              <router-link
                :to="{
                  name: 'report-student',
                  params: { studentId: student.id },
                  query: { examId: reportExam.id },
                }"
                class="h-11 inline-flex items-center text-emerald-500 hover:text-emerald-600 text-xs font-bold uppercase mr-3"
              >
                Student report <i class="fas fa-arrow-right ml-1"></i>
              </router-link>
              <router-link
                :to="{ name: 'report-progress-student', params: { studentId: student.id } }"
                class="h-11 inline-flex items-center text-lightBlue-600 hover:text-lightBlue-800 text-xs font-bold uppercase"
              >
                Progress report <i class="fas fa-arrow-right ml-1"></i>
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Skill mastery by topic -->
      <div class="w-full px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <h3 class="font-semibold text-lg text-blueGray-700">
              Skills by topic
            </h3>
            <p class="text-xs text-blueGray-400">
              Red below 50%, orange to 75%, green above. Each bar is the most
              recent recorded score for that skill.
            </p>
          </div>

          <div v-if="!skillGroups.length" class="px-8 pb-8">
            <empty-state
              title="No skills recorded yet"
              description="Skill mastery appears after an exam has been marked."
              icon="fas fa-chart-bar"
            />
          </div>

          <div v-else class="flex-auto px-4 pb-6">
            <div
              v-for="group in skillGroups"
              :key="group.topic"
              class="mb-6"
            >
              <h6 class="text-xs uppercase font-bold text-blueGray-500 mb-2">
                {{ group.topic }}
              </h6>
              <div
                v-for="skill in group.skills"
                :key="skill.id"
                class="mb-3"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm text-blueGray-600">
                    <span class="text-blueGray-400 mr-1">{{ skill.code }}</span>
                    {{ skill.name }}
                  </span>
                  <span class="text-sm font-bold" :class="masteryBand(skill.score).text">
                    {{ formatScore(skill.score) }}
                  </span>
                </div>
                <div class="w-full h-2 bg-blueGray-200 rounded overflow-hidden">
                  <div
                    class="h-2 rounded"
                    :class="masteryBand(skill.score).bar"
                    :style="{ width: `${Math.round((skill.score || 0) * 100)}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Exam history -->
      <div class="w-full mb-12 px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <h3 class="font-semibold text-lg text-blueGray-700">Exam history</h3>
          </div>

          <div v-if="!history.length" class="px-8 pb-8">
            <empty-state
              title="No exams marked yet"
              description="This student's results will appear here as exams are marked."
              icon="fas fa-file-alt"
            />
          </div>

          <div v-else class="block w-full overflow-x-auto">
            <table class="items-center w-full bg-transparent border-collapse">
              <thead>
                <tr>
                  <th
                    v-for="head in ['Exam', 'Date', 'Score', 'Change']"
                    :key="head"
                    class="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                  >
                    {{ head }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in history" :key="row.examId">
                  <td
                    class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4"
                  >
                    <router-link
                      :to="{ name: 'teacher-exam', params: { id: row.examId } }"
                      class="font-bold text-blueGray-700 hover:text-emerald-500"
                    >
                      {{ row.title }}
                    </router-link>
                  </td>
                  <td
                    class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-blueGray-600"
                  >
                    {{ formatDate(row.at) }}
                  </td>
                  <td
                    class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4"
                  >
                    <span :class="masteryBand(row.score).text" class="font-bold">
                      {{ formatScore(row.score) }}
                    </span>
                  </td>
                  <td
                    class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4"
                  >
                    <span
                      v-if="index === 0"
                      class="text-blueGray-400"
                      title="First recorded exam"
                    >
                      <i class="fas fa-minus"></i>
                    </span>
                    <span
                      v-else
                      :class="TREND[trendAt(index)].classes"
                      :title="TREND[trendAt(index)].label"
                    >
                      <i :class="TREND[trendAt(index)].icon"></i>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import Chart from "chart.js";

import { gql } from "@/api/client";
import AiNote from "@/components/teacher/AiNote.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import Spinner from "@/components/ui/Spinner.vue";

import {
  TREND,
  formatDate,
  formatScore,
  latestPerSkill,
  latestScore,
  masteryBand,
  perExamSeries,
  trendOf,
} from "@/lib/insights";

const LIMIT = 100;

// There is no `student(id)` query, so the record is reached through the
// student's own enrolment, which also gives the class for context.
const STUDENT_BY_ENROLMENT = `
  query StudentByEnrolment($studentId: ID) {
    enrollments(studentId: $studentId, isActive: true, limit: 1) {
      items {
        id
        student { id fullName admissionNo gender }
        schoolClass { id name level }
        term { id name year isCurrent }
      }
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
        skill { id code name }
      }
    }
  }
`;

const CLASS_EXAMS = `
  query ClassExams($classId: ID, $termId: ID) {
    exams(classId: $classId, termId: $termId, limit: ${LIMIT}) {
      items { id title status createdAt subject { id code } }
    }
  }
`;

const CURRICULUM_TREE = `
  query {
    topics {
      id
      name
      skills { id code name }
    }
  }
`;

const STUDENT_REPORT = `
  query StudentReport($studentId: ID!, $examId: ID!) {
    studentReport(studentId: $studentId, examId: $examId) {
      id
      summary
      strengths
      gaps
      language
      status
      createdAt
      examId
    }
  }
`;

export default {
  name: "teacher-student",
  components: { AiNote, EmptyState, Spinner },

  data() {
    return {
      loading: true,
      error: "",
      student: null,
      classId: "",
      className: "",
      examTitles: new Map(),
      series: [],
      skills: [],
      topicBySkill: new Map(),
      report: null,
      reportExam: null,
      reportLoading: false,
      TREND,
    };
  },

  computed: {
    studentId() {
      return this.$route.params.id;
    },
    initials() {
      if (!this.student) return "?";
      return this.student.fullName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase();
    },
    latest() {
      return latestScore(this.series);
    },
    /** Newest first, with the exam's title where one is known. */
    history() {
      return [...this.series]
        .reverse()
        .map((point) => ({
          ...point,
          title: this.examTitles.get(point.examId) || "Exam",
        }));
    },
    skillGroups() {
      const byTopic = new Map();
      for (const skill of this.skills) {
        const topic = this.topicBySkill.get(skill.id) || "Other skills";
        if (!byTopic.has(topic)) byTopic.set(topic, []);
        byTopic.get(topic).push(skill);
      }
      // Weakest first inside a topic, so the work to do is at the top.
      return [...byTopic.entries()].map(([topic, skills]) => ({
        topic,
        skills: skills.sort((a, b) => (a.score ?? 1) - (b.score ?? 1)),
      }));
    },
  },

  async mounted() {
    await this.load();
  },

  beforeUnmount() {
    if (this.chart) this.chart.destroy();
  },

  methods: {
    formatDate,
    formatScore,
    masteryBand,

    /** The change from the previous recorded exam to this one. */
    trendAt(index) {
      const current = this.history[index];
      const previous = this.history[index + 1];
      if (!previous) return "flat";
      return trendOf([
        { score: previous.score },
        { score: current.score },
      ]);
    },

    async load() {
      this.loading = true;
      this.error = "";
      try {
        const enrolment = await gql(STUDENT_BY_ENROLMENT, { studentId: this.studentId });
        const row = enrolment.enrollments.items[0];
        if (!row) {
          this.error =
            "This student is not enrolled in any of your classes, so there is nothing to show.";
          return;
        }

        this.student = row.student;
        this.classId = row.schoolClass.id;
        this.className = row.schoolClass.name;

        const [progress, tree, exams] = await Promise.all([
          gql(STUDENT_PROGRESS, { studentId: this.studentId }),
          gql(CURRICULUM_TREE),
          gql(CLASS_EXAMS, { classId: this.classId, termId: row.term.id }),
        ]);

        this.series = perExamSeries(progress.studentProgress.rows);
        this.skills = [...latestPerSkill(progress.studentProgress.rows).values()].map((row) => ({
          id: row.skill.id,
          code: row.skill.code,
          name: row.skill.name,
          score: row.score,
        }));

        for (const topic of tree.topics) {
          for (const skill of topic.skills) this.topicBySkill.set(skill.id, topic.name);
        }

        const mine = exams.exams.items.filter((exam) => exam.status === "finalized");
        for (const exam of exams.exams.items) this.examTitles.set(exam.id, exam.title);
        this.reportExam = mine.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] || null;

        if (this.reportExam) await this.loadReport();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
      // After `loading` is false, or the canvas is not in the DOM yet and
      // chart.js would size itself to its default and draw nothing.
      await this.$nextTick();
      this.drawChart();
    },

    async loadReport() {
      this.reportLoading = true;
      try {
        const data = await gql(STUDENT_REPORT, {
          studentId: this.studentId,
          examId: this.reportExam.id,
        });
        this.report = data.studentReport;
      } catch (error) {
        // A report only exists once it has been generated; that is not an
        // error worth failing the page for.
        this.report = null;
      } finally {
        this.reportLoading = false;
      }
    },

    /** The Notus line chart, with the points this student actually has. */
    drawChart() {
      const canvas = this.$refs.chart;
      if (!canvas || !this.series.length) return;

      if (this.chart) this.chart.destroy();
      this.chart = new Chart(canvas, {
        type: "line",
        data: {
          labels: this.series.map((point, index) => {
            // The exam's own name where we have it; a position otherwise.
            const title = this.examTitles.get(point.examId);
            if (!title) return `Exam ${index + 1}`;
            return title.length > 18 ? `${title.slice(0, 17)}…` : title;
          }),
          datasets: [
            {
              label: "Mastery",
              backgroundColor: "#ffffff",
              borderColor: "#ffffff",
              pointBackgroundColor: "#ffffff",
              data: this.series.map((point) => Math.round(point.score * 100)),
              fill: false,
            },
          ],
        },
        options: {
          maintainAspectRatio: false,
          responsive: true,
          legend: { display: false },
          tooltips: {
            callbacks: {
              title: (items) => {
                const point = this.series[items[0].index];
                return this.examTitles.get(point.examId) || `Exam ${items[0].index + 1}`;
              },
            },
          },
          scales: {
            yAxes: [
              {
                ticks: { beginAtZero: true, max: 100, fontColor: "#cbd5e0", callback: (v) => `${v}%` },
                gridLines: { color: "rgba(255,255,255,0.1)" },
              },
            ],
            xAxes: [
              {
                ticks: { fontColor: "#cbd5e0" },
                gridLines: { color: "rgba(255,255,255,0.1)" },
              },
            ],
          },
        },
      });
    },
  },
};
</script>
