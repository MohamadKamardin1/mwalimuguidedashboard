import { onMounted, ref, watch } from "vue";

/** How long to wait after the last keystroke before searching. */
const SEARCH_DELAY = 300;

/**
 * The state every paged list needs, so no page re-implements it.
 *
 * `fetchFn` is handed `{ page, pageSize, offset, search, filters }` and must
 * resolve to `{ items, total }` -- the shape every paginated backend query
 * already returns.
 *
 * @param {(query: object) => Promise<{items: Array, total: number}>} fetchFn
 * @param {{ pageSize?: number, filters?: object }} [options]
 */
export function usePagedList(fetchFn, options = {}) {
  const rows = ref([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(options.pageSize || 10);
  const search = ref("");
  const filters = ref({ ...(options.filters || {}) });
  const loading = ref(true);
  const error = ref("");

  async function load() {
    loading.value = true;
    error.value = "";
    try {
      const result = await fetchFn({
        page: page.value,
        pageSize: pageSize.value,
        // Backends here page by offset, not by page number.
        offset: (page.value - 1) * pageSize.value,
        search: search.value.trim(),
        filters: filters.value,
      });
      rows.value = result.items;
      total.value = result.total;
    } catch (failure) {
      // Kept as state rather than thrown: a list shows its error inline.
      error.value = failure.message;
      rows.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  function refresh() {
    return load();
  }

  function goToPage(next) {
    page.value = Math.max(1, next);
    return load();
  }

  let searchTimer;
  watch(search, () => {
    // One request after typing stops, not one per keystroke.
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page.value = 1;
      load();
    }, SEARCH_DELAY);
  });

  watch(
    filters,
    () => {
      page.value = 1;
      load();
    },
    { deep: true }
  );

  onMounted(load);

  return {
    rows,
    total,
    page,
    pageSize,
    search,
    filters,
    loading,
    error,
    load,
    refresh,
    goToPage,
  };
}
