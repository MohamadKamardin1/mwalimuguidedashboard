<template>
  <!--
    Students down the side, skills across the top, colour for the score.

    This is the page a teacher actually reads, so it is built for forty
    students rather than for eight: the container scrolls both ways, the header
    row and the name column stay put while it does, and a row is a fixed height
    so the whole class stays visible without the page growing a metre tall.

    Sorting is the point of it. By student answers "who is struggling"; by
    skill answers "what should I teach tomorrow", which is the question a
    teacher usually has.
  -->
  <div class="heatmap">
    <div v-if="!rows.length" class="text-sm text-blueGray-400 py-4">
      Nothing to plot yet.
    </div>

    <template v-else>
      <!-- Sorting, and what is being sorted by. -->
      <div class="flex flex-wrap items-center gap-2 mb-3 print:hidden">
        <span class="text-xs font-bold uppercase text-blueGray-400">Sort</span>
        <button
          v-for="option in sortOptions"
          :key="option.key"
          type="button"
          class="h-11 px-3 text-xs font-bold uppercase rounded"
          :class="sort.by === option.key ? 'bg-blueGray-800 text-white' : 'bg-blueGray-100 text-blueGray-600 hover:bg-blueGray-200'"
          :aria-pressed="sort.by === option.key ? 'true' : 'false'"
          @click="setSort(option.key)"
        >
          <i :class="option.icon" aria-hidden="true"></i>
          <span class="ml-1">{{ option.label }}</span>
          <i
            v-if="sort.by === option.key"
            class="fas ml-1"
            :class="sort.dir === 1 ? 'fa-sort-up' : 'fa-sort-down'"
            aria-hidden="true"
          ></i>
        </button>
        <span class="text-xs text-blueGray-400 ml-1">
          Sort by a skill by pressing its column heading.
        </span>
      </div>

      <div
        class="overflow-auto border border-blueGray-100 rounded print:border-0 print:overflow-visible"
        style="max-height: 32rem"
      >
        <table class="border-collapse text-sm w-full">
          <caption class="sr-only">{{ caption }}</caption>
          <thead class="sticky top-0 z-20">
            <tr>
              <th
                class="sticky left-0 z-30 bg-blueGray-50 text-left font-bold text-blueGray-500 text-xs uppercase px-3 py-2 border-b border-blueGray-200"
                style="min-width: 10rem"
                scope="col"
              >
                <button
                  type="button"
                  class="hover:text-lightBlue-600"
                  :aria-label="sort.by === 'name' ? 'Sorted by student' : 'Sort by student name'"
                  @click="setSort('name')"
                >
                  Student
                  <i v-if="sort.by === 'name'" class="fas ml-1" :class="sort.dir === 1 ? 'fa-sort-up' : 'fa-sort-down'" aria-hidden="true"></i>
                </button>
              </th>

              <th
                v-for="column in columns"
                :key="column.skillId"
                class="px-1 py-2 border-b border-blueGray-200 text-center align-bottom bg-blueGray-50"
                scope="col"
              >
                <button
                  type="button"
                  class="px-1 text-xs font-bold uppercase text-blueGray-500 hover:text-lightBlue-600"
                  :title="`${column.name} — press to sort by this skill`"
                  @click="setSort('skill', column.skillId)"
                >
                  <!-- Vertical so forty columns do not each claim 120px. -->
                  <span class="block whitespace-nowrap" style="writing-mode: vertical-rl; transform: rotate(180deg); max-height: 7rem; overflow: hidden">
                    {{ shortCode(column.code) }}
                  </span>
                  <i v-if="sort.by === 'skill' && sort.skillId === column.skillId" class="fas mt-1" :class="sort.dir === 1 ? 'fa-sort-up' : 'fa-sort-down'" aria-hidden="true"></i>
                </button>
              </th>

              <th
                class="px-3 py-2 border-b border-blueGray-200 text-center text-xs font-bold uppercase text-blueGray-500 bg-blueGray-50 whitespace-nowrap"
                scope="col"
              >
                Average
              </th>
            </tr>
          </thead>

          <tbody>
            <!-- Column averages first: "which skill is weak" is read off this. -->
            <tr class="bg-blueGray-50">
              <th
                class="sticky left-0 z-10 bg-blueGray-50 text-left text-xs font-bold uppercase text-blueGray-500 px-3 py-2 border-b border-blueGray-200"
                scope="row"
              >
                Class average
              </th>
              <td
                v-for="column in columns"
                :key="column.skillId"
                class="px-1 py-2 border-b border-blueGray-200 text-center text-xs font-bold"
                :class="bandFor(column.average).text"
              >
                {{ column.average === null ? "–" : Math.round(column.average * 100) }}
              </td>
              <td class="px-3 py-2 border-b border-blueGray-200 text-center text-xs font-bold" :class="bandFor(classAverage).text">
                {{ classAverage === null ? "–" : Math.round(classAverage * 100) }}
              </td>
            </tr>

            <tr
              v-for="row in sortedRows"
              :key="row.studentId"
              class="hover:bg-blueGray-50"
            >
              <th
                class="sticky left-0 z-10 bg-white text-left font-normal text-blueGray-700 px-3 border-b border-blueGray-100 whitespace-nowrap"
                scope="row"
              >
                <button
                  type="button"
                  class="text-left hover:text-lightBlue-600"
                  @click="$emit('select-student', row)"
                >
                  {{ row.studentName }}
                </button>
              </th>

              <td
                v-for="cell in row.cells"
                :key="cell.skillId"
                class="p-0.5 border-b border-blueGray-100 text-center"
              >
                <button
                  type="button"
                  class="block w-full rounded px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-lightBlue-500"
                  :class="[heatColour(cell.score), heatText(cell.score)]"
                  :title="tooltip(row, cell)"
                  :aria-label="`${row.studentName}, ${cell.name}: ${cell.score === null ? 'not measured' : Math.round(cell.score * 100) + ' percent'}`"
                  @click="openCell($event, row, cell)"
                >
                  {{ cell.score === null ? "–" : Math.round(cell.score * 100) }}
                </button>
              </td>

              <td
                class="px-3 border-b border-blueGray-100 text-center text-xs font-bold"
                :class="bandFor(row.average).text"
              >
                {{ row.average === null ? "–" : Math.round(row.average * 100) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap items-center justify-between mt-3">
        <div class="flex flex-wrap items-center text-xs text-blueGray-400 print:mt-2">
          <span class="mr-2">Score</span>
          <span v-for="step in legend" :key="step.label" class="inline-flex items-center mr-3">
            <span class="w-4 h-4 rounded mr-1" :class="step.classes"></span>
            {{ step.label }}
          </span>
        </div>
        <p class="text-xs text-blueGray-400 print:hidden">
          {{ rows.length }} student(s), {{ columns.length }} skill(s). Press a
          score for the detail.
        </p>
      </div>
    </template>

    <!--
      Fixed to the viewport rather than the cell: inside the scroll container it
      would be clipped by it, and half the cells are near an edge.
    -->
    <div
      v-if="open"
      ref="popover"
      class="fixed z-50 w-64 bg-white rounded shadow-xl border border-blueGray-100 p-3 print:hidden"
      role="dialog"
      :aria-label="`${open.row.studentName}, ${open.cell.name}`"
      :style="{ left: open.x + 'px', top: open.y + 'px' }"
    >
      <div class="flex flex-wrap items-start mb-1">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-blueGray-700 truncate">{{ open.cell.name }}</p>
          <p class="text-xs text-blueGray-400 truncate">{{ open.row.studentName }}</p>
        </div>
        <button
          type="button"
          class="w-8 h-8 text-blueGray-300 hover:text-blueGray-500 flex-none"
          aria-label="Close"
          @click="closeCell"
        >
          <i class="fas fa-times text-xs" aria-hidden="true"></i>
        </button>
      </div>

      <p class="text-lg font-bold" :class="bandFor(open.cell.score).text">
        {{ open.cell.score === null ? "Not measured" : percent(open.cell.score) }}
      </p>
      <p class="text-xs text-blueGray-500 mt-1">
        Class average for this skill:
        <span class="font-bold">{{ percent(columnAverage(open.cell.skillId)) }}</span>
      </p>

      <p v-if="open.group" class="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1 mt-2">
        <i class="fas fa-users mr-1" aria-hidden="true"></i>
        In the reteach group for this skill ({{ open.group.errorType }},
        {{ open.group.size }} student(s)).
      </p>

      <div class="flex flex-wrap mt-3">
        <router-link
          :to="studentRoute(open.row)"
          class="h-9 inline-flex items-center text-xs font-bold uppercase text-lightBlue-600 hover:text-lightBlue-800 mr-2"
          @click="closeCell"
        >
          Open student <i class="fas fa-arrow-right ml-1" aria-hidden="true"></i>
        </router-link>
        <button
          type="button"
          class="h-9 inline-flex items-center text-xs font-bold uppercase text-blueGray-500 hover:text-blueGray-700"
          @click="focusSkill(open.cell)"
        >
          Sort by this skill
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { meanOf, scoreFor, sortHeatmapRows } from "@/lib/heatmapSort";
import { bandFor, heatColour, heatText, percent } from "@/lib/scale";

const LEGEND = [
  { label: "under 30%", classes: "bg-red-500" },
  { label: "30–49%", classes: "bg-red-300" },
  { label: "50–69%", classes: "bg-amber-300" },
  { label: "70–84%", classes: "bg-emerald-300" },
  { label: "85%+", classes: "bg-emerald-500" },
  { label: "not measured", classes: "bg-blueGray-100" },
];

const SORTS = [
  { key: "name", label: "Student", icon: "fas fa-user" },
  { key: "average", label: "Row average", icon: "fas fa-percent" },
];

/** "MATH.F2.ALG.SIMULTANEOUS" -> "SIMULTANEOUS": the column heading. */
function shortCode(code) {
  const parts = String(code || "").split(".");
  return (parts[parts.length - 1] || code || "").slice(0, 18).toUpperCase();
}

export default {
  name: "report-heatmap",
  props: {
    /** `[{ studentId, studentName, admissionNo, cells: [{ skillId, code, name, score }] }]` */
    rows: { type: Array, default: () => [] },
    caption: { type: String, default: "Skill scores by student" },
    /**
     * `{ [skillId]: { errorType, size } }` — the reteach group this skill
     * formed, when the latest exam produced one.
     *
     * The API does not expose "which questions this student lost marks on for
     * this skill": that lives inside one student's report. Rather than invent
     * it, the popover says what it does know and links to the report.
     */
    groups: { type: Object, default: () => ({}) },
  },
  emits: ["select-student"],
  data() {
    return {
      legend: LEGEND,
      sort: { by: "name", dir: 1, skillId: "" },
      open: null,
    };
  },
  computed: {
    sortOptions() {
      return SORTS;
    },
    columns() {
      const first = this.rows[0];
      if (!first) return [];
      // Every row is measured on the same set, because the report reads one
      // class against one term.
      return first.cells.map((cell) => ({
        skillId: cell.skillId,
        code: cell.code,
        name: cell.name,
        // The column average is the number a teacher reads this for.
        average: meanOf(this.rows.map((row) => this.cellFor(row, cell.skillId).score)),
      }));
    },
    rowsWithAverage() {
      return this.rows.map((row) => ({
        ...row,
        average: meanOf(row.cells.map((cell) => cell.score)),
      }));
    },
    sortedRows() {
      return sortHeatmapRows(this.rowsWithAverage, this.sort);
    },
    classAverage() {
      return meanOf(this.rowsWithAverage.map((row) => row.average));
    },
  },
  mounted() {
    document.addEventListener("keydown", this.onKeydown);
    document.addEventListener("click", this.onOutsideClick);
  },
  beforeUnmount() {
    document.removeEventListener("keydown", this.onKeydown);
    document.removeEventListener("click", this.onOutsideClick);
  },
  methods: {
    bandFor,
    heatColour,
    heatText,
    percent,
    shortCode,

    cellFor(row, skillId) {
      return { score: scoreFor(row, skillId) };
    },

    columnAverage(skillId) {
      const column = this.columns.find((item) => item.skillId === skillId);
      return column ? column.average : null;
    },

    setSort(by, skillId = "") {
      if (this.sort.by === by && this.sort.skillId === skillId) {
        this.sort = { ...this.sort, dir: -this.sort.dir };
        return;
      }
      // Lowest first: the point of pressing a column is to find who is weak.
      this.sort = { by, dir: 1, skillId };
    },

    focusSkill(cell) {
      this.sort = { by: "skill", dir: 1, skillId: cell.skillId };
      this.closeCell();
    },

    /**
     * The popover is placed at the click and then pulled back inside the
     * window, so a cell in the last column does not open off the screen.
     */
    openCell(event, row, cell) {
      const cell$ = event.currentTarget;
      const rect = cell$.getBoundingClientRect();
      const width = 256;
      const height = 210;
      const x = Math.min(
        Math.max(8, rect.left),
        Math.max(8, window.innerWidth - width - 8)
      );
      // Below the cell unless there is no room, then above it.
      const below = rect.bottom + 6;
      const y = below + height < window.innerHeight ? below : Math.max(8, rect.top - height - 6);

      this.open = {
        row,
        cell,
        x,
        y,
        group: this.groups[cell.skillId] || null,
      };
    },

    closeCell() {
      this.open = null;
    },

    onOutsideClick(event) {
      if (!this.open) return;
      const popover = this.$refs.popover;
      if (popover && popover.contains(event.target)) return;
      this.closeCell();
    },

    onKeydown(event) {
      if (event.key === "Escape") this.closeCell();
    },

    studentRoute(row) {
      // Carrying the exam through means the report opens on the exam the
      // teacher was looking at, not on whichever one comes first.
      const examId = this.$route && this.$route.query.examId;
      return {
        name: "report-student",
        params: { studentId: row.studentId },
        query: examId ? { examId } : {},
      };
    },

    tooltip(row, cell) {
      const score = cell.score === null ? "not measured" : percent(cell.score);
      const column = percent(this.columnAverage(cell.skillId));
      return `${row.studentName} — ${cell.name}: ${score} (class ${column})`;
    },
  },
};
</script>
