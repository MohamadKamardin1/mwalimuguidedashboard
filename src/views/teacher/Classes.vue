<template>
  <div class="flex flex-wrap">
    <div class="w-full px-4">
      <div class="flex flex-wrap items-center mb-4">
        <div class="flex-1">
          <h3 class="font-semibold text-lg text-blueGray-700">My classes</h3>
          <p class="text-sm text-blueGray-400">
            Everything you teach this term. Open a class to see its students and
            exams.
          </p>
        </div>
      </div>
    </div>

    <spinner v-if="loading" large label="Loading your classes..." />

    <div v-else-if="error" class="w-full px-4">
      <empty-state
        title="Could not load your classes"
        :description="error"
        icon="fas fa-exclamation-triangle"
      />
    </div>

    <div v-else-if="!cards.length" class="w-full px-4">
      <empty-state
        title="No classes yet"
        description="You are not assigned to any class this term. Ask your school administrator to assign you to a class and subject."
        icon="fas fa-door-open"
      />
    </div>

    <template v-else>
      <div
        v-for="card in cards"
        :key="card.id"
        class="w-full md:w-6/12 xl:w-4/12 px-4"
      >
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
        >
          <div class="rounded-t mb-0 px-4 py-3 border-0">
            <h6 class="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
              {{ card.subject }}
            </h6>
            <h2 class="text-blueGray-700 text-xl font-semibold">
              {{ card.className }}
            </h2>
          </div>

          <div class="flex-auto px-4 pb-4">
            <div class="flex flex-wrap">
              <div class="w-4/12 py-2">
                <span class="text-xl font-bold block text-blueGray-600">
                  {{ card.studentCount }}
                </span>
                <span class="text-xs text-blueGray-400">Students</span>
              </div>
              <div class="w-4/12 py-2">
                <span class="text-xl font-bold block text-blueGray-600">
                  {{ card.examCount }}
                </span>
                <span class="text-xs text-blueGray-400">Exams</span>
              </div>
              <div class="w-4/12 py-2">
                <span
                  class="text-xl font-bold block"
                  :class="card.average === null ? 'text-blueGray-400' : masteryBand(card.average).text"
                >
                  {{ formatScore(card.average) }}
                </span>
                <span class="text-xs text-blueGray-400">Last average</span>
              </div>
            </div>

            <p class="text-xs text-blueGray-400 mt-3">
              <template v-if="card.lastExam">
                Latest finalized: {{ card.lastExam.title }} ·
                {{ formatDate(card.lastExam.createdAt) }}
              </template>
              <template v-else>
                No exam finalized yet for this class and subject.
              </template>
            </p>

            <router-link
              :to="{
                name: 'teacher-class',
                params: { id: card.classId },
                query: { subjectId: card.subjectId, termId: card.termId },
              }"
              class="mt-4 bg-emerald-500 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg inline-block"
            >
              Open class
            </router-link>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { gql } from "@/api/client";
import EmptyState from "@/components/ui/EmptyState.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { useSetupStore } from "@/stores/setup";

import { examAverage, formatDate, formatScore, masteryBand } from "@/lib/insights";

const PAGE_LIMIT = 100;

// A teacher only ever sees their own rows from this query.
const MY_ASSIGNMENTS = `
  query MyAssignments($termId: ID) {
    teacherAssignments(termId: $termId, limit: ${PAGE_LIMIT}) {
      total
      items {
        id
        schoolClass { id name level year }
        subject { id name code }
        term { id name year }
      }
    }
  }
`;

const CLASS_STUDENTS = `
  query ClassStudents($classId: ID) {
    students(classId: $classId, limit: 1) { total }
  }
`;

// The exam carries its subject's code, so the school's subject row and the
// curriculum subject are matched on that code rather than a second lookup.
const CLASS_EXAMS = `
  query ClassExams($classId: ID, $termId: ID) {
    exams(classId: $classId, termId: $termId, limit: ${PAGE_LIMIT}) {
      total
      items {
        id
        title
        status
        createdAt
        subject { id name code }
      }
    }
  }
`;

export default {
  name: "teacher-classes",
  components: { EmptyState, Spinner },

  data() {
    return {
      cards: [],
      loading: true,
      error: "",
    };
  },

  computed: {
    setupStore() {
      return useSetupStore();
    },
  },

  async mounted() {
    await this.setupStore.ensure();
    await this.load();
  },

  methods: {
    formatDate,
    formatScore,
    masteryBand,

    async load() {
      this.loading = true;
      this.error = "";
      try {
        const termId = this.setupStore.currentTermId || null;
        const assignments = await gql(MY_ASSIGNMENTS, { termId });

        this.cards = await Promise.all(
          assignments.teacherAssignments.items.map((assignment) =>
            this.buildCard(assignment, termId)
          )
        );
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async buildCard(assignment, termId) {
    const classId = assignment.schoolClass.id;
    const cardTermId = termId || assignment.term.id;

    const card = {
      id: assignment.id,
      classId,
      className: assignment.schoolClass.name,
      subjectId: assignment.subject.id,
      subject: `${assignment.subject.name} (${assignment.subject.code})`,
      termId: cardTermId,
      studentCount: 0,
      examCount: 0,
      average: null,
      lastExam: null,
    };

    const [students, exams] = await Promise.all([
      gql(CLASS_STUDENTS, { classId }),
      gql(CLASS_EXAMS, { classId, termId: cardTermId }),
    ]);

    card.studentCount = students.students.total;

    const mine = exams.exams.items.filter(
      (exam) => exam.subject.code.toUpperCase() === assignment.subject.code.toUpperCase()
    );
    card.examCount = mine.length;

    const finalized = mine
      .filter((exam) => exam.status === "finalized")
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    if (finalized.length) {
      card.lastExam = finalized[0];
      card.average = await examAverage(finalized[0].id);
    }
    return card;
    },
  },
};
</script>
