<template>
  <div class="px-4 pb-4">
    <div class="flex flex-wrap">
      <div class="w-full lg:w-6/12 px-0 lg:pr-2">
        <upload-zone
          title="Exam paper"
          description="The question paper the students sat."
          :pages="paper"
          :busy="uploadingKind === PAPER"
          :busy-count="uploadingCount"
          :fraction="uploadFraction"
          :error="uploadingKind === PAPER ? uploadError : ''"
          @upload="upload(PAPER, $event)"
          @remove="removePage"
          @reorder="reorder(PAPER, $event)"
        />
      </div>
      <div class="w-full lg:w-6/12 px-0 lg:pl-2">
        <upload-zone
          title="Marking scheme"
          description="The scheme the paper is marked against."
          :pages="scheme"
          :busy="uploadingKind === SCHEME"
          :busy-count="uploadingCount"
          :fraction="uploadFraction"
          :error="uploadingKind === SCHEME ? uploadError : ''"
          @upload="upload(SCHEME, $event)"
          @remove="removePage"
          @reorder="reorder(SCHEME, $event)"
        />
      </div>
    </div>

    <!-- The upload's own job, while the pages are being made. -->
    <job-progress
      v-if="uploadJobId"
      :job="uploadJob"
      title="Preparing the pages"
      :ai="false"
      retry-label="Choose the files again"
      @retry="restartUpload"
    >
      <p class="text-sm text-blueGray-600">The pages are ready below.</p>
    </job-progress>

    <div
      v-if="readyToExtract || extractJobId"
      class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
    >
      <div class="px-4 py-6 text-center">
        <template v-if="!extractJobId">
          <p class="text-sm text-blueGray-500 mb-4">
            Both the paper and the scheme are in. The model can read them now.
          </p>
          <button
            type="button"
            class="w-full sm:w-auto h-12 bg-emerald-500 text-white text-sm font-bold uppercase px-6 rounded shadow hover:shadow-lg ease-linear transition-all duration-150"
            @click="extract"
          >
            <i class="fas fa-magic mr-2"></i> Extract with AI
          </button>
        </template>

        <template v-else>
          <p class="text-sm text-blueGray-500">
            You can leave this page — the work carries on and picks up where it
            left off when you come back.
          </p>
        </template>
      </div>
    </div>

    <job-progress
      v-if="extractJobId"
      :job="extractJob"
      title="Extracting the exam"
      :stage="extractStage"
      retry-label="Try the extraction again"
      @retry="extract"
    >
      <p class="text-sm text-blueGray-600">
        {{ extractSummary }}
      </p>
      <div class="flex flex-wrap mt-3">
        <router-link
          :to="{ name: 'teacher-exam-confirm', params: { id: examId } }"
          class="h-11 inline-flex items-center bg-emerald-500 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg"
        >
          Review the questions
        </router-link>
      </div>
    </job-progress>

    <div v-else-if="!readyToExtract" class="relative w-full mb-6 px-0">
      <div class="bg-blueGray-50 border-l-4 border-blueGray-300 rounded px-4 py-3">
        <p class="text-sm text-blueGray-600">
          Add at least one page to each side. The model reads both together, so
          it needs the paper and the scheme it is marked against.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";
import { useRoute } from "vue-router";

import { gql, uploadManyGql } from "@/api/client";
import JobProgress from "@/components/teacher/JobProgress.vue";
import UploadZone from "@/components/teacher/UploadZone.vue";
import { jobFor, rememberJob, useJob } from "@/components/teacher/useJob";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";

const PAPER = "paper";
const SCHEME = "scheme";

const EXAM_FILES = `
  query ($id: ID!) {
    exam(id: $id) { id files { id kind pageNumber order url } }
  }
`;

const UPLOAD = `
  mutation ($examId: ID!, $kind: String!, $files: [Upload!]!) {
    uploadExamFiles(examId: $examId, kind: $kind, files: $files)
  }
`;

const EXTRACT = `mutation ($examId: ID!) { extractExam(examId: $examId) }`;

const REMOVE_PAGE = `mutation ($id: ID!) { deleteExamFile(id: $id) }`;

const REORDER = `
  mutation ($examId: ID!, $kind: String!, $fileIds: [ID!]!) {
    reorderExamFiles(examId: $examId, kind: $kind, fileIds: $fileIds) {
      id files { id kind order url }
    }
  }
`;

/** The three stages the extraction task reports, in the words a teacher uses. */
const STAGES = [
  { at: 85, text: "Checking the marks" },
  { at: 70, text: "Tagging skills" },
  { at: 40, text: "Reading the marking scheme" },
  { at: 5, text: "Reading the question paper" },
  { at: 0, text: "Getting ready" },
];

const JOB_KEY = "exam-extract";
const UPLOAD_KEY = "exam-upload";

export default {
  name: "files-step",
  components: { JobProgress, UploadZone },
  props: {
    exam: { type: Object, required: true },
  },
  emits: ["changed"],
  setup() {
    // Both jobs follow the same rules: poll every 1.5s, stop when finished, and
    // carry on after a reload because the id is stored per exam. Setting the id
    // is what starts the polling.
    const route = useRoute();
    const examId = route.params.id;

    const uploadJobId = ref(jobFor(`${UPLOAD_KEY}:${examId}`));
    const extractJobId = ref(jobFor(`${JOB_KEY}:${examId}`));

    const upload = useJob(uploadJobId);
    const extract = useJob(extractJobId);

    return {
      examId,
      uploadJobId,
      extractJobId,
      uploadJob: upload.job,
      uploadStatus: upload.status,
      extractJob: extract.job,
      extractStatus: extract.status,
      extractError: extract.error,
    };
  },
  data() {
    return {
      PAPER,
      SCHEME,
      pages: [],
      uploadingKind: "",
      uploadingCount: 0,
      uploadFraction: 0,
      uploadError: "",
    };
  },
  computed: {
    paper() {
      return this.pages.filter((page) => page.kind === PAPER);
    },
    scheme() {
      return this.pages.filter((page) => page.kind === SCHEME);
    },
    readyToExtract() {
      return this.paper.length > 0 && this.scheme.length > 0;
    },
    extractSummary() {
      const job = this.extractJob;
      if (!job || job.status !== "done") return "";
      const result = job.result || {};
      return `${result.questions || 0} question(s) and ${result.rubric_items || 0} rubric line(s) read.`;
    },
    /** The task's progress figure, said in a teacher's words. */
    extractStage() {
      const progress = this.extractJob ? this.extractJob.progress : 0;
      const found = STAGES.find((stage) => progress >= stage.at);
      return found ? found.text : STAGES[STAGES.length - 1].text;
    },
  },
  watch: {
    // `useJob` knows nothing about exams or pages, so what to do when a job
    // lands is decided here.
    uploadStatus(status) {
      if (status === "failed") toastError("The pages could not be prepared.");
      if (status !== "done" && status !== "failed") return;
      this.refreshPages();
      // The pages are on the screen now, so the progress card can go.
      this.uploadJobId = "";
      if (status === "done") this.$emit("changed");
    },
    extractStatus(status) {
      if (status === "failed") {
        toastError(this.extractError || "Extraction failed.");
        return;
      }
      if (status !== "done") return;
      toastSuccess("Questions extracted. Check them before marking.");
      this.$emit("changed");
    },
  },
  async mounted() {
    await this.refreshPages();
    // The ids came out of storage in `setup`, so a job started before the
    // teacher left is already being followed.
  },
  methods: {
    async refreshPages() {
      try {
        const data = await gql(EXAM_FILES, { id: this.examId });
        this.pages = data.exam ? data.exam.files : [];
      } catch (error) {
        this.uploadError = error.message;
      }
    },

    async upload(kind, files) {
      this.uploadError = "";
      this.uploadingKind = kind;
      this.uploadingCount = files.length;
      try {
        const data = await uploadManyGql(
          UPLOAD,
          { examId: this.examId, kind },
          files,
          {
            fieldPath: "files",
            // Real upload progress, which matters on a phone on mobile data.
            onProgress: (fraction) => {
              this.uploadFraction = fraction;
            },
          }
        );
        const jobId = data.uploadExamFiles;
        rememberJob(`${UPLOAD_KEY}:${this.examId}`, jobId, {
          examId: this.examId,
          step: "upload",
          label: "Preparing the pages",
        });
        // Setting the id is what starts `useJob` polling.
        this.uploadJobId = jobId;
      } catch (error) {
        this.uploadError = error.message;
        toastError(error.message);
      } finally {
        this.uploadingKind = "";
        this.uploadingCount = 0;
        this.uploadFraction = 0;
      }
    },

    /** The bytes are gone once a failed upload ends, so this asks again. */
    restartUpload() {
      this.uploadJobId = "";
      this.uploadError = "Choose the files again to retry the upload.";
    },

    async removePage(page) {
      try {
        await gql(REMOVE_PAGE, { id: page.id });
        toastSuccess("Page removed.");
        await this.refreshPages();
        this.$emit("changed");
      } catch (error) {
        toastError(error.message);
      }
    },

    /** Writes the new reading order; the badge numbers follow suit. */
    async reorder(kind, pages) {
      // Show it at once -- the round trip is quick and a page that snaps back
      // reads as a failed drag.
      this.pages = [
        ...this.pages.filter((page) => page.kind !== kind),
        ...pages.map((page, index) => ({ ...page, order: index + 1 })),
      ];
      try {
        const data = await gql(REORDER, {
          examId: this.examId,
          kind,
          fileIds: pages.map((page) => page.id),
        });
        this.pages = data.reorderExamFiles.files;
      } catch (error) {
        toastError(error.message);
        await this.refreshPages();
      }
    },

    async extract() {
      try {
        const data = await gql(EXTRACT, { examId: this.examId });
        const jobId = data.extractExam;
        rememberJob(`${JOB_KEY}:${this.examId}`, jobId, {
          examId: this.examId,
          step: "extract",
          label: "Reading the paper and scheme",
        });
        this.extractJobId = jobId;
        toastSuccess("Extraction started.");
      } catch (error) {
        toastError(error.message);
      }
    },
  },
};
</script>
