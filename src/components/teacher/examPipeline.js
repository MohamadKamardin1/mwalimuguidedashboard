/**
 * The exam pipeline, defined once.
 *
 * The list, the workspace stepper and the dashboard's next-step bar all have
 * to agree on what the steps are, where an exam sits in them, and what it
 * should do next. That agreement lives here rather than in three pages.
 *
 * Pure: everything is derived from `exam.status` and a small counts object.
 */

/** The steps a teacher walks through, in order. */
export const STEPS = [
  { key: "files", label: "Files", route: "teacher-exam-files" },
  { key: "confirm", label: "Confirm", route: "teacher-exam-confirm" },
  { key: "scripts", label: "Scripts", route: "teacher-exam-scripts" },
  { key: "marking", label: "Marking", route: "teacher-exam-marking" },
  { key: "review", label: "Review", route: "teacher-exam-review" },
  { key: "results", label: "Results", route: "teacher-exam-results" },
  { key: "insights", label: "Insights", route: "teacher-exam-insights" },
];

/** Where a status sits in that list. */
const CURRENT = {
  draft: 0,
  extracting: 0,
  needs_confirmation: 1,
  ready: 2,
  marking: 3,
  review: 4,
  finalized: 6,
};

/** Why a step cannot be opened yet. Keyed by the step it blocks. */
const LOCKED_BECAUSE = {
  confirm: "Upload the question paper and the marking scheme first.",
  scripts: "Confirm the extracted questions before collecting scripts.",
  marking: "The scripts have to be uploaded and matched before marking can run.",
  review: "Marking has to finish before there is anything to review.",
  results: "Review the uncertain marks first — results are locked until then.",
  insights: "Finalise the exam to produce the class insights.",
};

const PROGRESS = {
  draft: 10,
  extracting: 25,
  needs_confirmation: 35,
  ready: 50,
  marking: 70,
  review: 85,
  finalized: 100,
};

const BAR = {
  draft: "bg-blueGray-400",
  extracting: "bg-lightBlue-500",
  needs_confirmation: "bg-amber-500",
  ready: "bg-teal-500",
  marking: "bg-lightBlue-500",
  review: "bg-amber-500",
  finalized: "bg-emerald-500",
};

/** How far along the pipeline an exam is, for a list's progress bar. */
export function progressPercent(status) {
  return PROGRESS[status] || 0;
}

export function progressColor(status) {
  return BAR[status] || "bg-blueGray-400";
}

/** The step a fresh page should open on. */
export function currentStep(status) {
  return STEPS[CURRENT[status] === undefined ? 0 : CURRENT[status]];
}

/** A step's route, with the exam id filled in. */
export function routeFor(stepKey, examId) {
  const step = STEPS.find((item) => item.key === stepKey) || STEPS[0];
  return { name: step.route, params: { id: examId } };
}

/**
 * Is there something for the teacher to do at this step right now?
 *
 * `counts` carries what the workspace measured: `unconfirmed` questions,
 * `unmatched` scripts, `awaiting` answers in the review queue.
 */
function needsAttention(key, counts) {
  if (!counts) return false;
  if (key === "confirm") return counts.unconfirmed > 0;
  if (key === "scripts") return counts.unmatched > 0;
  if (key === "review") return counts.awaiting > 0;
  return false;
}

/**
 * Every step with the state it should be drawn in.
 *
 *   done       behind the exam
 *   current    where the exam is now
 *   attention  where the exam is now, and something is waiting
 *   locked     ahead of the exam; `reason` says why
 */
export function stepsFor(status, counts) {
  const index = currentIndex(status, counts);

  return STEPS.map((step, position) => {
    if (position < index) return { ...step, state: "done", reason: "" };
    if (position === index) {
      return {
        ...step,
        state: needsAttention(step.key, counts) ? "attention" : "current",
        reason: "",
      };
    }
    // Ahead of the exam. Review is the exception: nothing on the server moves
    // `Exam.status` out of `marking` once the batch ends, so the queue is the
    // only signal that there is something to review. It is therefore openable
    // as soon as marking has begun -- the marker itself still sits on Marking
    // while the job runs.
    if (step.key === "review" && status === "marking") {
      return { ...step, state: "open", reason: "" };
    }
    return { ...step, state: "locked", reason: LOCKED_BECAUSE[step.key] || "" };
  });
}

/**
 * Where the exam actually is.
 *
 * `CURRENT` maps a status to a step, but the server never sets the status to
 * `review`: marking leaves the exam on `marking` and simply fills a queue. So
 * a non-empty queue means the exam has reached review, whatever the status
 * says. A `status = "review"` transition on the server would replace this.
 */
function currentIndex(status, counts) {
  const base = CURRENT[status] === undefined ? 0 : CURRENT[status];
  if (status === "marking" && counts && counts.awaiting > 0) return 4;
  return base;
}

/**
 * The single recommended action for an exam, for the sticky bar.
 *
 * `progress` is null when there is nothing to press because a background step
 * is running; `indeterminate` says the wait has no measurable percentage.
 */
export function nextStepFor(exam, counts = {}) {
  switch (exam.status) {
    case "draft":
      return {
        label: "Upload the paper and scheme",
        description:
          "Add the question paper and the marking scheme so the questions and rubric can be read.",
        actionLabel: "Upload files",
        step: "files",
        variant: "primary",
      };
    case "extracting":
      return {
        label: "Reading your uploads",
        description:
          "The questions and the marking scheme are being extracted. Nothing to do yet — this updates as it goes.",
        actionLabel: "",
        step: "files",
        variant: "info",
        indeterminate: true,
      };
    case "needs_confirmation":
      return {
        label: "Review the extracted questions",
        description: `${counts.unconfirmed || 0} question(s) still need confirming before marking can start.`,
        actionLabel: "Review questions",
        step: "confirm",
        variant: "warning",
      };
    case "ready": {
      // Scripts are in but some have no student yet. Nothing can be marked
      // until every script belongs to somebody.
      if (counts.scripts > 0 && counts.unmatched > 0) {
        return {
          label: `${counts.unmatched} script${counts.unmatched === 1 ? "" : "s"} need attention`,
          description:
            "Match the remaining scripts to their students, or sort out the batches that were read as one.",
          actionLabel: "Fix scripts",
          step: "scripts",
          variant: "warning",
        };
      }
      // Nothing uploaded yet.
      if (!counts.scripts) {
        return {
          label: "Upload the student scripts",
          description: "Marking starts as soon as the scripts are in.",
          actionLabel: "Upload scripts",
          step: "scripts",
          variant: "primary",
        };
      }
      // Every script is matched, so the next move is a mutation rather than a
      // step. `mutate` names it, and the workspace asks before running it.
      return {
        label: "Every script is matched",
        description: `Ready to mark ${counts.scripts} script(s).`,
        actionLabel: "Start AI marking",
        step: "marking",
        variant: "success",
        mutate: "startMarking",
      };
    }
    case "marking":
      // Marking fills a queue as it goes. Once there is something in it, the
      // teacher's time is better spent deciding those than watching a bar.
      if (counts.awaiting > 0) {
        return {
          label: `${counts.awaiting} answer${counts.awaiting === 1 ? "" : "s"} need your decision`,
          description:
            "The model was unsure about these. Your mark is the one that counts, and you can leave and come back.",
          actionLabel: "Start review",
          step: "review",
          variant: "warning",
        };
      }
      return {
        label: "Marking in progress",
        description:
          "Answers are being marked in the background. Nothing to do yet — you will be told when it needs you.",
        actionLabel: "",
        step: "marking",
        variant: "info",
        indeterminate: true,
      };
    case "review":
      return {
        label: `Review ${counts.awaiting || 0} answer(s)`,
        description: "The model was unsure about these. Your decision is what counts.",
        actionLabel: "Start review",
        step: "review",
        variant: "warning",
      };
    case "finalized":
      return {
        label: "View the class insights",
        description:
          "Every mark is locked. See what the class found hard and what to reteach.",
        actionLabel: "Open insights",
        step: "insights",
        variant: "success",
      };
    default:
      return { label: "", description: "", actionLabel: "", step: "files", variant: "primary" };
  }
}
