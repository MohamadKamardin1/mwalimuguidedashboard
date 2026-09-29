<template>
  <!--
    One place to put pages: a paper or a scheme. Drop, pick, or take a photo.
    The pages already stored are shown underneath, in the order they will be
    read.
  -->
  <div
    class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
  >
    <div class="rounded-t mb-0 px-4 py-3 border-0">
      <div class="flex flex-wrap items-center">
        <div class="relative w-full px-4 max-w-full flex-grow flex-1">
          <h3 class="font-semibold text-lg text-blueGray-700">{{ title }}</h3>
          <p class="text-sm text-blueGray-500 mt-1">{{ description }}</p>
        </div>
        <div class="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
          <span class="text-xs font-bold uppercase text-blueGray-400">
            {{ pages.length }} page{{ pages.length === 1 ? "" : "s" }}
          </span>
        </div>
      </div>
    </div>

    <div class="px-4 pb-4">
      <div
        class="border-2 border-dashed rounded-lg px-4 py-6 text-center ease-linear transition-all duration-150"
        :class="dragging ? 'border-emerald-500 bg-emerald-50' : 'border-blueGray-300'"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <i class="fas fa-file-upload text-2xl text-blueGray-300 mb-2"></i>
        <p class="text-sm text-blueGray-600 mb-3">
          Drop {{ acceptLabel }} here, or
        </p>

        <div class="flex flex-wrap justify-center">
          <label
            class="h-11 inline-flex items-center bg-blueGray-800 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg cursor-pointer mb-2 sm:mb-0 sm:mr-2"
          >
            <i class="fas fa-folder-open mr-1"></i> Choose files
            <input
              ref="picker"
              type="file"
              multiple
              :accept="ACCEPT"
              class="hidden"
              @change="onPick"
            />
          </label>

          <!-- Opens the camera straight away on a phone. -->
          <label
            class="h-11 inline-flex items-center bg-blueGray-100 text-blueGray-700 text-xs font-bold uppercase px-4 rounded shadow hover:bg-blueGray-200 cursor-pointer"
          >
            <i class="fas fa-camera mr-1"></i> Take a photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              class="hidden"
              @change="onPick"
            />
          </label>
        </div>

        <p class="text-xs text-blueGray-400 mt-3">
          PDF or photos. Up to {{ maxFiles }} files at a time.
        </p>
      </div>

      <p v-if="error" class="text-sm text-red-500 mt-3">{{ error }}</p>

      <div v-if="busy" class="mt-3">
        <p class="text-sm text-lightBlue-500 mb-1">
          <i class="fas fa-circle-notch fa-spin mr-1"></i>
          Sending {{ busyCount }} file(s) — {{ Math.round(fraction * 100) }}%
        </p>
        <div class="w-full bg-blueGray-200 rounded-full h-1">
          <div
            class="bg-lightBlue-500 h-1 rounded-full ease-linear transition-all duration-150"
            :style="{ width: Math.round(fraction * 100) + '%' }"
          ></div>
        </div>
      </div>

      <div v-if="pages.length" class="flex flex-wrap mt-4">
        <div v-for="(page, index) in pages" :key="page.id" class="w-1/3 sm:w-1/4 lg:w-1/5 p-1">
          <div
            class="relative border border-blueGray-200 rounded overflow-hidden cursor-grab"
            :class="dragId === page.id ? 'ring-2 ring-emerald-500' : ''"
            draggable="true"
            @dragstart="dragId = page.id"
            @dragover.prevent
            @drop.prevent="dropOn(page)"
            @dragend="dragId = ''"
          >
            <img
              v-if="isImage(page)"
              :src="page.url"
              :alt="`Page ${page.pageNumber}`"
              class="w-full h-24 object-cover bg-blueGray-100"
              loading="lazy"
            />
            <div
              v-else
              class="w-full h-24 bg-blueGray-100 flex items-center justify-center text-blueGray-400"
            >
              <i class="fas fa-file-pdf text-2xl"></i>
            </div>

            <!-- The badge is the reading order, which is what a drag
                 changes. The printed page number is in the tooltip. -->
            <span
              class="absolute top-1 left-1 bg-blueGray-800 bg-opacity-80 text-white text-xs font-bold rounded px-2 py-1"
              :title="`Printed page ${page.pageNumber}`"
            >
              {{ index + 1 }}
            </span>

            <button
              type="button"
              class="absolute top-1 right-1 bg-white bg-opacity-90 text-blueGray-400 hover:text-red-500 rounded w-8 h-8"
              :aria-label="`Remove page ${page.pageNumber}`"
              @click="$emit('remove', page)"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>

      <p v-else class="text-sm text-blueGray-400 mt-4">
        No pages yet.
      </p>

      <p v-if="pages.length > 1" class="text-xs text-blueGray-400 mt-3">
        Drag a page onto another to swap their order. The numbers show where
        each page sits now.
      </p>
    </div>
  </div>
</template>

<script>
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";
const MAX_FILES = 20;

export default {
  name: "upload-zone",
  props: {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    /** The pages already stored for this exam and kind. */
    pages: { type: Array, default: () => [] },
    busy: { type: Boolean, default: false },
    busyCount: { type: Number, default: 0 },
    /** How much of the upload has been sent, 0 to 1. */
    fraction: { type: Number, default: 0 },
    error: { type: String, default: "" },
  },
  emits: ["upload", "remove", "reorder"],
  data() {
    return { ACCEPT, MAX_FILES, dragging: false, dragId: "" };
  },
  computed: {
    acceptLabel() {
      return this.title.toLowerCase();
    },
  },
  methods: {
    isImage(page) {
      return /\.(png|jpe?g|webp)$/i.test(page.url || "");
    },

    onDrop(event) {
      this.dragging = false;
      this.send([...event.dataTransfer.files]);
    },

    onPick(event) {
      this.send([...event.target.files]);
      // Let the same file be chosen twice in a row.
      event.target.value = "";
    },

    send(files) {
      if (!files.length) return;
      this.$emit("upload", files.slice(0, MAX_FILES));
    },

    /** Move the dragged page to where it was dropped, keeping the rest in order. */
    dropOn(target) {
      const from = this.pages.findIndex((page) => page.id === this.dragId);
      const to = this.pages.findIndex((page) => page.id === target.id);
      this.dragId = "";
      if (from === -1 || to === -1 || from === to) return;

      const next = [...this.pages];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      this.$emit("reorder", next);
    },
  },
};
</script>
