import { defineStore } from "pinia";

import { gql } from "@/api/client";
import {
  activeJobEntries,
  forgetJob,
  onJobsChanged,
} from "@/components/teacher/useJob";
import { toastError, toastSuccess } from "@/components/ui/Toast.vue";

/**
 * Every background job this browser has running, wherever it was started.
 *
 * A teacher uploads a paper, walks to another class, and the extraction
 * finishes while they are looking at something else. This is what tells them:
 * one poll for all of them, a tray in the navbar, and a toast with a link to
 * the screen that now has something to show.
 *
 * The registry itself lives in `useJob`, because a page has to find its own job
 * again after a reload. This store only reads it.
 */

/** How often the tray looks. Slower than a page's own poll: it is a summary. */
const POLL_INTERVAL = 2500;

/** Long enough to read a toast and act on it. */
const TOAST_TIMEOUT = 8000;

/** The route each kind of job ends on, so the toast can land somewhere useful. */
const STEP_BY_KIND = {
  extract: "teacher-exam-confirm",
  upload: "teacher-exam-files",
  scripts: "teacher-exam-scripts",
  marking: "teacher-exam-review",
};

export const useJobsStore = defineStore("jobs", {
  state: () => ({
    jobs: [],
    open: false,
    // Stops two trays polling if the app is mounted twice (a hot reload, or a
    // test that installs the store more than once).
    polling: false,
  }),

  getters: {
    running: (state) => state.jobs.filter((job) => job.status !== "done" && job.status !== "failed"),
    count() {
      return this.running.length;
    },
    /** The one to show on the closed indicator. */
    headline() {
      if (!this.running.length) return null;
      return this.running[0];
    },
  },

  actions: {
    /** Read the registry and start following whatever is in it. */
    sync() {
      this.jobs = activeJobEntries().map((entry) => ({
        ...entry,
        status: "uploaded",
        progress: 0,
        error: "",
      }));
      if (this.jobs.length) this.poll();
    },

    start() {
      this.sync();
      this.stop();
      this.polling = true;
      this.timer = setInterval(() => this.poll(), POLL_INTERVAL);
      // Coming back to the tab is the moment a stale tray is most obvious.
      this.detach = onJobsChanged(() => this.sync());
      document.addEventListener("visibilitychange", this.onVisible);
    },

    stop() {
      clearInterval(this.timer);
      this.polling = false;
      if (this.detach) this.detach();
      this.detach = null;
      document.removeEventListener("visibilitychange", this.onVisible);
    },

    onVisible() {
      if (!document.hidden) this.poll();
    },

    /**
     * Ask about every job in one request.
     *
     * `job(id:)` takes a single id, so the ids are aliased into one document
     * rather than sent as one request each: five uploads should not be five
     * round trips.
     */
    async poll() {
      const known = activeJobEntries();
      if (!known.length) {
        this.jobs = [];
        return;
      }

      const fields = "id jobType status progress error";
      const query =
        "query {" +
        known
          .map((entry, index) => `j${index}: job(id: ${JSON.stringify(entry.id)}) { ${fields} }`)
          .join(" ") +
        "}";

      let data;
      try {
        data = await gql(query);
      } catch (error) {
        // A blip is not news; the next tick tries again.
        return;
      }

      const next = [];
      const finished = [];
      for (const [index, entry] of known.entries()) {
        const job = data[`j${index}`];
        // The row was deleted server-side, or belongs to another school now.
        if (!job) continue;
        next.push({
          ...entry,
          status: job.status,
          progress: job.progress,
          error: job.error,
          jobType: job.jobType,
        });
        if (job.status === "done" || job.status === "failed") {
          finished.push({ ...entry, ...job });
        }
      }

      this.jobs = next;
      for (const job of finished) this.announce(job);
    },

    /** Tell the teacher, and stop following it. */
    announce(job) {
      const route = this.routeFor(job);
      if (job.status === "failed") {
        toastError(
          `${job.label || "That job"} did not finish. ${plainReason(job)}`,
          TOAST_TIMEOUT,
          route ? { label: "Open", to: route } : null
        );
      } else {
        toastSuccess(
          `${job.label || "That job"} is done.`,
          6000,
          route ? { label: "Open", to: route } : null
        );
      }
      forgetJob(job.id);
      this.jobs = this.jobs.filter((item) => item.id !== job.id);
    },

    /** Where the result of this job will be waiting. */
    routeFor(job) {
      if (!job.examId) return null;
      const name = STEP_BY_KIND[job.step] || STEP_BY_KIND.extract;
      return { name, params: { id: job.examId } };
    },

    /** Dismiss one from the tray without waiting for it. */
    dismiss(jobId) {
      forgetJob(jobId);
      this.jobs = this.jobs.filter((job) => job.id !== jobId);
    },

    toggle() {
      this.open = !this.open;
    },
  },
});

/**
 * What went wrong, said so a teacher can act on it.
 *
 * The server sends the reason in its own words. Some of them are useful as they
 * stand; the rest are replaced with something that names the next move rather
 * than the failure.
 */
export function plainReason(job) {
  const raw = (job.error || "").toLowerCase();
  if (!raw) return "You can try again from the exam.";
  if (raw.includes("timeout") || raw.includes("timed out")) {
    return "It took too long. Try again, or send fewer pages at once.";
  }
  if (raw.includes("connect") || raw.includes("network") || raw.includes("fetch")) {
    return "The server could not be reached. Check your connection and try again.";
  }
  if (raw.includes("no rubric")) {
    return "A question has no rubric, so there was nothing to mark against.";
  }
  if (raw.includes("upload the")) {
    return "Something it needs has not been uploaded yet.";
  }
  return "You can try again from the exam.";
}
