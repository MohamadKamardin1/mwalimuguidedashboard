<template>
  <placeholder-page :title="title" :icon="icon" />
</template>

<script>
import PlaceholderPage from "@/components/ui/PlaceholderPage.vue";

/**
 * One component for every route that has no screen yet. The title and icon
 * come from the route's `meta`, which `main.js` fills from `navigation.js`,
 * so a new placeholder route needs no new file here.
 */
export default {
  name: "placeholder-route",
  components: { PlaceholderPage },
  computed: {
    title() {
      return this.$route.meta.navLabel || "Coming soon";
    },
    icon() {
      return this.$route.meta.navIcon || "fas fa-tools";
    },
  },
};
</script>
