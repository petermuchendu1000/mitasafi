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

  describe("the photo carousel", () => {
    it("gives each dot a 44px box while the dot stays 8px", () => {
      // These were 8px targets: the smallest control in the product, on
      // the thing that moves the photos. The button is the box and the
      // dot is a span inside it.
      expect(CODE.gallery).toMatch(
        /className="min-w-\[44px\] min-h-\[44px\] grid place-items-center"/,
      );
      // The visual is still a dot, not a 44px blob.
      expect(CODE.gallery).toMatch(/"h-2 rounded-full transition-all"/);
      expect(CODE.gallery).not.toMatch(/"w-2 h-2 rounded-full transition-all"/);
    });

    it("says which dot is the current one", () => {
      expect(CODE.gallery).toMatch(/aria-current=/);
    });

    it("sizes BOTH arrows and the expand control", () => {
      // Counted, not merely found. The first version asserted the class
      // existed somewhere in the file, and a mutant that shrank only the
      // left arrow passed because the right one still carried it.
      expect(CODE.gallery.match(/w-11 h-11 bg-white\/90/g)).toHaveLength(2);
      expect(CODE.gallery).not.toMatch(/w-10 h-10 bg-white\/90/);
      expect(CODE.gallery).toMatch(
        /min-w-\[44px\] min-h-\[44px\] grid place-items-center rounded-full backdrop-blur-sm/,
      );
    });
  });

  describe("the listing's sticky bottom bar", () => {
    it("lets the price shrink and the buttons stay put", () => {
      // The row came to 412px in a 360px viewport: a price, two labelled
      // buttons and two icons, none of which could shrink.
      const bar = CODE.listingDetail.slice(
        CODE.listingDetail.indexOf("fixed bottom-0"),
      );
      expect(bar).toMatch(/flex-1 min-w-0/);
      expect(bar).toMatch(
        /text-lg sm:text-xl font-bold text-gray-900 truncate/,
      );

      // Counted, not merely found. Three buttons live in this bar, and a
      // mutant that put px-6 back on one of them passed an existence
      // check because the other two still carried px-4 sm:px-6.
      expect(bar.match(/px-4 sm:px-6/g)).toHaveLength(3);
      expect(bar).not.toMatch(/py-3 px-6/);

      // The icons are what pushed it over; all three hide on a phone.
      expect(bar.match(/w-5 h-5 hidden sm:block/g)).toHaveLength(3);
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
