import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gql = vi.fn();
vi.mock("@/api/client", () => ({ gql: (...args) => gql(...args) }));

const MarkPanel = (await import("@/views/teacher/steps/review/MarkPanel.vue")).default;
const ReviewStep = (await import("@/views/teacher/steps/ReviewStep.vue")).default;

/** Two answers waiting on a teacher, in the order the queue returns them. */
const QUEUE = {
  reviewQueue: {
    total: 2,
    items: [
      {
        answerId: "a1",
        scriptId: "s1",
        studentName: "Amina Yusuf",
        questionNumber: "1",
        questionText: "Solve $3x + 2 = 11$",
        maxMarks: 5,
        transcribedText: "x = 3",
        workingSteps: ["3x = 9", "x = 3"],
        finalAnswer: "3",
        isBlank: false,
        legibilityScore: 0.9,
        pageUrls: [],
        awardedMarks: 3,
        confidence: 0.55,
        errorType: "arithmetic",
        reasoning: "The method is right; the last line slips a sign.",
        rubricBreakdown: [],
        errorCarriedForward: false,
      },
      {
        answerId: "a2",
        scriptId: "s2",
        studentName: "Juma Ali",
        questionNumber: "2",
        questionText: "Factorise $x^2 - 5x + 6$",
        maxMarks: 3,
        transcribedText: "(x-2)(x-3)",
        workingSteps: [],
        finalAnswer: "(x-2)(x-3)",
        isBlank: false,
        legibilityScore: 0.8,
        pageUrls: [],
        awardedMarks: 3,
        confidence: 0.95,
        errorType: null,
        reasoning: "Correct.",
        rubricBreakdown: [],
        errorCarriedForward: false,
      },
    ],
  },
};

describe("the review screen's keyboard", () => {
  let wrapper;

  beforeEach(async () => {
    gql.mockReset();
    gql.mockResolvedValue(QUEUE);
    wrapper = mount(ReviewStep, {
      props: { exam: { id: "e1", schoolClass: { id: "c1" } } },
      global: { stubs: { RouterLink: true, MathText: true } },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();
  });

  const press = (key) =>
    window.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true }));

  it("loads the queue and starts on the first answer", () => {
    expect(wrapper.vm.filtered.length).toBe(2);
    expect(wrapper.vm.current.studentName).toBe("Amina Yusuf");
  });

  it("moves to the next answer and back again", async () => {
    press("n");
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.current.studentName).toBe("Juma Ali");

    press("p");
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.current.studentName).toBe("Amina Yusuf");
  });

  it("does not go past either end of the queue", async () => {
    press("p");
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.index).toBe(0);

    for (let i = 0; i < 5; i += 1) press("n");
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.index).toBe(1);
  });

  it("ignores keys typed into a field, so a note can contain an n", async () => {
    const field = document.createElement("input");
    document.body.appendChild(field);
    field.dispatchEvent(new window.KeyboardEvent("keydown", { key: "n", bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.index).toBe(0);
    field.remove();
  });
});

describe("the marks total", () => {
  const rubric = [
    { id: "r1", description: "Correct method", marks: 2, kind: "method" },
    { id: "r2", description: "Correct answer", marks: 3, kind: "accuracy" },
  ];

  it("adds up the rubric rows that are switched on", async () => {
    const wrapper = mount(MarkPanel, {
      props: {
        item: { answerId: "a1", rubricBreakdown: [{ rubric_item_id: "r1", awarded: 2 }] },
        rubric,
      },
      global: { stubs: { MathText: true, ConfidenceBadge: true, AiNote: true } },
    });

    // One row already awarded by the model.
    expect(wrapper.vm.total()).toBe(2);

    // Switching the other one on recomputes from the rubric, not from the
    // model's original figure.
    wrapper.vm.toggle(wrapper.vm.rows[1]);
    expect(wrapper.vm.total()).toBe(5);

    wrapper.vm.toggle(wrapper.vm.rows[1]);
    expect(wrapper.vm.total()).toBe(2);

    wrapper.vm.toggle(wrapper.vm.rows[0]);
    expect(wrapper.vm.total()).toBe(0);
  });

  it("tells its parent the new total every time one is toggled", async () => {
    const wrapper = mount(MarkPanel, {
      props: { item: { answerId: "a1", rubricBreakdown: [] }, rubric },
      global: { stubs: { MathText: true, ConfidenceBadge: true, AiNote: true } },
    });

    wrapper.vm.toggle(wrapper.vm.rows[0]);
    const emitted = wrapper.emitted("update:marks");
    expect(emitted[emitted.length - 1]).toEqual([2]);
  });
});
