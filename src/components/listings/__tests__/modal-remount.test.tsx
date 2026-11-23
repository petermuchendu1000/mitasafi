/**
 * @jest-environment jsdom
 */

/**
 * Modals are mounted only while they are open, so reopening cannot show the last
 * session's state.
 *
 * WHAT WAS WRONG
 *   Each of these components rendered nothing when closed (`if (!isOpen) return null`)
 *   but stayed MOUNTED, holding every piece of state from the previous time it was
 *   used. An effect keyed on isOpen put that state back to its defaults. Because
 *   useEffect is passive, that effect runs after the browser has painted the first
 *   open frame — so reopening a modal showed the previous email, the previous error,
 *   or the previous success panel for one frame before snapping to a clean form.
 *
 * WHY THE COMMIT LOG
 *   Testing Library flushes effects inside act(), so the final DOM is correct in both
 *   versions and an assertion on view.container would pass against the bug. <Profiler
 *   onRender> fires once per commit, after that commit's DOM mutations are applied, so
 *   recording container.innerHTML there is the only way to see the frame that is wrong.
 */

import { render, act, fireEvent } from "@testing-library/react";
import { Profiler, useState } from "react";
import { SearchAlertModal } from "../SearchAlertModal";
import { UnavailableListingModal } from "../UnavailableListingModal";
import { InquiryModal } from "../InquiryModal";

beforeEach(() => {
  document.body.style.overflow = "";
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true }),
  }) as unknown as typeof fetch;
});

/**
 * Mounts `Modal` behind a toggle, and records the DOM at every commit.
 *
 * The toggle is a real parent component so that opening and closing go through the
 * same path the application uses: a boolean prop flipping, not a remount forced by the
 * test.
 */
function harness(Modal: React.ComponentType<never>, props: object) {
  const commits: string[] = [];
  let container: HTMLElement | null = null;
  let setOpen: ((v: boolean) => void) | null = null;

  function Host() {
    const [open, _setOpen] = useState(false);
    setOpen = _setOpen;
    const M = Modal as React.ComponentType<Record<string, unknown>>;
    return <M {...props} isOpen={open} onClose={() => _setOpen(false)} />;
  }

  const view = render(
    <Profiler
      id="modal"
      onRender={() => {
        if (container) commits.push(container.innerHTML);
      }}
    >
      <Host />
    </Profiler>,
  );
  container = view.container;

  return {
    view,
    commits,
    open: () => act(() => setOpen?.(true)),
    close: () => act(() => setOpen?.(false)),
    /** Commits recorded since the marker returned by mark(). */
    since: (n: number) => commits.slice(n),
    mark: () => commits.length,
  };
}

const LISTING = {
  id: "l1",
  title: "Riverside Court 2BR",
  area: "Kilimani",
  city: "Nairobi",
  property_type: "apartment",
  bedrooms: 2,
  rent_amount: 85000,
  currency: "KES",
  cover_photo: null,
  status: "rented" as const,
};

describe("SearchAlertModal", () => {
  const props = {
    onSuccess: () => {},
    searchCriteria: { areas: ["Kilimani"] },
    isAuthenticated: false,
  };

  it("opens with an empty email even after one was typed and the modal closed", () => {
    const h = harness(SearchAlertModal as never, props);
    h.open();

    const email = h.view.container.querySelector(
      'input[type="email"]',
    ) as HTMLInputElement;
    fireEvent.change(email, { target: { value: "typed@example.com" } });
    expect(
      (
        h.view.container.querySelector(
          'input[type="email"]',
        ) as HTMLInputElement
      ).value,
    ).toBe("typed@example.com");

    h.close();
    const mark = h.mark();
    h.open();

    // Not one commit from here on may contain the old address. With the effect, the
    // first one did.
    for (const html of h.since(mark)) {
      expect(html).not.toContain("typed@example.com");
    }
  });

  it("opens with no error showing after a failed attempt", async () => {
    const h = harness(SearchAlertModal as never, props);
    h.open();

    // Submitting with no contact details produces an inline error.
    await act(async () => {
      fireEvent.submit(
        h.view.container.querySelector("form") as HTMLFormElement,
      );
    });
    expect(h.view.container.textContent).toMatch(/email|phone/i);

    h.close();
    const mark = h.mark();
    h.open();

    for (const html of h.since(mark)) {
      expect(html).not.toContain("Please enter");
    }
  });

  it("prefills from the profile on the very first commit", () => {
    const h = harness(SearchAlertModal as never, {
      ...props,
      isAuthenticated: true,
      userId: "u1",
      userEmail: "asha@example.com",
    });
    const mark = h.mark();
    h.open();

    const first = h.since(mark)[0];
    expect(first).toContain("asha@example.com");
  });

  it("releases the body scroll lock when closed", () => {
    const h = harness(SearchAlertModal as never, props);
    h.open();
    expect(document.body.style.overflow).toBe("hidden");
    h.close();
    expect(document.body.style.overflow).toBe("");
  });
});

describe("UnavailableListingModal", () => {
  const props = { listing: LISTING, similarListings: [] };

  it("never repaints the success panel when reopened after joining the waitlist", async () => {
    const h = harness(UnavailableListingModal as never, props);
    h.open();

    const email = h.view.container.querySelector(
      'input[type="email"]',
    ) as HTMLInputElement;
    fireEvent.change(email, { target: { value: "asha@example.com" } });
    await act(async () => {
      fireEvent.submit(
        h.view.container.querySelector("form") as HTMLFormElement,
      );
    });

    const succeeded = /you.re on the list|we.ll let you know|notified/i.test(
      h.view.container.textContent ?? "",
    );
    expect(succeeded).toBe(true);

    h.close();
    const mark = h.mark();
    h.open();

    // This is the frame the user saw: the success panel from the last time, before
    // the effect reset isSuccess and the form reappeared.
    for (const html of h.since(mark)) {
      expect(html).not.toMatch(/you.re on the list|we.ll let you know/i);
    }
  });

  it("releases the body scroll lock when closed", () => {
    const h = harness(UnavailableListingModal as never, props);
    h.open();
    expect(document.body.style.overflow).toBe("hidden");
    h.close();
    expect(document.body.style.overflow).toBe("");
  });
});

describe("InquiryModal keeps the draft but forgets the submission", () => {
  const props = {
    listingId: "l1",
    listingTitle: "Riverside Court 2BR",
    listingArea: "Kilimani",
    landlordName: "Peter Kamau",
    landlordId: "ll1",
  };

  it("KEEPS a typed message across close and reopen", () => {
    // The whole reason this modal is split rather than unmounted wholesale. The old
    // prefill effect wrote `message: prev.message || defaultMessage`, so a visitor who
    // closed the modal mid-draft got their text back. Unmounting the whole component
    // would have thrown it away, and nothing else in the suite would have noticed.
    const h = harness(InquiryModal as never, props);
    h.open();

    const textarea = h.view.container.querySelector(
      "textarea",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "Is parking included? I can view on Saturday." },
    });

    h.close();
    h.open();

    expect(
      (h.view.container.querySelector("textarea") as HTMLTextAreaElement).value,
    ).toBe("Is parking included? I can view on Saturday.");
  });

  it("keeps a typed name and phone across close and reopen", () => {
    const h = harness(InquiryModal as never, props);
    h.open();

    fireEvent.change(
      h.view.container.querySelector("#inquiry-name") as HTMLInputElement,
      { target: { value: "Asha" } },
    );
    fireEvent.change(
      h.view.container.querySelector("#inquiry-phone") as HTMLInputElement,
      { target: { value: "712345678" } },
    );

    h.close();
    h.open();

    expect(
      (h.view.container.querySelector("#inquiry-name") as HTMLInputElement)
        .value,
    ).toBe("Asha");
    expect(
      (h.view.container.querySelector("#inquiry-phone") as HTMLInputElement)
        .value,
    ).toBe("712 345 678");
  });

  it("starts with the generated default message on first open", () => {
    const h = harness(InquiryModal as never, props);
    h.open();
    const textarea = h.view.container.querySelector(
      "textarea",
    ) as HTMLTextAreaElement;
    expect(textarea.value).toContain("Hi Peter");
    expect(textarea.value).toContain("Riverside Court 2BR");
    expect(textarea.value).toContain("Kilimani");
  });

  it("FORGETS the sent state, and never repaints it on reopen", async () => {
    const h = harness(InquiryModal as never, props);
    h.open();

    fireEvent.change(
      h.view.container.querySelector("#inquiry-phone") as HTMLInputElement,
      { target: { value: "712345678" } },
    );
    await act(async () => {
      fireEvent.submit(
        h.view.container.querySelector("form") as HTMLFormElement,
      );
    });
    expect(h.view.container.textContent).toContain("Message Sent!");

    h.close();
    const mark = h.mark();
    h.open();

    for (const html of h.since(mark)) {
      expect(html).not.toContain("Message Sent!");
    }
    expect(h.view.container.querySelector("form")).not.toBeNull();
  });

  it("forgets a validation error on reopen", async () => {
    const h = harness(InquiryModal as never, props);
    h.open();

    await act(async () => {
      fireEvent.submit(
        h.view.container.querySelector("form") as HTMLFormElement,
      );
    });
    expect(h.view.container.textContent).toContain(
      "Please enter your phone number",
    );

    h.close();
    const mark = h.mark();
    h.open();

    for (const html of h.since(mark)) {
      expect(html).not.toContain("Please enter your phone number");
    }
  });

  it("releases the body scroll lock when closed", () => {
    const h = harness(InquiryModal as never, props);
    h.open();
    expect(document.body.style.overflow).toBe("hidden");
    h.close();
    expect(document.body.style.overflow).toBe("");
  });
});
