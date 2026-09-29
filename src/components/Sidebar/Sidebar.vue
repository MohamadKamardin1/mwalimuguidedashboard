<template>
  <nav
    class="md:left-0 md:block md:fixed md:top-0 md:bottom-0 md:overflow-y-auto md:flex-row md:flex-nowrap md:overflow-hidden shadow-xl bg-white flex flex-wrap items-center justify-between relative md:w-64 z-10 py-4 px-6"
  >
    <div
      class="md:flex-col md:items-stretch md:min-h-full md:flex-nowrap px-0 flex flex-wrap items-center justify-between w-full mx-auto"
    >
      <!-- Toggler -->
      <button
        class="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
        type="button"
        aria-label="Open the menu"
        :aria-expanded="menuOpen ? 'true' : 'false'"
        @click="openMenu"
      >
        <i class="fas fa-bars"></i>
      </button>
      <!-- Brand -->
      <router-link
        class="md:block text-left md:pb-2 mr-0 inline-block whitespace-nowrap p-4 px-0"
        to="/"
      >
        <brand-logo :height="36" alt="Mwalimu Guide AI" />
      </router-link>
      <!-- User -->
      <ul class="md:hidden items-center flex flex-wrap list-none">
        <li class="inline-block relative">
          <user-dropdown />
        </li>
      </ul>
      <!-- Collapse -->
      <div
        class="md:flex md:flex-col md:items-stretch md:opacity-100 md:relative md:mt-4 md:shadow-none shadow absolute top-0 left-0 right-0 z-40 overflow-y-auto overflow-x-hidden h-auto items-center flex-1 rounded"
        :class="collapseShow"
      >
        <!-- Collapse header -->
        <div
          class="md:min-w-full md:hidden block pb-4 mb-4 border-b border-solid border-blueGray-200"
        >
          <div class="flex flex-wrap">
            <div class="w-6/12">
              <router-link
                class="md:block text-left md:pb-2 mr-0 inline-block whitespace-nowrap p-4 px-0"
                to="/"
              >
                <brand-logo :height="26" alt="Mwalimu Guide AI" />
              </router-link>
            </div>
            <div class="w-6/12 flex justify-end">
              <button
                type="button"
                class="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
                aria-label="Close the menu"
                @click="closeMenu"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <hr class="my-4 md:min-w-full" />
        <!-- Heading -->
        <h6
          class="md:min-w-full text-blueGray-500 text-xs uppercase font-bold block pt-1 pb-4 no-underline"
        >
          {{ heading }}
        </h6>
        <!-- Navigation -->

        <ul class="md:flex-col md:min-w-full flex flex-col list-none">
          <li v-for="link in links" :key="link.route" class="items-center">
            <router-link
              :to="link.route"
              custom
              v-slot="{ href, navigate, isActive }"
            >
              <a
                :href="href"
                class="text-xs uppercase py-3 font-bold block"
                :class="[
                  isActive
                    ? 'text-emerald-500 hover:text-emerald-600'
                    : 'text-blueGray-700 hover:text-blueGray-500',
                ]"
                @click="navigateAndClose(navigate)"
              >
                <i
                  class="mr-2 text-sm"
                  :class="[
                    link.icon,
                    isActive ? 'opacity-75' : 'text-blueGray-300',
                  ]"
                ></i>
                {{ link.label }}
              </a>
            </router-link>
          </li>
        </ul>

        <!-- Divider -->
        <hr class="my-4 md:min-w-full" />
        <!-- Heading -->
        <h6
          class="md:min-w-full text-blueGray-500 text-xs uppercase font-bold block pt-1 pb-4 no-underline"
        >
          Account
        </h6>
        <!-- Navigation -->

        <ul class="md:flex-col md:min-w-full flex flex-col list-none md:mb-4">
          <li class="items-center">
            <router-link
              class="text-blueGray-700 hover:text-blueGray-500 text-xs uppercase py-3 font-bold block"
              to="/profile"
              @click="closeMenu"
            >
              <i class="fas fa-user-circle text-blueGray-300 mr-2 text-sm"></i>
              Profile
            </router-link>
          </li>
          <li class="items-center">
            <router-link
              class="text-blueGray-700 hover:text-blueGray-500 text-xs uppercase py-3 font-bold block"
              to="/change-password"
              @click="closeMenu"
            >
              <i class="fas fa-key text-blueGray-300 mr-2 text-sm"></i>
              Change password
            </router-link>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script>
import UserDropdown from "@/components/Dropdowns/UserDropdown.vue";
import { linksForRole } from "@/navigation";
import { SCHOOL_ADMIN, useAuthStore } from "@/stores/auth";

export default {
  data() {
    return {
      collapseShow: "hidden",
    };
  },
  computed: {
    links() {
      // The role decides the whole list; there is no per-link filtering here.
      return linksForRole(useAuthStore().role);
    },
    heading() {
      return useAuthStore().role === SCHOOL_ADMIN ? "School admin" : "Teacher";
    },
    /**
     * Whether the mobile menu is showing.
     *
     * `collapseShow` is a class string, not a flag, so the toggler's
     * `aria-expanded` reads it here. It used to read a property called `open`
     * that this component never declared: Vue warned on every render and the
     * button announced itself as collapsed even when the menu was open.
     */
    menuOpen() {
      return this.collapseShow !== "hidden";
    },
  },
  methods: {
    openMenu() {
      this.collapseShow = "bg-white m-2 py-3 px-6";
    },
    closeMenu() {
      this.collapseShow = "hidden";
    },
    /**
     * On a phone the sidebar covers the page, so following a link has to put
     * it away again -- otherwise the new screen opens behind the menu. On
     * desktop the menu is never collapsed, so this is harmless.
     */
    navigateAndClose(navigate) {
      navigate();
      this.closeMenu();
    },
  },
  components: {
    UserDropdown,
  },
};
</script>
