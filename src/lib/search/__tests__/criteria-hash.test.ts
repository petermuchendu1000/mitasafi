/**
 * The canonical search hash.
 *
 * Two properties matter, and the second is the one that could quietly hurt people:
 *
 *  1. The same logical search hashes the same however the object was built. That is
 *     the defect being closed — JSON.stringify serialises in insertion order, and
 *     array filters compared by order too.
 *
 *  2. Entries ALREADY in users' browsers still match. They were written by the old
 *     scheme as plain JSON.stringify output. If canonicalising broke them, every
 *     saved search anyone has would silently stop being recognised and the button
 *     would offer to save it again. There is no migration, so this compatibility is
 *     the only thing standing between the change and that outcome.
 */

import {
  canonicalSearchHash,
  canonicalHashOfStoredEntry,
  storedListContains,
  type SearchCriteria,
} from "../criteria-hash";

describe("the same search hashes the same", () => {
  it("ignores the order the keys were written in", () => {
    const a = { areas: ["Kilimani"], bedroomsMin: 2, priceMax: 90000 };
    const b = { priceMax: 90000, areas: ["Kilimani"], bedroomsMin: 2 };
    expect(canonicalSearchHash(a)).toBe(canonicalSearchHash(b));
  });

  it("ignores the order of values inside an array filter", () => {
    const a = { areas: ["Kilimani", "Westlands"] };
    const b = { areas: ["Westlands", "Kilimani"] };
    expect(canonicalSearchHash(a)).toBe(canonicalSearchHash(b));
  });

  it("treats an absent filter and an undefined one as the same", () => {
    const a = { areas: ["Kilimani"], priceMin: undefined };
    const b = { areas: ["Kilimani"] };
    expect(canonicalSearchHash(a)).toBe(canonicalSearchHash(b));
  });

  it("treats an empty array as no filter", () => {
    expect(canonicalSearchHash({ areas: [], bedroomsMin: 2 })).toBe(
      canonicalSearchHash({ bedroomsMin: 2 }),
    );
  });

  it("treats null like undefined", () => {
    expect(
      canonicalSearchHash({ areas: ["Kilimani"], query: null as never }),
    ).toBe(canonicalSearchHash({ areas: ["Kilimani"] }));
  });
});

describe("different searches stay different", () => {
  it("a different area", () => {
    expect(canonicalSearchHash({ areas: ["Kilimani"] })).not.toBe(
      canonicalSearchHash({ areas: ["Westlands"] }),
    );
  });

  it("an extra area", () => {
    expect(canonicalSearchHash({ areas: ["Kilimani"] })).not.toBe(
      canonicalSearchHash({ areas: ["Kilimani", "Westlands"] }),
    );
  });

  it("a different price ceiling", () => {
    expect(canonicalSearchHash({ priceMax: 90000 })).not.toBe(
      canonicalSearchHash({ priceMax: 95000 }),
    );
  });

  it("keeps priceMin: 0, which is a real filter and not an unset one", () => {
    // The reason falsy values are not dropped wholesale. Collapsing `0` here would
    // make "under any price, from zero" the same search as "no price filter".
    expect(canonicalSearchHash({ priceMin: 0, areas: ["Kilimani"] })).not.toBe(
      canonicalSearchHash({ areas: ["Kilimani"] }),
    );
  });

  it("keeps verifiedOnly: false distinct from absent", () => {
    // Arguably these are the same search. They are left distinct on purpose: the rule
    // that would collapse this would also have to collapse priceMin: 0, and guessing
    // which falsy values are defaults is how data gets quietly merged.
    expect(canonicalSearchHash({ verifiedOnly: false })).not.toBe(
      canonicalSearchHash({}),
    );
  });
});

describe("entries already in users' browsers keep matching", () => {
  const criteria: SearchCriteria = {
    areas: ["Kilimani"],
    propertyTypes: ["apartment"],
    bedroomsMin: 2,
    priceMax: 90000,
  };

  it("a legacy JSON.stringify entry canonicalises to the new hash", () => {
    const legacy = JSON.stringify(criteria);
    expect(canonicalHashOfStoredEntry(legacy)).toBe(
      canonicalSearchHash(criteria),
    );
  });

  it("a legacy entry built in a DIFFERENT key order also matches", () => {
    // This is the case the old comparison got wrong, now resolved in the stored
    // direction as well as the live one.
    const legacy = JSON.stringify({
      priceMax: 90000,
      bedroomsMin: 2,
      propertyTypes: ["apartment"],
      areas: ["Kilimani"],
    });
    expect(canonicalHashOfStoredEntry(legacy)).toBe(
      canonicalSearchHash(criteria),
    );
  });

  it("a legacy entry carrying explicit undefineds matches", () => {
    // JSON.stringify drops undefined, which is exactly why those entries survive.
    const legacy = JSON.stringify({ ...criteria, query: undefined });
    expect(canonicalHashOfStoredEntry(legacy)).toBe(
      canonicalSearchHash(criteria),
    );
  });

  it("storedListContains finds a legacy entry among newer ones", () => {
    const stored = [
      canonicalSearchHash({ areas: ["Westlands"] }),
      JSON.stringify(criteria),
    ];
    expect(storedListContains(stored, criteria)).toBe(true);
  });

  it("storedListContains says no when the search really is new", () => {
    const stored = [JSON.stringify({ areas: ["Westlands"] })];
    expect(storedListContains(stored, criteria)).toBe(false);
  });
});

describe("hand-edited storage", () => {
  it("a non-JSON entry is compared literally rather than discarded", () => {
    expect(canonicalHashOfStoredEntry("not json at all")).toBe(
      "not json at all",
    );
  });

  it("a non-JSON entry does not crash a lookup", () => {
    expect(() =>
      storedListContains(["{{{", "null", "7"], { areas: ["Kilimani"] }),
    ).not.toThrow();
    expect(storedListContains(["{{{"], { areas: ["Kilimani"] })).toBe(false);
  });

  it("a stored primitive does not match an object search", () => {
    expect(storedListContains(["7"], { areas: ["Kilimani"] })).toBe(false);
  });
});

describe("the hash is stable across calls", () => {
  it("returns the same string for the same input twice", () => {
    const c = { areas: ["Kilimani", "Westlands"], bedroomsMin: 2 };
    expect(canonicalSearchHash(c)).toBe(canonicalSearchHash(c));
  });

  it("does not mutate the criteria it was given", () => {
    // The array sort must be on a copy; sorting in place would reorder the caller's
    // state object.
    const areas = ["Westlands", "Kilimani"];
    const criteria = { areas };
    canonicalSearchHash(criteria);
    expect(areas).toEqual(["Westlands", "Kilimani"]);
  });
});
