<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <div class="fixed inset-0 bg-blueGray-800 bg-opacity-60" @click="$emit('close')"></div>

      <div class="relative w-full max-w-3xl bg-white shadow-xl rounded-lg">
        <div class="rounded-t bg-white px-6 py-4 flex items-center justify-between">
          <div>
            <h6 class="text-blueGray-700 text-lg font-bold">{{ row.studentName }}</h6>
            <p class="text-xs text-blueGray-400">
              {{ row.admissionNo }} · {{ row.total }} / {{ row.maxMarks }} ·
              {{ formatPercent(row.percent) }} · Grade {{ row.grade }}
              <span v-if="row.gap"> · Main gap: {{ row.gap }}</span>
            </p>
          </div>
          <button
            type="button"
            class="text-blueGray-400 hover:text-blueGray-600 px-2 py-2"
            aria-label="Close"
            @click="$emit('close')"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="px-6 pb-6">
          <div v-if="loading" class="py-6">
            <spinner inline label="Loading the script..." />
          </div>

          <div v-else-if="error" class="py-4">
            <p class="text-sm text-red-500">{{ error }}</p>
          </div>

          <template v-else-if="result">
            <!-- Per-question marks -->
            <h6 class="text-xs uppercase font-bold text-blueGray-500 mb-2">
              Marks by question
            </h6>
            <div class="overflow-x-auto border border-solid border-blueGray-100 rounded mb-4">
              <table class="items-center w-full bg-transparent border-collapse">
                <thead>
                  <tr>
                    <th
                      v-for="head in ['Q', 'Marks', 'Out of', 'Marked by', 'Read as']"
                      :key="head"
                      class="px-4 align-middle border border-solid py-2 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    >
                      {{ head }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="answer in result.answers" :key="answer.answerId">
                    <td class="border-t-0 px-4 py-2 text-sm font-bold text-blueGray-700">
                      {{ answer.questionNumber }}
                    </td>
                    <td class="border-t-0 px-4 py-2 text-sm text-blueGray-700">
                      {{ formatMark(answer.marks) }}
                    </td>
                    <td class="border-t-0 px-4 py-2 text-sm text-blueGray-400">
                      {{ answer.maxMarks }}
                    </td>
                    <td class="border-t-0 px-4 py-2">
                      <span
                        class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full"
                        :class="
                          answer.source === 'teacher'
                            ? 'text-lightBlue-800 bg-lightBlue-200'
                            : 'text-emerald-800 bg-emerald-200'
                        "
                      >
                        {{ answer.source === "teacher" ? "Teacher" : "AI" }}
                      </span>
                      <span v-if="answer.isBlank" class="text-xs text-blueGray-400 ml-1">blank</span>
                    </td>
                    <td class="border-t-0 px-4 py-2 text-xs text-blueGray-500 max-w-xs">
                      <!-- The model's reading, so a wrong AI mark is visible as one. -->
                      <span v-if="answer.confidence !== null">
                        <confidence-badge :value="answer.confidence" :show-value="false" />
                      </span>
                      <span class="ml-1">{{ short(answer.reasoning) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- The pages themselves -->
            <h6 class="text-xs uppercase font-bold text-blueGray-500 mb-2">
              The script
            </h6>
            <div v-if="pages.length" class="flex flex-wrap">
              <img
                v-for="(page, index) in pages"
                :key="page.id || index"
                :src="page.url"
                alt=""
                class="w-32 h-40 object-cover rounded border border-solid border-blueGray-200 mr-2 mb-2 cursor-pointer"
                @click="$emit('zoom', index)"
              />
            </div>
            <p v-else class="text-sm text-blueGray-400">No pages on this script.</p>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ConfidenceBadge from "@/components/teacher/ConfidenceBadge.vue";
import Spinner from "@/components/ui/Spinner.vue";

export default {
  name: "script-drawer",
  components: { ConfidenceBadge, Spinner },
  props: {
    /** The results-table row this drawer belongs to. */
    row: { type: Object, required: true },
    result: { type: Object, default: null },
    pages: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: String, default: "" },
  },
  emits: ["close", "zoom"],
  methods: {
    formatMark(value) {
      if (value === null || value === undefined) return "—";
      return Number.isInteger(value) ? String(value) : value.toFixed(1);
    },
    formatPercent(value) {
      return value === null || value === undefined ? "—" : `${value}%`;
    },
    short(text) {
      if (!text) return "";
      return text.length > 70 ? `${text.slice(0, 69)}…` : text;
    },
  },
};
</script>
