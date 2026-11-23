/**
 * @jest-environment jsdom
 */

/**
 * Both realtime hooks report "not connected" the moment they stop subscribing, instead
 * of a commit later.
 *
 * Each hook's effect opened with an inactive branch — disabled, or nothing to monitor —
 * that unsubscribed and then called setIsConnected(false) and setStatus(...). Those are
 * the reported setStates, and because useEffect is passive they ran after the render in
 * which the hook had ALREADY stopped subscribing. app/saved/page.tsx renders a Wifi /
 * WifiOff badge straight off isConnected, so removing your last saved property painted
 * "Live updates" one more time before switching to "Offline".
 *
 * While inactive, both values are constants, so they are derived at the return.
 */

import { renderHook, act } from "@testing-library/react";
import { Profiler } from "react";
import { useRealtimeListingStatus } from "../useRealtimeListingStatus";
import { useRealtimeInquiries } from "../useRealtimeInquiries";

const unsubscribe = jest.fn();
const subscribe = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "u1" } }, error: null }),
      // useRealtimeInquiries also watches for sign-out. An earlier version of this
      // mock omitted it and three tests failed with "onAuthStateChange is not a
      // function" — the mock being wrong, not the hook.
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    channel: () => ({
      on: function () {
        return this;
      },
      subscribe: (cb?: (s: string) => void) => {
        subscribe();
        cb?.("SUBSCRIBED");
        return { unsubscribe };
      },
      unsubscribe,
    }),
    removeChannel: jest.fn(),
  }),
}));

beforeEach(() => {
  unsubscribe.mockClear();
  subscribe.mockClear();
});

describe("useRealtimeListingStatus", () => {
  it("reports idle and disconnected when there is nothing to monitor", () => {
    const { result } = renderHook(() =>
      useRealtimeListingStatus({ listingIds: [] }),
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.status).toBe("idle");
  });

  /**
   * These two assert the VALUE, not the timing, and the distinction is worth being
   * precise about: rerender() runs inside act(), which flushes the effect before the
   * assertion, so putting the setStates back in the effect's inactive branch leaves
   * both of them green. The commit-count test below is the one that fails against
   * that mutant, and it is the one that evidences the "one commit, not two" claim.
   */
  it("reports disconnected once it is disabled", async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useRealtimeListingStatus({ listingIds: ["a", "b"], enabled }),
      { initialProps: { enabled: true } },
    );

    await act(async () => {});
    expect(result.current.isConnected).toBe(true);

    rerender({ enabled: false });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.status).toBe("disconnected");
  });

  it("reports idle once the last listing is removed", async () => {
    const { result, rerender } = renderHook(
      ({ ids }) => useRealtimeListingStatus({ listingIds: ids }),
      { initialProps: { ids: ["a"] } },
    );

    await act(async () => {});
    expect(result.current.isConnected).toBe(true);

    rerender({ ids: [] });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.status).toBe("idle");
  });

  it("still unsubscribes when it goes inactive", async () => {
    const { rerender } = renderHook(
      ({ enabled }) => useRealtimeListingStatus({ listingIds: ["a"], enabled }),
      { initialProps: { enabled: true } },
    );
    await act(async () => {});
    unsubscribe.mockClear();

    await act(async () => {
      rerender({ enabled: false });
    });

    // Removing the two setStates must not have removed the actual teardown.
    expect(unsubscribe).toHaveBeenCalled();
  });

  // THE test for this change. Going inactive must cost one commit; with the effect
  // writing the state it cost two, and the second is the frame in which the Wifi badge
  // on app/saved/page.tsx still said "Live updates".
  it("costs ONE commit to go inactive, not two", async () => {
    let commits = 0;
    const { rerender } = renderHook(
      ({ enabled }) => {
        commits += 1;
        return useRealtimeListingStatus({ listingIds: ["a"], enabled });
      },
      { initialProps: { enabled: true } },
    );
    await act(async () => {});

    commits = 0;
    await act(async () => {
      rerender({ enabled: false });
    });

    expect(commits).toBe(1);
  });
});

describe("useRealtimeInquiries", () => {
  it("reports disconnected while disabled", () => {
    const { result } = renderHook(() =>
      useRealtimeInquiries({ enabled: false }),
    );
    expect(result.current.isConnected).toBe(false);
    expect(result.current.status).toBe("disconnected");
  });

  it("reports disconnected once it is disabled", async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useRealtimeInquiries({ enabled }),
      { initialProps: { enabled: true } },
    );

    await act(async () => {});
    expect(result.current.isConnected).toBe(true);

    rerender({ enabled: false });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.status).toBe("disconnected");
  });

  it("still unsubscribes when disabled", async () => {
    const { rerender } = renderHook(
      ({ enabled }) => useRealtimeInquiries({ enabled }),
      { initialProps: { enabled: true } },
    );
    await act(async () => {});
    unsubscribe.mockClear();

    await act(async () => {
      rerender({ enabled: false });
    });

    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe("ServicesNavbar reads scroll as an external store", () => {
  // Imported lazily so the mock above does not apply to its module graph.
  it("subscribes once and tears the listener down symmetrically", async () => {
    const { ServicesNavbar } =
      await import("@/components/services-landing/ServicesNavbar");
    const { render } = await import("@testing-library/react");

    const added: string[] = [];
    const removed: string[] = [];
    const origAdd = window.addEventListener;
    const origRemove = window.removeEventListener;
    jest
      .spyOn(window, "addEventListener")
      .mockImplementation((...args: Parameters<typeof origAdd>) => {
        added.push(String(args[0]));
        return origAdd.apply(window, args);
      });
    jest
      .spyOn(window, "removeEventListener")
      .mockImplementation((...args: Parameters<typeof origRemove>) => {
        removed.push(String(args[0]));
        return origRemove.apply(window, args);
      });

    const view = render(
      <Profiler id="nav" onRender={() => {}}>
        <ServicesNavbar />
      </Profiler>,
    );
    expect(added).toContain("scroll");
    view.unmount();
    expect(removed.filter((e) => e === "scroll").length).toBe(
      added.filter((e) => e === "scroll").length,
    );

    jest.restoreAllMocks();
  });

  it("switches to the solid navbar when the page is scrolled past the threshold", async () => {
    const { ServicesNavbar } =
      await import("@/components/services-landing/ServicesNavbar");
    const { render } = await import("@testing-library/react");

    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    const view = render(<ServicesNavbar />);
    const navBefore = view.container.querySelector("nav,header");
    const classBefore = navBefore?.className ?? "";

    act(() => {
      (window as unknown as { scrollY: number }).scrollY = 500;
      window.dispatchEvent(new Event("scroll"));
    });

    const classAfter =
      view.container.querySelector("nav,header")?.className ?? "";
    expect(classAfter).not.toBe(classBefore);
  });
});
