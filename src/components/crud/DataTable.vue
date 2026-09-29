<template>
  <div
    class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
  >
    <!-- Header -->
    <div v-if="title || $slots.actions" class="rounded-t mb-0 px-4 py-3 border-0">
      <div class="flex flex-wrap items-center">
        <div class="relative w-full px-4 max-w-full flex-grow flex-1">
          <h3 class="font-semibold text-lg text-blueGray-700">{{ title }}</h3>
        </div>
        <div
          class="relative w-full px-4 max-w-full flex-grow flex-1 text-right"
        >
          <slot name="actions" />
        </div>
      </div>
    </div>

    <!--
      Search and filters, in one row.
      The slot renders straight into the flex row, so a page's filters are
      siblings of the search box rather than nested in a wrapper: give each one
      `flex-1 min-w-0` and they all share the width equally. They wrap only when
      the card is too narrow to hold them.
    -->
    <div v-if="searchable || $slots.filters" class="px-8 pb-3">
      <div class="flex flex-wrap items-center gap-2">
        <div v-if="searchable" class="flex-1 min-w-0">
          <!-- h-11 matches SelectField, so everything on the row is one height. -->
          <input
            :value="search"
            type="search"
            :placeholder="searchPlaceholder"
            class="border-0 px-3 h-11 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
            @input="$emit('update:search', $event.target.value)"
          />
        </div>
        <slot name="filters" />
      </div>
    </div>

    <!-- Body -->
    <div v-if="loading" class="px-8 pb-4">
      <skeleton-list :count="columns.length > 4 ? 5 : 3" :label="loadingText" />
    </div>

    <div v-else-if="error" class="px-8 pb-8">
      <empty-state
        title="Could not load this list"
        :description="error"
        icon="fas fa-exclamation-triangle"
      >
        <template #action>
          <button
            type="button"
            class="bg-blueGray-800 text-white active:bg-blueGray-600 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none ease-linear transition-all duration-150"
            @click="$emit('refresh')"
          >
            Try again
          </button>
        </template>
      </empty-state>
    </div>

    <div v-else-if="!rows.length" class="px-8 pb-8">
      <empty-state :title="emptyTitle" :description="emptyText" :icon="emptyIcon">
        <template #action><slot name="empty-action" /></template>
      </empty-state>
    </div>

    <!-- Horizontal scroll on narrow screens rather than a squashed table. -->
    <div v-else class="block w-full overflow-x-auto">
      <table class="items-center w-full bg-transparent border-collapse">
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              :class="[headClass, column.align === 'right' ? 'text-right' : 'text-left']"
            >
              {{ column.label }}
            </th>
            <th
              v-if="$slots['row-actions']"
              :class="[headClass, 'text-right']"
            ></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="row.id || index"
            :class="clickable ? 'cursor-pointer hover:bg-blueGray-50' : ''"
            @click="$emit('row-click', row)"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              :class="[cellClass, column.align === 'right' ? 'text-right' : '']"
            >
              <slot
                v-if="column.slot"
                :name="column.slot"
                :row="row"
                :value="row[column.key]"
              />
              <template v-else>{{ row[column.key] }}</template>
            </td>
            <!-- stop: a row action should not also open the row. -->
            <td
              v-if="$slots['row-actions']"
              :class="[cellClass, 'text-right']"
              @click.stop
            >
              <slot name="row-actions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <pagination
      v-if="pagination && !loading && !error && rows.length"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      @change="$emit('page-change', $event)"
    />
  </div>
</template>

<script>
import EmptyState from "@/components/ui/EmptyState.vue";
import Pagination from "@/components/crud/Pagination.vue";
import SkeletonList from "@/components/ui/SkeletonList.vue";

// The theme's table header and cell styling, in one place.
const HEAD =
  "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold bg-blueGray-50 text-blueGray-500 border-blueGray-100";
const CELL =
  "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-blueGray-600";

export default {
  name: "data-table",
  components: { EmptyState, Pagination, SkeletonList },
  props: {
    title: { type: String, default: "" },
    /** [{ key, label, slot?, align? }] — `slot` names a cell slot. */
    columns: { type: Array, default: () => [] },
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: String, default: "" },
    loadingText: { type: String, default: "Loading..." },
    emptyTitle: { type: String, default: "Nothing here yet" },
    emptyText: { type: String, default: "" },
    emptyIcon: { type: String, default: "fas fa-inbox" },
    searchable: { type: Boolean, default: false },
    search: { type: String, default: "" },
    searchPlaceholder: { type: String, default: "Search" },
    /** { page, pageSize, total } — omit it to hide the pager. */
    pagination: { type: Object, default: null },
    /** Shows a pointer and emits `row-click`. */
    clickable: { type: Boolean, default: false },
  },
  emits: ["update:search", "page-change", "refresh", "row-click"],
  data() {
    return { headClass: HEAD, cellClass: CELL };
  },
};
</script>
