import { defineStore } from "pinia";

import { gql } from "@/api/client";

/**
 * The two facts other pages need before they can do anything: which term is
 * current, and which subjects are usable. Both are read here once and handed
 * out from the cache, so a page like Exams does not re-ask on every visit.
 *
 * Anything on the Setup page that changes either fact must call `invalidate()`
 * afterwards, or every other page keeps serving a stale answer.
 */

const CURRENT_TERM = `
  query CurrentTerm {
    academicTerms(isCurrent: true, limit: 1) {
      items { id name year startDate endDate isCurrent isActive }
    }
  }
`;

const ACTIVE_SUBJECTS = `
  query ActiveSubjects {
    subjects(isActive: true, limit: 200) {
      total
      items { id name code isActive }
    }
  }
`;

export const useSetupStore = defineStore("setup", {
  state: () => ({
    currentTerm: null,
    activeSubjects: [],
    // True once a successful read has happened, so `ensure()` knows the
    // difference between "not asked yet" and "asked and found nothing".
    loaded: false,
    loading: false,
    error: "",
  }),

  getters: {
    hasCurrentTerm: (state) => Boolean(state.currentTerm),
    currentTermId: (state) => (state.currentTerm ? state.currentTerm.id : null),
  },

  actions: {
    async fetchAll() {
      this.loading = true;
      this.error = "";
      try {
        const [term, subjects] = await Promise.all([
          gql(CURRENT_TERM),
          gql(ACTIVE_SUBJECTS),
        ]);
        // A school may have none; the banner on the page is what tells the
        // admin, so this is data, not an error.
        this.currentTerm = term.academicTerms.items[0] || null;
        this.activeSubjects = subjects.subjects.items;
        this.loaded = true;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    /** Read once per session unless something has invalidated the cache. */
    async ensure() {
      if (this.loaded || this.loading) return;
      await this.fetchAll();
    },

    /** Call after any change on the Setup page. */
    invalidate() {
      this.loaded = false;
    },

    async refresh() {
      this.invalidate();
      await this.fetchAll();
    },
  },
});
