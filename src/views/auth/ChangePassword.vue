<template>
  <div class="container mx-auto px-4 h-full">
    <div class="flex content-center items-center justify-center h-full">
      <div class="w-full lg:w-4/12 px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0"
        >
          <div class="rounded-t mb-0 px-6 py-6">
            <div class="text-center">
              <h6 class="text-blueGray-700 text-lg font-bold">
                Choose a new password
              </h6>
              <p class="text-blueGray-500 text-sm mt-1">
                This account was set up for you, so its password has to change
                before you can carry on.
              </p>
            </div>
            <hr class="mt-6 border-b-1 border-blueGray-300" />
          </div>

          <div class="flex-auto px-4 lg:px-10 py-10 pt-0">
            <form @submit.prevent="submit">
              <div class="relative w-full mb-3">
                <label
                  class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                  for="old-password"
                >
                  Current password
                </label>
                <input
                  id="old-password"
                  v-model="oldPassword"
                  type="password"
                  autocomplete="current-password"
                  required
                  class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  placeholder="Current password"
                />
              </div>

              <div class="relative w-full mb-3">
                <label
                  class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                  for="new-password"
                >
                  New password
                </label>
                <input
                  id="new-password"
                  v-model="newPassword"
                  type="password"
                  autocomplete="new-password"
                  required
                  class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  placeholder="At least 8 characters"
                />
              </div>

              <div class="relative w-full mb-3">
                <label
                  class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                  for="confirm-password"
                >
                  Repeat new password
                </label>
                <input
                  id="confirm-password"
                  v-model="confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  required
                  class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  placeholder="Repeat new password"
                />
              </div>

              <div v-if="error" class="mt-4" role="alert">
                <p class="text-red-500 text-sm text-center">{{ error }}</p>
              </div>

              <div class="text-center mt-6">
                <button
                  type="submit"
                  :disabled="loading"
                  class="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full ease-linear transition-all duration-150 disabled:opacity-60"
                >
                  {{ loading ? "Saving..." : "Change Password" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from "@/stores/auth";

const MIN_LENGTH = 8;

export default {
  data() {
    return {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
      loading: false,
      error: "",
    };
  },
  methods: {
    async submit() {
      this.error = "";

      if (this.newPassword.length < MIN_LENGTH) {
        this.error = `A password needs at least ${MIN_LENGTH} characters.`;
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.error = "The two new passwords do not match.";
        return;
      }

      this.loading = true;
      const auth = useAuthStore();
      try {
        await auth.changePassword(this.oldPassword, this.newPassword);
        this.$router.replace(auth.home);
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
