<template>
  <div>
    <navbar />
    <main>
      <section class="relative w-full h-full py-40 min-h-screen bg-white">
        <!-- The pattern is mostly transparent, so the colour behind it is most
             of what you see. Change `bg-white` to recolour the page; the image
             itself is untouched.

             `bg-contain` fits the whole pattern on screen. `bg-full` (100%)
             blew it up to about twice the viewport height, and `bg-cover`
             would fill the screen but crop it. -->
        <div
          class="absolute top-0 w-full h-full bg-white bg-no-repeat bg-contain bg-center"
          :style="`background-image: url('${registerBg2}');`"
        ></div>
        <router-view />
        <footer-small absolute />
      </section>
    </main>
  </div>
</template>
<script>
import Navbar from "@/components/Navbars/AuthNavbar.vue";
import FooterSmall from "@/components/Footers/FooterSmall.vue";

import registerBg2 from "@/assets/img/register_bg_2.png";

export default {
  data() {
    return {
      registerBg2,
    };
  },
  components: {
    Navbar,
    FooterSmall,
  },
};
</script>
