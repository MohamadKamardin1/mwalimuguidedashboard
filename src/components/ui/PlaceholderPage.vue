<template>
  <div class="flex flex-wrap">
    <div class="w-full px-4">
      <div
        class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white"
      >
        <!-- Card header, matching the Notus table and settings cards. -->
        <div class="rounded-t mb-0 px-4 py-3 border-0">
          <div class="flex flex-wrap items-center">
            <div class="relative w-full px-4 max-w-full flex-grow flex-1">
              <h3 class="font-semibold text-lg text-blueGray-700">
                {{ title }}
              </h3>
            </div>
          </div>
        </div>

        <div class="flex-auto px-4 lg:px-10 py-10 pt-0">
          <div class="text-center py-8">
            <div
              class="text-blueGray-300 text-3xl mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-blueGray-100"
            >
              <i :class="icon"></i>
            </div>
            <h6 class="text-blueGray-600 font-bold mb-2">Coming soon</h6>
            <p class="text-sm text-blueGray-400 max-w-md mx-auto">
              This screen is not built yet. The route, the role check and the
              sidebar link are in place, so the page only has to be filled in.
            </p>
            <p class="mt-4 text-xs text-blueGray-400">
              <code class="bg-blueGray-100 px-2 py-1 rounded">{{ route }}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * Every not-yet-built screen in the sidebar points here, so the navigation is
 * complete and clickable before any of the real pages exist. Delete a route's
 * usage once its real view lands.
 */
export default {
  name: "placeholder-page",
  props: {
    title: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: "fas fa-tools",
    },
  },
  computed: {
    route() {
      return this.$route.path;
    },
  },
};
</script>
