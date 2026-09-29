<template>
  <!--
    Says what the teacher already suspects, and what it means for what they
    were doing. Anything typed into a field is kept, so the truthful message is
    "do not reload", not "your work is lost".
  -->
  <div
    v-if="offline"
    class="fixed top-0 inset-x-0 z-40 bg-amber-500 text-white text-sm font-semibold px-4 py-2 text-center"
    role="alert"
    style="padding-top: calc(0.5rem + env(safe-area-inset-top))"
  >
    <i class="fas fa-wifi mr-2" aria-hidden="true"></i>
    You are offline. Anything you have typed is kept on this device — it saves
    as soon as the connection is back.
  </div>
</template>

<script>
import { isOffline, onConnectionChange } from "@/lib/net";

export default {
  name: "offline-banner",
  data() {
    return { offline: isOffline() };
  },
  mounted() {
    this.detach = onConnectionChange((online) => {
      this.offline = !online;
    });
  },
  beforeUnmount() {
    if (this.detach) this.detach();
  },
};
</script>
