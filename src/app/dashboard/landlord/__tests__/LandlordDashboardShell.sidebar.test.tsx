/**
 * @jest-environment jsdom
 */

/**
 * The landlord shell's sidebar state is a store subscription, and the shell no longer
 * polls localStorage ten times a second.
 *
 * WHAT WAS THERE
 *   1. A mount effect reading "sidebar-collapsed" into state. That is the reported
 *      setState, and it meant the first paint always drew the sidebar expanded before
 *      snapping narrow one commit later for anyone who had collapsed it.
 *   2. A setInterval(…, 100) for the lifetime of every landlord dashboard page,
 *      re-reading the key and comparing it with state, plus a MutationObserver that was
 *      constructed and never observed anything. Its own comment said "This is a
 *      workaround - ideally we'd use a context". Nothing else in the repo writes that
 *      key, so the poll was watching the component observe itself.
 *
 * The polling test below is the one that matters most, because a 10Hz timer is not
 * visible in any rendered output — only in how often storage is read.
 */

import { render, act } from "@testing-library/react";
import { Profiler } from "react";
import { LandlordDashboardShell } from "../LandlordDashboardShell";

const useNotifications = jest.fn();

jest.mock("@/hooks", () => ({
  useNotifications: () => useNotifications(),
}));

jest.mock("@/components/dashboard/landlord", () => ({
  LandlordSidebar: ({ isCollapsed }: { isCollapsed: boolean }) => (
    <div data-testid="sidebar" data-collapsed={String(isCollapsed)} />
  ),
  LandlordDashboardHeader: ({
    onSidebarToggle,
    isSidebarCollapsed,
    children,
  }: {
    onSidebarToggle: () => void;
    isSidebarCollapsed: boolean;
    children?: React.ReactNode;
  }) => (
    <div>
      <button data-testid="toggle" onClick={onSidebarToggle}>
        {String(isSidebarCollapsed)}
      </button>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("@/components/shared/NotificationCenter", () => ({
  NotificationCenter: () => null,
}));

const PROFILE = {
  id: "u1",
  full_name: "Asha",
  email: "asha@example.com",
} as never;

beforeEach(() => {
  localStorage.clear();
  useNotifications.mockReturnValue({
    unreadCount: 0,
    latestNotification: null,
  });
});

function renderShell() {
  let commits = 0;
  // A FRESH element each time. Two things caught earlier versions of this helper:
  // dispatching an unrelated storage event does not re-render, because the store value
  // is unchanged and useSyncExternalStore compares equal (which is the point of the
  // snapshot caching); and rerendering the SAME element object does not either, because
  // React bails out on a referentially identical element.
  const tree = () => (
    <Profiler
      id="shell"
      onRender={() => {
        commits += 1;
      }}
    >
      <LandlordDashboardShell profile={PROFILE}>
        <p>page</p>
      </LandlordDashboardShell>
    </Profiler>
  );
  const view = render(tree());
  return {
    view,
    rerender: () => view.rerender(tree()),
    commitsAtMount: () => commits,
  };
}

function sidebar(view: { container: HTMLElement }) {
  return view.container.querySelector('[data-testid="sidebar"]');
}

describe("sidebar collapse is read from the store, not an effect", () => {
  it("draws the sidebar collapsed on the FIRST commit when storage says so", () => {
    localStorage.setItem("sidebar-collapsed", "true");

    const { view, commitsAtMount } = renderShell();

    // One commit, already collapsed. The mount effect needed a second one, so a
    // returning landlord saw the content area jump from md:ml-[260px] to 72px.
    expect(commitsAtMount()).toBe(1);
    expect(sidebar(view)?.getAttribute("data-collapsed")).toBe("true");
  });

  it("draws it expanded when nothing is stored", () => {
    const { view } = renderShell();
    expect(sidebar(view)?.getAttribute("data-collapsed")).toBe("false");
  });

  it("toggling writes the value and re-renders once", () => {
    const { view } = renderShell();
    const toggle = view.container.querySelector(
      '[data-testid="toggle"]',
    ) as HTMLElement;

    act(() => {
      toggle.click();
    });

    expect(localStorage.getItem("sidebar-collapsed")).toBe("true");
    expect(sidebar(view)?.getAttribute("data-collapsed")).toBe("true");

    act(() => {
      toggle.click();
    });

    expect(localStorage.getItem("sidebar-collapsed")).toBe("false");
    expect(sidebar(view)?.getAttribute("data-collapsed")).toBe("false");
  });

  it("follows a change made in another tab", () => {
    const { view } = renderShell();
    expect(sidebar(view)?.getAttribute("data-collapsed")).toBe("false");

    act(() => {
      localStorage.setItem("sidebar-collapsed", "true");
      window.dispatchEvent(
        new StorageEvent("storage", { key: "sidebar-collapsed" }),
      );
    });

    expect(sidebar(view)?.getAttribute("data-collapsed")).toBe("true");
  });

  it("follows another tab CLEARING the key, which the old listener ignored", () => {
    localStorage.setItem("sidebar-collapsed", "true");
    const { view } = renderShell();
    expect(sidebar(view)?.getAttribute("data-collapsed")).toBe("true");

    act(() => {
      localStorage.removeItem("sidebar-collapsed");
      window.dispatchEvent(
        new StorageEvent("storage", { key: "sidebar-collapsed" }),
      );
    });

    // The old handler was guarded by `e.newValue !== null`, so clearing site data in
    // another tab was dropped on the floor.
    expect(sidebar(view)?.getAttribute("data-collapsed")).toBe("false");
  });
});

describe("the shell does not poll localStorage", () => {
  it("reads nothing more after mount while idle", () => {
    jest.useFakeTimers();
    const { view } = renderShell();

    const getItem = jest.spyOn(Storage.prototype, "getItem");
    getItem.mockClear();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // The old setInterval ran every 100ms, so five idle seconds were ~50 reads of
    // localStorage plus a comparison, on a page that was doing nothing.
    expect(getItem).not.toHaveBeenCalled();

    getItem.mockRestore();
    jest.useRealTimers();
    view.unmount();
  });

  it("leaves no timer behind after unmount", () => {
    jest.useFakeTimers();
    const { view } = renderShell();
    view.unmount();

    // jest.getTimerCount() is 0 only if every interval and timeout was cleared.
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });

  it("adds and removes the same window listeners", () => {
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

    renderShell().view.unmount();

    expect(added.sort()).toEqual(removed.sort());
    jest.restoreAllMocks();
  });
});

describe("the notification toast is keyed on the notification", () => {
  const NOTIFICATION = {
    id: "n1",
    title: "New inquiry on Riverside Court",
    read_at: null,
  };

  it("shows the title on the FIRST commit after the notification arrives", () => {
    useNotifications.mockReturnValue({
      unreadCount: 1,
      latestNotification: NOTIFICATION,
    });

    const { view, commitsAtMount } = renderShell();

    expect(commitsAtMount()).toBe(1);
    expect(view.container.textContent).toContain(
      "New inquiry on Riverside Court",
    );
  });

  it("stays dismissed once closed, and does not come back", () => {
    useNotifications.mockReturnValue({
      unreadCount: 1,
      latestNotification: NOTIFICATION,
    });
    jest.useFakeTimers();
    const { view } = renderShell();

    const close = [...view.container.querySelectorAll("button")].find(
      (b) => b.getAttribute("data-testid") !== "toggle" && !b.textContent,
    );
    act(() => {
      close?.click();
    });

    expect(view.container.textContent).not.toContain(
      "New inquiry on Riverside Court",
    );

    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(view.container.textContent).not.toContain(
      "New inquiry on Riverside Court",
    );
    jest.useRealTimers();
  });

  it("auto-dismisses after five seconds", () => {
    useNotifications.mockReturnValue({
      unreadCount: 1,
      latestNotification: NOTIFICATION,
    });
    jest.useFakeTimers();
    const { view } = renderShell();

    expect(view.container.textContent).toContain("New inquiry");

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(view.container.textContent).not.toContain("New inquiry");
    jest.useRealTimers();
  });

  it("shows nothing for a notification that is already read", () => {
    useNotifications.mockReturnValue({
      unreadCount: 0,
      latestNotification: { ...NOTIFICATION, read_at: "2026-01-01" },
    });
    const { view } = renderShell();
    expect(view.container.textContent).not.toContain("New inquiry");
  });

  it("shows a SECOND notification after the first was dismissed", () => {
    /**
     * A regression guard on the rewrite, not evidence against the old code: restoring
     * `toastMessage` string state leaves this green, because useNotifications assigns a
     * NEW object for each notification (useNotifications.ts:293) and the old effect
     * re-ran on that identity change.
     *
     * What it does catch is the obvious wrong way to write the replacement — tracking
     * dismissal as a boolean rather than as the dismissed notification's id. That would
     * suppress every later toast, and this test is the one that says so.
     */
    useNotifications.mockReturnValue({
      unreadCount: 1,
      latestNotification: NOTIFICATION,
    });
    jest.useFakeTimers();
    const { view, rerender } = renderShell();

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(view.container.textContent).not.toContain("New inquiry");

    useNotifications.mockReturnValue({
      unreadCount: 2,
      latestNotification: { ...NOTIFICATION, id: "n2" },
    });
    act(() => {
      rerender();
    });

    expect(view.container.textContent).toContain("New inquiry");
    jest.useRealTimers();
  });
});
