<template>
  <footer class="relative bg-blueGray-200 pt-8 pb-6">
    <div
      class="bottom-auto top-0 left-0 right-0 w-full absolute pointer-events-none overflow-hidden -mt-20 h-20"
      style="transform: translateZ(0);"
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
          class="text-blueGray-200 fill-current"
          points="2560 0 2560 100 0 100"
        ></polygon>
      </svg>
    </div>
    <div class="container mx-auto px-4">
      <div class="flex flex-wrap text-center lg:text-left">
        <div class="w-full lg:w-6/12 px-4">
          <brand-logo :height="38" alt="Mwalimu Guide AI" class="mb-2" />
          <h5 class="text-lg mt-0 mb-2 text-blueGray-600">
            AI-assisted marking for secondary school mathematics, with the
            teacher always in charge.
          </h5>
          <div class="mt-6 lg:mb-0 mb-6">
            <a
              class="bg-white text-lightBlue-400 shadow-lg font-normal h-10 w-10 inline-flex items-center justify-center align-center rounded-full outline-none focus:outline-none mr-2"
              href="/admin/dashboard"
            >
              <i class="fas fa-tachometer-alt"></i>
            </a>
            <a
              class="bg-white text-lightBlue-600 shadow-lg font-normal h-10 w-10 inline-flex items-center justify-center align-center rounded-full outline-none focus:outline-none mr-2"
              href="/admin/tables"
            >
              <i class="fas fa-table"></i>
            </a>
            <a
              class="bg-white text-pink-400 shadow-lg font-normal h-10 w-10 inline-flex items-center justify-center align-center rounded-full outline-none focus:outline-none mr-2"
              href="/profile"
            >
              <i class="fas fa-user"></i>
            </a>
            <a
              class="bg-white text-blueGray-800 shadow-lg font-normal h-10 w-10 inline-flex items-center justify-center align-center rounded-full outline-none focus:outline-none mr-2"
              href="/admin/settings"
            >
              <i class="fas fa-cog"></i>
            </a>
          </div>
        </div>
        <div class="w-full lg:w-6/12 px-4">
          <div class="flex flex-wrap items-top mb-6">
            <div class="w-full lg:w-4/12 px-4 ml-auto">
              <span
                class="block uppercase text-blueGray-500 text-sm font-semibold mb-2"
              >
                The dashboard
              </span>
              <ul class="list-unstyled">
                <li>
                  <a
                    class="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm"
                    href="/admin/dashboard"
                  >
                    Overview
                  </a>
                </li>
                <li>
                  <a
                    class="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm"
                    href="/admin/tables"
                  >
                    Marking tables
                  </a>
                </li>
                <li>
                  <a
                    class="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm"
                    href="/admin/settings"
                  >
                    Settings
                  </a>
                </li>
                <li>
                  <a
                    class="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm"
                    href="/profile"
                  >
                    Your profile
                  </a>
                </li>
              </ul>
            </div>
            <div class="w-full lg:w-4/12 px-4">
              <span
                class="block uppercase text-blueGray-500 text-sm font-semibold mb-2"
              >
                Getting started
              </span>
              <ul class="list-unstyled">
                <li>
                  <a
                    class="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm"
                    href="/auth/login"
                  >
                    Sign in
                  </a>
                </li>
                <li>
                  <a
                    class="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm"
                    href="/change-password"
                  >
                    Change password
                  </a>
                </li>
                <li>
                  <a
                    class="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm"
                    href="/landing"
                  >
                    Landing page
                  </a>
                </li>
                <li>
                  <a
                    class="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm"
                    href="/admin/maps"
                  >
                    Map view
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <hr class="my-6 border-blueGray-300" />
      <div
        class="flex flex-wrap items-center md:justify-between justify-center"
      >
        <div class="w-full md:w-4/12 px-4 mx-auto text-center">
          <div class="text-sm text-blueGray-500 font-semibold py-1">
            Copyright © {{ date }} Zanzibar School AI.
            <br />
            <p>Interface based on <a class="text-blueGray-500 hover:text-blueGray-800" href="https://github.com/themewagon/vue-notus" target="_blank">Vue Notus</a>, MIT licensed.</p>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
<script>
export default {
  data() {
    return {
      date: new Date().getFullYear(),
    };
  },
};
</script>
