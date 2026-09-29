<template>
  <div>
    <a
      class="text-blueGray-500 block"
      href="#"
      ref="btnDropdownRef"
      @click="toggleDropdown($event)"
    >
      <div class="items-center flex">
        <span
          class="w-12 h-12 text-sm text-white bg-blueGray-200 inline-flex items-center justify-center rounded-full"
        >
          <img alt="" class="w-full rounded-full align-middle border-none shadow-lg" :src="image" />
        </span>
      </div>
    </a>
    <div
      ref="popoverDropdownRef"
      class="bg-white text-base z-50 float-left py-2 list-none text-left rounded shadow-lg min-w-56"
      :class="{ hidden: !dropdownPopoverShow, block: dropdownPopoverShow }"
    >
      <!-- Who is signed in, and where. -->
      <div class="px-4 py-3 border-b border-solid border-blueGray-100">
        <p class="text-sm font-bold text-blueGray-700 whitespace-nowrap">
          {{ auth.displayName }}
        </p>
        <p class="text-xs text-blueGray-400 whitespace-nowrap">
          {{ roleLabel }}
        </p>
        <p v-if="auth.schoolName" class="text-xs text-blueGray-400 whitespace-nowrap">
          {{ auth.schoolName }}
        </p>
      </div>

      <router-link
        to="/profile"
        class="text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700"
        @click="closeDropdown"
      >
        <i class="fas fa-user-circle mr-2 text-blueGray-400"></i>
        Profile
      </router-link>
      <router-link
        to="/change-password"
        class="text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700"
        @click="closeDropdown"
      >
        <i class="fas fa-key mr-2 text-blueGray-400"></i>
        Change password
      </router-link>

      <div class="h-0 my-2 border border-solid border-blueGray-100" />

      <button
        type="button"
        class="text-sm py-2 px-4 font-normal block w-full text-left whitespace-nowrap bg-transparent text-blueGray-700 hover:text-blueGray-500"
        @click="logout"
      >
        <i class="fas fa-sign-out-alt mr-2 text-blueGray-400"></i>
        Logout
      </button>
    </div>
  </div>
</template>

<script>
import { createPopper } from "@popperjs/core";

import image from "@/assets/img/team-1-800x800.jpg";
import { SCHOOL_ADMIN, useAuthStore } from "@/stores/auth";

/** The role as a reader would write it, rather than the API's snake_case. */
const ROLE_LABELS = {
  [SCHOOL_ADMIN]: "School admin",
  teacher: "Teacher",
};

export default {
  name: "user-dropdown",
  data() {
    return {
      dropdownPopoverShow: false,
      image,
    };
  },
  computed: {
    auth() {
      return useAuthStore();
    },
    roleLabel() {
      return ROLE_LABELS[this.auth.role] || "";
    },
  },
  methods: {
    toggleDropdown(event) {
      event.preventDefault();
      if (this.dropdownPopoverShow) {
        this.closeDropdown();
        return;
      }
      this.dropdownPopoverShow = true;
      // popper is created after the dropdown is shown, or it measures a hidden node.
      this.$nextTick(() => {
        createPopper(this.$refs.btnDropdownRef, this.$refs.popoverDropdownRef, {
          placement: "bottom-end",
        });
      });
    },
    closeDropdown() {
      this.dropdownPopoverShow = false;
    },
    async logout() {
      this.closeDropdown();
      this.auth.logout();
      this.$router.replace({ name: "login" });
    },
  },
};
</script>
