import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

// The composable polls through the API client; nothing here talks to a server.
const gql = vi.fn();
vi.mock("@/api/client", () => ({ gql: (...args) => gql(...args) }));

const { useJob, jobFor, rememberJob, activeJobIds } = await import(
  "@/components/teacher/useJob"
);

/** A component that uses the composable and exposes it, since it needs a scope. */
function harness(jobId) {
  return defineComponent({
    setup() {
      const job = useJob(jobId);
      return { ...job };
    },
    render: () => h("div"),
  });
}

describe("useJob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    gql.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls every 1.5s and stops once the job is done", async () => {
    // Running, then running, then finished: the poll must stop on the third.
    gql
      .mockResolvedValueOnce({ job: { id: "j1", status: "processing", progress: 10 } })
      .mockResolvedValueOnce({ job: { id: "j1", status: "processing", progress: 60 } })
      .mockResolvedValueOnce({ job: { id: "j1", status: "done", progress: 100 } });

    const wrapper = mount(harness("j1"));
    await vi.advanceTimersByTimeAsync(0);
    expect(gql).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.progress).toBe(10);

    await vi.advanceTimersByTimeAsync(1500);
    expect(gql).toHaveBeenCalledTimes(2);
    expect(wrapper.vm.progress).toBe(60);

    await vi.advanceTimersByTimeAsync(1500);
    expect(gql).toHaveBeenCalledTimes(3);
    expect(wrapper.vm.done).toBe(true);

    // The whole point of stopping: no further requests once it has landed.
    await vi.advanceTimersByTimeAsync(10000);
    expect(gql).toHaveBeenCalledTimes(3);
    wrapper.unmount();
  });

  it("stops polling when the component goes away", async () => {
    gql.mockResolvedValue({ job: { id: "j2", status: "processing", progress: 5 } });

    const wrapper = mount(harness("j2"));
    await vi.advanceTimersByTimeAsync(0);
    expect(gql).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(10000);

    // A timer left running would keep hitting the API after the page is gone.
    expect(gql).toHaveBeenCalledTimes(1);
  });

  it("does not poll at all without a job id", async () => {
    const wrapper = mount(harness(""));
    await vi.advanceTimersByTimeAsync(5000);
    expect(gql).not.toHaveBeenCalled();
    expect(wrapper.vm.job).toBe(null);
    wrapper.unmount();
  });

  it("keeps the job under its key so a reload can find it again", async () => {
    rememberJob("exam:e1:marking", "job-9", { examId: "e1", step: "marking" });

    expect(jobFor("exam:e1:marking")).toBe("job-9");
    expect(activeJobIds()).toContain("job-9");

    // A done job is dropped from the registry, so it is not chased forever.
    gql.mockResolvedValue({ job: { id: "job-9", status: "done", progress: 100 } });
    const wrapper = mount(harness(ref(jobFor("exam:e1:marking"))));
    await vi.advanceTimersByTimeAsync(0);
    await nextTick();

    expect(jobFor("exam:e1:marking")).toBe("");
    wrapper.unmount();
  });
});
