<template>
  <report-page
    :title="heading"
    :subtitle="subtitle"
    :loading="loading"
    :error="error"
    @reload="load"
  >
    <template #toolbar>
      <report-toolbar
        :back-to="{ name: 'report-assessment', params: { examId } }"
        back-label="Assessment"
        @print="print"
        @export="exportCsv"
      />
    </template>

    <div v-if="!loading && !error" class="w-full px-4 print:hidden">
      <div class="relative break-words bg-white rounded shadow-lg p-4 mb-4">
        <p class="text-sm text-blueGray-600">
          One sheet per student, in one print job: each student's report starts a
          new page. This is the <strong>parent copy</strong> — no class comparison
          and no band — because it is the one that goes home. A student's full
          report, with the marking behind every answer, is on their own page.
        </p>
        <p v-if="missing.length" class="text-sm text-amber-700 mt-2">
          <i class="fas fa-info-circle mr-1" aria-hidden="true"></i>
          {{ missing.length }} of {{ sheets.length }} students have no report yet:
          {{ missingNames }}. Their sheets say so rather than being left out, so the
          register still adds up.
        </p>
        <button
          type="button"
          class="mt-3 h-11 inline-flex items-center bg-blueGray-800 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg"
          @click="print"
        >
          <i class="fas fa-print mr-1" aria-hidden="true"></i>
          Print all {{ sheets.length }} sheet{{ sheets.length === 1 ? "" : "s" }}
        </button>
      </div>
    </div>

    <div v-if="!loading && !error" class="w-full px-4">
      <article
        v-for="sheet in sheets"
        :key="sheet.studentId"
        class="batch-sheet relative break-words bg-white rounded shadow-lg p-4 mb-4"
      >
        <header class="flex flex-wrap items-baseline border-b border-blueGray-200 pb-2 mb-3">
          <h2 class="flex-1 min-w-0 text-lg font-bold text-blueGray-800">
            {{ sheet.studentName }}
          </h2>
          <span class="text-xs text-blueGray-500">{{ sheet.admissionNo }}</span>
        </header>

        <p class="text-sm text-blueGray-500 mb-3">
          {{ subtitle }}
        </p>

        <div v-if="!sheet.report" class="text-sm text-blueGray-500">
          No report has been written for this student on this exam. Their script
          {{ sheet.percent === null ? "has not been marked" : "is marked" }}
          <template v-if="sheet.percent !== null">, at {{ pct(sheet.percent) }}</template>.
        </div>

        <template v-else>
          <!-- The mark, in the two frames a family reads it in. -->
          <div class="flex flex-wrap items-end mb-3">
            <span class="text-3xl font-bold text-blueGray-800 mr-3">
              {{ pct(sheet.percent) }}
            </span>
            <span class="text-sm text-blueGray-500 mr-3">
              {{ marks(sheet.totalMarks, sheet.maxMarks) }}
            </span>
            <span class="text-sm font-bold text-blueGray-700">
              Grade {{ gradeFor(sheet.percent) }}
            </span>
          </div>

          <p class="text-sm text-blueGray-700 mb-3">
            <ai-chip class="mr-1" />
            {{ sheet.report.summary || "The summary for this report has not been written yet." }}
          </p>

          <div v-if="sheet.strengths.length" class="mb-3">
            <h3 class="text-xs font-bold uppercase text-blueGray-500 mb-1">What they can do</h3>
            <p class="text-sm text-blueGray-700">
              <span v-for="(strength, index) in sheet.strengths" :key="strength.code">
                <span v-if="index">&middot; </span>
                {{ strength.name }} {{ percent(strength.score) }}
              </span>
            </p>
          </div>

          <div v-if="sheet.gaps.length" class="mb-3">
            <h3 class="text-xs font-bold uppercase text-blueGray-500 mb-1">What to work on</h3>
            <div class="flex flex-wrap -mx-2">
              <div
                v-for="gap in sheet.gaps"
                :key="gap.skill"
                class="w-full md:w-4/12 px-2 mb-2"
              >
                <p class="text-sm font-bold text-blueGray-700">{{ gap.name }}</p>
                <p class="text-xs text-blueGray-500">
                  <span v-for="number in gap.question_numbers" :key="number" class="mr-1">Q{{ number }}</span>
                  <span v-if="gap.error_type">{{ gap.error_type }}</span>
                </p>
                <p v-if="gap.guide" class="text-xs text-blueGray-600 mt-1">{{ gap.guide }}</p>
                <p class="text-xs font-bold uppercase text-lightBlue-700 mt-1">This week</p>
                <p class="text-xs text-blueGray-600">{{ gap.action }}</p>
              </div>
            </div>
          </div>

          <div v-if="sheet.practice.length" class="mb-2">
            <h3 class="text-xs font-bold uppercase text-blueGray-500 mb-1">Practice for this week</h3>
            <ol class="batch-practice list-decimal ml-5">
              <li v-for="(item, index) in sheet.practice" :key="index" class="text-sm text-blueGray-700 mb-1">
                <math-text :text="item.question" />
              </li>
            </ol>
          </div>

          <p v-if="sheet.gapSkill" class="text-xs text-blueGray-400">
            Practice written for {{ sheet.gapSkill }}, in
            {{ sheet.practiceLanguage === "sw" ? "Kiswahili" : "English" }}.
          </p>
        </template>
      </article>
    </div>
  </report-page>
</template>

<script>
import { gql } from "@/api/client";
import AiChip from "@/components/teacher/AiChip.vue";
import MathText from "@/components/teacher/MathText.vue";
import ReportPage from "@/components/reports/ReportPage.vue";
import ReportToolbar from "@/components/reports/ReportToolbar.vue";
import { exportRows, printPage } from "@/lib/reportIO";
import { gradeFor, marks, pct, percent } from "@/lib/scale";

const EXAM = `
  query ($examId: ID!) {
    exam(id: $examId) {
      id title createdAt
      subject { id name }
      schoolClass { id name }
      term { id name year }
      questions { number skills { skill { id code name } } }
    }
  }
`;

/** The register: who sat it, their marks, and whether a report exists. */
const REGISTER = `
  query ($examId: ID!) {
    examReports(examId: $examId) {
      studentId studentName admissionNo
      totalMarks maxMarks percent reportId status
    }
  }
`;

/** The exam's gap groups, which is where each student's practice set lives. */
const GROUPS = `
  query ($examId: ID!) {
    gapGroups(examId: $examId) {
      id
      skill { id code name }
      students { id }
      materials { id kind language content }
    }
  }
`;

const REPORT = `
  query ($studentId: ID!, $examId: ID!) {
    studentReport(studentId: $studentId, examId: $examId) {
      id summary strengths gaps guide language status
    }
  }
`;

// How many reports are in flight at once. A class of forty is forty calls, and
// a browser will happily open six sockets and then start dropping the rest.
const BATCH = 6;

export default {
  name: "batch-student-reports",
  components: { AiChip, MathText, ReportPage, ReportToolbar },
  data() {
    return {
      loading: true,
      error: "",
      exam: null,
      register: [],
      groups: [],
      reports: {},
    };
  },
  computed: {
    examId() {
      return this.$route.params.examId;
    },
    heading() {
      return this.exam ? `All reports — ${this.exam.title}` : "All student reports";
    },
    subtitle() {
      if (!this.exam) return "";
      const parts = [
        this.exam.schoolClass && this.exam.schoolClass.name,
        this.exam.title,
        this.exam.term && `${this.exam.term.name} ${this.exam.term.year}`,
      ];
      return parts.filter(Boolean).join(" · ");
    },
    /** One printable page per student who sat the paper. */
    sheets() {
      return this.register.map((row) => {
        const report = this.reports[row.studentId] || null;
        const group = this.groups.find((item) =>
          (item.students || []).some((student) => student.id === row.studentId)
        );
        return {
          ...row,
          report,
          strengths: report ? this.skillStrengthList(report) : [],
          gaps: report ? this.gapList(report) : [],
          gapSkill: group ? group.skill.code : "",
          practice: this.practiceFor(group, report),
          practiceLanguage: this.practiceLanguage(group, report),
        };
      });
    },
    missing() {
      return this.sheets.filter((sheet) => !sheet.report);
    },
    missingNames() {
      return this.missing.map((sheet) => sheet.studentName).join(", ");
    },
    /**
     * `{code: name}` for the skills this paper tested.
     *
     * A report's strengths name a skill by its code, and a code is not what a
     * parent reads, so the names come from the questions the code was tagged to.
     */
    skillNames() {
      const index = {};
      const questions = (this.exam && this.exam.questions) || [];
      for (const question of questions) {
        for (const link of question.skills || []) {
          index[link.skill.code] = link.skill.name;
        }
      }
      return index;
    },
  },
  watch: {
    examId() {
      this.load();
    },
  },
  created() {
    this.load();
  },
  methods: {
    marks,
    percent,
    pct,
    gradeFor,

    async load() {
      this.loading = true;
      this.error = "";
      try {
        const [exam, register, groups] = await Promise.all([
          gql(EXAM, { examId: this.examId }),
          gql(REGISTER, { examId: this.examId }),
          gql(GROUPS, { examId: this.examId }).catch(() => ({ gapGroups: [] })),
        ]);
        this.exam = exam.exam;
        this.register = register.examReports;
        this.groups = groups.gapGroups || [];
        await this.loadReports();
      } catch (failure) {
        this.error = `We could not load these reports. ${failure.message}`;
      } finally {
        this.loading = false;
      }
    },

    /**
     * One `studentReport` per student, six at a time.
     *
     * There is no "all reports for an exam" query, and asking for forty in
     * parallel makes the browser queue them anyway -- but in a way that looks
     * like a hang. A student whose report fails is left without one rather
     * than taking the whole job down with them.
     */
    async loadReports() {
      const wanted = this.register.filter((row) => row.reportId);
      const found = {};
      for (let index = 0; index < wanted.length; index += BATCH) {
        const slice = wanted.slice(index, index + BATCH);
        const answers = await Promise.all(
          slice.map((row) =>
            gql(REPORT, { studentId: row.studentId, examId: this.examId })
              .then((data) => [row.studentId, data.studentReport])
              .catch(() => [row.studentId, null])
          )
        );
        for (const [studentId, report] of answers) found[studentId] = report;
      }
      this.reports = found;
    },

    skillStrengthList(report) {
      const index = this.skillNames;
      return (report.strengths || []).slice(0, 3).map((item) => ({
        code: item.skill,
        name: index[item.skill] || item.skill,
        score: item.score,
      }));
    },

    /**
     * The guide paragraph for each gap, by name with the position as fallback.
     *
     * The model names a skill one way in `gaps` and another in `guide` -- a
     * code in one, a phrase in the other -- so the two lists are matched by
     * name first and by order second, which is how the pipeline writes them.
     */
    gapList(report) {
      const guide = report.guide || [];
      return (report.gaps || []).slice(0, 3).map((gap, position) => {
        const wanted = String(gap.skill || "").trim().toLowerCase();
        const named = guide.find((entry) => {
          const key = String((entry && entry.skill) || "").trim().toLowerCase();
          return key && (key === wanted || key.includes(wanted) || wanted.includes(key));
        });
        const numbers = gap.question_numbers || [];
        return {
          ...gap,
          name: gap.skill,
          guide: named ? named.paragraph || "" : (guide[position] || {}).paragraph || "",
          action: numbers.length
            ? `Redo question ${numbers.map((n) => `Q${n}`).join(" and ")}, then two more like it.`
            : "Practise two short questions on this every day.",
        };
      });
    },

    practiceFor(group, report) {
      if (!group) return [];
      const sets = (group.materials || []).filter((item) => item.kind === "practice_set");
      if (!sets.length) return [];
      const language = (report && report.language) || "en";
      const chosen = sets.find((item) => item.language === language) || sets[0];
      return Array.isArray(chosen.content) ? chosen.content.slice(0, 5) : [];
    },

    practiceLanguage(group, report) {
      if (!group) return "en";
      const sets = (group.materials || []).filter((item) => item.kind === "practice_set");
      const language = (report && report.language) || "en";
      const chosen = sets.find((item) => item.language === language) || sets[0];
      return chosen ? chosen.language : language;
    },

    print() {
      printPage();
    },

    /** One row per student, for the office copy of the same numbers. */
    exportCsv() {
      const rows = [
        [`${this.heading} — ${this.subtitle}`],
        [],
        ["Student", "Admission no", "Marks", "Out of", "Percent", "Grade", "Report", "Skills going well", "Things to work on"],
        ...this.sheets.map((sheet) => [
          sheet.studentName,
          sheet.admissionNo,
          sheet.totalMarks === null ? "" : sheet.totalMarks,
          sheet.maxMarks === null ? "" : sheet.maxMarks,
          sheet.percent === null ? "" : Math.round(sheet.percent * 10) / 10,
          sheet.percent === null ? "" : gradeFor(sheet.percent),
          sheet.report ? "written" : "missing",
          sheet.strengths.map((item) => item.name).join("; "),
          sheet.gaps.map((item) => item.name).join("; "),
        ]),
      ];
      exportRows(`${this.exam ? this.exam.title : "exam"} — all reports.csv`, rows);
    },
  },
};
</script>

<style scoped>
/*
 * One student, one sheet.
 *
 * `break-after` on every sheet but the last is what makes a batch print of
 * forty reports into forty pages in one job rather than one long scroll: the
 * browser is told where the seams are instead of being left to find them.
 */
@media print {
  .batch-sheet {
    break-after: page;
    page-break-after: always;
    break-inside: auto;
    page-break-inside: auto;
    box-shadow: none;
    border: 1px solid #e2e8f0;
    margin-bottom: 0;
    padding: 0;
  }

  .batch-sheet:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  /* Two columns of questions is what keeps a sheet to one page. */
  .batch-practice {
    columns: 2;
    column-gap: 18px;
  }

  /*
   * Gaps at half width rather than a third: a skill the model named as a code
   * -- "MATH.F2.LINEQ.SIMULTANEOUS" -- is wider than a third of a sheet, and
   * a handout that breaks a word in half reads as a mistake.
   */
  .batch-sheet .md\:w-4\/12 {
    width: 50% !important;
  }

  .batch-practice li {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
</style>
