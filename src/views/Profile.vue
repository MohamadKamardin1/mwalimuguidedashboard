<template>
  <div>
    <!--
      The Notus profile page opens with a photo band and a card that overlaps
      it. It is pulled up and out so it sits full-width under the transparent
      admin navbar, the way the template intends.
    -->
    <section class="relative block h-500-px -mt-24 -mx-4 md:-mx-10">
      <div
        class="absolute top-0 w-full h-full bg-center bg-cover"
        :style="`background-image: url('${hero}');`"
      ></div>
      <div
        class="top-auto bottom-0 left-0 right-0 w-full absolute pointer-events-none overflow-hidden h-70-px"
        style="transform: translateZ(0)"
      >
        <svg
          class="absolute bottom-0 overflow-hidden"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          version="1.1"
          viewBox="0 0 2560 100"
          x="0"
          y="0"
        >
          <polygon
            class="text-blueGray-100 fill-current"
            points="2560 0 2560 100 0 100"
          ></polygon>
        </svg>
      </div>
    </section>

    <section class="relative py-16 -mx-4 md:-mx-10">
      <div class="px-4 md:px-10">
        <div
          class="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-xl rounded-lg -mt-64"
        >
          <div class="px-6">
            <div class="flex flex-wrap justify-center">
              <div class="w-full lg:w-3/12 px-4 lg:order-2 flex justify-center">
                <div class="relative">
                  <!--
                    The template puts a photo here. The API has no avatar field,
                    so the account's initials stand in -- same shape and shadow.
                  -->
                  <div
                    class="shadow-xl rounded-full h-32 w-32 absolute -m-16 -ml-20 lg:-ml-16 flex items-center justify-center bg-emerald-500 text-white text-3xl font-bold tracking-wide"
                  >
                    {{ initials }}
                  </div>
                </div>
              </div>
              <div
                class="w-full lg:w-4/12 px-4 lg:order-3 lg:text-right lg:self-center"
              >
                <div class="py-6 px-3 mt-32 sm:mt-0">
                  <span
                    class="bg-emerald-500 uppercase text-white font-bold shadow text-xs px-4 py-2 rounded inline-block"
                  >
                    {{ roleLabel }}
                  </span>
                </div>
              </div>
              <div class="w-full lg:w-4/12 px-4 lg:order-1">
                <div
                  class="flex justify-center py-4 lg:pt-4 pt-8 text-sm text-blueGray-400 font-bold uppercase text-center"
                >
                  <span v-if="school">
                    <i class="fas fa-school mr-2 text-lg text-blueGray-300"></i>
                    {{ school }}
                  </span>
                </div>
              </div>
            </div>

            <div class="text-center mt-12">
              <h3
                class="text-4xl font-semibold leading-normal mb-2 text-blueGray-700"
              >
                {{ auth.displayName }}
              </h3>
              <div
                class="text-sm leading-normal mt-0 mb-2 text-blueGray-400 font-bold uppercase"
              >
                <i class="fas fa-user-tag mr-2 text-lg text-blueGray-400"></i>
                {{ roleLabel }}
              </div>
              <div class="mb-2 text-blueGray-600 mt-10">
                <i class="fas fa-envelope mr-2 text-lg text-blueGray-400"></i>
                {{ user.email || "—" }}
              </div>
              <div v-if="school" class="mb-2 text-blueGray-600">
                <i class="fas fa-school mr-2 text-lg text-blueGray-400"></i>
                {{ school }}
              </div>
              <div v-if="schoolCode" class="mb-2 text-blueGray-600">
                <i class="fas fa-hashtag mr-2 text-lg text-blueGray-400"></i>
                {{ schoolCode }}
              </div>
            </div>

            <div class="mt-10 py-10 border-t border-blueGray-200 text-center">
              <div class="flex flex-wrap justify-center">
                <div class="w-full lg:w-9/12 px-4">
                  <p class="mb-4 text-lg leading-relaxed text-blueGray-700">
                    Your account is managed by your school administrator. Ask
                    them to change your name, email or role.
                  </p>
                  <router-link
                    to="/change-password"
                    class="font-normal text-emerald-500"
                  >
                    Change password
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import hero from "@/assets/img/register_bg_2.png";
import { useAuthStore } from "@/stores/auth";

const ROLE_LABELS = {
  school_admin: "School admin",
  teacher: "Teacher",
  platform_admin: "Platform admin",
};

/** Read-only: the account is administrator-managed, so nothing here edits. */
export default {
  name: "profile-page",
  data() {
    return { hero };
  },
  computed: {
    auth() {
      return useAuthStore();
    },
    user() {
      return this.auth.user || {};
    },
    roleLabel() {
      return ROLE_LABELS[this.user.role] || this.user.role || "";
    },
    school() {
      return (this.user.school && this.user.school.name) || "";
    },
    schoolCode() {
      return (this.user.school && this.user.school.code) || "";
    },
    initials() {
      const first = this.user.firstName || "";
      const last = this.user.lastName || "";
      const letters = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
      return letters || (this.user.email || "?").charAt(0).toUpperCase();
    },
  },
};
</script>
