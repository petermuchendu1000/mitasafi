/**
 * @jest-environment jsdom
 */

/**
 * JSX entity escapes must render as the literal characters.
 *
 * WHY THIS EXISTS
 *   17 of the repository's ESLint errors are react/no-unescaped-entities: literal ' and "
 *   sitting in JSX text, in user-facing copy such as
 *       Are you sure you want to delete <span>"{listing.title}"</span>?
 *   The fix is to write &quot; / &apos; instead. That is only acceptable if the rendered
 *   text is byte-identical — otherwise it is a silent copy change across 13 screens.
 *
 *   I had this as [UNKNOWN] and would not assert it without evidence. This is the
 *   evidence, established once for the whole class rather than claimed 17 times.
 *
 *   It can fail: if JSX entity escaping produced the entity text, or a typographic
 *   quote (&rsquo; / &ldquo;) instead of the ASCII character, these assertions report it.
 */

import { render } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";

describe("JSX entity escapes are textually identical to the raw characters", () => {
  it("&quot; renders as an ASCII double quote", () => {
    const escaped = render(<p>delete &quot;My Listing&quot;?</p>);
    const raw = render(<p>{'delete "My Listing"?'}</p>);
    expect(escaped.container.textContent).toBe('delete "My Listing"?');
    expect(escaped.container.textContent).toBe(raw.container.textContent);
  });

  it("&apos; renders as an ASCII apostrophe", () => {
    const escaped = render(<p>you won&apos;t lose it</p>);
    const raw = render(<p>{"you won't lose it"}</p>);
    expect(escaped.container.textContent).toBe("you won't lose it");
    expect(escaped.container.textContent).toBe(raw.container.textContent);
  });

  it("escapes around an interpolation keep the surrounding text intact", () => {
    // The exact shape used in ListingActions.tsx and ListingsGrid.tsx.
    const title = "Kilimani 2BR";
    const escaped = render(
      <p>
        Are you sure you want to delete <span>&quot;{title}&quot;</span>?
      </p>,
    );
    expect(escaped.container.textContent).toBe(
      'Are you sure you want to delete "Kilimani 2BR"?',
    );
  });

  /**
   * The nine sites actually changed, in the JSX shape each one has in its file.
   *
   * The generic cases above establish the mechanism. These establish that THESE
   * STRINGS are unchanged on screen, which is the thing a reader of the diff cares
   * about. Each expectation is the copy as it read BEFORE the escape.
   *
   * These can fail: writing &rsquo; (the repo's other apostrophe form, 4 uses) or
   * &ldquo;/&rdquo; (its commonest double-quote form, 14/13 uses) renders a curly
   * glyph, and every assertion below is on the ASCII character.
   */
  describe("the exact copy at each changed site", () => {
    it("(auth)/signup/page.tsx:895", () => {
      const { container } = render(
        <p>Welcome back! You&apos;re currently signed in as a </p>,
      );
      expect(container.textContent).toBe(
        "Welcome back! You're currently signed in as a ",
      );
    });

    it("dashboard/inquiries/page.tsx:449 — quotes around an interpolation", () => {
      const message = "Is this still available?";
      const { container } = render(<p>&quot;{message}&quot;</p>);
      expect(container.textContent).toBe('"Is this still available?"');
    });

    it("steps/Step3Details.tsx:91", () => {
      const { container } = render(
        <p>Size, condition, and what&apos;s included</p>,
      );
      expect(container.textContent).toBe(
        "Size, condition, and what's included",
      );
    });

    it("steps/Step4Amenities.tsx:142", () => {
      const { container } = render(<h2>What&apos;s included?</h2>);
      expect(container.textContent).toBe("What's included?");
    });

    it("steps/Step4CommercialAmenities.tsx:186", () => {
      const { container } = render(
        <p>What&apos;s included with this commercial space?</p>,
      );
      expect(container.textContent).toBe(
        "What's included with this commercial space?",
      );
    });

    it("steps/Step6Pricing.tsx:181", () => {
      const { container } = render(
        <p>Rent, deposit, and when it&apos;s available</p>,
      );
      expect(container.textContent).toBe(
        "Rent, deposit, and when it's available",
      );
    });

    it("units/[unitId]/add-tenant/page.tsx:272", () => {
      const { container } = render(
        <p>Enter the tenant&apos;s personal details</p>,
      );
      expect(container.textContent).toBe("Enter the tenant's personal details");
    });

    it("components/listings/InquiryModal.tsx:368", () => {
      const { container } = render(
        <p>
          We&apos;ll share your phone with the landlord so they can reach you
        </p>,
      );
      expect(container.textContent).toBe(
        "We'll share your phone with the landlord so they can reach you",
      );
    });

    it("no site renders an entity literally or a typographic glyph", () => {
      const { container } = render(
        <div>
          <p>Welcome back! You&apos;re currently signed in as a</p>
          <p>&quot;a message&quot;</p>
          <p>Size, condition, and what&apos;s included</p>
          <p>What&apos;s included?</p>
          <p>What&apos;s included with this commercial space?</p>
          <p>Rent, deposit, and when it&apos;s available</p>
          <p>Enter the tenant&apos;s personal details</p>
          <p>
            We&apos;ll share your phone with the landlord so they can reach you
          </p>
        </div>,
      );
      const text = container.textContent ?? "";
      expect(text).not.toContain("&apos;");
      expect(text).not.toContain("&quot;");
      expect(text).not.toContain("’"); // right single quote
      expect(text).not.toContain("‘"); // left single quote
      expect(text).not.toContain("“"); // left double quote
      expect(text).not.toContain("”"); // right double quote
      // Eight apostrophes/quote-pairs survived as ASCII.
      expect((text.match(/'/g) || []).length).toBe(7);
      expect((text.match(/"/g) || []).length).toBe(2);
    });
  });

  /**
   * A SOURCE-level guard, because the render tests above cannot provide one.
   *
   * Those tests render their own JSX, so they prove that &apos; decodes to an ASCII
   * apostrophe — not that the files USE &apos;. ESLint cannot tell the difference
   * either: react/no-unescaped-entities accepts &apos;, &lsquo;, &#39; and &rsquo;
   * equally, and &rsquo; renders a CURLY apostrophe. So a well-meaning future fix in
   * one of these files could silently change the glyph on an auth or dashboard screen
   * and every other check in this repo would stay green.
   *
   * These eight files are the ones whose apostrophes and quotes were escaped for the
   * ASCII glyph. Fourteen other files use the typographic forms deliberately and are
   * deliberately not covered here.
   */
  /**
   * Escaping an apostrophe lengthens the line, which can push prettier into moving a
   * JSX text node onto its own line:
   *
   *     <p className="text-gray-500">Rent, deposit, and when it's available</p>
   *  -> <p className="text-gray-500">
   *       Rent, deposit, and when it&apos;s available
   *     </p>
   *
   * A whitespace-insensitive comparison of the two sources reports a difference, which
   * looks like a copy change. It is not one: JSX trims whitespace at the start and end
   * of each line of text and drops lines that are only whitespace. This asserts that,
   * rather than taking it on trust — it happened to two of the eight files here.
   */
  it("re-wrapping a JSX text node does not change the rendered text", () => {
    const inline = render(
      <p className="text-gray-500">
        Rent, deposit, and when it&apos;s available
      </p>,
    );
    const wrapped = render(
      // prettier-ignore
      <p className="text-gray-500">Rent, deposit, and when it&apos;s available</p>,
    );
    expect(inline.container.textContent).toBe(
      "Rent, deposit, and when it's available",
    );
    expect(inline.container.textContent).toBe(wrapped.container.textContent);
  });

  describe("the escaped files keep ASCII glyphs", () => {
    const FILES = [
      "app/(auth)/signup/page.tsx",
      "app/dashboard/inquiries/page.tsx",
      "app/dashboard/landlord/listings/new/steps/Step3Details.tsx",
      "app/dashboard/landlord/listings/new/steps/Step4Amenities.tsx",
      "app/dashboard/landlord/listings/new/steps/Step4CommercialAmenities.tsx",
      "app/dashboard/landlord/listings/new/steps/Step6Pricing.tsx",
      "app/dashboard/landlord/buildings/[id]/units/[unitId]/add-tenant/page.tsx",
      "components/listings/InquiryModal.tsx",
    ];

    it.each(FILES)("%s uses no typographic entity", (relative) => {
      const source = readFileSync(join(__dirname, "..", relative), "utf8");
      expect(source).not.toContain("&rsquo;");
      expect(source).not.toContain("&lsquo;");
      expect(source).not.toContain("&ldquo;");
      expect(source).not.toContain("&rdquo;");
    });
  });

  it("does NOT silently produce typographic quotes", () => {
    const { container } = render(<p>&quot;a&quot; and &apos;b&apos;</p>);
    expect(container.textContent).not.toContain("“"); // left double
    expect(container.textContent).not.toContain("”"); // right double
    expect(container.textContent).not.toContain("‘"); // left single
    expect(container.textContent).not.toContain("’"); // right single
    expect(container.textContent).toBe("\"a\" and 'b'");
  });
});
