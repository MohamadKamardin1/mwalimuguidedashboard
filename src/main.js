import { createApp } from "vue";
import { createPinia } from "pinia";

// styles

import "@fortawesome/fontawesome-free/css/all.min.css";
import "@/assets/styles/tailwind.css";

import App from "@/App.vue";
import BrandLogo from "@/components/BrandLogo.vue";

import router from "@/router";
import { resolveNavigation } from "@/router/guard";
import { useAuthStore } from "@/stores/auth";

const pinia = createPinia();

/**
 * The session is rebuilt once per page load, before any decision is made: a
 * stored refresh token is worth trying before sending anyone to the sign-in
 * page. The policy itself lives in `@/router/guard`.
 */
router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia);
  await auth.restore();
  return resolveNavigation(to, auth);
});

const app = createApp(App).use(pinia).use(router);
// Used on most screens, so it is registered once here rather than imported
// into each of them.
app.component("brand-logo", BrandLogo);
app.mount("#app");
