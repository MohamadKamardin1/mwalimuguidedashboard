<template>
  <div class="flex flex-wrap">
    <!-- Steps -->
    <div class="w-full px-4">
      <ol class="flex flex-wrap list-none mb-6">
        <li
          v-for="(label, index) in steps"
          :key="label"
          class="flex items-center mr-6 mb-2"
        >
          <span
            class="text-xs font-bold uppercase w-6 h-6 rounded-full inline-flex items-center justify-center mr-2"
            :class="
              step > index + 1
                ? 'bg-emerald-500 text-white'
                : step === index + 1
                ? 'bg-blueGray-800 text-white'
                : 'bg-blueGray-200 text-blueGray-500'
            "
          >
            <i v-if="step > index + 1" class="fas fa-check"></i>
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span
            class="text-xs font-bold uppercase"
            :class="step === index + 1 ? 'text-blueGray-700' : 'text-blueGray-400'"
          >
            {{ label }}
          </span>
        </li>
      </ol>
    </div>

    <!-- Step 1: class and template -->
    <div class="w-full lg:w-6/12 px-4">
      <div
        class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
      >
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <h3 class="font-semibold text-lg text-blueGray-700 px-4">
            1. Choose the class
          </h3>
        </div>
        <div class="px-8 py-6">
          <select-field
            v-model="classId"
            label="Class"
            :options="classOptions"
            placeholder="Choose a class..."
            required
            :disabled="step > 1"
            :hint="
              term
                ? `Students are enrolled into this class for ${term.name}.`
                : 'This school has no current term; importing is not possible.'
            "
          />

          <p v-if="!term && !loadingClasses" class="text-sm text-red-500 mb-3">
            Set a current term before importing students.
          </p>

          <button
            type="button"
            class="text-blueGray-700 hover:text-blueGray-500 text-sm font-bold ease-linear transition-all duration-150"
            @click="downloadTemplate"
          >
            <i class="fas fa-download mr-1"></i>
            Download the CSV template
          </button>
          <p class="text-xs text-blueGray-400 mt-2">
            Three columns: admission_no, full_name, gender.
          </p>

          <div v-if="step === 1" class="mt-6">
            <button
              type="button"
              :disabled="!classId || !term"
              class="bg-emerald-500 text-white active:bg-emerald-600 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none disabled:opacity-60 ease-linear transition-all duration-150"
              @click="step = 2"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 2: the file -->
    <div v-if="step >= 2" class="w-full lg:w-6/12 px-4">
      <div
        class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
      >
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <h3 class="font-semibold text-lg text-blueGray-700 px-4">
            2. Pick the CSV
          </h3>
        </div>
        <div class="px-8 py-6">
          <div
            v-if="step === 2"
            class="border-2 border-dashed border-blueGray-300 rounded-lg px-6 py-10 text-center ease-linear transition-all duration-150"
            :class="dragging ? 'border-emerald-500 bg-emerald-50' : ''"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="onDrop"
          >
            <i class="fas fa-file-csv text-3xl text-blueGray-300 mb-3"></i>
            <p class="text-sm text-blueGray-600 mb-3">
              Drop a CSV here, or choose one.
            </p>
            <label
              class="bg-blueGray-800 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg cursor-pointer inline-block"
            >
              Choose file
              <input type="file" accept=".csv,text/csv" class="hidden" @change="onPick" />
            </label>
          </div>

          <p v-if="fileName" class="text-sm text-blueGray-600 mt-4">
            <i class="fas fa-file-csv mr-1 text-blueGray-400"></i>
            {{ fileName }}
          </p>
          <p v-if="parseError" class="text-sm text-red-500 mt-2">{{ parseError }}</p>
        </div>
      </div>
    </div>

    <!-- Step 2 preview -->
    <div v-if="rows.length" class="w-full px-4">
      <div
        class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
      >
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <div class="flex flex-wrap items-center">
            <div class="relative w-full px-4 max-w-full flex-grow flex-1">
              <h3 class="font-semibold text-lg text-blueGray-700">
                Preview
              </h3>
              <p class="text-sm text-blueGray-500">
                The first {{ Math.min(rows.length, 10) }} of {{ rows.length }} rows.
              </p>
            </div>
            <div class="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
              <status-badge
                :status="validCount ? 'done' : 'failed'"
                :label="`${validCount} ready`"
              />
              <status-badge
                v-if="errorCount"
                class="ml-1"
                status="failed"
                :label="`${errorCount} with errors`"
              />
            </div>
          </div>
        </div>

        <div class="block w-full overflow-x-auto">
          <table class="items-center w-full bg-transparent border-collapse">
            <thead>
              <tr>
                <th :class="headClass">Row</th>
                <th :class="headClass">Admission no.</th>
                <th :class="headClass">Full name</th>
                <th :class="headClass">Gender</th>
                <th :class="headClass">Problems</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in preview" :key="row.line">
                <td :class="cellClass">{{ row.line }}</td>
                <td :class="cellClass">{{ row.admissionNo || "—" }}</td>
                <td :class="cellClass">{{ row.fullName || "—" }}</td>
                <td :class="cellClass">{{ row.gender || "—" }}</td>
                <td :class="cellClass">
                  <span v-if="!row.errors.length" class="text-emerald-600">
                    <i class="fas fa-check"></i> Ready
                  </span>
                  <span v-else class="text-red-500">{{ row.errors.join("; ") }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="step === 2" class="px-8 py-4">
          <p v-if="!validCount" class="text-sm text-red-500 mb-3">
            Every row has a problem, so there is nothing to import. Fix the file
            and choose it again.
          </p>
          <button
            type="button"
            :disabled="!validCount || uploading"
            class="bg-emerald-500 text-white active:bg-emerald-600 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none disabled:opacity-60 ease-linear transition-all duration-150"
            @click="upload"
          >
            <i
              class="fas mr-1"
              :class="uploading ? 'fa-circle-notch fa-spin' : 'fa-file-upload'"
            ></i>
            {{ uploading ? "Uploading..." : `Import ${validCount} student(s)` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Step 3: progress -->
    <div v-if="step === 3" class="w-full px-4">
      <div
        class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
      >
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <h3 class="font-semibold text-lg text-blueGray-700 px-4">
            3. Importing
          </h3>
        </div>
        <div class="px-8 py-8">
          <p class="text-sm text-blueGray-600 mb-4">
            The server is reading the file. You can leave this page; the import
            continues.
          </p>
          <div class="w-full bg-blueGray-200 rounded-full h-2 mb-3">
            <div
              class="bg-emerald-500 h-2 rounded-full ease-linear transition-all duration-300"
              :style="{ width: progress + '%' }"
            ></div>
          </div>
          <p class="text-xs text-blueGray-500">{{ progress }}%</p>

          <p v-if="timedOut" class="text-sm text-amber-600 mt-4">
            This is taking longer than expected, so polling has stopped. The
            import may still finish — check the class in a moment.
          </p>
        </div>
      </div>
    </div>

    <!-- Step 4: result -->
    <div v-if="step === 4 && result" class="w-full px-4">
      <div
        class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
      >
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <h3 class="font-semibold text-lg text-blueGray-700 px-4">
            {{ failed ? "4. The import failed" : "4. Done" }}
          </h3>
        </div>

        <div class="px-8 py-6">
          <p v-if="failed" class="text-sm text-red-500 mb-4">
            {{ jobError || "The server could not read that file." }}
          </p>

          <template v-else>
            <div class="flex flex-wrap mb-6">
              <div class="w-full md:w-4/12 mb-3">
                <stat-card label="Created" :value="result.created || 0" icon="fas fa-user-plus" icon-color="bg-emerald-500" />
              </div>
              <div class="w-full md:w-4/12 mb-3">
                <stat-card label="Updated" :value="result.updated || 0" icon="fas fa-user-edit" icon-color="bg-lightBlue-500" />
              </div>
              <div class="w-full md:w-4/12 mb-3">
                <stat-card label="Skipped" :value="result.skipped || 0" icon="fas fa-user-slash" icon-color="bg-amber-500" />
              </div>
            </div>

            <div v-if="errors.length" class="mb-6">
              <div class="flex flex-wrap items-center mb-3">
                <h6 class="text-blueGray-400 text-sm font-bold uppercase flex-1">
                  Rows the server could not use
                </h6>
                <button
                  type="button"
                  class="text-xs font-bold uppercase text-blueGray-700 hover:text-blueGray-500"
                  @click="downloadErrors"
                >
                  <i class="fas fa-download mr-1"></i> Download errors as CSV
                </button>
              </div>

              <div class="block w-full overflow-x-auto">
                <table class="items-center w-full bg-transparent border-collapse">
                  <thead>
                    <tr>
                      <th :class="headClass">Row</th>
                      <th :class="headClass">Admission no.</th>
                      <th :class="headClass">Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="error in errors" :key="error.row">
                      <td :class="cellClass">{{ error.row }}</td>
                      <td :class="cellClass">{{ error.admission_no || "—" }}</td>
                      <td :class="[cellClass, 'text-red-500']">{{ error.error }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="flex flex-wrap items-center">
              <router-link
                :to="{ name: 'class-detail', params: { id: classId } }"
                class="bg-emerald-500 text-white active:bg-emerald-600 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg mr-2 ease-linear transition-all duration-150"
              >
                Open the class
              </router-link>
              <button
                type="button"
                class="text-blueGray-600 font-bold uppercase text-xs px-4 py-2 rounded"
                @click="reset"
              >
                Import another file
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Papa from "papaparse";
import { useRoute } from "vue-router";

import { gql, uploadGql } from "@/api/client";
import SelectField from "@/components/crud/SelectField.vue";
import StatCard from "@/components/crud/StatCard.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import { toastError } from "@/components/ui/Toast.vue";

const POLL_INTERVAL = 1500;
// Stop chasing the job after this long; the worker may still be going.
const POLL_TIMEOUT = 120000;
const PREVIEW_ROWS = 10;

// The same aliases the server accepts.
const GENDERS = { m: "male", male: "male", f: "female", female: "female" };

const HEAD =
  "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100";
const CELL =
  "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-blueGray-600";

const CLASSES = `
  query { classes(isActive: true, limit: 200) { items { id name year } } }
`;

const CURRENT_TERM = `
  query { academicTerms(isCurrent: true, limit: 1) { items { id name } } }
`;

const IMPORT = `
  mutation ($classId: ID!, $file: Upload!) { importStudentsCsv(classId: $classId, file: $file) }
`;

const JOB = `
  query ($id: ID!) { job(id: $id) { id status progress error result } }
`;

/** Checked in the browser so the preview can show problems before uploading. */
function inspect(rows) {
  const seen = new Map();
  return rows.map((raw, index) => {
    const admissionNo = (raw.admission_no || "").trim();
    const fullName = (raw.full_name || "").trim();
    const gender = (raw.gender || "").trim().toLowerCase();
    const errors = [];

    if (!admissionNo) errors.push("Missing admission_no");
    if (!fullName) errors.push("Missing full_name");
    if (!GENDERS[gender]) errors.push(`Invalid gender "${(raw.gender || "").trim()}"`);

    if (admissionNo) {
      if (seen.has(admissionNo)) {
        errors.push(`Duplicate admission_no, also on row ${seen.get(admissionNo)}`);
      } else {
        seen.set(admissionNo, index + 2); // +2: the header is row 1
      }
    }

    return {
      line: index + 2,
      admissionNo,
      fullName,
      gender: (raw.gender || "").trim(),
      errors,
    };
  });
}

function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default {
  name: "admin-student-import",
  components: { SelectField, StatCard, StatusBadge },
  setup() {
    const route = useRoute();
    return { preselectedClassId: route.query.classId || "" };
  },
  data() {
    return {
      steps: ["Class", "File", "Import", "Result"],
      step: 1,
      headClass: HEAD,
      cellClass: CELL,
      classOptions: [],
      loadingClasses: true,
      term: null,
      classId: "",
      dragging: false,
      fileName: "",
      parseError: "",
      rows: [],
      file: null,
      uploading: false,
      progress: 0,
      jobStatus: "",
      jobError: "",
      result: null,
      timedOut: false,
      pollTimer: null,
      cancelled: false,
      pollStartedAt: 0,
    };
  },
  computed: {
    preview() {
      return this.rows.slice(0, PREVIEW_ROWS);
    },
    validCount() {
      return this.rows.filter((row) => !row.errors.length).length;
    },
    errorCount() {
      return this.rows.length - this.validCount;
    },
    errors() {
      return (this.result && this.result.errors) || [];
    },
    failed() {
      return this.jobStatus === "failed";
    },
  },
  created() {
    this.loadClasses();
  },
  beforeUnmount() {
    // Never leave a timer running against a page that has gone.
    this.cancelled = true;
    clearTimeout(this.pollTimer);
  },
  methods: {
    async loadClasses() {
      try {
        const [classes, terms] = await Promise.all([gql(CLASSES), gql(CURRENT_TERM)]);
        this.classOptions = classes.classes.items.map((c) => ({
          value: c.id,
          label: `${c.name} (${c.year})`,
        }));
        const [current] = terms.academicTerms.items;
        this.term = current || null;

        // Preselect the class when the page is opened from a class.
        if (this.preselectedClassId) {
          this.classId = this.preselectedClassId;
        }
      } catch (error) {
        this.parseError = error.message;
      } finally {
        this.loadingClasses = false;
      }
    },

    downloadTemplate() {
      download("students-template.csv", "admission_no,full_name,gender\nA001,Amina Yusuf,female\n");
    },

    downloadErrors() {
      const lines = ["row,admission_no,error"];
      for (const error of this.errors) {
        const problem = String(error.error || "").replace(/"/g, '""');
        lines.push(`${error.row || ""},"${error.admission_no || ""}","${problem}"`);
      }
      download(`import-errors-${Date.now()}.csv`, lines.join("\n"));
    },

    onDrop(event) {
      const [file] = event.dataTransfer.files;
      this.readFile(file);
    },

    onPick(event) {
      const [file] = event.target.files;
      this.readFile(file);
    },

    readFile(file) {
      if (!file) return;
      this.fileName = file.name;
      this.file = file;
      this.parseError = "";
      this.rows = [];

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const missing = ["admission_no", "full_name", "gender"].filter(
            (column) => !headers.includes(column)
          );
          if (missing.length) {
            this.parseError = `That file has no ${missing.join(", ")} column. Download the template and try again.`;
            return;
          }
          this.rows = inspect(results.data);
        },
        error: (error) => {
          this.parseError = `Could not read that file: ${error.message}`;
        },
      });
    },

    async upload() {
      this.uploading = true;
      try {
        const data = await uploadGql(IMPORT, { classId: this.classId }, this.file, "file");
        this.step = 3;
        this.progress = 0;
        this.poll(data.importStudentsCsv);
      } catch (error) {
        toastError(error.message);
      } finally {
        this.uploading = false;
      }
    },

    /** Poll until the job finishes, the page goes away, or two minutes pass. */
    async poll(jobId) {
      this.pollStartedAt = Date.now();
      const tick = async () => {
        if (this.cancelled) return;

        if (Date.now() - this.pollStartedAt > POLL_TIMEOUT) {
          this.timedOut = true;
          return;
        }

        try {
          const data = await gql(JOB, { id: jobId });
          const job = data.job;
          this.progress = job.progress;
          this.jobStatus = job.status;

          if (job.status === "done" || job.status === "failed") {
            this.result = job.result || {};
            this.jobError = job.error;
            this.step = 4;
            return;
          }
        } catch (error) {
          // A blip should not end the wait; keep trying until the timeout.
        }

        this.pollTimer = setTimeout(tick, POLL_INTERVAL);
      };
      tick();
    },

    reset() {
      this.cancelled = true;
      clearTimeout(this.pollTimer);
      Object.assign(this.$data, this.$options.data.call(this));
      this.loadClasses();
    },
  },
};
</script>
