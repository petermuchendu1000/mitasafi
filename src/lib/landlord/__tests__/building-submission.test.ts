/**
 * Mapping the Add Building wizard onto a `buildings` row.
 *
 * Two groups carry most of the weight.
 *
 *   PHOTOS. Step 4 stores base64 data: URLs, because it reads files with
 *   FileReader.readAsDataURL. The column is TEXT[] read as a list of URLs, so
 *   storing one would put up to 5MB of base64 in the row AND render nothing.
 *   The guard has to refuse them, and the test has to prove it refuses them,
 *   because the wizard will hand it exactly that if the upload step is skipped
 *   or fails.
 *
 *   VALUES THE DATABASE WOULD REJECT. building_type, management_type and the
 *   two coordinate columns are each capable of failing the insert rather than
 *   storing something odd — a CHECK violation or a numeric overflow. Those
 *   arrive as an opaque error after the request; caught here they are a field.
 */

import {
  buildBuildingInsert,
  dataUrlToBlob,
  extensionForMime,
} from "../building-submission";
import {
  DEFAULT_FORM_DATA,
  type BuildingFormData,
} from "@/app/dashboard/landlord/buildings/new/types";

const LANDLORD = "12e51647-833b-41a7-b4ab-02e3d3672eb5";

const VALID: BuildingFormData = {
  ...DEFAULT_FORM_DATA,
  name: "Riverside Court",
  building_type: "apartment",
  address: "Riverside Drive",
  area: "Kilimani",
  city: "Nairobi",
};

function build(over: Partial<BuildingFormData> = {}, year = 2026) {
  return buildBuildingInsert({ ...VALID, ...over }, LANDLORD, year);
}

describe("a complete form", () => {
  it("produces an insert with no errors", () => {
    const r = build();
    expect(r.errors).toEqual({});
    expect(r.insert).not.toBeNull();
  });

  it("carries the landlord, the required fields and an active status", () => {
    const i = build().insert!;
    expect(i.landlord_id).toBe(LANDLORD);
    expect(i.name).toBe("Riverside Court");
    expect(i.building_type).toBe("apartment");
    expect(i.address).toBe("Riverside Drive");
    expect(i.area).toBe("Kilimani");
    // buildings_status_check has no 'draft'; a building made here is managed now.
    expect(i.status).toBe("active");
  });

  it("passes the five amenity groups through as objects", () => {
    const i = build().insert!;
    expect(i.security_features).toEqual(DEFAULT_FORM_DATA.security_features);
    expect(i.water_power).toEqual(DEFAULT_FORM_DATA.water_power);
    expect(i.parking).toEqual(DEFAULT_FORM_DATA.parking);
    expect(i.common_facilities).toEqual(DEFAULT_FORM_DATA.common_facilities);
    expect(i.services).toEqual(DEFAULT_FORM_DATA.services);
    expect(i.policies).toEqual(DEFAULT_FORM_DATA.policies);
  });

  it("copies the amenity groups rather than aliasing the form state", () => {
    // The insert is handed to a server action; sharing a reference with live
    // React state means a later keystroke could change what gets written.
    const form = { ...VALID };
    const i = buildBuildingInsert(form, LANDLORD, 2026).insert!;
    expect(i.security_features).not.toBe(form.security_features);
    expect(i.policies).not.toBe(form.policies);
  });

  it("trims rather than storing padding", () => {
    const i = build({
      name: "  Riverside Court  ",
      area: " Kilimani ",
    }).insert!;
    expect(i.name).toBe("Riverside Court");
    expect(i.area).toBe("Kilimani");
  });

  it("never returns an insert alongside an error", () => {
    expect(build({ name: "" }).insert).toBeNull();
  });
});

describe("required fields", () => {
  it("rejects an empty name", () => {
    expect(build({ name: "   " }).errors.name).toBeTruthy();
  });

  it("rejects a missing building type", () => {
    expect(build({ building_type: "" }).errors.building_type).toBeTruthy();
  });

  it("rejects an empty address and an empty area", () => {
    expect(build({ address: "" }).errors.address).toBeTruthy();
    expect(build({ area: "" }).errors.area).toBeTruthy();
  });

  it("rejects a signed-out caller", () => {
    expect(buildBuildingInsert(VALID, "", 2026).errors.landlord).toBeTruthy();
    expect(buildBuildingInsert(VALID, "  ", 2026).insert).toBeNull();
  });

  it("reports every bad field at once, not just the first", () => {
    const r = build({ name: "", area: "", building_type: "" });
    expect(Object.keys(r.errors).sort()).toEqual([
      "area",
      "building_type",
      "name",
    ]);
  });
});

describe("values the database would reject", () => {
  it("accepts every type the wizard offers", () => {
    for (const t of [
      "apartment",
      "flat_block",
      "townhouse_complex",
      "gated_community",
      "student_hostel",
      "mixed_use",
      "other",
    ] as const) {
      expect(build({ building_type: t }).errors.building_type).toBeUndefined();
    }
  });

  it("rejects a type outside the CHECK constraint", () => {
    // "apartment_block" is the value the old mock pages used throughout.
    const r = build({
      building_type: "apartment_block" as BuildingFormData["building_type"],
    });
    expect(r.errors.building_type).toBeTruthy();
    expect(r.insert).toBeNull();
  });

  it("rejects an unknown management type", () => {
    const r = build({
      management_type: "agency" as BuildingFormData["management_type"],
    });
    expect(r.errors.management_type).toBeTruthy();
  });

  it("rejects a latitude outside the column's range", () => {
    // DECIMAL(10,8) holds at most 99.99999999; 91 is both wrong and an overflow.
    expect(build({ latitude: 91 }).errors.latitude).toBeTruthy();
    expect(build({ latitude: -90 }).errors.latitude).toBeUndefined();
  });

  it("rejects a longitude outside the column's range", () => {
    expect(build({ longitude: 181 }).errors.longitude).toBeTruthy();
    expect(build({ longitude: 36.8 }).errors.longitude).toBeUndefined();
  });

  it("keeps a Nairobi coordinate intact", () => {
    const i = build({ latitude: -1.2921, longitude: 36.8219 }).insert!;
    expect(i.latitude).toBe(-1.2921);
    expect(i.longitude).toBe(36.8219);
  });
});

describe("photos", () => {
  // Deliberately not a *.supabase.co host: no-hardcoded-storage-project.test.ts
  // refuses one anywhere in source, and it is right to be blunt about it.
  const URL_A = "https://cdn.example.test/storage/public/a.jpg";
  const URL_B = "https://cdn.example.test/storage/public/b.jpg";

  it("REFUSES a base64 data URL", () => {
    // What Step 4 actually holds. Storing it would write megabytes of base64
    // into the row and render nothing.
    const r = build({ photos: ["data:image/jpeg;base64,/9j/4AAQSkZJRg=="] });
    expect(r.errors.photos).toBeTruthy();
    expect(r.insert).toBeNull();
  });

  it("refuses a mixture of uploaded and un-uploaded photos", () => {
    const r = build({ photos: [URL_A, "data:image/png;base64,iVBORw0KGgo="] });
    expect(r.errors.photos).toBeTruthy();
  });

  it("accepts uploaded URLs", () => {
    const r = build({ photos: [URL_A, URL_B] });
    expect(r.errors).toEqual({});
    expect(r.insert!.photos).toEqual([URL_A, URL_B]);
  });

  it("accepts a site-relative path", () => {
    expect(build({ photos: ["/images/a.jpg"] }).errors.photos).toBeUndefined();
  });

  it("drops empty entries rather than storing blanks", () => {
    const i = build({ photos: [URL_A, "", "   "] }).insert!;
    expect(i.photos).toEqual([URL_A]);
  });

  it("keeps a cover photo that is one of the photos", () => {
    const i = build({ photos: [URL_A, URL_B], cover_photo: URL_B }).insert!;
    expect(i.cover_photo).toBe(URL_B);
  });

  it("falls back to the first photo when the cover is not among them", () => {
    // Otherwise the card renders a broken image and nothing says why.
    const i = build({
      photos: [URL_A, URL_B],
      cover_photo: "https://example.com/deleted.jpg",
    }).insert!;
    expect(i.cover_photo).toBe(URL_A);
  });

  it("has no cover photo when there are no photos", () => {
    const i = build({ photos: [], cover_photo: undefined }).insert!;
    expect(i.photos).toEqual([]);
    expect(i.cover_photo).toBeNull();
  });
});

describe("optional fields become null, not zero or empty string", () => {
  it("city, plot number, landmarks, access instructions", () => {
    const i = build({
      city: "",
      plot_number: "  ",
      landmarks: undefined,
      access_instructions: "",
    }).insert!;
    expect(i.city).toBeNull();
    expect(i.plot_number).toBeNull();
    expect(i.landmarks).toBeNull();
    expect(i.access_instructions).toBeNull();
  });

  it("floors, year built and service charge", () => {
    const i = build().insert!;
    expect(i.total_floors).toBeNull();
    expect(i.year_built).toBeNull();
    expect(i.service_charge).toBeNull();
  });

  it("but total_units is 0, matching the column default", () => {
    // The detail page compares this stored counter against the units actually
    // recorded and warns when they disagree; null would make that comparison
    // meaningless.
    expect(build().insert!.total_units).toBe(0);
  });
});

describe("numbers", () => {
  it("rejects NaN from a cleared number input", () => {
    // Number.isInteger(NaN) is false, so the whole-number check catches this.
    // Asserting the message pins WHICH check is doing the work: an earlier
    // version had a separate isFinite branch that a mutation run proved was
    // unreachable, and this test passed against its removal.
    expect(build({ total_floors: NaN }).errors.total_floors).toBe(
      "Floors must be a whole number.",
    );
  });

  it("rejects Infinity the same way", () => {
    expect(build({ year_built: Infinity }).errors.year_built).toBeTruthy();
  });

  it("rejects a fractional floor count", () => {
    expect(build({ total_floors: 2.5 }).errors.total_floors).toBeTruthy();
  });

  it("rejects zero floors and accepts one", () => {
    expect(build({ total_floors: 0 }).errors.total_floors).toBeTruthy();
    expect(build({ total_floors: 1 }).errors.total_floors).toBeUndefined();
  });

  it("allows a year up to five ahead, for a building under construction", () => {
    expect(build({ year_built: 2031 }, 2026).errors.year_built).toBeUndefined();
    expect(build({ year_built: 2032 }, 2026).errors.year_built).toBeTruthy();
  });

  it("rejects a year before 1800", () => {
    expect(build({ year_built: 1799 }).errors.year_built).toBeTruthy();
  });

  it("accepts a service charge of exactly zero", () => {
    const r = build({ service_charge: 0 });
    expect(r.errors).toEqual({});
    expect(r.insert!.service_charge).toBe(0);
  });

  it("rejects a negative service charge", () => {
    expect(build({ service_charge: -1 }).errors.service_charge).toBeTruthy();
  });

  it("rounds the service charge to the two decimals the column stores", () => {
    expect(build({ service_charge: 5000.456 }).insert!.service_charge).toBe(
      5000.46,
    );
  });

  it("accepts zero declared units", () => {
    expect(build({ total_units: 0 }).insert!.total_units).toBe(0);
  });
});

describe("collection_via_mitasafi", () => {
  it("defaults to true", () => {
    expect(build().insert!.collection_via_mitasafi).toBe(true);
  });

  it("is false only when explicitly false", () => {
    expect(
      build({ collection_via_mitasafi: false }).insert!.collection_via_mitasafi,
    ).toBe(false);
  });
});

describe("dataUrlToBlob", () => {
  it("recovers a blob of the right type from a base64 data URL", () => {
    // "hi" base64-encoded.
    const blob = dataUrlToBlob("data:image/png;base64,aGk=");
    expect(blob).not.toBeNull();
    expect(blob!.type).toBe("image/png");
    expect(blob!.size).toBe(2);
  });

  it("handles a non-base64 data URL", () => {
    const blob = dataUrlToBlob("data:text/plain,hello");
    expect(blob!.type).toBe("text/plain");
    expect(blob!.size).toBe(5);
  });

  it("returns null for a URL that is already uploaded", () => {
    // This is how a retry skips the photos it has already dealt with.
    expect(dataUrlToBlob("https://example.com/a.jpg")).toBeNull();
  });

  it("returns null for junk rather than throwing", () => {
    expect(dataUrlToBlob("")).toBeNull();
    expect(dataUrlToBlob("data:image/png;base64,!!!not base64!!!")).toBeNull();
  });
});

describe("extensionForMime", () => {
  it("maps the types the bucket accepts", () => {
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("image/png")).toBe("png");
    expect(extensionForMime("image/webp")).toBe("webp");
  });

  it("is case insensitive", () => {
    expect(extensionForMime("IMAGE/PNG")).toBe("png");
  });

  it("falls back to jpg for something unexpected", () => {
    expect(extensionForMime("application/octet-stream")).toBe("jpg");
  });
});
