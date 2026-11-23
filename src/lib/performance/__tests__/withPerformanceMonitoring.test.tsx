/**
 * @jest-environment jsdom
 */

/**
 * withPerformanceMonitoring — the logged renderTime must be per-render, not cumulative.
 *
 * WHY THIS EXISTS
 *   ESLint react-hooks/purity reported at src/lib/performance/client.tsx:
 *       "`performance.now` is an impure function" for useRef<number>(performance.now())
 *
 *   The impurity is the smaller half of the problem. useRef's argument is evaluated on
 *   every render but only the FIRST result is kept, so renderStart is pinned to mount
 *   time. The effect then logs `performance.now() - renderStart.current`, which on every
 *   render after the first is the time since the component mounted — not the time that
 *   render took. The numbers grow for as long as the component stays on screen, and they
 *   are labelled renderTime.
 *
 * WHAT MAKES THIS ABLE TO FAIL (L5)
 *   jest's modern fake timers mock performance.now, so advancing time is observable in
 *   whatever the component measures. The test renders, advances a long way, renders
 *   again, and asserts the second logged renderTime is small. Against the old
 *   implementation that figure includes the advanced interval and the assertion fails;
 *   against a per-render measurement it does not.
 */

import { render } from "@testing-library/react";
import { act } from "react";
import { withPerformanceMonitoring, clientPerf } from "../client";

const ADVANCE_MS = 10_000;

function Plain({ label }: { label: string }) {
  return <div>{label}</div>;
}

describe("withPerformanceMonitoring", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clientPerf.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    clientPerf.clear();
  });

  it("logs one entry per render, naming the component", () => {
    const Wrapped = withPerformanceMonitoring(Plain, "PlainUnderTest");
    const { rerender } = render(<Wrapped label="a" />);
    rerender(<Wrapped label="b" />);

    const metrics = clientPerf
      .getMetrics()
      .filter((m) => m.component === "PlainUnderTest");

    expect(metrics.length).toBeGreaterThanOrEqual(2);
  });

  it("does not report time since mount as this render's time", () => {
    const Wrapped = withPerformanceMonitoring(Plain, "PlainUnderTest");
    const { rerender } = render(<Wrapped label="a" />);

    // Simulate the component sitting on screen for ten seconds.
    act(() => {
      jest.advanceTimersByTime(ADVANCE_MS);
    });

    rerender(<Wrapped label="b" />);

    const metrics = clientPerf
      .getMetrics()
      .filter((m) => m.component === "PlainUnderTest");
    const last = metrics[metrics.length - 1];

    expect(last).toBeDefined();
    // A trivial <div> does not take ten seconds to render. If this value carries the
    // elapsed interval, the measurement is cumulative rather than per-render.
    expect(last.renderTime ?? 0).toBeLessThan(ADVANCE_MS / 2);
  });
});
