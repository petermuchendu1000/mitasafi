import { PROVIDER_SORT_OPTIONS } from "@/lib/constants";
import { findPlace } from "@/lib/site/places";

export const browsePath = "/services/browse";

export const priceBands = [
  { id: "budget", label: "Up to KES 5,000", min: 0, max: 5_000 },
  { id: "moderate", label: "KES 5,000–15,000", min: 5_000, max: 15_000 },
  { id: "standard", label: "KES 15,000–30,000", min: 15_000, max: 30_000 },
  { id: "premium", label: "KES 30,000–50,000", min: 30_000, max: 50_000 },
  { id: "luxury", label: "KES 50,000–100,000", min: 50_000, max: 100_000 },
  { id: "enterprise", label: "KES 100,000+", min: 100_000, max: null },
];

export const featureFilters = [
  { key: "verified", label: "ID verified" },
  { key: "available", label: "Currently active" },
  { key: "instant", label: "Instant booking" },
] as const;

export function commaValues(value: string | null) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function wholeNumber(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

export function parseBrowseFilters(params: URLSearchParams) {
  const areas = commaValues(params.get("area"));
  const location = areas.length === 0 ? findPlace(params.get("location") ?? undefined) : undefined;
  const ids = commaValues(params.get("price"));
  const bands = priceBands.filter((band) => ids.includes(band.id));
  const rating = Number(params.get("rating"));
  const sort = params.get("sort") === "rating" ? "rating-high" : params.get("sort");

  return {
    areas,
    location,
    page: Math.max(wholeNumber(params.get("page")) ?? 1, 1),
    filters: {
      area: areas.length ? areas : location?.areas.slice() ?? null,
      category: params.get("category") || null,
      subcategory: commaValues(params.get("subcategory"))[0] ?? null,
      priceMin: bands.length ? Math.min(...bands.map((band) => band.min)) : wholeNumber(params.get("priceMin")),
      priceMax: bands.length
        ? bands.some((band) => band.max === null) ? null : Math.max(...bands.map((band) => band.max ?? 0))
        : wholeNumber(params.get("priceMax")),
      ratingMin: rating > 0 && rating <= 5 ? rating : null,
      verifiedOnly: params.get("verified") === "true",
      availableNow: params.get("available") === "true",
      instantBooking: params.get("instant") === "true",
      sort: PROVIDER_SORT_OPTIONS.find((option) => option.value === sort)?.value ?? "recommended",
      search: params.get("q")?.trim() || null,
    },
  };
}

export function browseHref(params: URLSearchParams, anchor = "") {
  return `${browsePath}${params.size ? `?${params}` : ""}${anchor}`;
}

export function locationParams(params: URLSearchParams) {
  const location = new URLSearchParams();
  const area = params.get("area");
  const place = params.get("location");
  if (area) location.set("area", area);
  else if (place) location.set("location", place);
  return location;
}
