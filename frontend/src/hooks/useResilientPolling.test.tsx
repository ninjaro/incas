import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/client";
import { useResilientPolling } from "./useResilientPolling";

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value });
  document.dispatchEvent(new Event("visibilitychange"));
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useResilientPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility("visible");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("pauses in hidden tabs and resumes when visible", async () => {
    const load = vi.fn(async () => ({ status: "waiting" }));
    renderHook(() => useResilientPolling({ load, deps: [load], intervalMs: 90_000 }));
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(1);

    act(() => setVisibility("hidden"));
    await act(async () => vi.advanceTimersByTimeAsync(180_000));
    expect(load).toHaveBeenCalledTimes(1);

    act(() => setVisibility("visible"));
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("stops polling final states", async () => {
    const load = vi.fn(async () => ({ status: "approved" }));
    renderHook(() => useResilientPolling({
      load,
      deps: [load],
      intervalMs: 90_000,
      isFinal: (value) => value.status === "approved",
    }));
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(360_000));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("preserves valid data and respects Retry-After after a 429", async () => {
    const load = vi.fn()
      .mockResolvedValueOnce({ status: "waiting" })
      .mockRejectedValueOnce(new ApiError(429, { code: "rate_limited", message: "Slow down" }, 120))
      .mockResolvedValue({ status: "waiting" });
    const state = renderHook(() => useResilientPolling({ load, deps: [load], intervalMs: 90_000 }));
    await flushPromises();
    expect(state.result.current.data).toEqual({ status: "waiting" });

    await act(async () => vi.advanceTimersByTimeAsync(90_000));
    await flushPromises();
    expect(state.result.current.stale).toBe(true);
    expect(state.result.current.data).toEqual({ status: "waiting" });
    // The capped exponential backoff (180s) is longer than Retry-After (120s),
    // so the hook must honor the safer of the two budgets.
    await act(async () => vi.advanceTimersByTimeAsync(179_000));
    expect(load).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(load).toHaveBeenCalledTimes(3);
  });
});
