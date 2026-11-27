"use client";

import { useRef, useTransition, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { findPlace, places } from "@/lib/site/places";
import styles from "@/app/properties/rentals.module.css";

const propertyTypes = [
  { value: "apartment", label: "Apartment" },
  { value: "bedsitter", label: "Bedsitter" },
  { value: "studio", label: "Studio" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
  { value: "villa", label: "Villa" },
  { value: "maisonette", label: "Maisonette" },
];

const bedroomOptions = [
  { value: "0", label: "Studio or bedsitter" },
  { value: "1", label: "1+ bedroom" },
  { value: "2", label: "2+ bedrooms" },
  { value: "3", label: "3+ bedrooms" },
  { value: "4", label: "4+ bedrooms" },
];

const priceOptions = [
  { value: "0-5000", label: "Up to KES 5,000" },
  { value: "0-20000", label: "Up to KES 20,000" },
  { value: "20000-40000", label: "KES 20,000–40,000" },
  { value: "40000-70000", label: "KES 40,000–70,000" },
  { value: "70000-100000", label: "KES 70,000–100,000" },
  { value: "100000-150000", label: "KES 100,000–150,000" },
  { value: "150000+", label: "KES 150,000+" },
];

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "price_low", label: "Lowest rent" },
  { value: "price_high", label: "Highest rent" },
  { value: "popular", label: "Most viewed" },
];

const locations = places
  .map(({ name, slug }) => ({ label: name, value: slug }))
  .sort((a, b) => a.label.localeCompare(b.label, "en-KE"));

interface FieldOption { value: string; label: string }

function FilterSelect({
  label,
  value,
  name,
  options,
  onChange,
}: {
  label: string;
  value: string;
  name: string;
  options: FieldOption[];
  onChange?: (value: string) => void;
}) {
  return (
    <label className={styles.select}>
      <span>{label}</span>
      <select
        name={name}
        {...(onChange
          ? { value, onChange: (event) => onChange(event.target.value) }
          : { defaultValue: value })}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown size={16} aria-hidden="true" />
    </label>
  );
}

export function SearchFilters() {
  const router = useRouter();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const area = search.get("area");
  const location = findPlace(search.get("location") ?? undefined);
  const locationLabel = location?.name ?? area;
  const locationValue = location?.slug ?? (area ? "legacy" : "");
  const type = search.get("type") ?? "";
  const exactBeds = search.get("bedrooms");
  const beds = exactBeds ? "exact" : search.get("beds") ?? "";
  const minPrice = search.get("minPrice");
  const maxPrice = search.get("maxPrice");
  const price = search.get("price") ?? (maxPrice === "5000" && !minPrice ? "0-5000" : (minPrice || maxPrice) ? "custom" : "");
  const sort = sortOptions.find((option) => option.value === search.get("sort"))?.value ?? "newest";
  const verified = search.get("verified") === "true";
  const available = search.get("available") === "true";
  const keyword = search.get("q");
  const locationOptions = [
    { value: "", label: "Anywhere in Kenya" },
    ...(area && !location ? [{ value: "legacy", label: area }] : []),
    ...locations,
  ];
  const typeOptions = [
    { value: "", label: "Any home type" },
    ...propertyTypes,
    ...(type && !propertyTypes.some((item) => item.value === type)
      ? [{ value: type, label: type.replace(/_/g, " ") }] : []),
  ];
  const budgetOptions = [
    { value: "", label: "Any rent" },
    ...priceOptions,
    ...(price && !priceOptions.some((option) => option.value === price)
      ? [{ value: price, label: "Custom rent range" }] : []),
  ];
  const bedsOptions = [
    { value: "", label: "Any bedrooms" },
    ...(exactBeds ? [{ value: "exact", label: `Exactly ${exactBeds}` }] : []),
    ...bedroomOptions,
    ...(beds && beds !== "exact" && !bedroomOptions.some((item) => item.value === beds)
      ? [{ value: beds, label: `${beds}+ bedrooms` }] : []),
  ];

  function navigate(next: URLSearchParams) {
    next.delete("page");
    const query = next.toString();
    startTransition(() => router.push(query ? `/properties?${query}` : "/properties", { scroll: false }));
  }

  function update(values: Record<string, string | null>) {
    const next = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    navigate(next);
  }

  function priceUpdate(value: string) {
    return { price: value, minPrice: null, maxPrice: null, currency: value === "0-5000" ? "KES" : null };
  }

  function clear() {
    const next = new URLSearchParams();
    if (search.get("residential") === "1") next.set("residential", "1");
    dialog.current?.close();
    navigate(next);
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextLocation = String(data.get("location"));
    const nextPrice = String(data.get("price"));
    const nextBeds = String(data.get("beds"));
    update({
      ...(nextLocation !== locationValue && { location: nextLocation, area: null }),
      type: String(data.get("type")),
      ...(nextPrice !== price && priceUpdate(nextPrice)),
      ...(nextBeds !== beds && { beds: nextBeds, bedrooms: null }),
      verified: data.has("verified") ? "true" : null,
      available: data.has("available") ? "true" : null,
    });
    dialog.current?.close();
  }

  const active: { label: string; reset: Record<string, string | null> }[] = [
    ...(locationLabel ? [{ label: locationLabel, reset: { location: null, area: null } }] : []),
    ...(type ? [{ label: typeOptions.find((item) => item.value === type)?.label ?? type, reset: { type: null } }] : []),
    ...(price ? [{ label: budgetOptions.find((item) => item.value === price)?.label ?? "Rent range", reset: priceUpdate("") }] : []),
    ...(beds ? [{ label: bedsOptions.find((item) => item.value === beds)?.label ?? "Bedrooms", reset: { beds: null, bedrooms: null } }] : []),
    ...(verified ? [{ label: "Verified", reset: { verified: null } }] : []),
    ...(available ? [{ label: "Available now", reset: { available: null } }] : []),
    ...(keyword ? [{ label: keyword, reset: { q: null } }] : []),
  ];

  return (
    <div className={styles.filters} aria-busy={pending}>
      <div className={styles.filterRow}>
        <div className={styles.quickFilters}>
          <FilterSelect name="location" label="Location" value={locationValue} options={locationOptions}
            onChange={(value) => update({ location: value, area: null })} />
          <FilterSelect name="type" label="Home type" value={type} options={typeOptions}
            onChange={(value) => update({ type: value })} />
          <FilterSelect name="price" label="Monthly rent" value={price} options={budgetOptions}
            onChange={(value) => update(priceUpdate(value))} />
        </div>
        <button ref={trigger} type="button" className={styles.filterButton} aria-haspopup="dialog"
          onClick={() => {
            dialog.current?.querySelector("form")?.reset();
            dialog.current?.showModal();
          }}>
          <SlidersHorizontal size={17} aria-hidden="true" /> <span>Filters{active.length > 0 ? ` (${active.length})` : ""}</span>
        </button>
        <FilterSelect name="sort" label="Sort by" value={sort} options={sortOptions}
          onChange={(value) => update({ sort: value === "newest" ? null : value })} />
      </div>
      {active.length > 0 && (
        <ul className={styles.chips} aria-label="Active filters">
          {active.map(({ label, reset }, index) => (
            <li key={`${label}-${index}`}>
              <button type="button" onClick={() => update(reset)} aria-label={`Remove filter ${label}`}>
                <span>{label}</span><X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
          <li><button type="button" className={styles.clear} onClick={clear}>Clear all</button></li>
        </ul>
      )}

      <dialog ref={dialog} className={styles.filterDialog} aria-labelledby="rental-filter-title"
        onClose={() => trigger.current?.focus()}>
        <form key={search.toString()} onSubmit={apply}>
          <div className={styles.dialogHeader}>
            <h2 id="rental-filter-title">Filter rentals</h2>
            <button type="button" className={styles.dialogClose} aria-label="Close filters" onClick={() => dialog.current?.close()}>
              <X size={21} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.dialogBody}>
            <FilterSelect name="location" label="Location" value={locationValue} options={locationOptions} />
            <FilterSelect name="type" label="Home type" value={type} options={typeOptions} />
            <FilterSelect name="price" label="Monthly rent" value={price} options={budgetOptions} />
            <FilterSelect name="beds" label="Bedrooms" value={beds} options={bedsOptions} />
            <label className={styles.checkbox}><input type="checkbox" name="verified" defaultChecked={verified} /> Verified listings only</label>
            <label className={styles.checkbox}><input type="checkbox" name="available" defaultChecked={available} /> Available now</label>
          </div>
          <div className={styles.dialogFooter}>
            <button type="button" className={styles.textButton} onClick={clear}>Clear all</button>
            <button type="submit" className={styles.primary}>Apply filters</button>
          </div>
        </form>
      </dialog>
      {pending && <span className={styles.srOnly} role="status">Updating rental results</span>}
    </div>
  );
}
