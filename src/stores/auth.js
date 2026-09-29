import { defineStore } from "pinia";

import { gql } from "@/api/client";

const REFRESH_KEY = "zsa.refreshToken";
export const SCHOOL_ADMIN = "school_admin";
export const TEACHER = "teacher";

/** Where each role lands after signing in. Platform admins use Django admin. */
const HOME_BY_ROLE = {
  [SCHOOL_ADMIN]: "/admin/dashboard",
  [TEACHER]: "/teacher/dashboard",
};

const USER_FIELDS = `
  id
  email
  firstName
  lastName
  role
  mustChangePassword
  school { id name code }
`;

const LOGIN = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      refreshToken
      user { ${USER_FIELDS} }
    }
  }
`;

const REFRESH = `
  mutation Refresh($token: String!) {
    refreshToken(refreshToken: $token) {
      accessToken
      refreshToken
      user { ${USER_FIELDS} }
    }
  }
`;

const ME = `
  query Me {
    me { ${USER_FIELDS} }
  }
`;

const CHANGE_PASSWORD = `
  mutation ChangePassword($oldPassword: String!, $newPassword: String!) {
    changePassword(oldPassword: $oldPassword, newPassword: $newPassword) {
      ${USER_FIELDS}
    }
  }
`;

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    // Deliberately in memory only: an access token in localStorage outlives
    // the tab and is readable by any script that gets injected. The refresh
    // token has to persist so a reload can rebuild the session.
    accessToken: "",
    refreshToken: localStorage.getItem(REFRESH_KEY) || "",
    // Set once the stored session has been checked, so the guard only does it
    // on the first navigation of a page load.
    restored: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    mustChangePassword: (state) =>
      Boolean(state.user && state.user.mustChangePassword),
    role: (state) => (state.user ? state.user.role : null),
    isSchoolAdmin: (state) => Boolean(state.user && state.user.role === SCHOOL_ADMIN),
    isTeacher: (state) => Boolean(state.user && state.user.role === TEACHER),
    // The API carries first and last name separately; the UI wants one string.
    displayName: (state) => {
      if (!state.user) return "";
      const name = [state.user.firstName, state.user.lastName]
        .filter(Boolean)
        .join(" ");
      return name || state.user.email;
    },
    schoolName: (state) =>
      (state.user && state.user.school && state.user.school.name) || "",
    home: (state) => (state.user && HOME_BY_ROLE[state.user.role]) || "/login",
  },

  actions: {
    keepSession({ accessToken, refreshToken, user }) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.user = user;
      localStorage.setItem(REFRESH_KEY, refreshToken);
    },

    async login(email, password) {
      const data = await gql(LOGIN, { email, password });
      this.keepSession(data.login);
      return this.user;
    },

    async loadMe() {
      const data = await gql(ME);
      this.user = data.me;
      return this.user;
    },

    async changePassword(oldPassword, newPassword) {
      const data = await gql(CHANGE_PASSWORD, { oldPassword, newPassword });
      this.user = data.changePassword;
      return this.user;
    },

    /**
     * Swap the stored refresh token for a new pair. Returns false rather than
     * throwing when there is nothing to refresh with, so the API client can
     * treat "cannot refresh" and "refresh failed" the same way.
     *
     * This is the raw call: it must not go through `gql`, or a rejected
     * refresh would recurse into another refresh.
     */
    async refreshAndKeep() {
      if (!this.refreshToken) return false;
      try {
        const data = await gql(REFRESH, { token: this.refreshToken });
        this.keepSession(data.refreshToken);
        return true;
      } catch (error) {
        return false;
      }
    },

    /**
     * The session is gone for good. Clear it and send the user to sign in,
     * remembering where they were so the redirect can be undone.
     */
    async sessionExpired() {
      this.logout();
      const { default: router } = await import("@/router");
      const current = router.currentRoute.value;
      if (current.name !== "login") {
        router.replace({
          name: "login",
          query: current.fullPath === "/" ? {} : { redirect: current.fullPath },
        });
      }
    },

    /**
     * Rebuild a session from the stored refresh token, once per page load.
     * A token the server has forgotten simply means starting over.
     */
    async restore() {
      if (this.restored) return;
      await this.refreshAndKeep();
      if (this.refreshToken) {
        try {
          await this.loadMe();
        } catch (error) {
          this.logout();
        }
      }
      this.restored = true;
    },

    logout() {
      this.user = null;
      this.accessToken = "";
      this.refreshToken = "";
      localStorage.removeItem(REFRESH_KEY);
    },
  },
});
