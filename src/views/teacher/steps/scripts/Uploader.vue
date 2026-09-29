<template>
  <div
    class="relative flex flex-col min-w-0 break-words w-full mb-4 shadow-lg rounded bg-white"
  >
    <div class="rounded-t mb-0 px-4 py-3 border-0">
      <h3 class="font-semibold text-lg text-blueGray-700">Collect scripts</h3>
      <p class="text-sm text-blueGray-500">
        Photograph each student's pages and add them together. Up to
        {{ maxFiles }} photos at a time; each is shrunk before it is sent.
      </p>
    </div>

    <div class="px-4 pb-4">
      <!-- Drop zone -->
      <div
        class="border-2 border-dashed rounded-lg px-6 py-10 text-center transition-colors"
        :class="dragOver ? 'border-emerald-500 bg-emerald-50' : 'border-blueGray-300 bg-blueGray-50'"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <i class="fas fa-cloud-upload-alt text-4xl text-blueGray-300"></i>
        <p class="text-blueGray-600 font-semibold mt-3">
          Drop the photos here
        </p>
        <p class="text-xs text-blueGray-400 mb-4">
          or choose them from this device
        </p>

        <div class="flex flex-wrap justify-center">
          <button
            type="button"
            class="bg-emerald-500 text-white text-sm font-bold uppercase px-5 py-3 rounded shadow hover:shadow-lg mb-2 mr-2"
            @click="pickCamera"
          >
            <i class="fas fa-camera mr-2"></i>Take photo
          </button>
          <button
            type="button"
            class="bg-blueGray-800 text-white text-sm font-bold uppercase px-5 py-3 rounded shadow hover:shadow-lg mb-2"
            @click="pickFiles"
          >
            <i class="fas fa-images mr-2"></i>Choose photos
          </button>
        </div>

        <!-- capture=environment opens the rear camera straight away -->
        <input
          ref="camera"
          class="hidden"
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          @change="onPicked"
        />
        <input
          ref="picker"
          class="hidden"
          type="file"
          accept="image/*"
          multiple
          @change="onPicked"
        />
      </div>

      <!-- Queue -->
      <div v-if="queue.length" class="mt-4">
        <div class="flex flex-wrap items-center justify-between mb-2">
          <h6 class="text-xs uppercase font-bold text-blueGray-500">
            {{ doneCount }} of {{ queue.length }} uploaded
          </h6>
          <span class="text-xs text-blueGray-400">
            {{ formatBytes(totalBytes) }} to send
            <template v-if="savedBytes > 0">
              · {{ formatBytes(savedBytes) }} saved by shrinking
            </template>
          </span>
        </div>

        <ul class="list-none mb-3">
          <li
            v-for="item in queue"
            :key="item.id"
            class="flex items-center py-2 border-b border-solid border-blueGray-100"
          >
            <span class="mr-3 w-5 text-center">
              <i v-if="item.status === 'done'" class="fas fa-check-circle text-emerald-500"></i>
              <i v-else-if="item.status === 'failed'" class="fas fa-exclamation-circle text-red-500"></i>
              <i v-else-if="item.status === 'uploading'" class="fas fa-circle-notch fa-spin text-lightBlue-500"></i>
              <i v-else class="far fa-image text-blueGray-300"></i>
            </span>

            <span class="flex-1 min-w-0">
              <span class="block text-sm text-blueGray-700 truncate">{{ item.name }}</span>
              <span class="block text-xs text-blueGray-400">
                {{ formatBytes(item.bytes) }}
                <template v-if="item.originalBytes > item.bytes">
                  (was {{ formatBytes(item.originalBytes) }})
                </template>
                <template v-if="item.error"> · {{ item.error }}</template>
              </span>
              <span
                v-if="item.status === 'uploading'"
                class="block mt-1 h-1 bg-blueGray-200 rounded overflow-hidden"
              >
                <span
                  class="block h-1 bg-lightBlue-500"
                  :style="{ width: `${Math.round(item.progress * 100)}%` }"
                ></span>
              </span>
            </span>

            <button
              v-if="item.status === 'failed'"
              type="button"
              class="text-xs font-bold uppercase text-emerald-500 ml-3 px-2 py-2"
              @click="retry(item)"
            >
              Retry
            </button>
            <button
              v-if="item.status !== 'uploading'"
              type="button"
              class="text-blueGray-400 hover:text-red-500 ml-2 px-2 py-2"
              aria-label="Remove"
              @click="remove(item)"
            >
              <i class="fas fa-times"></i>
            </button>
          </li>
        </ul>

        <div class="flex flex-wrap items-center">
          <button
            type="button"
            class="bg-emerald-500 text-white text-sm font-bold uppercase px-5 py-3 rounded shadow hover:shadow-lg mr-2 mb-2 disabled:opacity-50"
            :disabled="uploading || !pending.length"
            @click="uploadAll"
          >
            <i class="fas fa-upload mr-2"></i>
            {{ uploading ? "Uploading..." : `Upload ${pending.length} photo${pending.length === 1 ? "" : "s"}` }}
          </button>
          <button
            v-if="failed.length"
            type="button"
            class="bg-blueGray-800 text-white text-sm font-bold uppercase px-5 py-3 rounded shadow hover:shadow-lg mr-2 mb-2"
            @click="retryAll"
          >
            Retry {{ failed.length }} failed
          </button>
          <button
            type="button"
            class="text-blueGray-500 hover:text-blueGray-700 text-xs font-bold uppercase px-3 py-3 mb-2"
            @click="clearFinished"
          >
            Clear finished
          </button>
        </div>

        <p v-if="error" class="text-sm text-red-500 mt-1">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { uploadManyGql } from "@/api/client";
import { downscale, formatBytes } from "@/lib/downscale";

/** Mirrors EXAM_MAX_FILES_PER_UPLOAD on the server. */
const MAX_FILES = 20;

const UPLOAD_PAGES = `
  mutation ($examId: ID!, $files: [Upload!]!) {
    uploadScriptPages(examId: $examId, files: $files)
  }
`;

export default {
  name: "script-uploader",
  props: {
    examId: { type: String, required: true },
  },
  emits: ["uploaded"],
  data() {
    return {
      queue: [],
      dragOver: false,
      uploading: false,
      error: "",
      maxFiles: MAX_FILES,
      nextId: 1,
    };
  },
  computed: {
    pending() {
      return this.queue.filter((item) => item.status === "queued" || item.status === "failed");
    },
    failed() {
      return this.queue.filter((item) => item.status === "failed");
    },
    doneCount() {
      return this.queue.filter((item) => item.status === "done").length;
    },
    totalBytes() {
      return this.queue.reduce((sum, item) => sum + (item.bytes || 0), 0);
    },
    savedBytes() {
      return this.queue.reduce(
        (sum, item) => sum + Math.max((item.originalBytes || 0) - (item.bytes || 0), 0),
        0
      );
    },
  },
  methods: {
    formatBytes,
    pickCamera() {
      this.$refs.camera.click();
    },
    pickFiles() {
      this.$refs.picker.click();
    },
    onPicked(event) {
      this.addFiles(Array.from(event.target.files || []));
      event.target.value = "";
    },
    onDrop(event) {
      this.dragOver = false;
      this.addFiles(Array.from(event.dataTransfer.files || []));
    },

    /** Shrink each photo as it joins the queue, so the size shown is the size sent. */
    async addFiles(files) {
      this.error = "";
      const images = files.filter((file) => file.type.startsWith("image/"));
      if (!images.length) {
        this.error = "Only photographs can be added here.";
        return;
      }
      const room = MAX_FILES - this.queue.length;
      if (images.length > room) {
        this.error = `Only ${MAX_FILES} photos fit in one upload; the first ${room} were added.`;
      }

      for (const file of images.slice(0, Math.max(room, 0))) {
        const item = {
          id: this.nextId++,
          name: file.name,
          status: "queued",
          progress: 0,
          error: "",
          file,
          blob: file,
          bytes: file.size,
          originalBytes: file.size,
        };
        this.queue.push(item);
        // Shrinking is async; the row is already visible while it happens.
        const shrunk = await downscale(file);
        item.name = shrunk.name;
        item.blob = shrunk.blob;
        item.bytes = shrunk.bytes;
        item.originalBytes = shrunk.originalBytes;
      }
    },

    remove(item) {
      const index = this.queue.indexOf(item);
      if (index !== -1) this.queue.splice(index, 1);
    },

    clearFinished() {
      this.queue = this.queue.filter((item) => item.status !== "done");
    },

    uploadAll() {
      return this.send(this.pending);
    },

    retry(item) {
      return this.send([item]);
    },

    retryAll() {
      return this.send(this.failed);
    },

    /**
     * Send the given rows in one request.
     *
     * One request rather than one per file: the server cuts scripts by reading
     * the pages together, so pages that belong to one student only group
     * correctly when they arrive as a batch. A row that fails can still be
     * retried on its own, and one failure never stops the others being sent.
     */
    async send(items) {
      const sending = items.filter((item) => item.blob);
      if (!sending.length || this.uploading) return;

      this.uploading = true;
      this.error = "";
      sending.forEach((item) => {
        item.status = "uploading";
        item.error = "";
        item.progress = 0;
      });

      try {
        const data = await uploadManyGql(
          UPLOAD_PAGES,
          { examId: this.examId },
          sending.map((item) => item.blob),
          {
            fieldPath: "files",
            onProgress: (fraction) => {
              sending.forEach((item) => {
                item.progress = fraction;
              });
            },
          }
        );
        sending.forEach((item) => {
          item.status = "done";
          item.progress = 1;
        });
        this.$emit("uploaded", data.uploadScriptPages);
      } catch (failure) {
        sending.forEach((item) => {
          item.status = "failed";
          item.progress = 0;
          item.error = failure.message;
        });
        this.error = failure.message;
      } finally {
        this.uploading = false;
      }
    },
  },
};
</script>
