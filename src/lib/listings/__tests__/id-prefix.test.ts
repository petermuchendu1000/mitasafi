import { resolveListingRef } from "../id-prefix";
import { generateListingSlug } from "../types";

const ID = "1ec79185-52ef-402c-a6e7-f7b86cde7cd4";

describe("resolving a listing slug", () => {
  it("turns the 8-character tail into the range it covers", () => {
    const r = resolveListingRef("2br-apartment-kilimani-1ec79185");
    expect(r).toEqual({
      kind: "range",
      lo: "1ec79185-0000-0000-0000-000000000000",
      hi: "1ec79185-ffff-ffff-ffff-ffffffffffff",
    });
  });

  it("covers the real id it came from", () => {
    // The point of the range: the id must fall inside it. String comparison
    // matches Postgres's uuid ordering for canonical lowercase forms.
    const r = resolveListingRef(`x-${ID.slice(0, 8)}`);
    if (r?.kind !== "range") throw new Error("expected a range");
    expect(r.lo <= ID).toBe(true);
    expect(ID <= r.hi).toBe(true);
  });

  it("excludes an id that merely looks similar", () => {
    const r = resolveListingRef("x-1ec79185");
    if (r?.kind !== "range") throw new Error("expected a range");
    const neighbour = "1ec79186-0000-0000-0000-000000000000";
    expect(neighbour <= r.hi).toBe(false);
  });

  it("accepts a FULL uuid as the slug", () => {
    // The case that 404'd on the live site: splitting a UUID on "-" yields
    // its last twelve characters, which can never be a prefix of itself.
    expect(resolveListingRef(ID)).toEqual({ kind: "id", id: ID });
  });

  it("accepts an upper-case uuid, lower-cased", () => {
    expect(resolveListingRef(ID.toUpperCase())).toEqual({ kind: "id", id: ID });
  });

  it("round-trips whatever generateListingSlug produces", () => {
    // The slug generator and the resolver must agree. If either changes
    // alone, every listing URL breaks at once.
    const slug = generateListingSlug({
      id: ID,
      bedrooms: 2,
      property_type: "apartment",
      area: "Kilimani",
    });
    const r = resolveListingRef(slug);
    if (r?.kind !== "range") throw new Error(`expected a range for ${slug}`);
    expect(r.lo <= ID && ID <= r.hi).toBe(true);
  });

  it("refuses a tail that is not entirely hex", () => {
    // "kilimani" is all hex-ish letters to a sloppy filter. Accepting the
    // hex it contains would resolve a typo to somebody else's listing.
    expect(resolveListingRef("2br-apartment-kilimani")).toBeNull();
    expect(resolveListingRef("a-deadbeefzz")).toBeNull();
  });

  it("refuses a tail that is too short to be selective", () => {
    expect(resolveListingRef("a-1ec791")).toBeNull();
    expect(resolveListingRef("a-1ec7918")).toBeNull();
  });

  it("accepts the shortest allowed tail, so the boundary is exact", () => {
    expect(resolveListingRef("a-1ec79185")).not.toBeNull();
  });

  it("refuses nothing at all", () => {
    expect(resolveListingRef("")).toBeNull();
    expect(resolveListingRef("   ")).toBeNull();
    expect(resolveListingRef(null)).toBeNull();
    expect(resolveListingRef(undefined)).toBeNull();
  });

  it("builds a range from a longer hex tail too", () => {
    const r = resolveListingRef("x-1ec7918552ef");
    expect(r).toEqual({
      kind: "range",
      lo: "1ec79185-52ef-0000-0000-000000000000",
      hi: "1ec79185-52ef-ffff-ffff-ffffffffffff",
    });
  });

  it("always produces canonically shaped uuids", () => {
    const r = resolveListingRef("x-1ec79185");
    if (r?.kind !== "range") throw new Error("expected a range");
    for (const v of [r.lo, r.hi]) {
      expect(v).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    }
  });
});
