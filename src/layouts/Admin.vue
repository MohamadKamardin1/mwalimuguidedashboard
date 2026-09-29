<template>
  <div>
    <offline-banner />
    <sidebar />
    <!--
      A full-height flex column so the footer sits at the bottom of the window
      even when a page's content is short, instead of floating up behind it.
      `flex-1` on the content pushes it down.
    -->
    <div class="relative md:ml-64 bg-blueGray-100 min-h-screen flex flex-col">
      <admin-navbar />
      <div class="px-4 md:px-10 mx-auto w-full pt-28 md:pt-24 pb-4 flex-1">
        <router-view />
      </div>
      <footer-admin />
    </div>
  </div>
</template>
<script>
import OfflineBanner from "@/components/ui/OfflineBanner.vue";
import AdminNavbar from "@/components/Navbars/AdminNavbar.vue";
import Sidebar from "@/components/Sidebar/Sidebar.vue";
import FooterAdmin from "@/components/Footers/FooterAdmin.vue";
export default {
  name: "admin-layout",
  components: {
    AdminNavbar,
    FooterAdmin,
    OfflineBanner,
    Sidebar,
  },
};
</script>
