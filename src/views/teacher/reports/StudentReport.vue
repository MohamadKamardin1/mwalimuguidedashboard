<template>
  <report-page
    :class="{ 'parent-copy': isParent, 'printing-practice': printingPractice }"
    :title="heading"
    :subtitle="subtitle"
    :loading="loading"
    :error="error"
    @reload="load"
  >
    <template #header-actions>
      <div v-if="register.length" class="flex flex-wrap items-center">
        <button
          type="button"
          class="w-11 h-11 inline-flex items-center justify-center text-blueGray-500 hover:text-lightBlue-600 disabled:opacity-30"
          :disabled="!neighbour(-1)"
          :aria-label="neighbour(-1) ? `Previous student, ${neighbour(-1).studentName}` : 'This is the first student'"
          @click="goTo(neighbour(-1))"
        >
          <i class="fas fa-chevron-left" aria-hidden="true"></i>
        </button>
        <span class="text-xs text-blueGray-500 px-1 whitespace-nowrap">
          {{ position }} of {{ register.length }}
        </span>
        <button
          type="button"
          class="w-11 h-11 inline-flex items-center justify-center text-blueGray-500 hover:text-lightBlue-600 disabled:opacity-30"
          :disabled="!neighbour(1)"
          :aria-label="neighbour(1) ? `Next student, ${neighbour(1).studentName}` : 'This is the last student'"
          @click="goTo(neighbour(1))"
        >
          <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    </template>

    <template #toolbar>
      <report-toolbar
        :back-to="{ name: 'report-student-picker', query: { examId: examId } }"
        back-label="Students"
        :languages="LANGUAGES"
        :model-value="language"
        share
        @update:model-value="regenerate"
        @print="print"
        @share="share"
        @export="exportCsv"
      />
    </template>

    <!-- Which copy is in the teacher's hands. It rides in the query string so
         a printed link and the screen agree, and so back/forward works. -->
    <div class="w-full px-4 print:hidden">
      <div class="inline-flex rounded overflow-hidden shadow-sm" role="group" aria-label="Which copy to show">
        <button
          v-for="option in COPIES"
          :key="option.value"
          type="button"
          class="h-11 px-4 text-xs font-bold uppercase"
          :class="copy === option.value ? 'bg-blueGray-800 text-white' : 'bg-white text-blueGray-600 hover:bg-blueGray-100'"
          :aria-pressed="copy === option.value ? 'true' : 'false'"
          @click="setCopy(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <span class="text-xs text-blueGray-400 ml-3">{{ copyHint }}</span>
    </div>

    <div v-if="regenerating" class="w-full px-4">
      <skeleton-list variant="cards" :count="2" label="Writing the report again" />
      <p class="text-xs text-blueGray-400 py-1">
        The model is rewriting this report in {{ languageLabel }}. It keeps the same marks.
      </p>
    </div>

    <template v-else-if="report">
      <!-- 1. Who this is about. -->
      <div class="w-full px-4">
        <div class="relative flex flex-col min-w-0 break-words bg-white rounded shadow-lg mb-4">
          <div class="px-4 py-4">
            <dl class="report-facts grid grid-cols-2 md:grid-cols-3 gap-3">
              <div v-for="fact in facts" :key="fact.label">
                <dt class="text-blueGray-400 uppercase font-bold text-xs">{{ fact.label }}</dt>
                <dd class="text-blueGray-700 font-semibold text-sm mt-1">{{ fact.value }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <!-- 2. The mark, in the only two frames that matter: out of the paper,
           and against the class. -->
      <div class="w-full px-4">
        <div class="relative break-words bg-white rounded shadow-lg p-4 mb-4 report-card">
          <div class="flex flex-wrap items-start">
            <div class="flex-1 min-w-0 pr-3 mb-3">
              <h5 class="text-blueGray-400 uppercase font-bold text-xs">Score</h5>
              <p class="text-3xl font-bold text-blueGray-700">
                {{ percentValue(score) }}
                <span class="text-base font-semibold text-blueGray-400">{{ marksText }}</span>
              </p>
              <p class="text-sm text-blueGray-500 mt-1">
                Grade <span class="font-bold text-blueGray-700">{{ grade }}</span>
                <span v-if="report.status === 'ready'"> &middot; {{ reportCountLabel }}</span>
              </p>
            </div>

            <!-- Not on a parent's copy: comparing a child to their classmates
                 is the teacher's conversation to have, not a sheet of paper's. -->
            <div v-if="showsComparison" class="flex-none w-full lg:w-6/12 mb-3">
              <div class="flex items-baseline mb-1">
                <span class="flex-1 text-xs font-bold uppercase text-blueGray-500">Against the class</span>
                <span class="text-xs text-blueGray-500">
                  Average {{ percentValue(report.classAverage) }}
                </span>
              </div>
              <div class="mb-2">
                <div class="flex items-center">
                  <span class="w-20 text-xs text-blueGray-500">This student</span>
                  <div class="flex-1 bg-blueGray-100 rounded-full h-3">
                    <div class="h-3 rounded-full bg-lightBlue-500" :style="{ width: barWidth((score || 0) / 100) + '%' }"></div>
                  </div>
                </div>
              </div>
              <div>
                <div class="flex items-center">
                  <span class="w-20 text-xs text-blueGray-500">Class</span>
                  <div class="flex-1 bg-blueGray-100 rounded-full h-3">
                    <div class="h-3 rounded-full bg-blueGray-400" :style="{ width: barWidth((report.classAverage || 0) / 100) + '%' }"></div>
                  </div>
                </div>
              </div>
              <p class="text-xs mt-2" :class="comparison.text">
                <i :class="comparison.icon" aria-hidden="true"></i>
                <span class="ml-1">{{ comparison.label }}</span>
              </p>
            </div>
          </div>

          <div v-if="showsBand && band" class="flex flex-wrap items-center mt-1">
            <span class="text-xs uppercase font-bold text-blueGray-500 mr-2">Performance band</span>
            <span class="text-xs font-semibold rounded-full px-3 py-1" :class="band.classes">
              {{ band.label }}
            </span>
            <span class="text-xs text-blueGray-400 ml-2">
              A third of the class, not a position in it.
            </span>
          </div>
        </div>
      </div>

      <!-- 3. What the model made of it, in words a family can follow. -->
      <div class="w-full px-4">
        <p v-if="isParent" class="text-sm text-blueGray-700 mb-2">
          {{ parentIntro }}
        </p>
        <verdict-card
          :summary="report.summary || fallbackSummary"
          :evidence="isParent ? [] : evidence"
        />
      </div>

      <!-- 4. What they can already do. -->
      <div class="w-full px-4">
        <report-section title="What they can do" :takeaway="strengthsTakeaway">
          <div class="relative break-words w-full shadow-lg rounded bg-white p-4 report-card report-strengths">
            <skill-bar
              v-for="strength in strengths"
              :key="strength.code"
              :name="strength.name"
              :score="strength.score"
            />
            <p v-if="!strengths.length" class="text-sm text-blueGray-400">
              No skill on this paper came out clearly above the line. That is worth
              saying out loud too.
            </p>
          </div>
        </report-section>
      </div>

      <!-- 5. What to work on, and what to actually do about it. -->
      <div class="w-full px-4">
        <report-section title="What to work on" :takeaway="gapsTakeaway">
          <div class="report-gaps flex flex-wrap -mx-2">
            <div v-for="gap in gaps" :key="gap.skill" class="w-full md:w-4/12 px-2 mb-3">
              <div class="relative break-words bg-white rounded shadow-lg p-4 h-full report-card">
                <h4 class="text-sm font-bold text-blueGray-700">{{ gap.name || gap.skill }}</h4>
                <div class="flex flex-wrap items-center gap-2 mt-2">
                  <span class="text-xs font-semibold rounded-full px-2 py-1 bg-amber-200 text-amber-800">
                    {{ gap.error_type || "mistake" }}
                  </span>
                  <span
                    v-for="number in gap.question_numbers"
                    :key="number"
                    class="text-xs rounded-full px-2 py-1 bg-blueGray-100 text-blueGray-600"
                  >
                    Q{{ number }}
                  </span>
                </div>
                <p v-if="gap.explanation && !isParent" class="text-sm text-blueGray-600 mt-2">
                  {{ gap.explanation }}
                </p>
                <p v-if="gap.guide" class="text-sm text-blueGray-600 mt-2">
                  {{ gap.guide }}
                </p>
                <p class="text-xs font-bold uppercase text-lightBlue-700 mt-3">This week</p>
                <p class="text-sm text-blueGray-600">{{ gap.action }}</p>
              </div>
            </div>
            <div v-if="!gaps.length" class="w-full px-2">
              <p class="text-sm text-blueGray-400">
                Nothing on this paper stood out as a gap. Keep doing what is working.
              </p>
            </div>
          </div>
        </report-section>
      </div>

      <!-- 6. Question by question. Teacher's copy only: a parent's copy is a
           page, and this is the working behind it. -->
      <div v-if="!isParent" class="w-full px-4">
        <report-section
          class="report-breakable"
          title="Question breakdown"
          takeaway="Where the marks went, and what the model saw when it marked them."
        >
          <div class="relative flex flex-col min-w-0 break-words w-full shadow-lg rounded bg-white report-card">
            <!-- The same rows as cards below `md`: three columns still want
                 more width than a phone has. The print sheet turns the cards
                 off and the table on, so paper shows one of them, not both. -->
            <div class="md:hidden divide-y divide-blueGray-100">
              <div v-for="row in questions" :key="row.questionNumber" class="px-4 py-3">
                <div class="flex items-start">
                  <button
                    type="button"
                    class="report-toggle w-11 h-11 inline-flex items-center justify-center text-blueGray-400 hover:text-lightBlue-600 flex-none -ml-3"
                    :aria-expanded="expanded[row.questionNumber] ? 'true' : 'false'"
                    :aria-label="`${expanded[row.questionNumber] ? 'Hide' : 'Show'} the answer to question ${row.questionNumber}`"
                    @click="toggle(row.questionNumber)"
                  >
                    <i class="fas" :class="expanded[row.questionNumber] ? 'fa-chevron-down' : 'fa-chevron-right'" aria-hidden="true"></i>
                  </button>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-blueGray-700">
                      Q{{ row.questionNumber }}
                      <span class="font-normal text-blueGray-400">·</span>
                      {{ marks(row.marks, row.maxMarks) }}
                      <span class="font-normal text-blueGray-400">·</span>
                      {{ percentValue(row.percent) }}
                    </p>
                    <p class="text-xs text-blueGray-500 inline-flex items-center mt-1">
                      <span class="w-2 h-2 rounded-full mr-1" :class="row.dot" aria-hidden="true"></span>
                      {{ row.dotLabel }}
                    </p>
                  </div>
                </div>

                <div v-if="expanded[row.questionNumber]" class="mt-3 rounded bg-blueGray-50 px-3 py-3">
                  <div class="w-full mb-3">
                    <h4 class="text-xs font-bold uppercase text-blueGray-500 mb-2">What they wrote</h4>
                    <p v-if="row.isBlank" class="text-sm text-blueGray-400">
                      Left blank.
                    </p>
                    <template v-else>
                      <img
                        v-if="row.pageUrl"
                        :src="row.pageUrl"
                        :alt="`Page ${row.pageRef} of ${studentName}'s script`"
                        class="w-full max-h-96 object-contain rounded border border-blueGray-200 bg-white"
                        loading="lazy"
                      />
                      <p v-if="row.finalAnswer" class="text-sm text-blueGray-700 mt-2">
                        <span class="text-xs uppercase font-bold text-blueGray-400">Answer</span>
                        <math-text :text="row.finalAnswer" />
                      </p>
                      <p v-else-if="!row.pageUrl" class="text-sm text-blueGray-400">
                        No page image is stored for this answer.
                      </p>
                    </template>
                  </div>
                  <div class="w-full">
                    <ai-note
                      v-if="row.reasoning"
                      label="Why this mark"
                      :text="row.reasoning"
                      :hint="row.confidence === null ? '' : `The model was ${percentValue(row.confidence * 100)} sure of this one.`"
                    />
                    <p v-else class="text-sm text-blueGray-400">
                      The model left no note on this answer.
                    </p>
                    <p class="text-xs text-blueGray-400 mt-2">
                      <span v-if="row.source">Marked by {{ row.source === 'teacher' ? 'you' : 'the model' }}.</span>
                      <span v-if="row.reviewed"> Reviewed.</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="hidden md:block overflow-x-auto">
              <table class="w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr>
                    <th scope="col" class="w-24 px-2 py-3 border-b border-blueGray-100 text-left text-xs uppercase font-bold text-blueGray-500">
                      Question
                    </th>
                    <th scope="col" class="w-24 px-2 py-3 border-b border-blueGray-100 text-right text-xs uppercase font-bold text-blueGray-500">
                      Marks
                    </th>
                    <th scope="col" class="px-2 py-3 border-b border-blueGray-100 text-left text-xs uppercase font-bold text-blueGray-500">
                      Marked by
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tbody v-for="row in questions" :key="row.questionNumber">
                    <tr class="hover:bg-blueGray-50 align-top">
                      <td class="px-2 py-2 border-b border-blueGray-100">
                        <div class="flex items-center">
                          <button
                            type="button"
                            class="report-toggle w-11 h-11 inline-flex items-center justify-center text-blueGray-400 hover:text-lightBlue-600 flex-none"
                            :aria-expanded="expanded[row.questionNumber] ? 'true' : 'false'"
                            :aria-label="`${expanded[row.questionNumber] ? 'Hide' : 'Show'} the answer to question ${row.questionNumber}`"
                            @click="toggle(row.questionNumber)"
                          >
                            <i class="fas" :class="expanded[row.questionNumber] ? 'fa-chevron-down' : 'fa-chevron-right'" aria-hidden="true"></i>
                          </button>
                          <span class="font-bold text-blueGray-700">Q{{ row.questionNumber }}</span>
                        </div>
                      </td>
                      <td class="px-2 py-2 border-b border-blueGray-100 text-right">
                        <span class="font-bold text-blueGray-700">{{ marks(row.marks, row.maxMarks) }}</span>
                        <div class="text-xs text-blueGray-400">{{ percentValue(row.percent) }}</div>
                      </td>
                      <td class="px-2 py-2 border-b border-blueGray-100">
                        <span class="inline-flex items-center">
                          <span class="w-2 h-2 rounded-full mr-1" :class="row.dot" aria-hidden="true"></span>
                          <span class="text-xs text-blueGray-500">{{ row.dotLabel }}</span>
                        </span>
                      </td>
                    </tr>

                    <tr v-if="expanded[row.questionNumber]" class="bg-blueGray-50">
                      <td colspan="3" class="px-4 py-4 border-b border-blueGray-100">
                        <div class="flex flex-wrap -mx-2">
                          <div class="w-full md:w-6/12 px-2 mb-3">
                            <h4 class="text-xs font-bold uppercase text-blueGray-500 mb-2">What they wrote</h4>
                            <p v-if="row.isBlank" class="text-sm text-blueGray-400">
                              Left blank.
                            </p>
                            <template v-else>
                              <img
                                v-if="row.pageUrl"
                                :src="row.pageUrl"
                                :alt="`Page ${row.pageRef} of ${studentName}'s script`"
                                class="w-full max-h-96 object-contain rounded border border-blueGray-200 bg-white"
                                loading="lazy"
                              />
                              <p v-if="row.finalAnswer" class="text-sm text-blueGray-700 mt-2">
                                <span class="text-xs uppercase font-bold text-blueGray-400">Answer</span>
                                <math-text :text="row.finalAnswer" />
                              </p>
                              <p v-else-if="!row.pageUrl" class="text-sm text-blueGray-400">
                                No page image is stored for this answer.
                              </p>
                            </template>
                          </div>
                          <div class="w-full md:w-6/12 px-2">
                            <ai-note
                              v-if="row.reasoning"
                              label="Why this mark"
                              :text="row.reasoning"
                              :hint="row.confidence === null ? '' : `The model was ${percentValue(row.confidence * 100)} sure of this one.`"
                            />
                            <p v-else class="text-sm text-blueGray-400">
                              The model left no note on this answer.
                            </p>
                            <p class="text-xs text-blueGray-400 mt-2">
                              <span v-if="row.source">Marked by {{ row.source === 'teacher' ? 'you' : 'the model' }}.</span>
                              <span v-if="row.reviewed"> Reviewed.</span>
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </tbody>
              </table>
            </div>
            <p v-if="!questions.length" class="px-4 py-4 text-sm text-blueGray-400">
              No answer was transcribed from this script.
            </p>
          </div>
        </report-section>
      </div>

      <!-- 7. Five questions to do at home. -->
      <div class="w-full px-4 practice-wrapper">
        <report-section
          class="practice-block"
          :title="isParent ? 'Practice for this week' : 'Practice set'"
          :takeaway="practiceTakeaway"
        >
          <div class="relative break-words w-full shadow-lg rounded bg-white p-4 report-card">
            <div v-if="practice.length">
              <div class="print:hidden mb-3">
                <button
                  type="button"
                  class="h-11 inline-flex items-center bg-blueGray-100 text-blueGray-700 text-xs font-bold uppercase px-4 rounded hover:bg-blueGray-200"
                  :aria-pressed="answersShown ? 'true' : 'false'"
                  @click="answersShown = !answersShown"
                >
                  <i class="fas mr-1" :class="answersShown ? 'fa-eye-slash' : 'fa-eye'" aria-hidden="true"></i>
                  {{ answersShown ? "Hide answers" : "Show answers" }}
                </button>
                <button
                  type="button"
                  class="h-11 inline-flex items-center text-blueGray-600 text-xs font-bold uppercase px-4 rounded hover:bg-blueGray-100"
                  @click="printPractice"
                >
                  <i class="fas fa-print mr-1" aria-hidden="true"></i> Print this sheet
                </button>
              </div>

              <ol class="report-practice list-decimal ml-5">
                <li v-for="(item, index) in practice" :key="index" class="mb-3">
                  <math-text :text="item.question" class="text-sm text-blueGray-700" />
                  <div v-if="answersShown" class="mt-1 pl-3 border-l-2 border-emerald-200">
                    <p class="text-xs uppercase font-bold text-emerald-700">Answer</p>
                    <math-text :text="item.answer" class="text-sm text-blueGray-700" />
                    <p v-if="item.solution" class="text-xs text-blueGray-500 mt-1">
                      <math-text :text="item.solution" />
                    </p>
                  </div>
                </li>
              </ol>
              <p class="text-xs text-blueGray-400 mt-2">
                Written by the model for this student's gap, in
                {{ practiceLanguage === "sw" ? "Kiswahili" : "English" }}.
              </p>
            </div>

            <div v-else>
              <p class="text-sm text-blueGray-400">
                <template v-if="gapGroup">
                  Nothing has been written for this gap yet. Five questions can be made for it.
                </template>
                <template v-else>
                  This student was not put in a gap group for this exam, so there is
                  nothing to practise here.
                </template>
              </p>
              <button
                v-if="gapGroup"
                type="button"
                class="mt-3 h-11 inline-flex items-center bg-lightBlue-500 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg print:hidden"
                :disabled="writingPractice"
                @click="writePractice"
              >
                <i class="fas fa-magic mr-1" aria-hidden="true"></i>
                {{ writingPractice ? "Writing them…" : "Write five questions" }}
              </button>
            </div>
          </div>
        </report-section>
      </div>

      <!-- 8. The teacher's own note, kept beside the model's. -->
      <div v-if="!isParent" class="w-full px-4">
        <report-section title="Your notes" :takeaway="notesTakeaway">
          <div class="relative break-words w-full shadow-lg rounded bg-white p-4 report-card">
            <label for="teacher-notes" class="block text-xs font-bold uppercase text-blueGray-500 mb-2">
              For the file, not for the family
            </label>
            <textarea
              id="teacher-notes"
              v-model="notes"
              rows="4"
              class="w-full border border-blueGray-200 rounded px-3 py-2 text-sm text-blueGray-700 focus:outline-none focus:ring"
              placeholder="What you saw, what you agreed with the student, who you spoke to."
              @input="queueSave"
            ></textarea>
            <p class="text-xs mt-1" :class="saveState.classes">{{ saveState.label }}</p>
          </div>
        </report-section>
      </div>
    </template>
  </report-page>
</template>

<script>
import { gql } from "@/api/client";
import AiNote from "@/components/teacher/AiNote.vue";
import MathText from "@/components/teacher/MathText.vue";
import ReportPage from "@/components/reports/ReportPage.vue";
import ReportSection from "@/components/reports/ReportSection.vue";
import ReportToolbar from "@/components/reports/ReportToolbar.vue";
import SkillBar from "@/components/reports/SkillBar.vue";
import VerdictCard from "@/components/reports/VerdictCard.vue";
import SkeletonList from "@/components/ui/SkeletonList.vue";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";
import { barWidth, marks, percent } from "@/lib/scale";
import { exportRows, printPage } from "@/lib/reportIO";
import {
  COPY_MODES,
  isParentCopy,
  resolveCopy,
  showsClassComparison,
  showsRankBand,
} from "@/lib/reportCopy";

const REPORT = `
  query ($studentId: ID!, $examId: ID!) {
    studentReport(studentId: $studentId, examId: $examId) {
      id summary strengths gaps guide practiceSet
      teacherNotes viewedAt language status createdAt examId
      score classAverage percentileBand
    }
  }
`;

/** The register, so the arrows and the "6 of 40" agree with the picker. */
const REGISTER = `
  query ($examId: ID!) {
    examReports(examId: $examId) {
      studentId studentName admissionNo scriptId totalMarks maxMarks percent
      reportId status viewedAt
    }
  }
`;

const EXAM = `
  query ($examId: ID!) {
    exam(id: $examId) {
      id title createdAt
      subject { id name }
      schoolClass { id name }
      term { id name year }
      questions { number maxMarks skills { skill { id code name } } }
    }
  }
`;

/** Marks and page images together: the table needs both on one row. */
const SCRIPT = `
  query ($scriptId: ID!) {
    scriptResult(scriptId: $scriptId) {
      totalMarks maxMarks
      answers {
        answerId questionNumber maxMarks marks source reviewed
        isBlank confidence reasoning
      }
    }
    script(id: $scriptId) {
      id
      pages { id order url }
      answers { id pageRef finalAnswer isBlank question { number } }
    }
  }
`;

/** The student's gap group for this exam, and whatever has been written for it. */
const GROUPS = `
  query ($examId: ID!) {
    gapGroups(examId: $examId) {
      id label errorType
      skill { id code name }
      students { id }
      materials { id kind language content createdAt }
    }
  }
`;

const VIEWED = `mutation ($id: ID!) { markReportViewed(reportId: $id) { id viewedAt } }`;

const NOTES = `
  mutation ($id: ID!, $notes: String!) {
    saveReportNotes(reportId: $id, notes: $notes) { id teacherNotes }
  }
`;

const REGENERATE = `
  mutation ($studentId: ID!, $examId: ID!, $language: String) {
    regenerateReport(studentId: $studentId, examId: $examId, language: $language) {
      id summary strengths gaps guide language status viewedAt teacherNotes
      score classAverage percentileBand
    }
  }
`;

const MATERIAL = `
  mutation ($groupId: ID!, $language: String, $kind: String) {
    generateTeachingMaterial(gapGroupId: $groupId, language: $language, kind: $kind) {
      id kind language content
    }
  }
`;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "sw", label: "Kiswahili" },
];

/** NECTA's secondary bands, the same ones the results table prints. */
const GRADES = [
  { min: 75, grade: "A" },
  { min: 65, grade: "B" },
  { min: 45, grade: "C" },
  { min: 30, grade: "D" },
  { min: 0, grade: "F" },
];

function gradeFor(percentValue) {
  if (percentValue === null || percentValue === undefined) return "—";
  const found = GRADES.find((band) => percentValue >= band.min);
  return found ? found.grade : "F";
}

/** top / mid / bottom, in words a report can print. */
const BANDS = {
  top: { label: "Top", classes: "bg-emerald-200 text-emerald-800" },
  mid: { label: "Middle", classes: "bg-lightBlue-200 text-lightBlue-800" },
  bottom: { label: "Support", classes: "bg-amber-200 text-amber-800" },
};

/** The API's percentages are 0-100; the kit's formatter takes 0-1. */
function percentValue(value, digits = 0) {
  if (value === null || value === undefined) return "—";
  return percent(value / 100, digits);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function day(iso) {
  if (!iso) return "—";
  const [year, month, date] = String(iso).slice(0, 10).split("-").map(Number);
  if (!year || !month || !date) return String(iso);
  return `${date} ${MONTHS[month - 1]} ${year}`;
}

export default {
  name: "student-report",
  components: { AiNote, MathText, ReportPage, ReportSection, ReportToolbar, SkillBar, SkeletonList, VerdictCard },
  data() {
    return {
      loading: true,
      regenerating: false,
      error: "",
      report: null,
      exam: null,
      register: [],
      script: null,
      result: null,
      groups: [],
      notes: "",
      savedNotes: "",
      saveTimer: null,
      saving: false,
      saved: false,
      expanded: {},
      answersShown: false,
      printingPractice: false,
      writingPractice: false,
      LANGUAGES,
      // The template reads `COPIES`; the rule itself is in `reportCopy`.
      COPIES: COPY_MODES,
    };
  },
  computed: {
    studentId() {
      return this.$route.params.studentId;
    },
    examId() {
      return this.$route.query.examId || "";
    },
    copy() {
      return resolveCopy(this.$route.query);
    },
    isParent() {
      return isParentCopy(this.copy);
    },
    /** Which blocks a parent's copy keeps, named for the template. */
    showsComparison() {
      return showsClassComparison(this.copy);
    },
    showsBand() {
      return showsRankBand(this.copy);
    },
    copyHint() {
      return this.isParent
        ? "No class comparison, no band, and the practice set to take home."
        : "Everything, including the working and your own notes.";
    },
    language() {
      return (this.report && this.report.language) || "en";
    },
    languageLabel() {
      const found = LANGUAGES.find((item) => item.value === this.language);
      return found ? found.label : this.language;
    },
    heading() {
      return this.studentName || "Student report";
    },
    studentName() {
      if (this.report && this.report.student) return this.report.student.fullName;
      const row = this.row;
      return row ? row.studentName : "";
    },
    admissionNo() {
      if (this.report && this.report.student) return this.report.student.admissionNo;
      const row = this.row;
      return row ? row.admissionNo : "";
    },
    subtitle() {
      if (!this.exam) return "";
      const parts = [
        this.exam.title,
        this.exam.schoolClass && this.exam.schoolClass.name,
        this.exam.term && `${this.exam.term.name} ${this.exam.term.year}`,
      ];
      return parts.filter(Boolean).join(" · ");
    },
    /** The register row for this student: marks and report state. */
    row() {
      return this.register.find((item) => item.studentId === this.studentId) || null;
    },
    position() {
      const index = this.register.findIndex((item) => item.studentId === this.studentId);
      return index === -1 ? 0 : index + 1;
    },
    facts() {
      return [
        { label: "Student", value: this.studentName || "—" },
        { label: "Admission no", value: this.admissionNo || "—" },
        { label: "Class", value: this.exam && this.exam.schoolClass ? this.exam.schoolClass.name : "—" },
        { label: "Exam", value: this.exam ? this.exam.title : "—" },
        { label: "Date", value: day(this.exam && this.exam.createdAt) },
        {
          label: "Report",
          value: this.report ? `${this.report.status} · ${day(this.report.createdAt)}` : "—",
        },
      ];
    },
    score() {
      if (!this.report) return null;
      // The register carries the same figure; the report's own is the one that
      // was written against these marks.
      if (this.report.score !== null && this.report.score !== undefined) return this.report.score;
      return this.row ? this.row.percent : null;
    },
    grade() {
      return gradeFor(this.score);
    },
    marksText() {
      const row = this.row;
      if (!row || row.totalMarks === null) return "";
      return `out of ${row.maxMarks}`;
    },
    reportCountLabel() {
      const total = this.register.length;
      if (!total) return "";
      return `One of ${total} scripts on this paper`;
    },
    comparison() {
      const s = this.score;
      const average = this.report ? this.report.classAverage : null;
      if (s === null || average === null || average === undefined) {
        return { text: "text-blueGray-400", icon: "fas fa-minus", label: "No class average to compare with." };
      }
      const delta = s - average;
      if (delta > 2) {
        return {
          text: "text-emerald-600",
          icon: "fas fa-arrow-up",
          label: `${percentValue(delta, 1)} above the class average.`,
        };
      }
      if (delta < -2) {
        return {
          text: "text-red-600",
          icon: "fas fa-arrow-down",
          label: `${percentValue(Math.abs(delta), 1)} below the class average.`,
        };
      }
      return { text: "text-blueGray-500", icon: "fas fa-minus", label: "In line with the class average." };
    },
    band() {
      if (!this.report || !this.report.percentileBand) return null;
      return BANDS[this.report.percentileBand] || null;
    },
    parentIntro() {
      const s = this.score;
      if (s === null) return "This report is about one exam.";
      if (s >= 75) return `${this.studentName} did really well on this paper.`;
      if (s >= 30) return `${this.studentName} passed this paper, and there is one thing worth practising at home.`;
      return `${this.studentName} found this paper hard. There is one thing to work on first, and it is written out below.`;
    },
    evidence() {
      if (!this.report) return [];
      const chips = [];
      if (this.score !== null) {
        chips.push({ label: `${percentValue(this.score)} on this paper`, classes: "bg-blueGray-200 text-blueGray-700" });
      }
      if (this.strengths.length) {
        chips.push({
          label: `${this.strengths.length} skill${this.strengths.length === 1 ? "" : "s"} going well`,
          classes: "bg-emerald-200 text-emerald-800",
        });
      }
      if (!this.isParent && this.band) {
        chips.push({ label: `Band: ${this.band.label}`, classes: this.band.classes });
      }
      if (this.gaps.length) {
        chips.push({
          label: `${this.gaps.length} thing${this.gaps.length === 1 ? "" : "s"} to work on`,
          classes: "bg-amber-200 text-amber-800",
        });
      }
      return chips;
    },
    fallbackSummary() {
      return "This student sat the paper. The model's own summary has not been written yet.";
    },
    /** `{code: name}` for the skills this paper tested. */
    skillIndex() {
      const index = {};
      const questions = (this.exam && this.exam.questions) || [];
      for (const question of questions) {
        for (const link of question.skills || []) {
          index[link.skill.code] = link.skill.name;
        }
      }
      return index;
    },
    strengths() {
      if (!this.report) return [];
      return (this.report.strengths || []).slice(0, 3).map((item) => ({
        code: item.skill,
        name: this.skillIndex[item.skill] || item.skill,
        score: item.score,
      }));
    },
    strengthsTakeaway() {
      if (!this.strengths.length) return "";
      return `${this.strengths.length} skill${this.strengths.length === 1 ? "" : "s"} this paper showed they can do.`;
    },
    /** The guide is keyed by skill name; the gaps carry the same names.
     *
     * Referenced in `methods`, not here: it takes an argument, and the Options
     * API calls a computed getter with the component instance as its first
     * parameter -- which would arrive as the skill to look up.
     */
    gaps() {
      if (!this.report) return [];
      return (this.report.gaps || []).slice(0, 3).map((gap, index) => {
        const numbers = gap.question_numbers || [];
        return {
          ...gap,
          name: gap.skill,
          guide: this.guideAt(index, gap.skill),
          action: numbers.length
            ? `Redo question ${numbers.map((n) => `Q${n}`).join(" and ")}, then two more like it.`
            : "Practise two short questions on this every day.",
        };
      });
    },
    gapsTakeaway() {
      if (!this.gaps.length) return "Nothing stood out. That is a result too.";
      const numbers = this.gaps.flatMap((gap) => gap.question_numbers || []);
      if (numbers.length) {
        return `Start with the questions this student lost marks on: Q${[...new Set(numbers)].join(", Q")}.`;
      }
      return "The three worth the most attention, most important first.";
    },
    /** Per-question marks joined with the page each answer was written on. */
    questions() {
      if (!this.result) return [];
      const pages = {};
      for (const page of (this.script && this.script.pages) || []) {
        pages[page.order] = page.url;
      }
      const written = {};
      for (const answer of (this.script && this.script.answers) || []) {
        written[answer.question.number] = answer;
      }

      return this.result.answers.map((answer) => {
        const mine = written[answer.questionNumber] || {};
        const percentScored = answer.maxMarks ? (100 * (answer.marks || 0)) / answer.maxMarks : 0;
        let dot = "bg-red-500";
        let dotLabel = "Lost marks";
        if (answer.isBlank) {
          dot = "bg-blueGray-400";
          dotLabel = "Blank";
        } else if (answer.marks >= answer.maxMarks) {
          dot = "bg-emerald-500";
          dotLabel = "Full marks";
        } else if (answer.marks > 0) {
          dot = "bg-amber-500";
          dotLabel = "Part marks";
        }
        return {
          ...answer,
          percent: percentScored,
          dot,
          dotLabel,
          pageRef: mine.pageRef,
          pageUrl: mine.pageRef === null || mine.pageRef === undefined ? "" : pages[mine.pageRef],
          finalAnswer: mine.finalAnswer || "",
        };
      });
    },
    /** The gap group this student is in, for this exam. */
    gapGroup() {
      return (
        this.groups.find((group) =>
          (group.students || []).some((student) => student.id === this.studentId)
        ) || null
      );
    },
    practiceMaterial() {
      if (!this.gapGroup) return null;
      const sets = (this.gapGroup.materials || []).filter((item) => item.kind === "practice_set");
      if (!sets.length) return null;
      return sets.find((item) => item.language === this.language) || sets[0];
    },
    practiceLanguage() {
      return this.practiceMaterial ? this.practiceMaterial.language : this.language;
    },
    practice() {
      const content = this.practiceMaterial ? this.practiceMaterial.content : null;
      if (!Array.isArray(content)) return [];
      return content.slice(0, 5);
    },
    practiceTakeaway() {
      if (this.practice.length) {
        return `Five questions the model wrote for the gap this student has: ${this.gapGroup.skill.code}.`;
      }
      if (this.gapGroup) return `Nothing written for ${this.gapGroup.skill.name} yet.`;
      return "A practice set is written from a gap, and this student has none on this exam.";
    },
    notesTakeaway() {
      return "Kept with the report, so the next teacher reads what you saw.";
    },
    notesDirty() {
      return this.notes !== this.savedNotes;
    },
    saveState() {
      if (this.saving) return { label: "Saving…", classes: "text-blueGray-400" };
      if (this.notesDirty) return { label: "Not saved yet", classes: "text-amber-600" };
      if (this.saved) return { label: "Saved", classes: "text-emerald-600" };
      return { label: "", classes: "text-blueGray-400" };
    },
  },
  watch: {
    // Moving to the next student is a route change, not a remount.
    studentId() {
      this.load();
    },
    examId() {
      this.load();
    },
  },
  created() {
    this.load();
  },
  beforeUnmount() {
    // The last keystrokes are the ones a teacher would miss: flush the note
    // rather than dropping it with the component.
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.notesDirty) this.saveNotes();
  },
  methods: {
    percentValue,
    marks,
    barWidth,

    /** Look up the model's paragraph for a gap, by skill name. */
    guideFor(skill) {
      const wanted = String(skill || "").trim().toLowerCase();
      if (!wanted) return "";
      const found = ((this.report && this.report.guide) || []).find((entry) => {
        const key = String((entry && entry.skill) || "").trim().toLowerCase();
        return key === wanted || (key && (key.includes(wanted) || wanted.includes(key)));
      });
      return found ? found.paragraph || "" : "";
    },

    /**
     * The guide paragraph for one gap.
     *
     * The model names a skill one way in `gaps` and another in `guide` --
     * a code in one, "simultaneous equations" in the other -- so the name is
     * tried first and the order is the fallback. The two lists are written
     * one paragraph per gap, shortest first, which is what makes the fallback
     * safe rather than a guess.
     */
    guideAt(index, skill) {
      const named = this.guideFor(skill);
      if (named) return named;
      const list = (this.report && this.report.guide) || [];
      const sameIndex = list[index];
      return sameIndex ? sameIndex.paragraph || "" : "";
    },

    async load() {
      if (!this.examId) {
        this.loading = false;
        this.error = "This report needs an exam. Pick one from the student list.";
        return;
      }
      this.loading = true;
      this.error = "";
      this.expanded = {};

      /*
       * Three independent reads, each allowed to fail on its own.
       *
       * The register is what makes the arrows work and the exam is what names
       * the paper; a teacher should not lose the way to the next student
       * because one report could not be opened.
       */
      const [report, exam, register] = await Promise.all([
        gql(REPORT, { studentId: this.studentId, examId: this.examId }).catch((failure) => ({
          failure: failure.message,
        })),
        gql(EXAM, { examId: this.examId }).catch(() => ({ exam: null })),
        gql(REGISTER, { examId: this.examId }).catch(() => ({ examReports: [] })),
      ]);

      this.report = report.studentReport || null;
      this.exam = exam.exam || null;
      this.register = register.examReports || [];
      if (!this.report) {
        this.error =
          report.failure ||
          "No report has been written for this student on this exam yet.";
      }
      this.notes = (this.report && this.report.teacherNotes) || "";
      this.savedNotes = this.notes;

      if (this.report) {
        // The script and the groups can both be absent without the report
        // being unreadable, so neither is allowed to fail the whole page.
        await Promise.all([this.loadScript(), this.loadGroups()]);
        this.markViewed();
      }
      this.loading = false;
    },

    async loadScript() {
      this.result = null;
      this.script = null;
      const scriptId = this.row && this.row.scriptId;
      if (!scriptId) return;
      try {
        const data = await gql(SCRIPT, { scriptId });
        this.result = data.scriptResult;
        this.script = data.script;
      } catch (failure) {
        this.result = null;
      }
    },

    async loadGroups() {
      this.groups = [];
      try {
        const data = await gql(GROUPS, { examId: this.examId });
        this.groups = data.gapGroups;
      } catch (failure) {
        this.groups = [];
      }
    },

    /** Opening the report is reading it. Stamped once, server-side. */
    async markViewed() {
      if (!this.report || this.report.viewedAt) return;
      try {
        const data = await gql(VIEWED, { id: this.report.id });
        this.report.viewedAt = data.markReportViewed.viewedAt;
        const row = this.row;
        if (row) row.viewedAt = data.markReportViewed.viewedAt;
      } catch (failure) {
        // A missing stamp is not worth interrupting a teacher over.
      }
    },

    toggle(number) {
      this.expanded[number] = !this.expanded[number];
    },

    neighbour(offset) {
      const index = this.register.findIndex((item) => item.studentId === this.studentId);
      if (index === -1) return null;
      return this.register[index + offset] || null;
    },

    goTo(row) {
      if (!row) return;
      this.$router.push({
        name: "report-student",
        params: { studentId: row.studentId },
        query: { ...this.$route.query, examId: this.examId },
      });
    },

    setCopy(value) {
      this.$router.replace({ query: { ...this.$route.query, copy: value } });
    },

    queueSave() {
      this.saved = false;
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(this.saveNotes, 900);
    },

    async saveNotes() {
      if (!this.report || !this.notesDirty) return;
      this.saving = true;
      const written = this.notes;
      try {
        const data = await gql(NOTES, { id: this.report.id, notes: written });
        this.savedNotes = data.saveReportNotes.teacherNotes;
        this.saved = true;
      } catch (failure) {
        toastError(failure.message);
      } finally {
        this.saving = false;
      }
    },

    async regenerate(language) {
      if (!this.report || language === this.language) return;
      this.regenerating = true;
      try {
        const data = await gql(REGENERATE, {
          studentId: this.studentId,
          examId: this.examId,
          language,
        });
        this.report = { ...this.report, ...data.regenerateReport };
        toastSuccess(`Report rewritten in ${language === "sw" ? "Kiswahili" : "English"}.`);
      } catch (failure) {
        toastError(failure.message);
      } finally {
        this.regenerating = false;
      }
    },

    async writePractice() {
      if (!this.gapGroup) return;
      this.writingPractice = true;
      try {
        await gql(MATERIAL, {
          groupId: this.gapGroup.id,
          language: this.language,
          kind: "practice_set",
        });
        await this.loadGroups();
        toastSuccess("Five questions written.");
      } catch (failure) {
        toastError(failure.message);
      } finally {
        this.writingPractice = false;
      }
    },

    async share() {
      const url = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: `${this.studentName} — ${this.subtitle}`, url });
          return;
        } catch (failure) {
          // A share sheet the teacher closed is a decision, not a failure:
          // nothing to say, and nothing to print.
          if (failure && failure.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        toastSuccess("Link copied.");
      } catch (failure) {
        // No share sheet and no clipboard -- an insecure context, or a
        // browser with neither. A sheet to hold still beats nothing.
        printPage();
        toastSuccess("The report was opened for printing instead.");
      }
    },

    print() {
      printPage();
    },

    /** Only the practice sheet, on its own page. */
    async printPractice() {
      this.printingPractice = true;
      // The class has to be on the DOM before the print engine reads the page.
      await this.$nextTick();
      const done = () => {
        this.printingPractice = false;
        window.removeEventListener("afterprint", done);
      };
      window.addEventListener("afterprint", done);
      window.print();
      // Safari does not fire afterprint reliably; the timer is the way out.
      setTimeout(done, 2000);
    },

    exportCsv() {
      const rows = [
        [`${this.studentName} — ${this.subtitle}`],
        [],
        ["Score", this.score, "Grade", this.grade],
        ["Admission no", this.admissionNo, "Class average", this.report ? this.report.classAverage : ""],
        [],
        ["Question", "Marks", "Out of", "Percent", "Marked by", "Model's note"],
        ...this.questions.map((row) => [
          `Q${row.questionNumber}`,
          row.marks,
          row.maxMarks,
          Math.round(row.percent * 10) / 10,
          row.source || "",
          row.reasoning || "",
        ]),
      ];
      exportRows(`${this.studentName} — report.csv`, rows);
    },
  },
};
</script>

<style scoped>
/*
 * Paper.
 *
 * The kit asks for `print:` utilities, but Tailwind 2.0.4 here does not
 * generate them -- only `.print\:hidden` exists, from the hand-written block in
 * `index.css`. So the rules that matter to this report are stated here, next to
 * the markup they describe.
 */
@media print {
  /*
   * A parent's copy is meant to be one sheet: a report that arrives as two
   * pages is one that gets folded in half and left in the bag. Paper is
   * narrower than any breakpoint in the page (A4 minus the 14mm margins is
   * 688px), so the columns are stated here rather than borrowed from `md:`.
   */
  .report-facts {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 6px;
  }

  .report-page {
    font-size: 13px;
  }

  .report-section {
    margin-bottom: 4px;
  }

  .report-page h2 {
    font-size: 14px;
  }

  .report-page h5 {
    font-size: 11px;
  }

  .report-page .p-4 {
    padding: 8px;
  }

  .report-card {
    box-shadow: none;
    border: 1px solid #e2e8f0;
  }

  /* Five questions read as five questions down the page; two columns of them
     is what buys the room for the rest of the report. */
  .report-practice,
  .report-strengths {
    columns: 2;
    column-gap: 18px;
  }

  .report-practice li,
  .report-strengths > div {
    break-inside: avoid;
    page-break-inside: avoid;
    margin-bottom: 6px;
  }

  /* Three gaps sit side by side on paper. Left to the screen rules they stack,
     because A4 is 688px and the breakpoint they were written for is 768px. */
  .report-gaps > div {
    width: 33.3333%;
  }

  /* A chevron does nothing on paper, and 44px of it per row is height a
     printed table cannot spare. */
  .report-toggle {
    display: none;
  }

  .report-breakable {
    break-inside: auto;
    page-break-inside: auto;
  }

  /*
   * A parent copy is one sheet, whatever it holds: it goes home in a bag, and
   * a second page is a page that gets lost. The teacher's copy has no such
   * promise and is left at its natural size, so nothing here shrinks the
   * working a teacher reads at a desk.
   *
   * `zoom` rather than `transform: scale`, because zoom changes the layout box:
   * the page breaks still land where the printer expects them.
   */
  .parent-copy {
    zoom: 0.8;
  }
}

/*
 * "Print this sheet": the practice set on its own, for handing out.
 *
 * The class rides on the report root rather than on the document element: a
 * scoped rule can only reach what this component rendered, and `:global()`
 * here produced a selector that matched nothing at all.
 */
@media print {
  .report-page.printing-practice > * {
    display: none !important;
  }

  .report-page.printing-practice > .practice-wrapper {
    display: block !important;
  }
}
</style>
