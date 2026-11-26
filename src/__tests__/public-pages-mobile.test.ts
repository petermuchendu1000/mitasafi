/**
 * The pages a visitor sees before signing in.
 *
 * Same scanning rule as the landlord list pages: a className carrying
 * `focus:ring` is a control, and a control sized by padding alone is one
 * of the 30px to 42px boxes the browser run flagged across these pages.
 * Nothing here is a substitute for the measurement, which is in the
 * evidence ledger; this is what stops the measurement going stale.
 *
 * WHAT IS DELIBERATELY NOT REQUIRED TO BE 44px
 *   A link inside a sentence. "Already have an account? Log in" and "I
 *   agree to the Terms of Service" are text, and WCAG 2.5.8 exempts a
 *   target "in a sentence or block of text" for exactly this reason:
 *   forcing it to 44px either breaks the line or inflates the paragraph.
 *   Those are the only small targets left on /login, /signup and
 *   /services, and they are left on purpose.
 */

import fs from "fs";
import path from "path";

const FILES = {
  navbar: "src/components/landing/Navbar.tsx",
  footer: "src/components/landing/Footer.tsx",
  hero: "src/components/landing/Hero.tsx",
  discovery: "src/components/landing/ServiceDiscoverySection.tsx",
  faq: "src/components/landing/FAQSection.tsx",
  contact: "src/app/contact/page.tsx",
  properties: "src/app/properties/page.tsx",
  searchFilters: "src/components/browse/SearchFilters.tsx",
  lowInventory: "src/components/browse/LowInventoryBanner.tsx",
  listingCard: "src/components/shared/ListingCard.tsx",
  servicesNav: "src/components/services-landing/ServicesNavbar.tsx",
  servicesHero: "src/components/services-landing/ServicesHero.tsx",
  servicesGrid: "src/components/services-landing/ServicesCategoryGrid.tsx",
  servicesAreas: "src/components/services-landing/ServicesAreaCoverage.tsx",
  servicesPricing: "src/components/services-landing/ServicesPricingPreview.tsx",
  servicesTestimonials:
    "src/components/services-landing/ServicesTestimonials.tsx",
  pricing: "src/components/landing/PricingSection.tsx",
} as const;

type Name = keyof typeof FILES;

/** Source with comments removed: they quote the old wording. */
function strip(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const CODE = Object.fromEntries(
  Object.entries(FILES).map(([name, rel]) => [
    name,
    strip(fs.readFileSync(path.join(process.cwd(), rel), "utf8")),
  ]),
) as Record<Name, string>;

/**
 * Classes that are allowed to stay small.
 *
 * sr-only is the skip link and the visually hidden labels: they are 1px
 * by design and become visible on focus.
 */
function sizedControls(code: string): string[] {
  return [...code.matchAll(/"([^"]*focus(?:-visible)?:ring[^"]*)"/g)]
    .map((m) => m[1])
    .filter((cls) => !cls.includes("sr-only"));
}

/**
 * Vertical padding that cannot reach a 44px box.
 *
 * py-3 is 12px each side; around text-sm's 20px line box that is 44px and
 * around text-base's 24px it is 48px, which is why the browser run never
 * flagged a py-3 control. Anything below it can be short, so anything
 * below it has to say min-h-[44px] out loud. Flagging py-3 as well was
 * stricter than the measurement and would have forced a redundant class
 * onto controls that were already the right size.
 */
const TOO_SHORT = /\bpy-(0|0\.5|1|1\.5|2|2\.5)\b/;

describe("public pages, mobile", () => {
  it("is reading all of them", () => {
    for (const name of Object.keys(FILES) as Name[]) {
      expect(CODE[name].length).toBeGreaterThan(500);
    }
  });

  it.each(Object.keys(FILES) as Name[])(
    "%s sizes every focusable control it styles",
    (name) => {
      const small = sizedControls(CODE[name]).filter(
        (cls) => TOO_SHORT.test(cls) && !/min-h-\[44px\]/.test(cls),
      );
      expect(small).toEqual([]);
    },
  );

  describe("the contact page", () => {
    it("publishes no phone number nobody answers", () => {
      // It read "+254 700 000 000" behind tel:+254700000000. 700 000 000
      // is the placeholder a template ships with. On a rental platform's
      // contact page that is worse than no number: somebody with a problem
      // taps it, hears nothing, and concludes the company is not real.
      expect(CODE.contact).not.toContain("700000000");
      expect(CODE.contact).not.toContain("700 000 000");
    });

    it("still offers a way to get in touch", () => {
      // Without this, deleting the whole contact block would pass above.
      expect(CODE.contact).toMatch(/mailto:\$\{CONTACT_EMAIL\}/);
    });
  });

  describe("the saved-listings control in the header", () => {
    it("has a name of its own, not only a title", () => {
      // A title is not shown on a touch device and is a weak accessible
      // name everywhere else. This control has no text at all.
      const badge = CODE.navbar.slice(
        CODE.navbar.indexOf("function SavedCountBadge"),
        CODE.navbar.indexOf("export function Navbar"),
      );
      expect(badge).toMatch(/aria-label=/);
    });
  });

  it("uses no bare arrow glyph as a call to action", () => {
    // "Join our network →", "Browse All Areas →", "Get a Free Quote →".
    // The arrow did no work the link text was not already doing.
    //
    // Swept over the whole of both landing directories, not the file list
    // above: the first version checked only the files this pass happened
    // to touch, and a mutant that put the arrow back in
    // NeighborhoodsSection, which it had not, passed.
    const offenders: string[] = [];
    for (const dir of [
      "src/components/landing",
      "src/components/services-landing",
    ]) {
      const base = path.join(process.cwd(), dir);
      for (const file of fs.readdirSync(base)) {
        if (!file.endsWith(".tsx")) continue;
        const code = strip(fs.readFileSync(path.join(base, file), "utf8"));
        if (code.includes("\u2192")) offenders.push(`${dir}/${file}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  describe("controls sized by hand", () => {
    /**
     * The rule above can only see a control that declares a focus ring.
     * These five do not: they are styled with hover: alone, or their ring
     * lives on a parent. A mutant that put p-2 back on the save-listing
     * heart passed against the rule, so each one is named here.
     */
    const SIZED: [Name, string][] = [
      [
        "footer",
        "min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-gray-800",
      ],
      ["footer", "inline-flex items-center gap-2 min-h-[44px] text-gray-400"],
      [
        "searchFilters",
        "flex-shrink-0 px-3 min-h-[44px] rounded-full text-sm font-medium transition-all",
      ],
      [
        "listingCard",
        "min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full",
      ],
      ["servicesHero", "px-4 min-h-[44px] rounded-full backdrop-blur-sm"],
      ["servicesAreas", "px-4 min-h-[44px] rounded-full text-sm font-medium"],
      ["lowInventory", "px-3 min-h-[44px] bg-gray-900"],
      ["discovery", "px-3 min-h-[44px] text-sm text-gray-600 bg-white/80"],
      ["hero", "inline-flex items-center min-h-[44px] gap-2"],
    ];

    it.each(SIZED)("%s keeps %s", (name, snippet) => {
      expect(CODE[name]).toContain(snippet);
    });
  });

  it("lets the pricing toggle wrap", () => {
    // Three fixed-width buttons in an inline-flex came to 363px and pushed
    // the home page to 340px in a 320px viewport. Measured, both ways.
    expect(CODE.pricing).toMatch(/flex flex-wrap justify-center bg-gray-100/);
    expect(CODE.pricing).not.toMatch(/inline-flex bg-gray-100/);
  });
});
