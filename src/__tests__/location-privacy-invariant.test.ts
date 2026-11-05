/**
 * The privacy grid and the map circle must agree — enforced, not commented.
 *
 * `hide_exact_address` is implemented in two places that have to stay in step:
 *
 *   SQL   20260340000000_enforce_hide_exact_address.sql snaps a hidden
 *         listing's coordinates to a grid, publishing the centre of a cell.
 *   TSX   ListingMap draws a circle around that published point and labels it
 *         "Approximate".
 *
 * The invariant is that the circle shown must be big enough to contain
 * wherever the real address actually is:
 *
 *     gridHalfDiagonalMetres(lat)  <  approximateCircleRadiusMetres(lat)
 *
 * Break it and the map starts claiming more precision than the data carries —
 * it would draw a tight ring that excludes the true address, pointing the
 * viewer confidently at the wrong building.
 *
 * Nothing recomputed this before. The SQL carried a bare `0.005` and the TSX
 * carried a bare `80` and `13`, related only by a paragraph of comment. These
 * tests read the real literal out of the migration, compare it against the
 * shared constant the component now imports, and evaluate the inequality.
 */

import fs from "fs";
import path from "path";
import {
  APPROX_CENTRE_DOT_PX,
  APPROX_CIRCLE_RADIUS_PX,
  APPROX_ZOOM,
  EXACT_ZOOM,
  METRES_PER_DEGREE_LAT,
  PRIVACY_GRID_DEG,
  approximateCircleRadiusMetres,
  gridHalfDiagonalMetres,
  metresPerPixel,
  privacyCircleContainsTruth,
} from "@/lib/listings/location-privacy";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

const MIGRATIONS_DIR = "supabase/migrations";

/** Drop `-- ...` comments so the prose about 0.005 is not mistaken for code. */
function stripSqlComments(sql: string): string {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

function locationMigrationSql(): string {
  const file = fs
    .readdirSync(path.join(root, MIGRATIONS_DIR))
    .find((f) => /enforce_hide_exact_address\.sql$/.test(f));
  expect(file).toBeDefined();
  return stripSqlComments(read(`${MIGRATIONS_DIR}/${file}`));
}

/**
 * Latitudes to evaluate the invariant at. Kenya spans roughly 5N to 5S, and
 * the equator is the worst case for the circle (a pixel covers the most
 * ground there, so... actually the circle is LARGEST at the equator and the
 * cell is also widest there). Both sides scale with cos(lat), so the ratio is
 * nearly constant — these cases prove that rather than assuming it.
 */
const LATITUDES: ReadonlyArray<[string, number]> = [
  ["Nairobi", -1.2921],
  ["equator", 0],
  ["Mandera (north Kenya)", 3.9366],
  ["far south of Kenya", -4.6796],
];

describe("the privacy grid and the map circle agree", () => {
  it("the migration's grid literal IS the shared constant", () => {
    const sql = locationMigrationSql();

    // round(v.latitude / 0.005) * 0.005 — divisor and multiplier, both axes.
    const snaps = [
      ...sql.matchAll(
        /round\(\s*v\.(latitude|longitude)\s*\/\s*([0-9.]+)\s*\)\s*\*\s*([0-9.]+)/g,
      ),
    ];

    // Both coordinates must be snapped, or one axis leaks full precision.
    expect(snaps.map((m) => m[1]).sort()).toEqual(["latitude", "longitude"]);

    for (const [, axis, divisor, multiplier] of snaps) {
      // A divisor that differs from the multiplier does not snap to a grid at
      // all — it rescales the coordinate.
      expect({ axis, divisor, multiplier }).toEqual({
        axis,
        divisor: multiplier,
        multiplier,
      });
      expect({ axis, grid: Number(divisor) }).toEqual({
        axis,
        grid: PRIVACY_GRID_DEG,
      });
    }
  });

  it.each(LATITUDES)(
    "the drawn circle contains the real address at %s",
    (_name, lat) => {
      const half = gridHalfDiagonalMetres(lat);
      const radius = approximateCircleRadiusMetres(lat);
      expect(privacyCircleContainsTruth(lat)).toBe(true);
      // Stated as the inequality too, so a failure prints both numbers.
      expect(half).toBeLessThan(radius);
    },
  );

  it("the margin is comfortable, not marginal", () => {
    // If the ratio ever falls below 2x, the two sides are close enough that a
    // small change to either would break the invariant, and this test should
    // start failing while there is still room to think.
    for (const [name, lat] of LATITUDES) {
      const ratio =
        approximateCircleRadiusMetres(lat) / gridHalfDiagonalMetres(lat);
      expect({ name, comfortable: ratio > 2 }).toEqual({
        name,
        comfortable: true,
      });
    }
  });

  it("the arithmetic is the documented arithmetic, not a coincidence", () => {
    // Pin the derivation so a change to metresPerPixel or the constants is
    // visible rather than absorbed. Nairobi, the numbers in the migration
    // header: ~19.1 m/px at zoom 13, ~393 m half-diagonal, ~1528 m radius.
    const lat = -1.2921;
    expect(metresPerPixel(APPROX_ZOOM, lat)).toBeCloseTo(19.104, 2);
    expect(gridHalfDiagonalMetres(lat)).toBeCloseTo(393.5, 0);
    expect(approximateCircleRadiusMetres(lat)).toBeCloseTo(1528.4, 0);
    expect(PRIVACY_GRID_DEG * METRES_PER_DEGREE_LAT).toBeCloseTo(556.6, 0);
    // A wider zoom must mean a wider view, or APPROX/EXACT are swapped.
    expect(APPROX_ZOOM).toBeLessThan(EXACT_ZOOM);
  });
});

describe("ListingMap consumes the shared constants", () => {
  const MAP = "src/components/listings/ListingMap.tsx";

  it("imports them rather than restating the numbers", () => {
    const src = read(MAP);
    expect(src).toMatch(/from "@\/lib\/listings\/location-privacy"/);
    for (const name of [
      "APPROX_ZOOM",
      "EXACT_ZOOM",
      "APPROX_CIRCLE_RADIUS_PX",
      "APPROX_CENTRE_DOT_PX",
    ]) {
      expect({ name, used: src.includes(name) }).toEqual({ name, used: true });
    }
  });

  it("has no bare numeric zoom or circle-radius left to drift", () => {
    const src = read(MAP);
    // The shape the defect would take: a literal back in the paint object or
    // the zoom ternary. Matching on the literal rather than on the constant
    // name means this fails if someone "simplifies" it back.
    const bareRadius = [...src.matchAll(/"circle-radius":\s*([0-9.]+)/g)];
    expect(bareRadius.map((m) => m[1])).toEqual([]);
    const bareZoom = [...src.matchAll(/const zoom\s*=[^;]*?\b([0-9]+)\b/g)];
    expect(bareZoom.map((m) => m[1])).toEqual([]);
  });

  it("withholds the Directions link when the position is approximate", () => {
    const src = read(MAP);
    // getDirectionsUrl puts coordinates into a Google Maps destination. For a
    // hidden listing those are the snapped coordinates, so it no longer leaks
    // the address, but it would route the viewer to a point up to ~393 m away
    // and call it Directions.
    const call = src.indexOf("getDirectionsUrl(latitude");
    expect(call).toBeGreaterThan(-1);
    const guard = src.lastIndexOf("!hideExactAddress && (", call);
    expect(guard).toBeGreaterThan(-1);
    // ...and the guard must be close enough to actually wrap the link, not
    // some earlier unrelated conditional.
    expect(call - guard).toBeLessThan(400);
  });

  it("the centre dot is smaller than the approximate circle", () => {
    // A centre dot as large as the circle would re-assert a precise point.
    expect(APPROX_CENTRE_DOT_PX).toBeLessThan(APPROX_CIRCLE_RADIUS_PX);
  });
});
