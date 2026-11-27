/**
 * The tenant and customer pages, and the listing a visitor lands on.
 *
 * Same scanning rule as the other two mobile suites: a className carrying
 * a focus ring is a control, and a control sized by padding below py-3
 * has to say min-h-[44px] out loud. See the note in
 * src/app/dashboard/landlord/__tests__/list-pages-mobile.test.ts for why
 * the rule is anchored on the ring and why py-3 is the cut-off.
 *
 * WHAT IS LEFT SMALL ON PURPOSE
 *   "Need help? Contact support@mitasafi.com" on the settings page. WCAG
 *   2.5.8 exempts a target inside a block of text, and it is the only
 *   small target left on any of these pages.
 */

import fs from "fs";
import path from "path";

const FILES = {
  shell: "src/components/dashboard/services/CustomerDashboardShell.tsx",
  profile: "src/app/dashboard/profile/ProfileEditForm.tsx",
  settings: "src/app/dashboard/settings/CustomerSettingsClient.tsx",
  notifications: "src/app/dashboard/notifications/NotificationsPageClient.tsx",
  bookings: "src/app/dashboard/bookings/page.tsx",
  reviews: "src/app/dashboard/reviews/CustomerReviewsList.tsx",
  savedProviders: "src/app/dashboard/saved-providers/SavedProvidersList.tsx",
  searches: "src/app/dashboard/searches/page.tsx",
  saved: "src/app/saved/page.tsx",
  gallery: "src/components/listings/ListingGallery.tsx",
  listingDetail: "src/app/listings/[slug]/ListingDetailClient.tsx",
  listingDetails: "src/components/listings/ListingDetails.tsx",
  priceCard: "src/components/listings/ListingPriceCard.tsx",
  propertyDetail: "src/app/properties/[id]/page.tsx",
} as const;

type Name = keyof typeof FILES;

function strip(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const CODE = Object.fromEntries(
  Object.entries(FILES).map(([name, rel]) => [
    name,
    strip(fs.readFileSync(path.join(process.cwd(), rel), "utf8")),
  ]),
) as Record<Name, string>;

/** Padding that cannot reach 44px. py-3 is 44 around text-sm, 48 around text-base. */
const TOO_SHORT = /\bpy-(0|0\.5|1|1\.5|2|2\.5)\b/;

describe("tenant pages and the listing detail", () => {
  it("is reading all of them", () => {
    for (const name of Object.keys(FILES) as Name[]) {
      expect(CODE[name].length).toBeGreaterThan(500);
    }
  });

  it.each(Object.keys(FILES) as Name[])(
    "%s sizes every focusable control it styles",
    (name) => {
      const small = [
        ...CODE[name].matchAll(/"([^"]*focus(?:-visible)?:ring[^"]*)"/g),
      ]
        .map((m) => m[1])
        .filter((cls) => !cls.includes("sr-only"))
        .filter((cls) => TOO_SHORT.test(cls) && !/min-h-\[44px\]/.test(cls));
      expect(small).toEqual([]);
    },
  );

  // The gallery, price card and mobile action bar use CSS modules.
  //
  // Follow the styles that size the controls and prevent long prices from overflowing.
  const CSS = {
    gallery: fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/listings/listing-gallery.module.css",
      ),
      "utf8",
    ),
    price: fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/listings/listing-price.module.css",
      ),
      "utf8",
    ),
    detail: fs.readFileSync(
      path.join(process.cwd(), "src/app/listings/[slug]/listing-detail.module.css"),
      "utf8",
    ),
  };

  /** The min-height / min-width a selector declares, in px. */
  function minBox(css: string, selector: string) {
    const rule = css
      .split("\n")
      .find((l) => l.trimStart().startsWith(selector) && l.includes("{"));
    const h = rule?.match(/min-height:\s*(\d+)px/);
    const w = rule?.match(/min-width:\s*(\d+)px/);
    return { h: h ? Number(h[1]) : null, w: w ? Number(w[1]) : null };
  }

  describe("the photo carousel", () => {
    it("gives every control a 44px box", () => {
      expect(
        minBox(CSS.gallery, ".photoControl, .viewPhotos, .viewerControl").h,
      ).toBe(44);
      // The round ones need the width too, or min-height alone gives a pill.
      expect(minBox(CSS.gallery, ".photoControl, .viewerControl").w).toBe(44);
    });

    it("covers the filmstrip and the category chips, not just the arrows", () => {
      // Counted the same way as before: one rule must name all of them, so a
      // mutant that drops a single selector from it is caught.
      const rule =
        CSS.gallery.split("\n").find((l) => /min-height:\s*44px/.test(l)) ?? "";
      expect(rule).toContain(".photoControl");
      expect(rule).toContain(".viewPhotos");
      expect(rule).toContain(".viewerControl");
      expect(rule).toContain(".categories button");
      expect(rule).toContain(".filmstrip button");
    });

    it("says which photo is the current one", () => {
      expect(CODE.gallery).toMatch(/aria-current=\{viewerIndex === index/);
    });

    it("sizes both arrows and the button that opens the viewer", () => {
      expect(CODE.gallery.match(/className=\{styles\.photoControl\}/g)).toHaveLength(2);
      expect(CODE.gallery).toContain("className={styles.viewPhotos}");
    });
  });

  describe("the price card", () => {
    it("gives every action a 44px box", () => {
      expect(minBox(CSS.price, ".actions button").h).toBe(44);
    });

    it("lets a long price shrink instead of widening the card", () => {
      // The old bar came to 412px in a 360px viewport because the price
      // could not shrink. Whatever replaces it must not repeat that.
      expect(CSS.price).toMatch(/\.card\s*\{[^}]*min-width:\s*0/);
      expect(CSS.price).toMatch(/\.amount\s*\{[^}]*overflow-wrap:\s*anywhere/);
    });
  });

  describe("the mobile action bar", () => {
    it("lets the price shrink and keeps the actions touch-sized", () => {
      expect(CODE.listingDetail).toContain("className={styles.mobileBar}");
      expect(CSS.detail).toMatch(/\.mobilePrice \{[^}]*flex: 1;[^}]*min-width: 0/);
      expect(CSS.detail).toMatch(/\.mobilePrice strong \{[^}]*overflow-wrap: anywhere/);
      expect(CSS.detail).toMatch(/\.mobileBar button \{[^}]*flex: none;[^}]*min-height: 44px/);
    });
  });

  describe("the public property page", () => {
    it("renders no control that does nothing when pressed", () => {
      // A share button and a heart button stood in its header with no
      // onClick, no form and no handler of any kind: two unnamed 36px
      // circles on the page a visitor lands on from a search result.
      expect(CODE.propertyDetail).not.toMatch(
        /className="p-2 rounded-full hover:bg-gray-100 transition-colors"/,
      );
      expect(CODE.propertyDetail).not.toMatch(/<Share2\b/);
      expect(CODE.propertyDetail).not.toMatch(/<Heart\b/);
    });

    it("still shows the listing, so the check above is not vacuous", () => {
      expect(CODE.propertyDetail).toMatch(/Back to search/);
    });
  });

  it("sizes every row of the customer sidebar", () => {
    // Nine links at 40px, on nine pages.
    expect(CODE.shell).toMatch(
      /flex items-center justify-between px-3 min-h-\[44px\] rounded-lg/,
    );
    expect(CODE.shell).not.toMatch(/px-3 py-2\.5 rounded-lg text-sm/);
  });

  it("keeps the notification switch a switch", () => {
    // The 44px box went on the button and the 24px pill stayed a pill.
    // Putting the height on the button would have made it a lozenge.
    expect(CODE.settings).toMatch(
      /grid min-h-\[44px\] min-w-\[44px\] place-items-center/,
    );
    expect(CODE.settings).toMatch(/h-6 w-11 items-center rounded-full/);
    expect(CODE.settings).toMatch(/role="switch"/);
  });

  describe("tab rows with no focus ring", () => {
    /**
     * Neither of these declares a ring, so the rule at the top of this
     * file cannot see them, and a mutant that put py-2 back on the
     * notification filters passed. Named explicitly instead.
     */
    it("sizes the notification filters", () => {
      expect(CODE.notifications).toMatch(
        /px-4 min-h-\[44px\] text-sm font-medium rounded-md/,
      );
      expect(CODE.notifications).not.toMatch(
        /px-4 py-2 text-sm font-medium rounded-md/,
      );
    });

    it("sizes the bookings tabs", () => {
      // pb-3 is not a py- utility, so the padding rule cannot catch this
      // one either, ring or no ring.
      expect(CODE.bookings).toMatch(
        /inline-flex items-center min-h-\[44px\] pb-3 text-sm font-medium border-b-2/,
      );
    });
  });
});
