/**
 * @jest-environment jsdom
 */

/**
 * The provider card's carousel index is clamped during render, not corrected afterwards.
 *
 * WHY THESE TESTS LOOK AT EVERY COMMIT AND NOT AT THE FINAL DOM
 *   The defect is a single bad frame. activeImageIndex is state the user moves with the
 *   arrows; the list it indexes shrinks underneath it when an image fails to load. The
 *   old code let the index go out of range, rendered `undefined` for the active image —
 *   which makes the card fall back to the big grey CategoryPlaceholder letter — and
 *   only then ran an effect that reset the index to 0.
 *
 *   Testing Library flushes effects inside act(), so by the time any assertion can run,
 *   the reset has happened and the final DOM is correct in BOTH versions. Asserting on
 *   view.container would therefore pass against the bug.
 *
 *   <Profiler onRender> fires once per commit of the subtree, after that commit's DOM
 *   mutations are applied. Recording container.innerHTML there gives the DOM as it was
 *   at EVERY commit, including the bad frame, which is the only place the defect is
 *   visible. The tests then assert a property of the whole sequence: no commit ever
 *   showed the placeholder.
 */

import { render, act } from "@testing-library/react";
import { Profiler } from "react";
import { ProviderCard } from "../ProviderCard";
import type { ServiceProviderCardData } from "@/types/service-providers";

// next/image renders a plain <img> under test; onError must still reach the card.
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { src, alt, onError } = props as {
      src: string;
      alt: string;
      onError?: () => void;
    };
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return (
      <img src={src} alt={alt} data-testid="carousel-image" onError={onError} />
    );
  },
}));

jest.mock("@/lib/analytics/use-analytics", () => ({
  useAnalytics: () => ({ track: jest.fn(), logSearch: jest.fn() }),
}));

const PROVIDER: ServiceProviderCardData = {
  id: "p1",
  business_name: "Zuri Cleaners",
  tagline: "Spotless, every time",
  description: null,
  logo_url: null,
  cover_photo_url: null,
  service_image_urls: ["/a.jpg", "/b.jpg", "/c.jpg"],
  service_names: [],
  service_areas: ["Kilimani"],
  is_available: true,
  instant_booking: false,
  is_verified: true,
  rating_average: 4.8,
  rating_count: 31,
  total_jobs_completed: 120,
  response_time_minutes: 30,
  tier: "free",
  min_price: 2500,
  price_type: "fixed",
  categories: ["cleaning"],
  subcategories: [],
  years_in_business: 3,
  last_active_at: null,
  has_insurance: false,
  has_business_license: false,
  has_id_verified: false,
};

/** The placeholder renders the business name's first letter at text-4xl. */
const PLACEHOLDER_MARKER = "text-4xl";

function renderWithCommitLog() {
  const commits: string[] = [];
  let container: HTMLElement | null = null;

  const onRender = () => {
    if (container) commits.push(container.innerHTML);
  };

  const view = render(
    <Profiler id="card" onRender={onRender}>
      <ProviderCard provider={PROVIDER} />
    </Profiler>,
  );
  container = view.container;

  // The first commit happens before `container` is assigned, so record it by hand.
  commits.unshift(view.container.innerHTML);

  return { view, commits };
}

function images(view: { container: HTMLElement }) {
  return [...view.container.querySelectorAll('[data-testid="carousel-image"]')];
}

function dots(view: { container: HTMLElement }) {
  return [
    ...view.container.querySelectorAll('[aria-label^="View image"]'),
  ] as HTMLElement[];
}

describe("carousel index is clamped, so no commit renders the placeholder", () => {
  it("shows the first image and three dots to begin with", () => {
    const { view } = renderWithCommitLog();
    expect(images(view)).toHaveLength(1);
    expect(images(view)[0].getAttribute("src")).toBe("/a.jpg");
    expect(dots(view)).toHaveLength(3);
  });

  it("losing the LAST image while it is active never shows the placeholder", () => {
    const { view, commits } = renderWithCommitLog();

    // Walk to the third image, the one at the end of the list.
    act(() => {
      dots(view)[2].click();
    });
    expect(images(view)[0].getAttribute("src")).toBe("/c.jpg");

    const before = commits.length;
    act(() => {
      images(view)[0].dispatchEvent(new Event("error"));
    });

    // The index is now 2 over a list of 2. Every commit from the failure onwards must
    // still have shown a real image. With the effect, the commit right here rendered
    // the CategoryPlaceholder instead.
    const after = commits.slice(before);
    expect(after.length).toBeGreaterThan(0);
    for (const html of after) {
      expect(html).not.toContain(PLACEHOLDER_MARKER);
    }
    expect(images(view)[0].getAttribute("src")).toBe("/a.jpg");
  });

  it("every commit of the whole sequence keeps exactly one image on screen", () => {
    const { view, commits } = renderWithCommitLog();

    act(() => {
      dots(view)[2].click();
    });
    act(() => {
      images(view)[0].dispatchEvent(new Event("error"));
    });
    act(() => {
      dots(view)[1].click();
    });
    act(() => {
      images(view)[0].dispatchEvent(new Event("error"));
    });

    for (const html of commits) {
      expect(html).toContain('data-testid="carousel-image"');
      expect(html).not.toContain(PLACEHOLDER_MARKER);
    }
  });

  it("falls back to the placeholder only when every image has failed", () => {
    // The clamp must not paper over the genuine empty case.
    const { view } = renderWithCommitLog();

    for (let i = 0; i < 3; i += 1) {
      act(() => {
        images(view)[0]?.dispatchEvent(new Event("error"));
      });
    }

    expect(images(view)).toHaveLength(0);
    expect(view.container.innerHTML).toContain(PLACEHOLDER_MARKER);
  });

  it("a dot is highlighted in EVERY commit, including right after a failure", () => {
    // Also a per-commit property. An earlier version of this test read the final DOM
    // and passed against the bug, because by assertion time the effect had reset the
    // index to 0 and dot 0 was highlighted again. The frame with no highlighted dot is
    // only visible in the commit log.
    const { view, commits } = renderWithCommitLog();

    act(() => {
      dots(view)[2].click();
    });
    act(() => {
      images(view)[0].dispatchEvent(new Event("error"));
    });

    for (const html of commits) {
      // The current dot is "w-4 bg-white" / "w-5 bg-white"; the others "bg-white/70".
      const current = html.match(/w-[45] bg-white/g) ?? [];
      expect(current).toHaveLength(1);
    }
  });
});

describe("the arrows step from the clamped index", () => {
  /**
   * These two pin the arrow rewrite as BEHAVIOUR-PRESERVING. They are not evidence of
   * the placeholder defect, and saying so would be wrong: restoring the original
   * updater-form arrows leaves both of them green.
   *
   * The reason is worth recording. The updater form's `prev` is the unclamped index, so
   * stepping from a stale 2 over a 2-entry list produced 3 — off the end again. But the
   * clamping effect always ran at the end of the commit in which the list shrank, long
   * before any click could arrive, so `prev` was never actually stale when an arrow was
   * pressed. The rewrite removes a hazard that the effect was covering; it does not
   * change what the user sees. What these tests do catch is an off-by-one introduced
   * while rewriting the stepping, which is the real risk of that edit.
   *
   * One mutation of `goToNextImage` survives them, and it is worth saying why rather
   * than papering over it: changing the wrap test to `=== visibleCarouselImages.length`
   * (so it never fires) leaves every test green, because the clamp in the render
   * already turns the resulting out-of-range index into 0. The explicit wrap in `next`
   * is therefore redundant — it is kept only so that `next` and `previous` read the
   * same way. `previous` genuinely needs its wrap: a negative index is NOT clamped
   * (`-1 < length` is true), so dropping it renders the placeholder, and the test below
   * fails. Verified by mutation, not assumed.
   */
  it('"next" advances to the following image', () => {
    const { view } = renderWithCommitLog();

    act(() => {
      dots(view)[2].click();
    });
    act(() => {
      images(view)[0].dispatchEvent(new Event("error"));
    });
    // Now showing /a.jpg out of [/a.jpg, /b.jpg].

    const next = view.container.querySelector<HTMLElement>(
      '[aria-label="Next service image"]',
    );
    act(() => {
      next?.click();
    });

    expect(images(view)[0].getAttribute("src")).toBe("/b.jpg");
  });

  it('"next" wraps round from the last remaining image', () => {
    const { view } = renderWithCommitLog();
    const next = view.container.querySelector<HTMLElement>(
      '[aria-label="Next service image"]',
    );

    act(() => {
      next?.click();
    });
    expect(images(view)[0].getAttribute("src")).toBe("/b.jpg");
    act(() => {
      next?.click();
    });
    expect(images(view)[0].getAttribute("src")).toBe("/c.jpg");
    act(() => {
      next?.click();
    });
    expect(images(view)[0].getAttribute("src")).toBe("/a.jpg");
  });

  it('"previous" steps backwards and wraps to the last image', () => {
    const { view } = renderWithCommitLog();
    const prev = view.container.querySelector<HTMLElement>(
      '[aria-label="Previous service image"]',
    );

    act(() => {
      prev?.click();
    });
    expect(images(view)[0].getAttribute("src")).toBe("/c.jpg");
    act(() => {
      prev?.click();
    });
    expect(images(view)[0].getAttribute("src")).toBe("/b.jpg");
  });
});
