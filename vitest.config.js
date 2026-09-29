import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

/**
 * Vitest, for the pieces that are worth pinning down: the polling in `useJob`,
 * the thresholds a badge uses, the route guard, the arithmetic behind a mark.
 *
 * The app itself is built by vue-cli and webpack; this is a second, lighter
 * toolchain that only ever reads `src`. It resolves `@` the same way, so the
 * tests import the modules the app does rather than copies of them.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    // Component tests need to reach into the DOM the components render.
    globals: true,
    include: ["tests/**/*.test.js"],
    // The app's own CSS is irrelevant here and importing Tailwind is slow.
    css: false,
  },
});
