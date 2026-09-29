<template>
  <!-- Navbar -->
  <nav
    class="absolute top-0 left-0 w-full z-10 bg-transparent md:flex-row md:flex-nowrap md:justify-start flex items-center p-4"
  >
    <div
      class="w-full mx-autp items-center flex justify-between md:flex-nowrap flex-wrap md:px-10 px-4"
    >
      <!--
        The page's own name, from the route's `meta.title`/`meta.navLabel`.
        Dark, not the template's white: Notus set the title in white because it
        sat on the dark HeaderStats band, which this shell no longer has -- the
        navbar now sits on the light page background.
      -->
      <span class="text-blueGray-700 text-sm uppercase hidden lg:inline-block font-semibold">
        {{ title }}
      </span>
      <!--
        The tray is outside the `hidden md:flex` group on purpose: background
        work is exactly the thing a teacher on a phone must not miss.
      -->
      <ul class="flex-row list-none items-center flex ml-auto">
        <job-tray />
        <li class="hidden md:block">
          <user-dropdown />
        </li>
      </ul>
    </div>
  </nav>
  <!-- End Navbar -->
</template>

<script>
import UserDropdown from "@/components/Dropdowns/UserDropdown.vue";
import JobTray from "@/components/teacher/JobTray.vue";

export default {
  name: "admin-navbar",
  components: {
    JobTray,
    UserDropdown,
  },
  computed: {
    /**
     * Placeholder routes carry `navLabel`; the built pages set `title` in
     * their own route meta. Either way the navbar never hardcodes a name.
     */
    title() {
      const meta = this.$route.meta || {};
      return meta.title || meta.navLabel || "";
    },
  },
};
</script>
