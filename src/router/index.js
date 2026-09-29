/**
 * The route table, kept out of `main.js` so the auth store can reach the same
 * router instance it navigates with. `main.js` only wires things together.
 */

import { createRouter, createWebHistory } from "vue-router";

import Admin from "@/layouts/Admin.vue";
import Auth from "@/layouts/Auth.vue";

import Login from "@/views/auth/Login.vue";
import ChangePassword from "@/views/auth/ChangePassword.vue";

import Landing from "@/views/Landing.vue";
import Profile from "@/views/Profile.vue";
import Index from "@/views/Index.vue";

import Forbidden from "@/views/Forbidden.vue";
import NotFound from "@/views/NotFound.vue";

import { SCHOOL_ADMIN, TEACHER } from "@/stores/auth";
import { routesForRole } from "@/navigation";

export const TEACHING = [SCHOOL_ADMIN, TEACHER];

const routes = [
  {
    path: "/",
    component: Index,
    meta: { public: true },
  },
  {
    path: "/landing",
    component: Landing,
    meta: { public: true },
  },
  {
    // The signed-out screens share the dark Auth layout. The children carry
    // absolute paths, so the URLs stay /login and so on.
    path: "/auth",
    component: Auth,
    children: [
      {
        // `/auth/login` is kept as an alias because the theme's navbars and
        // footers still link to it.
        path: "/login",
        alias: "/auth/login",
        name: "login",
        component: Login,
        meta: { public: true },
      },
      {
        path: "/change-password",
        name: "change-password",
        component: ChangePassword,
        meta: { roles: TEACHING },
      },
      {
        path: "/forbidden",
        name: "forbidden",
        component: Forbidden,
        meta: { roles: TEACHING },
      },
      {
        path: "/not-found",
        name: "not-found",
        component: NotFound,
        meta: { public: true },
      },
    ],
  },
  {
    path: "/admin",
    component: Admin,
    meta: { roles: [SCHOOL_ADMIN] },
    // Every admin page comes from `navigation.js`, so a new link there is
    // automatically a real, guarded, lazy route.
    children: routesForRole(SCHOOL_ADMIN, "admin"),
  },
  {
    path: "/teacher",
    component: Admin,
    meta: { roles: [TEACHER] },
    children: routesForRole(TEACHER, "teacher"),
  },
  {
    path: "/profile",
    name: "profile",
    // Profile sits inside the shell so both roles keep their sidebar. The two
    // records render the same view; only the surrounding menu differs.
    component: Admin,
    meta: { roles: TEACHING },
    children: [
      {
        path: "",
        name: "profile-view",
        component: Profile,
        meta: { title: "Profile", roles: TEACHING },
      },
    ],
  },
  { path: "/:pathMatch(.*)*", redirect: "/not-found" },
];

export default createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});
