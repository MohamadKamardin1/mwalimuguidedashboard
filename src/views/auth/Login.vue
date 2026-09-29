<template>
  <div class="container mx-auto px-4 h-full">
    <div class="flex content-center items-center justify-center h-full">
      <div class="w-full lg:w-4/12 px-4">
        <div
          class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0"
        >
          <div class="rounded-t mb-0 px-6 py-6">
            <div class="text-center">
              <brand-logo :height="46" alt="Mwalimu Guide AI" class="mb-4" />
              <p class="text-blueGray-500 text-sm mt-1">
                Sign in to mark exams and see how your classes are doing.
              </p>
            </div>
            <hr class="mt-6 border-b-1 border-blueGray-300" />
          </div>

          <div class="flex-auto px-4 lg:px-10 py-10 pt-0">
            <div class="text-blueGray-400 text-center mb-3 font-bold">
              <small>Sign in with your school account</small>
            </div>

            <form @submit.prevent="submit">
              <div class="relative w-full mb-3">
                <label
                  class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                  for="email"
                >
                  Email
                </label>
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  autocomplete="username"
                  required
                  class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  placeholder="Email"
                />
              </div>

              <div class="relative w-full mb-3">
                <label
                  class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                  for="password"
                >
                  Password
                </label>
                <input
                  id="password"
                  v-model="password"
                  type="password"
                  autocomplete="current-password"
                  required
                  class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  placeholder="Password"
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
                  {{ loading ? "Signing in..." : "Sign In" }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div class="text-center">
          <p class="text-blueGray-200 text-xs">
            Ask your school administrator if you need an account.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from "@/stores/auth";

export default {
  data() {
    return {
      email: "",
      password: "",
      loading: false,
      error: "",
    };
  },
  methods: {
    async submit() {
      this.error = "";
      this.loading = true;

      const auth = useAuthStore();
      try {
        await auth.login(this.email.trim(), this.password);
        // `redirect` is set by the guard when it turned someone away.
        const wanted = this.$route.query.redirect;
        this.$router.replace(wanted || auth.home);
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
