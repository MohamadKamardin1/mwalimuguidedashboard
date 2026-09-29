<template>
  <div id="app">
    <router-view />
    <!-- Mounted once, so any screen (or the API client) can raise a toast. -->
    <app-toast />
  </div>
</template>

<script>
import AppToast from "@/components/ui/Toast.vue";

export default {
  name: "app",
  components: { AppToast },
};
</script>
