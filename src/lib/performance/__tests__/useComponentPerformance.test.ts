/**
 * @jest-environment jsdom
 */

/**
 * useComponentPerformance — render count must not be read during render.
 *
 * WHY THIS EXISTS
 *   ESLint react-hooks/refs reported, twice, at src/lib/performance/client.tsx:140:
 *       "Cannot access ref value during render"
 *   for `renderCount: renderCountRef.current` in the hook's return value.
 *
 *   The ref is incremented in an effect with no dependency array, so it changes after
 *   every render. Mutating a ref never schedules a render, so a value read from it
 *   during render is stale (it predates this render's effect) and unobservable (nothing
 *   re-renders when it changes). A consumer rendering that number would show a figure
 *   that silently disagrees with reality.
 *
 *   It cannot become state: incrementing state in an effect with no dependency array
 *   schedules a render on every render, which does not terminate. So the count stays a
 *   ref and is exposed as a getter, to be called outside render.
 *
 * WHAT MAKES THIS ABLE TO FAIL (L5)
 *   Against the previous API there is no getRenderCount at all, so these tests throw.
 *   Against the current one they assert the count actually advances per render, which
 *   would fail if the getter were wired to a constant.
 */

import { renderHook } from "@testing-library/react";
import { useComponentPerformance } from "../client";

/**
 * jsdom implements performance.now() but not performance.mark()/measure(), and the hook
 * calls clientPerf.mark() in its mount effect. Without these stubs every test here dies
 * with "performance.mark is not a function" — failing for an environment reason rather
 * than for the defect under test, which would make the check worthless either way (G8.1).
 */
beforeAll(() => {
  if (typeof performance.mark !== "function") {
    (performance as unknown as { mark: () => void }).mark = () => {};
  }
  if (typeof performance.measure !== "function") {
    (performance as unknown as { measure: () => void }).measure = () => {};
  }
});

describe("useComponentPerformance", () => {
  it("exposes the render count as a getter, not as a render-time value", () => {
    const { result } = renderHook(() =>
      useComponentPerformance("TestComponent"),
    );

    expect(typeof result.current.getRenderCount).toBe("function");
    // The old shape leaked a number read during render.
    expect(
      (result.current as unknown as { renderCount?: number }).renderCount,
    ).toBeUndefined();
  });

  it("counts each render once the effect has run", () => {
    const { result, rerender } = renderHook(() =>
      useComponentPerformance("TestComponent"),
    );

    const afterFirst = result.current.getRenderCount();
    expect(afterFirst).toBe(1);

    rerender();
    expect(result.current.getRenderCount()).toBe(2);

    rerender();
    expect(result.current.getRenderCount()).toBe(3);
  });

  it("keeps separate counts for separate mounted components", () => {
    const a = renderHook(() => useComponentPerformance("A"));
    const b = renderHook(() => useComponentPerformance("B"));

    a.rerender();
    a.rerender();

    expect(a.result.current.getRenderCount()).toBe(3);
    expect(b.result.current.getRenderCount()).toBe(1);
  });
});
