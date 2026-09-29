import { computed, isRef, onUnmounted, ref, watch } from "vue";

import { gql } from "@/api/client";

/** How often a running job is asked about. */
const POLL_INTERVAL = 1500;

/** The statuses that mean the job has stopped, one way or another. */
const FINISHED = ["done", "failed"];

const STORAGE_KEY = "zanzibar.activeJobs";

const JOB = `
  query ($id: ID!) {
    job(id: $id) { id jobType status progress error result }
  }
`;

// --- what is still running, across reloads --------------------------------
// A job outlives the page that started it, so it is kept in localStorage under
// the thing it belongs to ("exam:<id>:marking"). A teacher who leaves the page
// and comes back finds its job still running instead of a blank screen, and the
// navbar tray can show every one of them from anywhere in the app.
//
// Each entry carries more than the id: which exam it belongs to, which step
// will be showing the result, and what to call it in the tray.

function normalise(value, key) {
  if (!value) return null;
  // An older build stored the bare id string.
  if (typeof value === "string") return { id: value, examId: "", step: "", label: key };
  return value;
}

function readStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    // An even older build stored a list of ids.
    if (Array.isArray(raw)) {
      return Object.fromEntries(raw.map((id) => [id, { id, examId: "", step: "", label: "" }]));
    }
    if (!raw || typeof raw !== "object") return {};
    return Object.fromEntries(
      Object.entries(raw)
        .map(([key, value]) => [key, normalise(value, key)])
        .filter(([, entry]) => entry && entry.id)
    );
  } catch (error) {
    // A corrupted value should not break the page.
    return {};
  }
}

function writeStore(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    // Same tab and other tabs both want to know the list changed.
    window.dispatchEvent(new CustomEvent("zanzibar:jobs"));
  } catch (error) {
    // Storage can be full or blocked; polling still works without it.
  }
}

/** Every job started in this browser that had not finished last time. */
export function activeJobIds() {
  return Object.values(readStore()).map((entry) => entry.id);
}

/** The same, with the exam and step each one belongs to. */
export function activeJobEntries() {
  return Object.entries(readStore()).map(([key, entry]) => ({ key, ...entry }));
}

/** Note which job belongs to a screen, so it can be picked up again. */
export function rememberJob(key, jobId, meta = {}) {
  if (!key || !jobId) return;
  writeStore({
    ...readStore(),
    [key]: {
      id: jobId,
      examId: meta.examId || "",
      step: meta.step || "",
      label: meta.label || key,
      since: meta.since || Date.now(),
    },
  });
}

/** The entry for this screen, or null. */
export function jobEntryFor(key) {
  return readStore()[key] || null;
}

/** The job last started for this screen, if it has not finished. */
export function jobFor(key) {
  const entry = readStore()[key];
  return entry ? entry.id : "";
}

/** Drop a job once it is finished with, wherever it was registered. */
export function forgetJob(jobId) {
  writeStore(
    Object.fromEntries(
      Object.entries(readStore()).filter(([, entry]) => entry.id !== jobId)
    )
  );
}

const forget = forgetJob;

/** Subscribe to the registry changing, in this tab or another. */
export function onJobsChanged(handler) {
  window.addEventListener("zanzibar:jobs", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("zanzibar:jobs", handler);
    window.removeEventListener("storage", handler);
  };
}

/**
 * Follow one ProcessingJob until it finishes.
 *
 * Polls `job(id:)` every 1.5s and stops on done or failed, when the component
 * goes away, or when the id becomes empty. The id may be a plain string or a
 * ref, so a page can start a job and hand it straight over.
 *
 * @param {string | import("vue").Ref<string>} jobId
 */
export function useJob(jobId) {
  const id = isRef(jobId) ? jobId : ref(jobId);
  const job = ref(null);
  const error = ref("");
  const loading = ref(false);

  let timer;
  let stopped = false;

  function stop() {
    stopped = true;
    clearTimeout(timer);
  }

  async function tick() {
    if (stopped || !id.value) return;
    loading.value = true;
    try {
      const data = await gql(JOB, { id: id.value });
      job.value = data.job;
      error.value = "";
      if (job.value && FINISHED.includes(job.value.status)) {
        forget(id.value);
        return;
      }
    } catch (failure) {
      // A blip should not end the wait; keep trying.
      error.value = failure.message;
    } finally {
      loading.value = false;
    }
    timer = setTimeout(tick, POLL_INTERVAL);
  }

  function start(value) {
    stop();
    stopped = false;
    job.value = null;
    error.value = "";
    if (value) id.value = value;
    if (!id.value) return;
    tick();
  }

  watch(id, (value) => start(value), { immediate: true });
  onUnmounted(stop);

  return {
    job,
    error,
    loading,
    status: computed(() => (job.value ? job.value.status : "")),
    progress: computed(() => (job.value ? job.value.progress : 0)),
    result: computed(() => (job.value ? job.value.result : null)),
    running: computed(
      () => Boolean(job.value) && !FINISHED.includes(job.value.status)
    ),
    done: computed(() => Boolean(job.value) && job.value.status === "done"),
    failed: computed(() => Boolean(job.value) && job.value.status === "failed"),
    /** Re-read the job now rather than waiting for the next tick. */
    refresh: tick,
    stop,
  };
}
