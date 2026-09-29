<template>
  <div class="px-4 pb-4">
    <div v-if="loading" class="w-full">
      <div
        v-for="n in 3"
        :key="n"
        class="relative w-full mb-4 shadow rounded bg-white px-4 py-6"
      >
        <div class="h-4 w-1/3 bg-blueGray-100 rounded mb-3 animate-pulse"></div>
        <div class="h-3 w-2/3 bg-blueGray-100 rounded mb-2 animate-pulse"></div>
        <div class="h-3 w-1/2 bg-blueGray-100 rounded animate-pulse"></div>
      </div>
      <p class="text-sm text-blueGray-500 text-center py-2">
        <i class="fas fa-magic mr-1"></i> AI is preparing this. It reads every
        script, so it takes a moment.
      </p>
    </div>

    <empty-state
      v-else-if="!insight"
      title="Insights are being written"
      :description="
        waitedTooLong
          ? 'This is taking longer than it should. The work is still running in the background; reload in a few minutes, and if it is still empty then, something went wrong.'
          : 'A report is written for every student before the class summary, so this takes a few minutes after an exam is finalised. It will appear here on its own — no need to reload.'
      "
      icon="fas fa-hourglass-half"
    >
      <template #action>
        <button
          type="button"
          class="h-11 bg-blueGray-800 text-white text-xs font-bold uppercase px-4 rounded shadow"
          @click="load"
        >
          Reload
        </button>
      </template>
    </empty-state>

    <template v-else>
      <!-- The reports this exam already feeds, so they are reachable from here. -->
      <div class="flex flex-wrap items-center mb-3">
        <router-link
          :to="{ name: 'report-assessment', params: { examId: exam.id } }"
          class="h-11 inline-flex items-center text-blueGray-600 hover:text-blueGray-800 text-xs font-bold uppercase px-4 rounded hover:bg-blueGray-100"
        >
          <i class="fas fa-file-signature mr-1"></i> Assessment report
        </router-link>
        <router-link
          :to="{
            name: 'report-class',
            params: { classId: exam.schoolClass.id },
            query: { subjectId: exam.subject.id, termId: exam.term.id },
          }"
          class="h-11 inline-flex items-center text-blueGray-600 hover:text-blueGray-800 text-xs font-bold uppercase px-4 rounded hover:bg-blueGray-100"
        >
          <i class="fas fa-users mr-1"></i> Class report
        </router-link>
      </div>

      <!-- 1. What to reteach, first: it is the reason to be on this screen. -->
      <div class="mb-5">
        <div class="flex flex-wrap items-center mb-3">
          <h3 class="font-semibold text-lg text-blueGray-700 mr-2">What to reteach</h3>
          <ai-chip />
          <p class="w-full text-sm text-blueGray-400 mt-1">
            In the order the class needs them, worst first.
          </p>
        </div>

        <div v-if="!recommendations.length" class="bg-blueGray-50 border-l-4 border-blueGray-300 rounded px-4 py-3">
          <p class="text-sm text-blueGray-600">
            Nothing stood out as needing a whole lesson. The questions below are
            still worth a look.
          </p>
        </div>

        <div v-else class="flex flex-wrap -mx-2">
          <div
            v-for="(item, index) in recommendations"
            :key="index"
            class="w-full md:w-6/12 xl:w-4/12 px-2 mb-3"
          >
            <div class="border border-blueGray-100 rounded p-4 h-full flex flex-col">
              <span class="text-xs font-bold uppercase text-blueGray-400 mb-1">
                Priority {{ index + 1 }}
              </span>
              <p class="font-bold text-blueGray-700">{{ item.title }}</p>

              <p v-if="item.skillCode" class="text-xs text-lightBlue-600 font-bold mt-1">
                {{ item.skillCode }}
              </p>

              <p v-if="item.evidence" class="text-xs text-blueGray-500 mt-2 flex-1">
                {{ item.evidence }}
              </p>

              <p v-if="item.action" class="text-sm text-blueGray-600 mt-3">
                {{ item.action }}
              </p>

              <button
                type="button"
                class="mt-3 h-11 text-xs font-bold uppercase text-lightBlue-600 hover:text-lightBlue-800 text-left"
                @click="openGroupForSkill(item.skillCode)"
              >
                <i class="fas fa-book-reader mr-1"></i> Generate lesson plan
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Hardest questions -->
      <div
        class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white"
      >
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <h3 class="font-semibold text-lg text-blueGray-700 px-4">Hardest questions</h3>
          <p class="text-sm text-blueGray-500 px-4 mt-1">
            How much of the marks each question earned, worst first. Tap one to
            see what went wrong.
          </p>
        </div>

        <div v-if="!hardest.length" class="px-8 pb-8">
          <p class="text-sm text-blueGray-400">No question stood out.</p>
        </div>

        <div v-else class="px-4 pb-6">
          <!--
            Every row is one line of the same height, and every track the same
            fixed width. The track used to be `flex-1`, so on a wide card a
            question that scored 90% drew an 800px bar and the block ran off
            the page; and a reason that wrapped made its row taller than the
            rest. The bar still says what it said -- how much of the marks the
            question earned -- it is just read against the same ruler as the
            others, which is the only way a row of bars means anything.
          -->
          <button
            v-for="item in hardest"
            :key="item.number"
            type="button"
            class="w-full text-left rounded hover:bg-blueGray-50 px-4 py-2"
            :class="selectedQuestion === item.number ? 'bg-blueGray-50' : ''"
            :title="item.reason || `Q${item.number}: ${percentOf(item.average)}%`"
            @click="selectQuestion(item.number)"
          >
            <div class="flex items-center">
              <!-- The gap is on both sides of the bar: with it only on the
                   right, the track sat flush against the question number. -->
              <span class="w-12 text-sm font-bold text-blueGray-700 flex-none mr-3">
                Q{{ item.number }}
              </span>
              <div class="w-40 sm:w-64 flex-none">
                <div class="w-full bg-blueGray-200 rounded-full h-2">
                  <div
                    class="h-2 rounded-full"
                    :class="bandOf(item.average).bar"
                    :style="{ width: Math.max(2, percentOf(item.average)) + '%' }"
                  ></div>
                </div>
              </div>
              <span
                class="w-16 text-right text-sm font-bold flex-none ml-3"
                :class="bandOf(item.average).text"
              >
                {{ percentOf(item.average) }}%
              </span>
              <span class="hidden sm:block flex-1 min-w-0 ml-3 text-xs text-blueGray-500 truncate">
                {{ item.reason }}
              </span>
            </div>
          </button>

          <div v-if="selectedQuestion && mistakesForSelected.length" class="mt-4 px-4">
            <div class="bg-amber-50 border-l-4 border-amber-500 rounded px-4 py-3">
              <p class="text-xs font-bold uppercase text-amber-700 mb-2">
                What went wrong in Q{{ selectedQuestion }}
              </p>
              <p
                v-for="(mistake, index) in mistakesForSelected"
                :key="index"
                class="text-sm text-amber-700 mb-1"
              >
                <span class="font-bold">{{ mistake.errorType }}</span> —
                {{ mistake.description }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Common mistakes -->
      <div
        class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white"
      >
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <h3 class="font-semibold text-lg text-blueGray-700 px-4">Common mistakes</h3>
        </div>

        <div v-if="!mistakes.length" class="px-8 pb-8">
          <p class="text-sm text-blueGray-400">Nothing repeated often enough to name.</p>
        </div>

        <div v-else class="px-8 pb-6">
          <div
            v-for="(mistake, index) in mistakes"
            :key="index"
            class="py-3 border-b border-blueGray-100 last:border-0"
          >
            <div class="flex flex-wrap items-center">
              <span
                class="text-xs font-bold uppercase rounded px-2 py-1 mr-2"
                :class="errorChip(mistake.errorType).classes"
              >
                {{ errorChip(mistake.errorType).label }}
              </span>
              <span
                v-if="mistake.count"
                class="text-xs font-bold text-blueGray-500 mr-2"
              >
                {{ mistake.count }} answer(s)
              </span>
              <span v-if="mistake.questionNumbers.length" class="text-xs text-blueGray-400">
                Q{{ mistake.questionNumbers.join(", Q") }}
              </span>
            </div>
            <p class="text-sm text-blueGray-600 mt-2">{{ mistake.description }}</p>
            <p v-if="mistake.example" class="text-xs text-blueGray-400 mt-1 italic">
              e.g. {{ mistake.example }}
            </p>
          </div>
        </div>
      </div>

      <!-- 4. Gap groups -->
      <div
        class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white"
      >
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <h3 class="font-semibold text-lg text-blueGray-700 px-4">
            Groups to work with
          </h3>
          <p class="text-sm text-blueGray-500 px-4 mt-1">
            Students who share the same weak skill and the same kind of mistake,
            so one lesson reaches all of them.
          </p>
        </div>

        <div v-if="!groups.length" class="px-8 pb-8">
          <p class="text-sm text-blueGray-400">
            No group fell below the line on this exam.
          </p>
        </div>

        <div v-else class="px-4 pb-6">
          <div
            v-for="group in groups"
            :key="group.id"
            class="border border-blueGray-100 rounded p-4 mb-3"
          >
            <div class="flex flex-wrap items-start">
              <div class="flex-1 min-w-0 pr-2">
                <p class="font-bold text-blueGray-700">
                  {{ group.skill.name }}
                  <span class="text-xs text-blueGray-400 font-normal ml-1">
                    {{ group.skill.code }}
                  </span>
                </p>
                <p class="text-sm text-blueGray-500 mt-1">
                  {{ group.students.length }} student(s) —
                  <span class="font-bold">{{ errorChip(group.errorType).label }}</span>
                </p>
                <p class="text-xs text-blueGray-400 mt-2">
                  {{ studentNames(group) }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap items-center mt-3">
              <select-field
                v-model="languageFor[group.id]"
                :options="languageOptions"
                flush
                class="w-40 mr-2 mb-2"
              />
              <button
                type="button"
                class="h-11 bg-emerald-500 text-white text-xs font-bold uppercase px-4 rounded shadow mb-2 mr-2"
                @click="openGroup(group)"
              >
                <i class="fas fa-book-open mr-1"></i> Generate practice set and guide
              </button>
              <router-link
                :to="{ name: 'teacher-class', params: { id: exam.schoolClass.id } }"
                class="h-11 inline-flex items-center text-blueGray-600 text-xs font-bold uppercase px-4 mb-2"
              >
                <i class="fas fa-users mr-1"></i> View students
              </router-link>
            </div>

            <p v-if="group.materials.length" class="text-xs text-emerald-600 mt-1">
              <i class="fas fa-check mr-1"></i>
              {{ group.materials.length }} material(s) already written — open to
              read them.
            </p>
          </div>
        </div>
      </div>

      <!-- On track, collapsed: reassuring, not actionable. -->
      <div v-if="onTrack.length" class="relative w-full mb-4 shadow rounded bg-white">
        <button
          type="button"
          class="w-full flex items-center px-4 py-4 text-left"
          @click="onTrackOpen = !onTrackOpen"
        >
          <span class="flex-1">
            <span class="font-semibold text-blueGray-700">
              On track — {{ onTrack.length }} student(s)
            </span>
            <span class="block text-sm text-blueGray-400 mt-1">
              Nobody in this group fell below the line on this exam.
            </span>
          </span>
          <i
            class="fas text-blueGray-400"
            :class="onTrackOpen ? 'fa-chevron-up' : 'fa-chevron-down'"
          ></i>
        </button>
        <p v-if="onTrackOpen" class="px-4 pb-4 text-sm text-blueGray-500">
          {{ onTrack.map((s) => s.fullName).join(", ") }}
        </p>
      </div>
    </template>

    <!-- 5. Teaching materials -->
    <drawer
      :open="drawerOpen"
      :title="drawerTitle"
      :subtitle="drawerSubtitle"
      width="lg"
      @close="drawerOpen = false"
    >
      <div v-if="generating" class="text-center py-10">
        <i class="fas fa-circle-notch fa-spin text-2xl text-lightBlue-500"></i>
        <p class="text-sm text-blueGray-500 mt-3">
          AI is preparing this. Written fresh for this group, in
          {{ languageLabel(currentLanguage) }}.
        </p>
      </div>

      <template v-else>
        <div class="flex flex-wrap items-center mb-4">
          <select-field
            v-model="currentLanguage"
            :options="languageOptions"
            flush
            class="w-40 mr-2 mb-2"
          />
          <button
            type="button"
            class="h-11 bg-blueGray-100 text-blueGray-700 text-xs font-bold uppercase px-4 rounded mb-2 mr-2"
            @click="regenerate"
          >
            <i class="fas fa-sync-alt mr-1"></i> Regenerate
          </button>
          <button
            type="button"
            class="h-11 bg-blueGray-100 text-blueGray-700 text-xs font-bold uppercase px-4 rounded mb-2 mr-2"
            @click="copy"
          >
            <i class="fas fa-copy mr-1"></i> {{ copied ? "Copied" : "Copy" }}
          </button>
          <button
            type="button"
            class="h-11 bg-blueGray-100 text-blueGray-700 text-xs font-bold uppercase px-4 rounded mb-2"
            @click="print"
          >
            <i class="fas fa-print mr-1"></i> Print
          </button>
        </div>

        <div v-if="!material" class="text-sm text-blueGray-400">
          Nothing has been written for this group yet.
        </div>

        <!-- The guide -->
        <div v-else-if="material.kind === 'guide'" class="text-sm text-blueGray-700">
          <h4 v-if="material.content.title" class="text-lg font-bold text-blueGray-700 mb-3">
            {{ material.content.title }}
          </h4>
          <div v-for="(section, index) in material.content.sections || []" :key="index" class="mb-4">
            <h5 class="font-bold text-blueGray-700 mb-1">{{ section.heading }}</h5>
            <math-text :text="section.body" />
          </div>
        </div>

        <!-- The practice set -->
        <div v-else class="text-sm text-blueGray-700">
          <div
            v-for="(item, index) in material.content"
            :key="index"
            class="mb-5 pb-4 border-b border-blueGray-100 last:border-0"
          >
            <div class="flex flex-wrap items-start">
              <span
                class="bg-blueGray-800 text-white text-xs font-bold rounded w-7 h-7 inline-flex items-center justify-center mr-2 flex-none"
              >
                {{ index + 1 }}
              </span>
              <div class="flex-1 min-w-0">
                <math-text :text="item.question" />
              </div>
            </div>

            <button
              type="button"
              class="mt-2 ml-9 h-9 text-xs font-bold uppercase text-lightBlue-600 hover:text-lightBlue-800"
              @click="answersShown = !answersShown"
            >
              <i class="fas mr-1" :class="answersShown ? 'fa-eye-slash' : 'fa-eye'"></i>
              {{ answersShown ? "Hide answers" : "Show answers" }}
            </button>

            <div v-if="answersShown" class="mt-2 ml-9 bg-blueGray-50 rounded px-3 py-2">
              <p class="text-sm text-emerald-700 font-bold mb-1">
                <math-text :text="item.answer" />
              </p>
              <p v-if="item.solution" class="text-xs text-blueGray-600">
                <math-text :text="item.solution" />
              </p>
            </div>
          </div>
        </div>
      </template>
    </drawer>
  </div>
</template>

<script>
import { gql } from "@/api/client";
import SelectField from "@/components/crud/SelectField.vue";
import Drawer from "@/components/crud/Drawer.vue";
import AiChip from "@/components/teacher/AiChip.vue";
import MathText from "@/components/teacher/MathText.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";
import { masteryBand } from "@/lib/insights";

/** How often to look for insight that is still being written. */
const INSIGHT_POLL = 5000;
/** How long to keep looking before saying something may be wrong. */
const INSIGHT_WAIT = 300000;

const INSIGHTS = `
  query ($examId: ID!) {
    classInsights(examId: $examId) {
      id
      hardestQuestions
      commonMistakes
      reteachRecommendations
      language
      createdAt
    }
    gapGroups(examId: $examId) {
      id
      label
      errorType
      skill { id code name }
      students { id fullName admissionNo }
      materials { id kind content language createdAt }
    }
  }
`;

const ENROLLED = `query ($classId: ID) { students(classId: $classId, limit: 200) { items { id fullName } } }`;

const MATERIAL = `
  mutation ($gapGroupId: ID!, $language: String, $kind: String) {
    generateTeachingMaterial(gapGroupId: $gapGroupId, language: $language, kind: $kind) {
      id
      kind
      content
      language
      createdAt
    }
  }
`;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "sw", label: "Kiswahili" },
];

/** The mark bands the rest of the teacher screens already use. */
const ERROR_CHIPS = {
  conceptual: { classes: "text-red-800 bg-red-200", label: "Conceptual" },
  procedural: { classes: "text-amber-800 bg-amber-200", label: "Procedural" },
  arithmetic: { classes: "text-amber-800 bg-amber-200", label: "Arithmetic" },
  notation: { classes: "text-lightBlue-800 bg-lightBlue-200", label: "Notation" },
  units: { classes: "text-lightBlue-800 bg-lightBlue-200", label: "Units" },
  incomplete: { classes: "text-blueGray-800 bg-blueGray-200", label: "Incomplete" },
  illegible: { classes: "text-blueGray-800 bg-blueGray-200", label: "Illegible" },
  none: { classes: "text-blueGray-800 bg-blueGray-200", label: "No pattern" },
};

export default {
  name: "insights-step",
  components: { AiChip, Drawer, EmptyState, MathText, SelectField },
  props: {
    exam: { type: Object, required: true },
  },
  data() {
    return {
      loading: true,
      insight: null,
      pollTimer: null,
      pollStartedAt: 0,
      cancelled: false,
      waitedTooLong: false,
      groups: [],
      onTrack: [],
      onTrackOpen: false,
      selectedQuestion: "",
      languageFor: {},
      drawerOpen: false,
      activeGroup: null,
      currentLanguage: "en",
      generating: false,
      material: null,
      answersShown: false,
      copied: false,
    };
  },
  computed: {
    languageOptions() {
      return LANGUAGES;
    },
    /** Recommendations were a list of strings before; both shapes render. */
    recommendations() {
      const raw = (this.insight && this.insight.reteachRecommendations) || [];
      return raw.map((item) => {
        if (typeof item === "string") return { title: item, evidence: "" };
        const questions = item.question_numbers || [];
        const failed = item.percent_failed;
        const evidence = [];
        if (questions.length) evidence.push(`Q${questions.join(", Q")}`);
        if (failed) evidence.push(`${Math.round(failed)}% failed`);
        return {
          title: item.title || "",
          skillCode: item.skill_code || "",
          action: item.action || "",
          evidence: evidence.join(" · "),
        };
      });
    },
    hardest() {
      const rows = (this.insight && this.insight.hardestQuestions) || [];
      return [...rows].sort((a, b) => (a.average || 0) - (b.average || 0));
    },
    mistakes() {
      const rows = (this.insight && this.insight.commonMistakes) || [];
      return rows.map((row) => ({
        description: row.description,
        errorType: row.error_type || "none",
        questionNumbers: row.question_numbers || [],
        example: row.example || "",
        count: row.count || 0,
      }));
    },
    mistakesForSelected() {
      return this.mistakes.filter((row) =>
        row.questionNumbers.includes(this.selectedQuestion)
      );
    },
    drawerTitle() {
      return this.activeGroup ? this.activeGroup.skill.name : "Teaching material";
    },
    drawerSubtitle() {
      return this.activeGroup
        ? `${this.activeGroup.students.length} student(s) · ${this.errorChip(this.activeGroup.errorType).label}`
        : "";
    },
  },
  watch: {
    currentLanguage(value) {
      // Switching language shows what exists in that language, and only writes
      // something when there is nothing to show.
      if (!this.activeGroup) return;
      const saved = this.activeGroup.materials.filter((item) => item.language === value);
      if (saved.length) {
        this.material = saved[0];
        return;
      }
      this.generate();
    },
  },
  created() {
    this.load();
  },
  beforeUnmount() {
    this.cancelled = true;
    clearTimeout(this.pollTimer);
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const data = await gql(INSIGHTS, { examId: this.$route.params.id });
        this.insight = data.classInsights;
        this.groups = data.gapGroups.map((group) => ({
          ...group,
          materials: group.materials || [],
        }));
        const defaults = { ...this.languageFor };
        for (const group of this.groups) {
          if (!defaults[group.id]) {
            defaults[group.id] = this.insight ? this.insight.language : "en";
          }
        }
        this.languageFor = defaults;
        await this.loadOnTrack();
        this.watchForInsight();
      } catch (error) {
        toastError(error.message);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Wait for insight that is still being written, rather than asking the
     * teacher to reload.
     *
     * Finalising queues a background job that produces a report per student
     * before it writes the class insight, and each of those is a model call
     * taking the better part of a minute. On a class of thirty the insight
     * arrives several minutes after the exam is locked -- and "check back in a
     * moment and reload" is a poor thing to say to someone who is watching.
     */
    watchForInsight() {
      if (this.insight || !this.exam || this.exam.status !== "finalized") return;
      if (this.pollTimer) return;
      this.pollStartedAt = Date.now();
      const tick = async () => {
        if (this.cancelled || this.insight) return;
        if (Date.now() - this.pollStartedAt > INSIGHT_WAIT) {
          // Long enough that something is wrong rather than slow; say so.
          this.waitedTooLong = true;
          return;
        }
        try {
          const data = await gql(INSIGHTS, { examId: this.$route.params.id });
          if (data.classInsights) {
            this.insight = data.classInsights;
            this.groups = data.gapGroups.map((group) => ({
              ...group,
              materials: group.materials || [],
            }));
            await this.loadOnTrack();
            return;
          }
        } catch (error) {
          // A blip is not news; the next tick tries again.
        }
        this.pollTimer = setTimeout(tick, INSIGHT_POLL);
      };
      this.pollTimer = setTimeout(tick, INSIGHT_POLL);
    },

    /** Everyone in the class who is not in a gap group. */
    async loadOnTrack() {
      try {
        const enrolled = await gql(ENROLLED, { classId: this.exam.schoolClass.id });
        const grouped = new Set(
          this.groups.flatMap((group) => group.students.map((student) => student.id))
        );
        this.onTrack = enrolled.students.items.filter((student) => !grouped.has(student.id));
      } catch (error) {
        this.onTrack = [];
      }
    },

    bandOf(average) {
      return masteryBand(average);
    },

    percentOf(average) {
      return Math.round((average || 0) * 100);
    },

    errorChip(type) {
      return ERROR_CHIPS[(type || "none").toLowerCase()] || ERROR_CHIPS.none;
    },

    languageLabel(value) {
      const found = LANGUAGES.find((item) => item.value === value);
      return found ? found.label : value;
    },

    studentNames(group) {
      const names = group.students.map((student) => student.fullName);
      return names.length > 6
        ? `${names.slice(0, 6).join(", ")} and ${names.length - 6} more`
        : names.join(", ");
    },

    selectQuestion(number) {
      this.selectedQuestion = this.selectedQuestion === number ? "" : number;
    },

    /** "Generate lesson plan" opens the group that teaches the same skill. */
    openGroupForSkill(skillCode) {
      const match = this.groups.find((group) => group.skill.code === skillCode);
      if (match) {
        this.openGroup(match);
        return;
      }
      // No group for that skill: the class-wide guides are not a thing yet.
      toastError(
        "No group was formed for that skill, so there is nothing to write for yet."
      );
    },

    /** Existing material is shown before anything is generated again. */
    openGroup(group) {
      this.activeGroup = group;
      this.answersShown = false;
      this.drawerOpen = true;

      const saved =
        group.materials.find(
          (item) => item.kind === "guide" && item.language === this.languageFor[group.id]
        ) ||
        group.materials.find((item) => item.language === this.languageFor[group.id]) ||
        group.materials[0] ||
        null;

      this.currentLanguage = saved ? saved.language : this.languageFor[group.id] || "en";
      this.material = saved;
      if (!saved) this.generate();
    },

    async generate() {
      if (!this.activeGroup) return;
      const group = this.activeGroup;
      this.generating = true;
      try {
        // A guide to teach from, and a practice set to hand out.
        const guide = await gql(MATERIAL, {
          gapGroupId: group.id,
          language: this.currentLanguage,
          kind: "guide",
        });
        const practice = await gql(MATERIAL, {
          gapGroupId: group.id,
          language: this.currentLanguage,
          kind: "practice_set",
        });
        group.materials = [
          guide.generateTeachingMaterial,
          practice.generateTeachingMaterial,
          ...group.materials,
        ];
        this.material = guide.generateTeachingMaterial;
        toastSuccess("Material ready.");
      } catch (error) {
        toastError(error.message);
      } finally {
        this.generating = false;
      }
    },

    regenerate() {
      this.generate();
    },

    /** The material as plain text, for pasting into anything. */
    asText() {
      if (!this.material) return "";
      const content = this.material.content;
      if (this.material.kind === "guide") {
        const lines = [content.title || "", ""];
        for (const section of content.sections || []) {
          lines.push(section.heading, section.body, "");
        }
        return lines.join("\n");
      }
      return content
        .map(
          (item, index) =>
            `${index + 1}. ${item.question}\nAnswer: ${item.answer}\n${item.solution || ""}`
        )
        .join("\n\n");
    },

    async copy() {
      try {
        await navigator.clipboard.writeText(this.asText());
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      } catch (error) {
        toastError("This browser would not let the page copy for you.");
      }
    },

    /** A window with just the material in it, so the printout is clean. */
    print() {
      const title = this.drawerTitle;
      const body = this.material && this.material.kind === "guide"
        ? `<h1>${this.material.content.title || title}</h1>` +
          (this.material.content.sections || [])
            .map((section) => `<h2>${section.heading}</h2><p>${section.body}</p>`)
            .join("")
        : (this.material ? this.material.content : [])
            .map(
              (item, index) =>
                `<p><b>${index + 1}.</b> ${item.question}</p>
                 <p class="answer"><b>Answer:</b> ${item.answer}<br/>${item.solution || ""}</p>`
            )
            .join("");

      const sheet = window.open("", "_blank", "width=820,height=1000");
      if (!sheet) {
        toastError("Your browser blocked the print window.");
        return;
      }
      sheet.document.write(`<!doctype html><html><head><title>${title}</title>
        <style>
          body { font: 14px/1.6 Georgia, serif; margin: 40px; color: #111; }
          h1 { font-size: 20px; } h2 { font-size: 16px; margin-top: 20px; }
          .answer { color: #444; margin-bottom: 18px; }
          .meta { color: #666; font-size: 12px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
        </style></head><body>
        <p class="meta">${title} — ${this.$route.meta.step ? this.$route.meta.step.label : ""}</p>
        ${body}
        </body></html>`);
      sheet.document.close();
      sheet.focus();
      sheet.print();
    },
  },
};
</script>
