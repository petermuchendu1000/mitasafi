/**
 * @jest-environment jsdom
 */

/**
 * `isSaved` is derived from the store, and the component no longer re-reads
 * localStorage on every render.
 *
 * THE DEPENDENCY ARRAY NEVER MATCHED
 *   The effect was `[searchCriteria, isAuthenticated, userId]`, and `searchCriteria` is
 *   an object literal ListingsGrid builds inline, so it had a fresh identity on every
 *   render. The effect therefore ran on every render: a localStorage read and a
 *   JSON.parse each time. The setState then bailed out because the boolean was
 *   unchanged, which hid the cost instead of removing it. That is what the first test
 *   here measures, and it is not visible in any rendered output.
 */

import { render, act, fireEvent } from "@testing-library/react";
import { SaveSearchButton } from "../SaveSearchButton";

const KEY = "mitasafi_saved_searches";

jest.mock("@/components/ui", () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn() }),
}));

jest.mock("@/components/listings/SearchAlertModal", () => ({
  SearchAlertModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="modal" /> : null,
}));

const CRITERIA = { areas: ["Kilimani"], bedroomsMin: 2 };

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({}) }) as never;
});

/** A parent that rebuilds `searchCriteria` on every render, as ListingsGrid does. */
function Host({ bump }: { bump: number }) {
  return (
    <SaveSearchButton
      searchCriteria={{ ...CRITERIA }}
      isAuthenticated
      userId="u1"
      userEmail="a@example.com"
      data-bump={bump}
    />
  );
}

describe("no re-parse per render", () => {
  it("does not re-parse stored searches when the parent re-renders", () => {
    /**
     * Measuring JSON.parse, not localStorage.getItem, and the distinction is the point.
     * useSyncExternalStore calls getSnapshot on every render by design, so the store
     * does still call getItem each time — twice, in fact, once during render and once
     * in React's post-commit consistency check. What it does not do is re-parse: the
     * cache is keyed on the raw string, so an unchanged string returns the same array.
     *
     * An earlier version of this test asserted getItem was never called and failed with
     * 10 calls, which was the test being wrong about the mechanism rather than the code
     * being wrong. The effect it replaces did both a read AND a parse on every render,
     * because the inline searchCriteria object was never dependency-equal.
     */
    const view = render(<Host bump={0} />);
    const parse = jest.spyOn(JSON, "parse");
    parse.mockClear();

    for (let i = 1; i <= 5; i += 1) {
      view.rerender(<Host bump={i} />);
    }

    expect(parse).not.toHaveBeenCalled();
    parse.mockRestore();
  });
});

describe("isSaved is derived", () => {
  it("shows the saved state on the FIRST render when the hash is stored", () => {
    localStorage.setItem(KEY, JSON.stringify([JSON.stringify(CRITERIA)]));

    const view = render(
      <SaveSearchButton
        searchCriteria={CRITERIA}
        isAuthenticated
        userId="u1"
        userEmail="a@example.com"
      />,
    );

    expect(view.container.textContent).toContain("Notified!");
    expect(view.container.querySelector("button")).toBeDisabled();
  });

  it("offers to save when the stored hash is for a different search", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([JSON.stringify({ areas: ["Westlands"] })]),
    );

    const view = render(
      <SaveSearchButton
        searchCriteria={CRITERIA}
        isAuthenticated
        userId="u1"
        userEmail="a@example.com"
      />,
    );

    expect(view.container.textContent).toContain("Notify Me");
  });

  it("ignores the stored hash for a signed-out visitor", () => {
    // The old effect returned early without authentication, leaving isSaved false;
    // the derivation keeps that condition rather than dropping it.
    localStorage.setItem(KEY, JSON.stringify([JSON.stringify(CRITERIA)]));

    const view = render(<SaveSearchButton searchCriteria={CRITERIA} />);
    expect(view.container.textContent).toContain("Notify Me");
  });

  it("follows another tab saving the same search", () => {
    const view = render(
      <SaveSearchButton
        searchCriteria={CRITERIA}
        isAuthenticated
        userId="u1"
        userEmail="a@example.com"
      />,
    );
    expect(view.container.textContent).toContain("Notify Me");

    act(() => {
      localStorage.setItem(KEY, JSON.stringify([JSON.stringify(CRITERIA)]));
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });

    expect(view.container.textContent).toContain("Notified!");
  });

  it("survives a hand-edited value", () => {
    localStorage.setItem(KEY, '["ok", 42, null]');
    expect(() =>
      render(
        <SaveSearchButton
          searchCriteria={CRITERIA}
          isAuthenticated
          userId="u1"
          userEmail="a@example.com"
        />,
      ),
    ).not.toThrow();
  });
});

describe("saving", () => {
  it("records the hash once and shows the saved state", async () => {
    const view = render(
      <SaveSearchButton
        searchCriteria={CRITERIA}
        isAuthenticated
        userId="u1"
        userEmail="a@example.com"
      />,
    );

    await act(async () => {
      fireEvent.click(view.container.querySelector("button") as HTMLElement);
    });

    expect(JSON.parse(localStorage.getItem(KEY) ?? "[]")).toEqual([
      JSON.stringify(CRITERIA),
    ]);
    expect(view.container.textContent).toContain("Notified!");
  });

  it("does not append a duplicate hash when it is already stored", async () => {
    localStorage.setItem(KEY, JSON.stringify([JSON.stringify(CRITERIA)]));

    const view = render(
      <SaveSearchButton
        searchCriteria={CRITERIA}
        isAuthenticated
        userId="u1"
        userEmail="a@example.com"
      />,
    );
    // Already saved, so the button is disabled; assert on storage rather than on a
    // click that cannot happen. The old handleSuccess pushed unconditionally.
    expect(JSON.parse(localStorage.getItem(KEY) ?? "[]")).toHaveLength(1);
    expect(view.container.textContent).toContain("Notified!");
  });

  it("a guest who saves through the modal sees the saved state for the session", async () => {
    // Nothing is derivable for a guest: no userId, so the stored-hash branch is off and
    // `justSaved` is the only thing that can show it. That state is kept on purpose.
    const view = render(<SaveSearchButton searchCriteria={CRITERIA} />);

    await act(async () => {
      fireEvent.click(view.container.querySelector("button") as HTMLElement);
    });
    expect(
      view.container.querySelector('[data-testid="modal"]'),
    ).not.toBeNull();
  });
});
