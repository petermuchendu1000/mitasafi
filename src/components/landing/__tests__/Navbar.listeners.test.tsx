/**
 * @jest-environment jsdom
 */

/**
 * subscribeSavedListings must remove exactly what it registers.
 *
 * ESLint react-hooks/set-state-in-effect reported Navbar.tsx:30 (setCount in a mount
 * effect). Reading that effect in full turned up a defect the rule does not report:
 *
 *     window.addEventListener("storage", (e) => {        // anonymous function
 *       if (e.key === STORAGE_KEY) handleChange();
 *     });
 *     return () => {
 *       window.removeEventListener("storage", handleChange);   // a DIFFERENT function
 *     };
 *
 * removeEventListener only detaches a listener registered with the same reference, so
 * that listener outlived the component. Navbar renders the badge twice, so every mount
 * stranded two of them, each holding a closure over that mount's setCount.
 *
 * MEASURED AGAINST THE UNFIXED COMPONENT, by rendering the real Navbar and counting
 * live listeners: 2 after one mount/unmount (expected 0), 8 after three (expected 2).
 * That full-render version of this test is not kept: it reliably got its jest worker
 * SIGTERM'd during a whole-suite run, while passing in isolation. Rendering the entire
 * Navbar tree is also more than this needs.
 *
 * What broke was the symmetry of subscribe/teardown, so that is what is asserted here.
 * useSyncExternalStore's contract is that the function returned by subscribe is called
 * on unmount, so a symmetric teardown is exactly the property that prevents the leak.
 *
 * ABLE TO FAIL (L5): the counts come from a wrapper around the real add/remove. Any
 * listener registered and not removed shows up as a non-zero delta.
 */

import { subscribeSavedListings } from "../Navbar";

type Listener = EventListenerOrEventListenerObject;

const live = new Map<string, Set<Listener>>();
let realAdd: typeof window.addEventListener;
let realRemove: typeof window.removeEventListener;

beforeAll(() => {
  realAdd = window.addEventListener.bind(window);
  realRemove = window.removeEventListener.bind(window);

  window.addEventListener = ((type: string, fn: Listener, opts?: never) => {
    if (!live.has(type)) live.set(type, new Set());
    live.get(type)!.add(fn);
    return realAdd(type, fn as EventListener, opts);
  }) as typeof window.addEventListener;

  window.removeEventListener = ((type: string, fn: Listener, opts?: never) => {
    live.get(type)?.delete(fn);
    return realRemove(type, fn as EventListener, opts);
  }) as typeof window.removeEventListener;
});

afterAll(() => {
  window.addEventListener = realAdd;
  window.removeEventListener = realRemove;
  live.clear();
});

const total = () => [...live.values()].reduce((n, s) => n + s.size, 0);

describe("subscribeSavedListings", () => {
  it("registers listeners and removes every one of them on teardown", () => {
    const before = total();

    const teardown = subscribeSavedListings(() => {});
    expect(total()).toBeGreaterThan(before);

    teardown();
    expect(total()).toBe(before);
  });

  it("does not accumulate across repeated subscribe/teardown cycles", () => {
    const before = total();
    for (let i = 0; i < 5; i += 1) {
      subscribeSavedListings(() => {})();
    }
    expect(total()).toBe(before);
  });

  it("notifies on the app's own change event", () => {
    const onChange = jest.fn();
    const teardown = subscribeSavedListings(onChange);

    window.dispatchEvent(new Event("savedListingsChanged"));
    expect(onChange).toHaveBeenCalledTimes(1);

    teardown();
    window.dispatchEvent(new Event("savedListingsChanged"));
    expect(onChange).toHaveBeenCalledTimes(1); // silent once torn down
  });
});
