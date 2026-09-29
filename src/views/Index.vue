<template>
  <div>
    <index-navbar />
    <section
      class="header relative pt-16 items-center flex h-screen max-h-860-px"
    >
      <div class="container mx-auto items-center flex flex-wrap">
        <div class="w-full md:w-8/12 lg:w-6/12 xl:w-6/12 px-4">
          <div class="pt-32 sm:pt-0">
            <h2 class="font-semibold text-4xl text-blueGray-600">
              Marking Zanzibar's mathematics exams, with the teacher in charge.
            </h2>
            <p class="mt-4 text-lg leading-relaxed text-blueGray-500">
              Photograph the scripts and the rest is automatic. It reads the
              marking scheme, transcribes each student's working, awards method,
              accuracy and units marks, and shows the class what to
              <a href="/admin/dashboard" class="text-blueGray-600">
                reteach next.
              </a>
            </p>
            <div class="mt-12">
              <a
                href="/admin/dashboard"

                class="get-started text-white font-bold px-6 py-4 rounded outline-none focus:outline-none mr-1 mb-1 bg-emerald-500 active:bg-emerald-600 uppercase text-sm shadow hover:shadow-lg ease-linear transition-all duration-150"
              >
                Open the dashboard
              </a>
              <a
                href="/auth/login"
                class="github-star ml-1 text-white font-bold px-6 py-4 rounded outline-none focus:outline-none mr-1 mb-1 bg-blueGray-700 active:bg-blueGray-600 uppercase text-sm shadow hover:shadow-lg ease-linear transition-all duration-150"
              >
                Sign in
              </a>
            </div>
          </div>
        </div>
      </div>

      <img
        class="absolute top-0 b-auto right-0 pt-16 sm:w-6/12 -mt-48 sm:mt-0 w-10/12 max-h-860-px"
        :src="patternVue"
        alt="..."
      />
    </section>

    <section class="mt-48 md:mt-40 pb-40 relative bg-blueGray-100">
      <div
        class="-mt-20 top-0 bottom-auto left-0 right-0 w-full absolute h-20"
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
            class="text-blueGray-100 fill-current"
            points="2560 0 2560 100 0 100"
          ></polygon>
        </svg>
      </div>
      <div class="container mx-auto">
        <div class="flex flex-wrap items-center">
          <div
            class="w-10/12 md:w-6/12 lg:w-4/12 px-12 md:px-4 mr-auto ml-auto -mt-32"
          >
            <div
              class="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded-lg bg-emerald-500"
            >
              <img
                alt="..."
                src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=700&q=80"
                class="w-full align-middle rounded-t-lg"
              />
              <blockquote class="relative p-8 mb-4">
                <svg
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 583 95"
                  class="absolute left-0 w-full block h-95-px -top-94-px"
                >
                  <polygon
                    points="-30,95 583,95 583,65"
                    class="text-emerald-500 fill-current"
                  ></polygon>
                </svg>
                <h4 class="text-xl font-bold text-white">
                  Built around the national syllabus
                </h4>
                <p class="text-md font-light mt-2 text-white">
                  Every question is tagged to the Form 1-4 mathematics skills it
                  tests, so a mark tells you which skill a student has not yet
                  mastered, not only what they scored.
                </p>
              </blockquote>
            </div>
          </div>

          <div class="w-full md:w-6/12 px-4">
            <div class="flex flex-wrap">
              <div class="w-full md:w-6/12 px-4">
                <div class="relative flex flex-col mt-4">
                  <div class="px-4 py-5 flex-auto">
                    <div
                      class="text-blueGray-500 p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-white"
                    >
                      <i class="fas fa-sitemap"></i>
                    </div>
                    <h6 class="text-xl mb-1 font-semibold">
                      Reads the paper
                    </h6>
                    <p class="mb-4 text-blueGray-500">
                      Upload the question paper and its marking scheme. The
                      questions, rubrics and mark allocations are read straight
                      off the page.
                    </p>
                  </div>
                </div>
                <div class="relative flex flex-col min-w-0">
                  <div class="px-4 py-5 flex-auto">
                    <div
                      class="text-blueGray-500 p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-white"
                    >
                      <i class="fas fa-drafting-compass"></i>
                    </div>
                    <h6 class="text-xl mb-1 font-semibold">
                      Reads the handwriting
                    </h6>
                    <p class="mb-4 text-blueGray-500">
                      Each script page is transcribed exactly as the student
                      wrote it, working and all, with anything unreadable marked
                      rather than guessed.
                    </p>
                  </div>
                </div>
              </div>
              <div class="w-full md:w-6/12 px-4">
                <div class="relative flex flex-col min-w-0 mt-4">
                  <div class="px-4 py-5 flex-auto">
                    <div
                      class="text-blueGray-500 p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-white"
                    >
                      <i class="fas fa-newspaper"></i>
                    </div>
                    <h6 class="text-xl mb-1 font-semibold">Marks to the scheme</h6>
                    <p class="mb-4 text-blueGray-500">
                      Method marks for correct working even when the answer is
                      wrong, accuracy only where it is earned, and never more
                      than the paper allows.
                    </p>
                  </div>
                </div>
                <div class="relative flex flex-col min-w-0">
                  <div class="px-4 py-5 flex-auto">
                    <div
                      class="text-blueGray-500 p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-white"
                    >
                      <i class="fas fa-file-alt"></i>
                    </div>
                    <h6 class="text-xl mb-1 font-semibold">
                      Says what to reteach
                    </h6>
                    <p class="mb-4 text-blueGray-500">
                      A short report for every student and one plan for the
                      class, with practice questions written for each group that
                      fell behind.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>

    <section class="pb-16 bg-blueGray-200 relative pt-32">
      <div
        class="-mt-20 top-0 bottom-auto left-0 right-0 w-full absolute h-20"
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

      <div class="container mx-auto">
        <div
          class="flex flex-wrap justify-center bg-white shadow-xl rounded-lg -mt-64 py-16 px-12 relative z-10"
        >
          <div class="w-full text-center lg:w-8/12">
            <p class="text-4xl text-center">
              <span role="img" aria-label="graduation">
                🎓
              </span>
            </p>
            <h3 class="font-semibold text-3xl">
              Ready to mark your first exam?
            </h3>
            <p class="text-blueGray-500 text-lg leading-relaxed mt-4 mb-4">
              Sign in, upload a past paper and its marking scheme, then
              photograph a set of scripts. The first reports are usually ready
              before the lesson ends.
            </p>
            <div class="sm:block flex flex-col mt-10">
              <a
                href="/admin/dashboard"

                class="get-started text-white font-bold px-6 py-4 rounded outline-none focus:outline-none mr-1 mb-2 bg-emerald-500 active:bg-emerald-600 uppercase text-sm shadow hover:shadow-lg ease-linear transition-all duration-150"
              >
                Open the dashboard
              </a>
              <a
                href="/auth/login"
                class="github-star sm:ml-1 text-white font-bold px-6 py-4 rounded outline-none focus:outline-none mr-1 mb-1 bg-blueGray-700 active:bg-blueGray-600 uppercase text-sm shadow hover:shadow-lg ease-linear transition-all duration-150"
              >
                <i class="fas fa-sign-in-alt text-lg mr-1"></i>
                <span>Sign in</span>
              </a>
            </div>
            <div class="text-center mt-16"></div>
          </div>
        </div>
      </div>
    </section>
    <footer-component />
  </div>
</template>
<script>
import IndexNavbar from "@/components/Navbars/IndexNavbar.vue";
import FooterComponent from "@/components/Footers/Footer.vue";

import patternVue from "@/assets/img/pattern_vue.png";

export default {
  data() {
    return {
      patternVue,
    };
  },
  components: {
    IndexNavbar,
    FooterComponent,
  },
};
</script>
