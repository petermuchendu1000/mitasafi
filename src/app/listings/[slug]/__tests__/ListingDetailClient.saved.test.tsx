/**
 * @jest-environment jsdom
 */

/**
 * The listing detail page's saved state.
 *
 * WHY THIS EXISTS
 *   This page was the last of the five independent owners of "mitasafi_saved_listings".
 *   It declared the key twice (handleSave and a mount effect), seeded React state from
 *   the effect — the react-hooks/set-state-in-effect error — and subscribed to nothing.
 *
 *   The page renders THREE readers of that key at once: this heart, the Navbar count, and
 *   the SimilarListings cards. Only this one did not listen, which was measured in a real
 *   browser before the change:
 *
 *     after a save made elsewhere : stored=1  navbar badge=1  this heart=NOT SAVED
 *     then clicking this heart    : stored=2  navbar badge=2  this heart=SAVED
 *
 *   The second line is the part worth testing. Because the component still believed the
 *   listing was unsaved, handleSave took its "add" branch and PUSHED A SECOND ENTRY for
 *   the same listing id. So the stale heart was not cosmetic: it corrupted storage and
 *   inflated every count drawn from it.
 *
 * THE DISCRIMINATING OBSERVATION
 *   "does not append a duplicate" asserts on the stored ids, so it can return either
 *   answer. Against the unmodified component it yields ["x","x"]; it now yields [].
 */

import { render, screen, act, fireEvent } from "@testing-library/react";
import { ListingDetailClient } from "../ListingDetailClient";
import {
  writeSavedListings,
  readSavedListings,
  resetSavedListingsCacheForTests,
} from "@/lib/saved-listings/store";
import type {
  Listing,
  PriceBreakdown,
  ListingCard,
} from "@/lib/listings/types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// The page's children pull in Supabase, Mapbox and a modal tree. None of them read the
// saved-listings key, so they are stubbed to keep this test about the heart.
jest.mock("@/components/landing", () => ({
  Navbar: () => null,
  Footer: () => null,
}));
jest.mock("@/components/listings", () => ({
  ListingGallery: () => null,
  ListingPriceCard: () => null,
  ListingMap: () => null,
  ListingDetails: () => null,
  ListingLandlord: () => null,
  InquiryModal: () => null,
  SimilarListings: () => null,
}));
jest.mock("@/components/listings/UnavailableListingModal", () => ({
  UnavailableListingModal: () => null,
}));

const SAVE = "Save listing";
const UNSAVE = "Remove from saved";

const listing = {
  id: "fixture-listing-0001",
  landlord_id: "landlord-1",
  building_id: null,
  unit_id: null,
  title: "2 Bedroom Apartment in Kilimani",
  description: "fixture",
  property_type: "apartment",
  building_name: null,
  address: null,
  area: "Kilimani",
  city: "Nairobi",
  landmarks: null,
  latitude: null,
  longitude: null,
  hide_exact_address: true,
  bedrooms: 2,
  bathrooms: 1,
  size_sqft: 900,
  size_unit: "sqft",
  floor_level: null,
  total_floors: null,
  year_built: null,
  condition: "good",
  furnishing: "semi_furnished",
  amenities: null,
  parking: "covered",
  parking_spaces: 1,
  pet_policy: "case_by_case",
  smoking_policy: "balcony_only",
  pets_allowed: true,
  smoking_allowed: false,
  children_allowed: true,
  security_features: {},
  utilities: {},
  photos: [],
  cover_photo: null,
  video_url: null,
  rent_amount: 65000,
  currency: "KES",
  rent_negotiable: true,
  deposit_months: 2,
  deposit_amount: 130000,
  service_charge: 5000,
  lease_term: "monthly",
  min_lease_months: 6,
  available_from: null,
  available_now: true,
  payment_methods: ["mpesa"],
  rent_includes: null,
  status: "active",
  views_count: 1,
  inquiries_count: 0,
  is_verified: true,
  published_at: "2026-11-01T00:00:00.000Z",
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-11-01T00:00:00.000Z",
} as Listing;

const priceBreakdown: PriceBreakdown = {
  rent: 65000,
  serviceCharge: 5000,
  totalMonthly: 70000,
  depositMonths: 2,
  depositAmount: 130000,
  moveInCost: 200000,
  currency: "KES",
  rentIncludes: [],
  isNegotiable: true,
};

const similarListings: ListingCard[] = [];

function renderPage() {
  return render(
    <ListingDetailClient
      listing={listing}
      priceBreakdown={priceBreakdown}
      similarListings={similarListings}
      isAuthenticated={false}
    />,
  );
}

describe("ListingDetailClient saved state", () => {
  beforeEach(() => {
    localStorage.clear();
    resetSavedListingsCacheForTests();
  });

  it("reflects a save made elsewhere", () => {
    renderPage();
    expect(screen.getByLabelText(SAVE)).toBeInTheDocument();

    act(() => {
      writeSavedListings([
        { listingId: listing.id, savedAt: "2026-01-02T00:00:00.000Z" },
      ]);
    });

    expect(screen.getByLabelText(UNSAVE)).toBeInTheDocument();
  });

  it("does not append a duplicate after a save made elsewhere", () => {
    renderPage();

    act(() => {
      writeSavedListings([
        { listingId: listing.id, savedAt: "2026-01-02T00:00:00.000Z" },
      ]);
    });

    // The heart now knows it is saved, so this click must UNSAVE. Before the migration
    // the component still thought it was unsaved and pushed a second entry: ["x","x"].
    fireEvent.click(screen.getByLabelText(UNSAVE));

    expect(readSavedListings().map((s) => s.listingId)).toEqual([]);
  });

  it("saves and unsaves from its own button", () => {
    renderPage();

    fireEvent.click(screen.getByLabelText(SAVE));
    expect(readSavedListings().map((s) => s.listingId)).toEqual([listing.id]);
    expect(readSavedListings()[0].lastKnownStatus).toBe("active");

    fireEvent.click(screen.getByLabelText(UNSAVE));
    expect(readSavedListings()).toHaveLength(0);
  });

  it("starts saved when the listing is already in storage", () => {
    writeSavedListings([
      { listingId: listing.id, savedAt: "2026-01-02T00:00:00.000Z" },
    ]);
    renderPage();
    expect(screen.getByLabelText(UNSAVE)).toBeInTheDocument();
  });

  it("leaves no window listener behind after unmount", () => {
    const live = new Map<string, Set<unknown>>();
    const realAdd = window.addEventListener.bind(window);
    const realRemove = window.removeEventListener.bind(window);

    window.addEventListener = ((t: string, f: never, o?: never) => {
      if (!live.has(t)) live.set(t, new Set());
      live.get(t)!.add(f);
      return realAdd(t, f, o);
    }) as typeof window.addEventListener;
    window.removeEventListener = ((t: string, f: never, o?: never) => {
      live.get(t)?.delete(f);
      return realRemove(t, f, o);
    }) as typeof window.removeEventListener;

    const total = () => [...live.values()].reduce((n, s) => n + s.size, 0);
    const before = total();

    for (let i = 0; i < 3; i += 1) renderPage().unmount();

    const after = total();

    window.addEventListener = realAdd;
    window.removeEventListener = realRemove;

    expect(after).toBe(before);
  });
});
