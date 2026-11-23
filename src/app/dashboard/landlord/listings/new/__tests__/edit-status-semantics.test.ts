/**
 * What the EDIT page's two save buttons do to a listing's status.
 *
 * THE DEFECT THESE EXIST FOR
 *   listing-service was written for the CREATE wizard, where every save is
 *   either "draft" or "publish". The edit page reuses it with the listing's own
 *   id as `existingDraftId`, so:
 *
 *     "Save draft"     -> saveDraft(formData, listingId)
 *                      -> transformFormDataToInsert(..., "draft")
 *                      -> UPDATE listings SET status='draft' WHERE id=<live listing>
 *
 *   A live listing was silently unpublished — removed from the public site and
 *   from search — while the toast said "Your listing has been updated". The
 *   button is rendered on `isDirty && !isSaving` with no isEditMode guard, so
 *   it appears as soon as a landlord changes any field.
 *
 *   "Update Listing" had two smaller versions of the same bug: it forced
 *   status='active' (resuming a PAUSED listing without saying so) and stamped
 *   published_at = now on every save, so the detail page's "Published" stat
 *   read as the last edit rather than the publication date.
 *
 * These assert on the PAYLOAD actually handed to the database, because that is
 * where the damage was done. The absence of a `status` key is the fix; a test
 * that only checked `status !== "draft"` would pass on a payload that set it
 * to "active" instead, which is a different bug.
 */

import { saveDraft, publishListing, getListing } from "../listing-service";
import { DEFAULT_FORM_DATA, type PropertyFormData } from "../types";

/** Every call the service makes, recorded. */
interface Recorded {
  table: string | null;
  op: "insert" | "update" | "select" | null;
  payload: Record<string, unknown> | null;
  filters: [string, unknown][];
}

const recorded: Recorded = {
  table: null,
  op: null,
  payload: null,
  filters: [],
};

let userId: string | null = "landlord-a";

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    // Typed explicitly: the object references itself (every method returns the
    // chain), which TypeScript cannot infer (TS7022).
    const chain: Record<string, jest.Mock> = {
      select: jest.fn(() => {
        if (!recorded.op) recorded.op = "select";
        return chain;
      }),
      insert: jest.fn((payload: Record<string, unknown>) => {
        recorded.op = "insert";
        recorded.payload = payload;
        return chain;
      }),
      update: jest.fn((payload: Record<string, unknown>) => {
        recorded.op = "update";
        recorded.payload = payload;
        return chain;
      }),
      eq: jest.fn((col: string, val: unknown) => {
        recorded.filters.push([col, val]);
        return chain;
      }),
      single: jest
        .fn()
        .mockResolvedValue({ data: { id: "listing-1" }, error: null }),
    };
    return {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: userId ? { id: userId } : null },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        recorded.table = table;
        return chain;
      }),
    };
  },
}));

beforeEach(() => {
  recorded.table = null;
  recorded.op = null;
  recorded.payload = null;
  recorded.filters = [];
  userId = "landlord-a";
});

/** A form that passes publishListing's validation gate. */
const validForm = (): PropertyFormData => ({
  ...DEFAULT_FORM_DATA,
  listingCategory: "residential",
  title: "Beautiful 2BR Apartment in Kilimani",
  description:
    "A spacious and modern apartment with excellent amenities, in a quiet neighbourhood with easy access to shops and restaurants.",
  area: "Kilimani",
  city: "Nairobi",
  rentAmount: 85000,
  bedrooms: 2,
  bathrooms: 2,
  propertyType: "apartment",
});

describe("saveDraft", () => {
  it("still writes status 'draft' for the CREATE wizard, which passes no options", async () => {
    // The create flow must be untouched by the fix.
    const r = await saveDraft(validForm(), "listing-1");
    expect(r.success).toBe(true);
    expect(recorded.op).toBe("update");
    expect(recorded.payload).toHaveProperty("status", "draft");
  });

  it("writes status 'draft' when creating a brand-new draft", async () => {
    const r = await saveDraft(validForm());
    expect(r.success).toBe(true);
    expect(recorded.op).toBe("insert");
    expect(recorded.payload).toHaveProperty("status", "draft");
  });

  it("OMITS status entirely when the edit page asks it to preserve", async () => {
    // Not "status is active" — the column must not be mentioned at all, so the
    // UPDATE cannot change whatever the listing currently is.
    const r = await saveDraft(validForm(), "listing-1", {
      preserveStatus: true,
    });
    expect(r.success).toBe(true);
    expect(recorded.op).toBe("update");
    expect(Object.keys(recorded.payload!)).not.toContain("status");
  });

  it("omits published_at too when preserving", async () => {
    await saveDraft(validForm(), "listing-1", { preserveStatus: true });
    expect(Object.keys(recorded.payload!)).not.toContain("published_at");
  });

  it("still scopes the update to the owner", async () => {
    await saveDraft(validForm(), "listing-1", { preserveStatus: true });
    expect(recorded.filters).toContainEqual(["landlord_id", "landlord-a"]);
    expect(recorded.filters).toContainEqual(["id", "listing-1"]);
  });

  it("refuses when nobody is signed in", async () => {
    userId = null;
    const r = await saveDraft(validForm(), "listing-1");
    expect(r.success).toBe(false);
    expect(recorded.op).toBeNull();
  });
});

describe("publishListing status intent", () => {
  it("sets status 'active' for a brand-new listing", async () => {
    const r = await publishListing(validForm());
    expect(r.success).toBe(true);
    expect(recorded.payload).toHaveProperty("status", "active");
  });

  it("sets status 'active' when publishing an existing DRAFT", async () => {
    const r = await publishListing(validForm(), "listing-1", {
      currentStatus: "draft",
    });
    expect(r.success).toBe(true);
    expect(recorded.payload).toHaveProperty("status", "active");
  });

  it("does NOT resume a PAUSED listing", async () => {
    // The button reads "Update Listing" on the edit page. Updating a paused
    // listing must not quietly put it back on the public site.
    await publishListing(validForm(), "listing-1", { currentStatus: "paused" });
    expect(Object.keys(recorded.payload!)).not.toContain("status");
  });

  it("does NOT re-advertise a RENTED listing", async () => {
    await publishListing(validForm(), "listing-1", { currentStatus: "rented" });
    expect(Object.keys(recorded.payload!)).not.toContain("status");
  });

  it("leaves an already-active listing active by not touching the column", async () => {
    await publishListing(validForm(), "listing-1", { currentStatus: "active" });
    expect(Object.keys(recorded.payload!)).not.toContain("status");
  });
});

describe("publishListing published_at", () => {
  it("stamps it for a brand-new listing", async () => {
    await publishListing(validForm());
    expect(recorded.payload).toHaveProperty("published_at");
    expect(typeof recorded.payload!.published_at).toBe("string");
  });

  it("stamps it when publishing an existing draft", async () => {
    await publishListing(validForm(), "listing-1", { currentStatus: "draft" });
    expect(recorded.payload).toHaveProperty("published_at");
  });

  it("does NOT touch it when editing a listing that is already live", async () => {
    // This is the actual fix. The detail page renders a "Published" stat from
    // this column, and the old code stamped `now` on every save of a live
    // listing, so the stat read as the date of the last edit.
    await publishListing(validForm(), "listing-1", { currentStatus: "active" });
    expect(Object.keys(recorded.payload!)).not.toContain("published_at");
  });

  it("does NOT touch it when editing a paused or rented listing", async () => {
    for (const status of ["paused", "rented"]) {
      recorded.payload = null;
      await publishListing(validForm(), "listing-1", {
        currentStatus: status,
      });
      expect(Object.keys(recorded.payload!)).not.toContain("published_at");
    }
  });

  it("does NOT touch it on a preserving save-draft either", async () => {
    await saveDraft(validForm(), "listing-1", { preserveStatus: true });
    expect(Object.keys(recorded.payload!)).not.toContain("published_at");
  });
});

describe("getListing is owner-scoped", () => {
  it("filters by the signed-in landlord as well as the id", async () => {
    // Without this, /dashboard/landlord/listings/<any id>/edit loaded a
    // stranger's listing into the edit form: the view returns every row the
    // public read policy admits, which is exactly why the PUBLIC detail page
    // reads the same view with no owner filter.
    await getListing("listing-1");
    expect(recorded.table).toBe("listings_public");
    expect(recorded.filters).toContainEqual(["id", "listing-1"]);
    expect(recorded.filters).toContainEqual(["landlord_id", "landlord-a"]);
  });

  it("refuses rather than querying when nobody is signed in", async () => {
    userId = null;
    await expect(getListing("listing-1")).rejects.toThrow(/signed in/i);
    expect(recorded.table).toBeNull();
  });
});
