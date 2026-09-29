<template>
  <nav
    class="top-0 absolute z-50 w-full flex flex-wrap items-center justify-between px-2 py-3 navbar-expand-lg"
  >
    <div
      class="container px-4 mx-auto flex flex-wrap items-center justify-between"
    >
      <div
        class="w-full relative flex justify-between lg:w-auto lg:static lg:block lg:justify-start"
      >
        <router-link
          class="leading-relaxed inline-flex items-center mr-4 py-2 whitespace-nowrap"
          to="/"
        >
          <brand-logo :height="28" alt="Mwalimu Guide AI" />
        </router-link>
        <button
          class="cursor-pointer text-xl leading-none px-3 py-1 border border-solid border-transparent rounded bg-transparent block lg:hidden outline-none focus:outline-none"
          type="button"
          aria-label="Open the menu"
          v-on:click="setNavbarOpen"
        >
          <i class="text-blueGray-700 fas fa-bars"></i>
        </button>
      </div>
      <div
        class="lg:flex flex-grow items-center bg-white lg:bg-opacity-0 lg:shadow-none"
        :class="[navbarOpen ? 'block rounded shadow-lg' : 'hidden']"
        id="example-navbar-warning"
      >
        <ul class="flex flex-col lg:flex-row list-none mr-auto">
          <li class="flex items-center">
            <a
              class="lg:text-blueGray-700 lg:hover:text-blueGray-500 text-blueGray-700 px-3 py-4 lg:py-2 flex items-center text-xs uppercase font-bold"
              href="#!/learning-lab/tailwind/vue/overview/notus?ref=vn-auth-navbar"
            >
              <i
                class="text-blueGray-400 far fa-file-alt text-lg leading-lg mr-2"
              />
              Docs
            </a>
          </li>
        </ul>
        <ul class="flex flex-col lg:flex-row list-none lg:ml-auto">
          <li class="flex items-center">
            <PagesDropdown />
          </li>
          <li class="flex items-center">
            <a
              class="lg:text-blueGray-700 lg:hover:text-blueGray-500 text-blueGray-700 px-3 py-4 lg:py-2 flex items-center text-xs uppercase font-bold"
              href="#!"
              
            >
              <i
                class="text-blueGray-400 fab fa-facebook text-lg leading-lg"
              />
              <span class="lg:hidden inline-block ml-2">Share</span>
            </a>
          </li>

          <li class="flex items-center">
            <a
              class="lg:text-blueGray-700 lg:hover:text-blueGray-500 text-blueGray-700 px-3 py-4 lg:py-2 flex items-center text-xs uppercase font-bold"
              href="#!"
              
            >
              <i
                class="text-blueGray-400 fab fa-twitter text-lg leading-lg"
              />
              <span class="lg:hidden inline-block ml-2">Tweet</span>
            </a>
          </li>

          <li class="flex items-center">
            <a
              class="lg:text-blueGray-700 lg:hover:text-blueGray-500 text-blueGray-700 px-3 py-4 lg:py-2 flex items-center text-xs uppercase font-bold"
              href="https://github.com/themewagon/vue-notus/"
              target="_blank"
            >
              <i
                class="text-blueGray-400 fab fa-github text-lg leading-lg"
              />
              <span class="lg:hidden inline-block ml-2">Star</span>
            </a>
          </li>

        </ul>
      </div>
    </div>
  </nav>
</template>
<script>
import PagesDropdown from "@/components/Dropdowns/PagesDropdown.vue";
export default {
  data() {
    return {
      navbarOpen: false,
    };
  },
  methods: {
    setNavbarOpen: function () {
      this.navbarOpen = !this.navbarOpen;
    },
  },
  components: {
    PagesDropdown,
  },
};
</script>
