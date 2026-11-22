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

  it("does NOT silently produce typographic quotes", () => {
    const { container } = render(<p>&quot;a&quot; and &apos;b&apos;</p>);
    expect(container.textContent).not.toContain("“"); // left double
    expect(container.textContent).not.toContain("”"); // right double
    expect(container.textContent).not.toContain("‘"); // left single
    expect(container.textContent).not.toContain("’"); // right single
    expect(container.textContent).toBe("\"a\" and 'b'");
  });
});
