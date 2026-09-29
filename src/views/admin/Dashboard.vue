<template>
  <div class="flex flex-wrap">
    <div class="w-full px-4">
      <p class="text-sm text-blueGray-500 mb-4">
        Everything happening in {{ schoolName }} right now.
      </p>
    </div>

    <!--
      Each figure comes from a `total` on a one-row query: the schema has no
      admin-wide aggregate, but every scoped list already counts for us.
    -->
    <div v-for="card in cards" :key="card.label" class="w-full md:w-6/12 xl:w-4/12 px-4">
      <stat-card
        :label="card.label"
        :value="card.value"
        :icon="card.icon"
        :icon-color="card.iconColor"
        :hint="card.hint"
      />
    </div>

    <div class="w-full px-4">
      <div
        class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
      >
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <h3 class="font-semibold text-lg text-blueGray-700 px-4">
            Where to next
          </h3>
        </div>
        <div class="px-8 py-6 flex flex-wrap">
          <router-link
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="flex items-center px-4 py-3 mr-3 mb-3 rounded bg-blueGray-50 hover:bg-blueGray-100 ease-linear transition-all duration-150"
          >
            <i :class="[link.icon, 'text-blueGray-400 mr-2']"></i>
            <span class="text-sm font-bold text-blueGray-700">{{ link.label }}</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { gql } from "@/api/client";
import StatCard from "@/components/crud/StatCard.vue";
import { useAuthStore } from "@/stores/auth";

/**
 * One row per school-wide figure. Each is a scoped list asked for a single
 * row, so the payload is a count and nothing else.
 */
const COUNTS = `
  query {
    teachers: users(role: "teacher", limit: 1) { total }
    students(limit: 1) { total }
    classes(limit: 1) { total }
    terms: academicTerms(isCurrent: true, limit: 1) { items { id name year } }
  }
`;

const EXAMS_THIS_TERM = `
  query ($termId: ID) { exams(termId: $termId, limit: 1) { total } }
`;

const EXAMS_AWAITING_REVIEW = `
  query { exams(status: "review", limit: 1) { total } }
`;

// A dash rather than a zero: an unreadable count is not "none".
const UNKNOWN = "—";

export default {
  name: "admin-dashboard",
  components: { StatCard },
  data() {
    return {
      counts: {
        teachers: null,
        students: null,
        classes: null,
        termExams: null,
        awaitingReview: null,
      },
      termName: "",
      links: [
        { to: "/admin/exams", label: "All exams", icon: "fas fa-file-alt" },
        { to: "/admin/students", label: "Students", icon: "fas fa-user-graduate" },
        { to: "/admin/classes", label: "Classes", icon: "fas fa-door-open" },
        { to: "/admin/teachers", label: "Teachers", icon: "fas fa-chalkboard-teacher" },
      ],
    };
  },
  computed: {
    auth() {
      return useAuthStore();
    },
    schoolName() {
      const user = this.auth.user;
      return (user && user.school && user.school.name) || "your school";
    },
    cards() {
      return [
        {
          label: "Teachers",
          value: this.show(this.counts.teachers),
          icon: "fas fa-chalkboard-teacher",
          iconColor: "bg-lightBlue-500",
          hint: "Active accounts in this school",
        },
        {
          label: "Students",
          value: this.show(this.counts.students),
          icon: "fas fa-user-graduate",
          iconColor: "bg-emerald-500",
          hint: "On the school roll",
        },
        {
          label: "Classes",
          value: this.show(this.counts.classes),
          icon: "fas fa-door-open",
          iconColor: "bg-amber-500",
          hint: "Active classes",
        },
        {
          label: "Exams this term",
          value: this.show(this.counts.termExams),
          icon: "fas fa-file-signature",
          iconColor: "bg-blueGray-700",
          hint: this.termName || "No current term is set",
        },
        {
          label: "Awaiting review",
          value: this.show(this.counts.awaitingReview),
          icon: "fas fa-exclamation-circle",
          iconColor: "bg-red-500",
          hint: "Marked exams a teacher still has to check",
        },
      ];
    },
  },
  created() {
    this.load();
  },
  methods: {
    show(value) {
      return value === null || value === undefined ? UNKNOWN : value;
    },

    async load() {
      try {
        const data = await gql(COUNTS);
        this.counts.teachers = data.teachers.total;
        this.counts.students = data.students.total;
        this.counts.classes = data.classes.total;

        const [term] = data.terms.items;
        this.termName = term ? `${term.name} ${term.year}` : "";
        const termId = term ? term.id : null;

        const [thisTerm, awaiting] = await Promise.all([
          gql(EXAMS_THIS_TERM, { termId }),
          gql(EXAMS_AWAITING_REVIEW),
        ]);
        this.counts.termExams = thisTerm.exams.total;
        this.counts.awaitingReview = awaiting.exams.total;
      } catch (error) {
        // Leave the dashes in place and let the cards say so quietly.
        this.termName = "";
      }
    },
  },
};
</script>
