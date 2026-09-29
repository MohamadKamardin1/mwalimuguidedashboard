<template>
  <img
    :src="logo"
    :alt="alt"
    class="inline-block select-none"
    :style="style"
    draggable="false"
  />
</template>

<script>
import logo from "@/assets/img/logo.png";

/**
 * The school's mark, wherever the product names itself.
 *
 * Registered globally in `main.js`, because it appears on nearly every screen
 * -- sidebar, both navbars, the sign-in card and the landing footer.
 *
 * The asset is a wide wordmark (1800x420, about 4.3:1), so it is sized by
 * **height** and left to find its own width. Pinning both dimensions would
 * squash it, and the `height` attribute cannot be used at all: the base
 * stylesheet carries `img { height: auto }`, which outranks a presentational
 * attribute and collapsed the mark to a text-height sliver. The size is an
 * inline style so nothing in a stylesheet can override it.
 *
 * `alt` defaults to empty on purpose: the mark is the brand, and a screen
 * reader announcing it twice is worse than once.
 */
export default {
  name: "brand-logo",
  props: {
    /** Rendered height in pixels; the width follows the artwork's ratio. */
    height: { type: Number, default: 32 },
    alt: { type: String, default: "" },
  },
  data() {
    return { logo };
  },
  computed: {
    style() {
      return { height: `${this.height}px`, width: "auto" };
    },
  },
};
</script>
