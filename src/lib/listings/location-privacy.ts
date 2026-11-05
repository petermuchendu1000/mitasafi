/**
 * Location privacy — the single source of truth for the constants that
 * `hide_exact_address` depends on, on BOTH sides of the database boundary.
 *
 * WHY THIS MODULE EXISTS
 *
 * 20260340000000_enforce_hide_exact_address.sql masks a hidden listing's
 * coordinates by snapping them to a grid, and `ListingMap` draws a circle to
 * tell the viewer the position is approximate. Those two numbers have to agree,
 * and until this module existed they agreed only in a comment:
 *
 *   - the migration snapped to 0.005 degrees, written as a literal in SQL;
 *   - ListingMap drew `"circle-radius": 80` at `zoom = 13`, written as bare
 *     numeric literals in a Mapbox paint object.
 *
 * Nothing recomputed the relationship if either side moved. Shrink the circle
 * or zoom in and the drawn area would stop containing the real address, so the
 * map would quietly start claiming more precision than the data carries —
 * pointing a viewer at a specific building that is not the right one.
 *
 * THE INVARIANT, stated once
 *
 *   gridHalfDiagonalMetres() < approximateCircleRadiusMetres(lat)
 *
 * The published point is the centre of a grid cell, so the true location is
 * somewhere in that cell and at worst half a diagonal away. The circle drawn
 * around the published point must be at least that big, or it excludes the
 * truth it is supposed to be hiding.
 *
 * `src/__tests__/location-privacy-invariant.test.ts` enforces this against the
 * migration's own literal, so the two sides can no longer drift apart silently.
 */

/**
 * Grid size in degrees. MUST equal the divisor in
 * 20260340000000_enforce_hide_exact_address.sql:
 *   round(v.latitude / 0.005) * 0.005
 * The test asserts the equality by parsing that file.
 */
export const PRIVACY_GRID_DEG = 0.005;

/** Metres per degree of latitude. WGS84 mean; varies by <1% over Kenya. */
export const METRES_PER_DEGREE_LAT = 111_320;

/** Mapbox world circumference in metres at zoom 0, 512px tiles. */
const MAPBOX_EQUATOR_METRES_PER_PIXEL_Z0 = 156_543.03392;

/** Zoom used when the exact position may be shown. */
export const EXACT_ZOOM = 15;

/** Zoom used when the position is approximate — wider, so the cell fits. */
export const APPROX_ZOOM = 13;

/** Radius, in screen pixels, of the circle drawn for an approximate position. */
export const APPROX_CIRCLE_RADIUS_PX = 80;

/** Radius, in screen pixels, of the centre dot on an approximate position. */
export const APPROX_CENTRE_DOT_PX = 6;

/** Radius, in screen pixels, of the exact-position marker is not a circle —
 *  it is a DOM element — so it has no constant here. */

/**
 * Ground resolution of a Mapbox web-mercator tile at a given zoom and
 * latitude. This is the standard formula; `cos(lat)` is the mercator
 * convergence, so a pixel covers less ground away from the equator.
 */
export function metresPerPixel(zoom: number, latitudeDeg: number): number {
  const latRad = (latitudeDeg * Math.PI) / 180;
  return (
    (MAPBOX_EQUATOR_METRES_PER_PIXEL_Z0 * Math.cos(latRad)) / Math.pow(2, zoom)
  );
}

/**
 * Worst-case distance from a snapped point to the real one: the real location
 * lies anywhere in the grid cell whose centre was published, so the bound is
 * half the cell's diagonal.
 *
 * The cell is `grid` degrees on each side, but a degree of longitude is
 * shorter than a degree of latitude by cos(lat), so the cell is not square and
 * the latitude is required.
 */
export function gridHalfDiagonalMetres(
  latitudeDeg: number,
  grid: number = PRIVACY_GRID_DEG,
): number {
  const latRad = (latitudeDeg * Math.PI) / 180;
  const halfLatMetres = (grid / 2) * METRES_PER_DEGREE_LAT;
  const halfLonMetres = (grid / 2) * METRES_PER_DEGREE_LAT * Math.cos(latRad);
  return Math.hypot(halfLatMetres, halfLonMetres);
}

/** Ground radius of the circle ListingMap draws for an approximate position. */
export function approximateCircleRadiusMetres(latitudeDeg: number): number {
  return APPROX_CIRCLE_RADIUS_PX * metresPerPixel(APPROX_ZOOM, latitudeDeg);
}

/**
 * The invariant. True when the circle shown to the viewer is big enough to
 * contain wherever the real address actually is.
 */
export function privacyCircleContainsTruth(latitudeDeg: number): boolean {
  return (
    gridHalfDiagonalMetres(latitudeDeg) <
    approximateCircleRadiusMetres(latitudeDeg)
  );
}
