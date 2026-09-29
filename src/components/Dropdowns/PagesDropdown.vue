<template>
  <div>
    <a
      class="text-blueGray-500 text-white active:text-blueGray-300 text-xs font-bold uppercase px-3 py-1 rounded outline-none focus:outline-none mr-1 mb-1 inline-block ease-linear transition-all duration-150"
      href="#"
      ref="btnDropdownRef"
      @click="toggleDropdown($event)"
    >
      Menu
      <i class="fas fa-caret-down ml-1"></i>
    </a>
    <div
      ref="popoverDropdownRef"
      class="bg-white text-base z-50 float-left py-2 list-none text-left rounded shadow-lg min-w-40"
      :class="{ hidden: !dropdownPopoverShow, block: dropdownPopoverShow }"
    >
      <!-- The only pages reachable while signed out. -->
      <router-link
        to="/login"
        class="text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700"
        @click="closeDropdown"
      >
        Login
      </router-link>
    </div>
  </div>
</template>
<script>
import { createPopper } from "@popperjs/core";

export default {
  name: "pages-dropdown",
  data() {
    return {
      dropdownPopoverShow: false,
    };
  },
  methods: {
    toggleDropdown(event) {
      event.preventDefault();
      if (this.dropdownPopoverShow) {
        this.closeDropdown();
        return;
      }
      this.dropdownPopoverShow = true;
      // popper must run once the node is visible, or it measures a hidden box.
      this.$nextTick(() => {
        createPopper(this.$refs.btnDropdownRef, this.$refs.popoverDropdownRef, {
          placement: "bottom-start",
        });
      });
    },
    closeDropdown() {
      this.dropdownPopoverShow = false;
    },
  },
};
</script>
