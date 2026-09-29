<template>
  <div class="px-4 pb-4">
    <uploader :exam-id="exam.id" @uploaded="onUploaded" />

    <!-- Reading the upload -->
    <div v-if="jobStatus" class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white">
      <div class="p-4">
        <job-progress
          :job="job"
          title="Reading the script pages"
          retry-label="Read them again"
          @retry="$emit('changed')"
        />

        <ul class="list-none mt-3">
          <li v-for="stage in stages" :key="stage.label" class="flex items-start py-1">
            <span class="mr-2 mt-1 w-4 text-center">
              <i v-if="stage.state === 'done'" class="fas fa-check-circle text-emerald-500 text-sm"></i>
              <i v-else-if="stage.state === 'active'" class="fas fa-circle-notch fa-spin text-lightBlue-500 text-sm"></i>
              <i v-else class="far fa-circle text-blueGray-300 text-sm"></i>
            </span>
            <span class="text-sm" :class="stage.state === 'todo' ? 'text-blueGray-400' : 'text-blueGray-700'">
              {{ stage.label }}
              <span v-if="stage.detail" class="text-blueGray-400">· {{ stage.detail }}</span>
            </span>
          </li>
        </ul>

        <p class="text-xs text-blueGray-400 mt-2">
          Matching and transcription are reported as one counter by the API, so
          those two move together here.
        </p>

        <p v-if="jobStatus === 'failed'" class="text-sm text-red-500 mt-2">
          {{ jobError || "Processing failed." }}
        </p>
      </div>
    </div>

    <spinner v-if="loading" large label="Loading scripts..." />

    <div v-else-if="error" class="w-full">
      <empty-state
        title="Could not load the scripts"
        :description="error"
        icon="fas fa-exclamation-triangle"
      />
    </div>

    <div v-else-if="!scripts.length" class="w-full">
      <empty-state
        title="No scripts yet"
        description="Photograph the students' answer sheets above. They are grouped, matched to students and read automatically."
        icon="fas fa-file-alt"
      />
    </div>

    <template v-else>
      <!-- Summary -->
      <div class="flex flex-wrap mb-4">
        <div
          v-for="chip in chips"
          :key="chip.label"
          class="w-6/12 md:w-3/12 px-2 mb-2"
        >
          <div class="bg-white rounded shadow p-3">
            <span class="text-xl font-bold block" :class="chip.classes">
              {{ chip.value }}
            </span>
            <span class="text-xs uppercase text-blueGray-400">{{ chip.label }}</span>
          </div>
        </div>
      </div>

      <!-- Needs a student -->
      <div v-if="unmatched.length" class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white">
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <h3 class="font-semibold text-lg text-blueGray-700">
            {{ unmatched.length }} script{{ unmatched.length === 1 ? "" : "s" }} need a student
          </h3>
          <p class="text-sm text-blueGray-500">
            Pick the student each one belongs to. Students who have not handed
            anything in are listed first.
          </p>
        </div>

        <div class="px-4 pb-4">
          <div
            v-for="script in unmatched"
            :key="script.id"
            class="border border-solid border-blueGray-100 rounded mb-3 p-3"
          >
            <div class="flex flex-wrap items-start">
              <img
                v-if="firstPage(script)"
                :src="firstPage(script).url"
                alt=""
                class="w-20 h-24 object-cover rounded mr-3 cursor-pointer"
                @click="openViewer(script)"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-blueGray-700">
                  {{ script.detectedName || "Name not read" }}
                </p>
                <p class="text-xs text-blueGray-400 mb-2">
                  <template v-if="script.detectedAdmissionNo">
                    Admission no read as {{ script.detectedAdmissionNo }}
                  </template>
                  <template v-else>No admission number read</template>
                  · {{ script.pages.length }} page{{ script.pages.length === 1 ? "" : "s" }}
                </p>

                <input
                  v-model="searches[script.id]"
                  type="search"
                  placeholder="Search students by name or admission number"
                  class="border-0 px-3 py-2 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full mb-2"
                />

                <div class="max-h-48 overflow-y-auto border border-solid border-blueGray-100 rounded">
                  <button
                    v-for="student in candidatesFor(script)"
                    :key="student.id"
                    type="button"
                    class="w-full text-left text-sm px-3 py-3 border-b border-solid border-blueGray-100 hover:bg-blueGray-50 flex items-center justify-between"
                    :disabled="busy === script.id"
                    @click="assign(script, student)"
                  >
                    <span>
                      <span class="font-bold text-blueGray-700">{{ student.fullName }}</span>
                      <span class="text-blueGray-400"> · {{ student.admissionNo }}</span>
                    </span>
                    <span v-if="!hasScript(student)" class="text-xs uppercase text-amber-600">
                      No script
                    </span>
                  </button>
                  <p v-if="!candidatesFor(script).length" class="text-sm text-blueGray-400 px-3 py-3">
                    No student matches that search.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="absent.length" class="mt-4">
            <h6 class="text-xs uppercase font-bold text-blueGray-500 mb-2">
              Nothing handed in yet ({{ absent.length }})
            </h6>
            <div class="flex flex-wrap">
              <span
                v-for="student in absent"
                :key="student.id"
                class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-800 bg-blueGray-200 mr-1 mb-1"
              >
                {{ student.fullName }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Needs grouping -->
      <div v-if="needsGrouping.length" class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white">
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <h3 class="font-semibold text-lg text-blueGray-700">
            {{ needsGrouping.length }} batch{{ needsGrouping.length === 1 ? "" : "es" }} to sort out
          </h3>
          <p class="text-sm text-blueGray-500">
            Drag a page onto another script to move it there, or tick pages and
            split them off. Merging keeps everything in the script you drop onto.
          </p>
        </div>

        <div class="px-4 pb-4">
          <div
            v-for="script in needsGrouping"
            :key="script.id"
            class="border border-solid rounded mb-3 p-3"
            :class="dropTarget === script.id ? 'border-emerald-500 bg-emerald-50' : 'border-blueGray-100'"
            @dragover.prevent="dropTarget = script.id"
            @dragleave.prevent="dropTarget = ''"
            @drop.prevent="onDrop(script)"
          >
            <div class="flex flex-wrap items-center justify-between mb-2">
              <p class="text-sm font-bold text-blueGray-700">
                {{ script.detectedName || "Unnamed batch" }}
                <span class="text-blueGray-400 font-normal">
                  · {{ script.pages.length }} page{{ script.pages.length === 1 ? "" : "s" }}
                </span>
              </p>
              <div class="flex items-center">
                <button
                  type="button"
                  class="text-xs font-bold uppercase text-emerald-500 px-2 py-2 mr-1"
                  :disabled="busy === script.id || !selected(script).length"
                  @click="split(script)"
                >
                  Split off {{ selected(script).length || "" }}
                </button>
                <button
                  type="button"
                  class="text-xs font-bold uppercase text-blueGray-600 px-2 py-2"
                  @click="openViewer(script)"
                >
                  View
                </button>
              </div>
            </div>

            <div class="flex flex-wrap">
              <div
                v-for="page in script.pages"
                :key="page.id"
                class="mr-2 mb-2 relative"
                draggable="true"
                @dragstart="dragFrom = { scriptId: script.id, pageId: page.id }"
              >
                <img
                  :src="page.url"
                  alt=""
                  class="w-20 h-24 object-cover rounded border-2 border-solid"
                  :class="isSelected(script, page) ? 'border-emerald-500' : 'border-blueGray-200'"
                />
                <button
                  type="button"
                  class="absolute bottom-0 left-0 text-xs px-1 bg-white rounded-tr"
                  :aria-label="isSelected(script, page) ? 'Deselect page' : 'Select page'"
                  @click="toggle(script, page)"
                >
                  <i
                    :class="isSelected(script, page) ? 'fas fa-check-square text-emerald-500' : 'far fa-square text-blueGray-400'"
                  ></i>
                </button>
              </div>
            </div>

            <div class="flex flex-wrap items-center mt-2">
              <select-field
                :model-value="mergeTargetOf(script)"
                class="w-full md:w-64 mr-2"
                label=""
                placeholder="Merge this batch into..."
                :options="mergeOptions(script)"
                @update:model-value="(value) => setMergeTarget(script, value)"
              />
              <button
                type="button"
                class="bg-blueGray-800 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow mb-1 disabled:opacity-50"
                :disabled="busy === script.id || !mergeTargetOf(script)"
                @click="merge(script)"
              >
                Merge
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- All scripts -->
      <div class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white">
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <h3 class="font-semibold text-lg text-blueGray-700">
            Scripts ({{ scripts.length }})
          </h3>
        </div>

        <div class="px-4 pb-4">
          <div class="flex flex-wrap">
            <div
              v-for="script in scripts"
              :key="script.id"
              class="w-full md:w-6/12 xl:w-4/12 px-2 mb-3"
            >
              <div class="border border-solid border-blueGray-100 rounded h-full">
                <div class="flex">
                  <img
                    v-if="firstPage(script)"
                    :src="firstPage(script).url"
                    alt=""
                    class="w-24 h-28 object-cover rounded-l cursor-pointer"
                    @click="openViewer(script)"
                  />
                  <div class="flex-1 min-w-0 p-3">
                    <p class="text-sm font-bold text-blueGray-700 truncate">
                      {{ script.detectedName || "Name not read" }}
                    </p>

                    <p v-if="script.student" class="text-xs text-blueGray-500 mb-1">
                      {{ script.student.fullName }}
                      <span class="text-blueGray-400">· {{ script.student.admissionNo }}</span>
                    </p>
                    <p v-else class="text-xs text-amber-600 mb-1">
                      No student yet
                    </p>

                    <div class="flex flex-wrap items-center mb-2">
                      <status-badge :status="script.status" />
                      <span
                        v-if="script.student"
                        class="ml-1 text-xs uppercase text-blueGray-400"
                      >
                        <confidence-badge :value="script.matchConfidence" />
                      </span>
                    </div>

                    <button
                      type="button"
                      class="text-xs font-bold uppercase text-emerald-500"
                      @click="openViewer(script)"
                    >
                      {{ script.pages.length }} page{{ script.pages.length === 1 ? "" : "s" }}
                      · Open
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Page viewer -->
    <div v-if="viewer.script" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 bg-blueGray-800 bg-opacity-60" @click="closeViewer"></div>
        <div class="relative w-full max-w-4xl bg-white shadow-xl rounded-lg">
          <div class="rounded-t bg-white mb-0 px-6 py-4 flex items-center justify-between">
            <div>
              <h6 class="text-blueGray-700 text-lg font-bold">
                {{ viewer.script.detectedName || "Script" }}
              </h6>
              <p class="text-xs text-blueGray-400">
                {{ viewer.index + 1 }} of {{ viewer.script.pages.length }}
              </p>
            </div>
            <div class="flex items-center">
              <button
                type="button"
                class="text-blueGray-500 px-3 py-2"
                aria-label="Zoom out"
                @click="zoomBy(-0.25)"
              >
                <i class="fas fa-search-minus"></i>
              </button>
              <span class="text-xs text-blueGray-500 w-12 text-center">
                {{ Math.round(viewer.zoom * 100) }}%
              </span>
              <button
                type="button"
                class="text-blueGray-500 px-3 py-2 mr-2"
                aria-label="Zoom in"
                @click="zoomBy(0.25)"
              >
                <i class="fas fa-search-plus"></i>
              </button>
              <button
                type="button"
                class="text-blueGray-400 hover:text-blueGray-600 px-2 py-2"
                aria-label="Close"
                @click="closeViewer"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div class="px-6 pb-6">
            <div class="overflow-auto bg-blueGray-100 rounded" style="max-height: 70vh">
              <img
                v-if="viewerPage"
                :src="viewerPage.url"
                alt=""
                class="mx-auto block"
                :style="{ width: `${Math.round(viewer.zoom * 100)}%` }"
              />
            </div>
            <div class="flex items-center justify-between mt-3">
              <button
                type="button"
                class="text-xs font-bold uppercase text-blueGray-600 px-3 py-3 disabled:opacity-40"
                :disabled="viewer.index === 0"
                @click="stepPage(-1)"
              >
                <i class="fas fa-chevron-left mr-1"></i>Previous
              </button>
              <button
                type="button"
                class="text-xs font-bold uppercase text-blueGray-600 px-3 py-3 disabled:opacity-40"
                :disabled="viewer.index >= viewer.script.pages.length - 1"
                @click="stepPage(1)"
              >
                Next<i class="fas fa-chevron-right ml-1"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";

import { gql } from "@/api/client";
import SelectField from "@/components/crud/SelectField.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import ConfidenceBadge from "@/components/teacher/ConfidenceBadge.vue";
import JobProgress from "@/components/teacher/JobProgress.vue";
import { jobFor, rememberJob, useJob } from "@/components/teacher/useJob";
import EmptyState from "@/components/ui/EmptyState.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";

import Uploader from "./scripts/Uploader.vue";

const SCRIPTS = `
  query Scripts($examId: ID!) {
    scripts(examId: $examId, limit: 200) {
      total
      items {
        id
        status
        matchMethod
        matchConfidence
        detectedName
        detectedAdmissionNo
        needsGrouping
        needsReview
        student { id fullName admissionNo }
        pages { id order url }
      }
    }
  }
`;

const CLASS_STUDENTS = `
  query ClassStudents($classId: ID) {
    students(classId: $classId, limit: 200) {
      total
      items { id fullName admissionNo }
    }
  }
`;

const ASSIGN = `
  mutation ($scriptId: ID!, $studentId: ID!) {
    assignScriptToStudent(scriptId: $scriptId, studentId: $studentId) {
      id
      student { id fullName }
    }
  }
`;

const MERGE = `
  mutation ($sourceScriptId: ID!, $targetScriptId: ID!) {
    mergePagesIntoScript(sourceScriptId: $sourceScriptId, targetScriptId: $targetScriptId) {
      id
    }
  }
`;

const SPLIT = `
  mutation ($scriptId: ID!, $pageIds: [ID!]!) {
    splitScript(scriptId: $scriptId, pageIds: $pageIds) { id }
  }
`;

/** The statuses that mean the answers have been read out of the page. */
const EXTRACTED = ["extracted", "marked", "reviewed", "final"];

export default {
  name: "exam-step-scripts",
  components: { SelectField, StatusBadge, ConfidenceBadge, JobProgress, EmptyState, Spinner, Uploader },
  props: {
    /** Passed down by the workspace shell. */
    exam: { type: Object, required: true },
    counts: { type: Object, default: null },
  },
  emits: ["changed"],

  setup(props) {
    // The id is owned here so the page can hand over a job it has just
    // started; a job begun before a reload is picked up from storage.
    const jobId = ref(jobFor(`exam:${props.exam.id}:scripts`));
    const followed = useJob(jobId);

    // Unpacked deliberately. `useJob` returns refs, and a ref nested inside an
    // object is not unwrapped in a template or by `this`: `job.status` would
    // be the ref itself, never a string, so every comparison against "done" or
    // "failed" was false and the watcher below watched an object's identity
    // and never fired. The board never reloaded after a job finished, which is
    // why scripts that had been read and stored still showed as "No scripts
    // yet". Returning them at the top level unwraps them.
    return {
      jobId,
      job: followed.job,
      jobStatus: followed.status,
      jobError: followed.error,
      rememberJob,
    };
  },

  data() {
    return {
      scripts: [],
      students: [],
      loading: true,
      error: "",
      busy: "",
      searches: {},
      mergeTargets: {},
      dragFrom: null,
      dropTarget: "",
      viewer: { script: null, index: 0, zoom: 1 },
      poller: null,
    };
  },

  computed: {
    unmatched() {
      return this.scripts.filter((script) => !script.student);
    },
    needsGrouping() {
      return this.scripts.filter((script) => script.needsGrouping);
    },
    matchedIds() {
      return new Set(this.scripts.filter((s) => s.student).map((s) => s.student.id));
    },
    /** Students with no script of their own, so likely absent. */
    absent() {
      return this.students.filter((student) => !this.matchedIds.has(student.id));
    },
    chips() {
      return [
        {
          label: "Matched",
          value: this.scripts.filter((s) => s.student).length,
          classes: "text-emerald-600",
        },
        { label: "Needs student", value: this.unmatched.length, classes: "text-amber-600" },
        { label: "Needs grouping", value: this.needsGrouping.length, classes: "text-amber-600" },
        {
          label: "Extracted",
          value: this.scripts.filter((s) => EXTRACTED.includes(s.status)).length,
          classes: "text-lightBlue-600",
        },
      ];
    },
    stages() {
      const current = this.job;
      if (!current) return [];
      const result = current.result || {};
      const total = Number(result.total || 0);
      const done = Number(result.done || 0);
      const finishing = current.status !== "failed";
      // Grouping finishes when the batch reports a total; the per-script
      // work then runs, and the API counts matching and transcription as one.
      const grouped = total > 0 || current.status === "done";
      const perScript = grouped && finishing ? (current.status === "done" ? "done" : "active") : "todo";

      return [
        { label: "Reading pages", state: grouped ? "done" : "active", detail: "" },
        {
          label: "Matching students",
          state: perScript,
          detail: total ? `${done}/${total}` : "",
        },
        { label: "Transcribing answers", state: perScript, detail: "" },
      ];
    },
    viewerPage() {
      if (!this.viewer.script) return null;
      return this.viewer.script.pages[this.viewer.index] || null;
    },
  },

  watch: {
    // The board is only interesting once the job has stopped. Watching a plain
    // string, not a ref: a ref inside an object never changes identity, so the
    // handler below would never run.
    jobStatus(status) {
      if (status === "done") {
        toastSuccess("Scripts are ready.");
        this.refresh();
      }
    },
  },

  async mounted() {
    await this.load();
  },

  beforeUnmount() {
    clearTimeout(this.poller);
  },

  methods: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        const [scripts, students] = await Promise.all([
          gql(SCRIPTS, { examId: this.exam.id }),
          gql(CLASS_STUDENTS, { classId: this.exam.schoolClass && this.exam.schoolClass.id }),
        ]);
        this.scripts = scripts.scripts.items;
        this.students = students.students.items;
      } catch (failure) {
        this.error = failure.message;
      } finally {
        this.loading = false;
      }
    },

    /** Re-read the board and let the shell recompute its counts. */
    async refresh() {
      await this.load();
      this.$emit("changed");
    },

    firstPage(script) {
      return script.pages && script.pages.length ? script.pages[0] : null;
    },
    hasScript(student) {
      return this.matchedIds.has(student.id);
    },

    /**
     * Students to offer for a script: the search applied, and whoever has no
     * script yet first so the likely owner is at the top of the list.
     */
    candidatesFor(script) {
      const term = (this.searches[script.id] || "").trim().toLowerCase();
      const rows = term
        ? this.students.filter((student) =>
            `${student.fullName} ${student.admissionNo}`.toLowerCase().includes(term)
          )
        : this.students;

      return [...rows].sort((a, b) => {
        const aHas = this.hasScript(a) ? 1 : 0;
        const bHas = this.hasScript(b) ? 1 : 0;
        if (aHas !== bHas) return aHas - bHas;
        return a.fullName.localeCompare(b.fullName);
      });
    },

    async assign(script, student) {
      this.busy = script.id;
      try {
        await gql(ASSIGN, { scriptId: script.id, studentId: student.id });
        toastSuccess(`${student.fullName} is now on this script.`);
        await this.refresh();
      } catch (failure) {
        toastError(failure.message);
      } finally {
        this.busy = "";
      }
    },

    // --- grouping ------------------------------------------------------------

    isSelected(script, page) {
      return Boolean(this.mergeTargets[`sel:${script.id}`] && this.mergeTargets[`sel:${script.id}`].has(page.id));
    },

    selected(script) {
      const set = this.mergeTargets[`sel:${script.id}`];
      return set ? [...set] : [];
    },

    toggle(script, page) {
      const key = `sel:${script.id}`;
      const set = new Set(this.mergeTargets[key] || []);
      if (set.has(page.id)) set.delete(page.id);
      else set.add(page.id);
      this.mergeTargets = { ...this.mergeTargets, [key]: set };
    },

    mergeTargetOf(script) {
      return this.mergeTargets[`to:${script.id}`] || "";
    },

    setMergeTarget(script, value) {
      this.mergeTargets = { ...this.mergeTargets, [`to:${script.id}`]: value };
    },

    mergeOptions(script) {
      return this.scripts
        .filter((row) => row.id !== script.id)
        .map((row) => ({
          value: row.id,
          label: `${row.detectedName || "Unnamed batch"} · ${row.pages.length} page(s)`,
        }));
    },

    /** Move a dragged page into another script: split it off, then merge it in. */
    async onDrop(target) {
      const from = this.dragFrom;
      this.dragFrom = null;
      this.dropTarget = "";
      if (!from || from.scriptId === target.id) return;

      this.busy = target.id;
      try {
        const created = await gql(SPLIT, {
          scriptId: from.scriptId,
          pageIds: [from.pageId],
        });
        await gql(MERGE, {
          sourceScriptId: created.splitScript.id,
          targetScriptId: target.id,
        });
        toastSuccess("Page moved.");
        await this.refresh();
      } catch (failure) {
        toastError(failure.message);
      } finally {
        this.busy = "";
      }
    },

    async split(script) {
      const pageIds = this.selected(script);
      if (!pageIds.length) return;
      this.busy = script.id;
      try {
        await gql(SPLIT, { scriptId: script.id, pageIds });
        toastSuccess(`${pageIds.length} page(s) split into a new script.`);
        await this.refresh();
      } catch (failure) {
        toastError(failure.message);
      } finally {
        this.busy = "";
      }
    },

    async merge(script) {
      const target = this.mergeTargetOf(script);
      if (!target) return;
      this.busy = script.id;
      try {
        await gql(MERGE, { sourceScriptId: script.id, targetScriptId: target });
        toastSuccess("Batches merged.");
        await this.refresh();
      } catch (failure) {
        toastError(failure.message);
      } finally {
        this.busy = "";
      }
    },

    // --- viewer --------------------------------------------------------------

    openViewer(script) {
      this.viewer = { script, index: 0, zoom: 1 };
    },
    closeViewer() {
      this.viewer = { script: null, index: 0, zoom: 1 };
    },
    stepPage(delta) {
      const next = this.viewer.index + delta;
      if (next < 0 || next >= this.viewer.script.pages.length) return;
      this.viewer = { ...this.viewer, index: next };
    },
    zoomBy(delta) {
      const zoom = Math.min(3, Math.max(0.25, this.viewer.zoom + delta));
      this.viewer = { ...this.viewer, zoom };
    },

    /** The uploader hands over the job it just started. */
    onUploaded(jobId) {
      if (!jobId) return;
      this.rememberJob(`exam:${this.exam.id}:scripts`, jobId, {
        examId: this.exam.id,
        step: "scripts",
        label: "Reading the scripts",
      });
      // Setting the ref is what makes `useJob` start following it.
      this.jobId = jobId;
      this.$emit("changed");
    },
  },
};
</script>
