<template>
  <div class="container mx-auto px-4 h-full">
    <div class="flex content-center items-center justify-center h-full">
      <div class="w-full lg:w-6/12 px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0"
        >
          <div class="px-6 py-12 text-center">
            <div
              class="text-blueGray-500 p-3 text-center inline-flex items-center justify-center w-16 h-16 mb-6 shadow-lg rounded-full bg-white"
            >
              <i class="fas fa-compass text-xl"></i>
            </div>
            <h6 class="text-2xl font-bold text-blueGray-700">
              That page does not exist
            </h6>
            <p class="text-blueGray-500 mt-3">
              The link may be out of date, or the page may have been moved.
            </p>
            <div class="mt-8">
              <router-link
                :to="home"
                class="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none ease-linear transition-all duration-150 inline-block"
              >
                Go back
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from "@/stores/auth";

export default {
  computed: {
    home() {
      const auth = useAuthStore();
      return auth.isAuthenticated ? auth.home : "/login";
    },
  },
};
</script>
