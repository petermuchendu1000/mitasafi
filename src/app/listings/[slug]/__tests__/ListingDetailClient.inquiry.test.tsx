/**
 * @jest-environment jsdom
 */

/**
 * The inquiry modal is derived from the URL and a session flag, and cleaning the URL
 * no longer throws the other query parameters away.
 *
 * Two separate things are covered here.
 *
 * THE LINT FINDING. An effect read ?openInquiry=true plus sessionStorage and called
 * setInquiryOpen(true). Because useEffect is passive, a visitor returning from signup
 * got one painted frame of the page without the modal before it appeared.
 *
 * THE BUG THAT WAS SITTING NEXT TO IT, which is the more serious of the two. The same
 * effect cleaned the flag out of the address bar with
 *     window.history.replaceState({}, "", url.pathname)
 * after building `url` with the parameter removed — and then passed only the PATH.
 * Every other query parameter went with it.
 */

import { render, act } from "@testing-library/react";
import { Profiler } from "react";

const searchParams = { value: new URLSearchParams() };
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSearchParams: () => searchParams.value,
}));

jest.mock("@/components/landing", () => ({
  Navbar: () => null,
  Footer: () => null,
}));
// InquiryModal is imported from the BARREL, not from its own module, so stubbing
// "@/components/listings/InquiryModal" has no effect on this component. Mocking the
// wrong one of those is why an earlier run of this file failed with "Element type is
// invalid" on every test.
jest.mock("@/components/listings", () => ({
  ListingGallery: () => null,
  // The real prop is onContact, not onInquire. Getting that wrong gave a button that
  // rendered, satisfied `expect(contact).toBeDefined()`, and did nothing when clicked.
  ListingPriceCard: ({ onContact }: { onContact?: () => void }) => (
    <button data-testid="price-card-contact" onClick={onContact}>
      Contact landlord
    </button>
  ),
  ListingMap: () => null,
  ListingDetails: () => null,
  ListingLandlord: () => null,
  SimilarListings: () => null,
  InquiryModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="inquiry-modal" /> : null,
}));
jest.mock("@/components/listings/UnavailableListingModal", () => ({
  UnavailableListingModal: () => null,
}));

import { ListingDetailClient } from "../ListingDetailClient";

const LISTING = {
  id: "listing-1",
  slug: "riverside-court",
  title: "Riverside Court 2BR",
  description: "A flat",
  property_type: "apartment",
  listing_category: "residential",
  area: "Kilimani",
  city: "Nairobi",
  address: null,
  latitude: null,
  longitude: null,
  hide_exact_address: false,
  landmarks: null,
  building_name: null,
  bedrooms: 2,
  bathrooms: 1,
  size_sqft: null,
  rent_amount: 85000,
  deposit_amount: null,
  currency: "KES",
  available_from: null,
  available_now: true,
  is_verified: true,
  status: "active",
  photos: [],
  cover_photo: null,
  amenities: [],
  published_at: "2026-01-01T00:00:00.000Z",
  views_count: 0,
  landlord_id: "ll1",
  landlord_name: "Peter Kamau",
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-11-01T00:00:00.000Z",
} as never;

const PRICE_BREAKDOWN = {
  rent: 85000,
  serviceCharge: 5000,
  totalMonthly: 90000,
  depositMonths: 2,
  depositAmount: 170000,
  moveInCost: 260000,
  currency: "KES",
  rentIncludes: [],
  isNegotiable: true,
} as never;

/**
 * Records the DOM at EVERY commit, including the first.
 *
 * Reading `view.container` inside onRender cannot capture the first commit: render()
 * has not returned yet, so there is nothing to read, and capturing it afterwards is
 * too late because render() runs inside act() and act() has already flushed the
 * effects. An earlier version of this helper did exactly that, and the mutant that
 * puts the effect back passed all eight tests. document.body is where Testing Library
 * mounts, and it exists from the first commit onwards.
 */
function renderPage(isAuthenticated: boolean) {
  const commits: string[] = [];
  const view = render(
    <Profiler
      id="ldc"
      onRender={() => {
        commits.push(document.body.innerHTML);
      }}
    >
      <ListingDetailClient
        listing={LISTING}
        priceBreakdown={PRICE_BREAKDOWN}
        similarListings={[]}
        isAuthenticated={isAuthenticated}
      />
    </Profiler>,
  );
  return { view, commits };
}

beforeEach(() => {
  sessionStorage.clear();
  searchParams.value = new URLSearchParams();
  window.history.replaceState({}, "", "/listings/riverside-court");
});

describe("cleaning ?openInquiry out of the address bar", () => {
  it("KEEPS the other query parameters", () => {
    window.history.replaceState(
      {},
      "",
      "/listings/riverside-court?openInquiry=true&ref=whatsapp&utm_source=newsletter",
    );
    searchParams.value = new URLSearchParams(
      "openInquiry=true&ref=whatsapp&utm_source=newsletter",
    );

    renderPage(true);

    // The old code passed url.pathname alone, so ref and utm_source vanished from the
    // address bar — and from anything that read them afterwards.
    expect(window.location.search).toBe("?ref=whatsapp&utm_source=newsletter");
    expect(window.location.pathname).toBe("/listings/riverside-court");
  });

  it("removes the flag itself", () => {
    window.history.replaceState(
      {},
      "",
      "/listings/riverside-court?openInquiry=true",
    );
    searchParams.value = new URLSearchParams("openInquiry=true");

    renderPage(true);

    expect(window.location.search).toBe("");
  });

  it("leaves the URL alone when the flag is not there", () => {
    window.history.replaceState({}, "", "/listings/riverside-court?ref=x");
    searchParams.value = new URLSearchParams("ref=x");

    renderPage(true);

    expect(window.location.search).toBe("?ref=x");
  });
});

describe("the modal is derived, not opened by an effect", () => {
  it("is open in the FIRST commit when the URL asks for it", () => {
    searchParams.value = new URLSearchParams("openInquiry=true");

    const { commits } = renderPage(true);

    // With the effect, the first commit had no modal and the second did.
    expect(commits[0]).toContain('data-testid="inquiry-modal"');
  });

  it("stays shut for a signed-out visitor even with the flag set", () => {
    searchParams.value = new URLSearchParams("openInquiry=true");
    const { view } = renderPage(false);
    expect(
      view.container.querySelector('[data-testid="inquiry-modal"]'),
    ).toBeNull();
  });

  it("stays shut when the visitor already dismissed it this session", () => {
    sessionStorage.setItem("inquiry-dismissed-listing-1", "true");
    searchParams.value = new URLSearchParams("openInquiry=true");

    const { view, commits } = renderPage(true);

    expect(
      view.container.querySelector('[data-testid="inquiry-modal"]'),
    ).toBeNull();
    for (const html of commits) {
      expect(html).not.toContain('data-testid="inquiry-modal"');
    }
  });

  it("stays shut with no flag at all", () => {
    const { view } = renderPage(true);
    expect(
      view.container.querySelector('[data-testid="inquiry-modal"]'),
    ).toBeNull();
  });

  it("opens from a Contact button, with no flag in the URL", () => {
    const { view } = renderPage(true);

    const contact = [...view.container.querySelectorAll("button")].find((b) =>
      /contact|inquire|message/i.test(b.textContent ?? ""),
    );
    expect(contact).toBeDefined();
    act(() => {
      contact?.click();
    });

    expect(
      view.container.querySelector('[data-testid="inquiry-modal"]'),
    ).not.toBeNull();
  });
});
