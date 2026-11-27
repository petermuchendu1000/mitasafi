"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { PROVIDER_SORT_OPTIONS, SERVICE_CATEGORIES } from "@/lib/constants";
import { marketplaceAreaNames } from "@/lib/site/marketplace";
import { places } from "@/lib/site/places";
import type { ServiceCategoryWithSubs } from "@/types/service-providers";
import { browseHref, commaValues, featureFilters, locationParams, parseBrowseFilters, priceBands } from "./filters";
import styles from "./browse.module.css";

const placeOptions = [...places].sort((a, b) => a.name.localeCompare(b.name, "en-KE"));
const ratingOptions = [5, 4.5, 4, 3.5, 3];
const formatMoney = new Intl.NumberFormat("en-KE");

function SelectField({ label, name, value, onChange, children }: {
  label: string;
  name: string;
  value: string;
  onChange?: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className={styles.select}>
      <span>{label}</span>
      <select name={name} {...(onChange
        ? { value, onChange: (event) => onChange(event.target.value) }
        : { defaultValue: value })}>{children}</select>
      <ChevronDown size={16} aria-hidden="true" />
    </label>
  );
}

export function BrowseControls({ categories }: { categories: ServiceCategoryWithSubs[] }) {
  const search = useSearchParams();
  const router = useRouter();
  const [pending, transition] = useTransition();
  const [formRevision, resetForm] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = new URLSearchParams(search.toString());
  const { areas, location, filters } = parseBrowseFilters(current);
  const activeBands = priceBands.filter((band) => commaValues(current.get("price")).includes(band.id));
  const sort = filters.sort;
  const category = SERVICE_CATEGORIES.find((item) => item.id === filters.category) ??
    categories.find((item) => item.slug === filters.category || item.id === filters.category);
  const subcategory = categories.flatMap((item) => item.subcategories).find((item) => item.slug === filters.subcategory || item.id === filters.subcategory);
  const budget = activeBands.length > 0 ? activeBands.map((band) => band.label).join(", ")
    : filters.priceMin !== null && filters.priceMax !== null ? `KES ${formatMoney.format(filters.priceMin)}–${formatMoney.format(filters.priceMax)}`
      : filters.priceMin !== null ? `From KES ${formatMoney.format(filters.priceMin)}`
        : filters.priceMax !== null ? `Up to KES ${formatMoney.format(filters.priceMax)}` : null;
  const chips: { label: string; keys: string[] }[] = [];
  if (location || areas.length) chips.push({ label: location?.name ?? areas.join(", "), keys: ["location", "area"] });
  if (filters.category) chips.push({ label: category?.name ?? filters.category, keys: ["category", "subcategory", "services"] });
  if (filters.subcategory) chips.push({ label: subcategory?.name ?? filters.subcategory, keys: ["subcategory", "services"] });
  if (budget) chips.push({ label: budget, keys: ["price", "priceMin", "priceMax"] });
  if (filters.ratingMin) chips.push({ label: `${filters.ratingMin}+ stars`, keys: ["rating"] });
  if (filters.search) chips.push({ label: filters.search, keys: ["q"] });
  for (const { key, label } of featureFilters) {
    if (current.get(key) === "true") chips.push({ label, keys: [key] });
  }

  function apply(next: URLSearchParams) {
    next.delete("page");
    transition(() => router.push(browseHref(next), { scroll: false }));
  }

  return (
    <div className={styles.controls} aria-busy={pending}>
      <div className={styles.controlRow}>
        <button ref={trigger} type="button" className={styles.filterButton} aria-haspopup="dialog"
          onClick={() => dialog.current?.showModal()}>
          <SlidersHorizontal size={17} aria-hidden="true" /> Filters{chips.length ? ` (${chips.length})` : ""}
        </button>
        <SelectField label="Sort by" name="sort" value={sort} onChange={(value) => {
          if (value === "recommended") current.delete("sort");
          else current.set("sort", value);
          apply(current);
        }}>
          {PROVIDER_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectField>
      </div>
      {chips.length > 0 && (
        <ul className={styles.chips} aria-label="Active filters" role="list">
          {chips.map(({ label, keys }) => {
            const without = new URLSearchParams(current);
            for (const key of [...keys, "page"]) without.delete(key);
            return (
              <li key={keys[0]}>
                <Link href={browseHref(without)} aria-label={`Remove filter ${label}`} scroll={false}>
                  <span>{label}</span><X size={14} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
          {chips.some(({ keys }) => keys[0] !== "location") &&
            <li><Link className={styles.clear} href={browseHref(locationParams(current))} scroll={false}>Reset filters</Link></li>}
        </ul>
      )}
      {pending && <p className={styles.srOnly} role="status">Updating providers</p>}
      <dialog className={styles.dialog} ref={dialog} aria-labelledby="service-filters-heading" onClose={() => {
        resetForm((revision) => revision + 1);
        trigger.current?.focus();
      }}>
        <FilterForm key={`${formRevision}:${search}`} current={current} categories={categories} close={() => dialog.current?.close()}
          apply={(next) => { dialog.current?.close(); apply(next); }} />
      </dialog>
    </div>
  );
}

function FilterForm({ current, categories, close, apply }: {
  current: URLSearchParams;
  categories: ServiceCategoryWithSubs[];
  close: () => void;
  apply: (next: URLSearchParams) => void;
}) {
  const { areas, location, filters } = parseBrowseFilters(current);
  const initialCategory = filters.category ?? "";
  const initialPlace = areas.length ? "areas" : location?.slug ?? "";
  const [category, setCategory] = useState(initialCategory);
  const [place, setPlace] = useState(initialPlace);
  const [areaText, setAreaText] = useState("");
  const [chosenAreas, setChosenAreas] = useState(areas);
  const [priceMode, setPriceMode] = useState(() => {
    const bands = commaValues(current.get("price"));
    if (bands.length > 1) return "existing";
    if (priceBands.some((band) => band.id === bands[0])) return bands[0];
    if (filters.priceMin !== null || filters.priceMax !== null) return "custom";
    return "";
  });
  const major = SERVICE_CATEGORIES.find((group) => group.id === category);
  const subcategories = categories
    .filter((item) => item.slug === category || item.id === category || major?.dbCategoryIds.includes(item.slug))
    .flatMap((item) => item.subcategories)
    .filter((item, index, items) => items.findIndex(({ slug }) => slug === item.slug) === index)
    .sort((a, b) => a.name.localeCompare(b.name, "en-KE"));
  const categoryOptions = categories.filter((item) => !SERVICE_CATEGORIES.some((group) => group.id === item.slug));
  const initialSubcategory = category === initialCategory ? filters.subcategory ?? "" : "";
  const visibleAreas = Array.from(new Set([...chosenAreas, ...marketplaceAreaNames]))
    .filter((area) => !areaText || area.toLowerCase().includes(areaText.toLowerCase()));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams(current);
    for (const key of ["category", "subcategory", "location", "area", "price", "priceMin", "priceMax", "rating"]) {
      next.delete(key);
    }

    for (const name of ["category", "subcategory", "rating"]) {
      const value = form.get(name);
      if (typeof value === "string" && value) next.set(name, value);
    }
    if (place === "areas" && chosenAreas.length) next.set("area", chosenAreas.join(","));
    else if (place && place !== "areas") next.set("location", place);
    const originalPrice = current.get("price");
    if (priceMode === "existing" && originalPrice) next.set("price", originalPrice);
    else if (priceMode === "custom") {
      for (const key of ["priceMin", "priceMax"]) {
        const value = form.get(key);
        if (typeof value === "string" && value) next.set(key, value);
      }
    } else if (priceMode) next.set("price", priceMode);
    for (const { key } of featureFilters) {
      if (form.has(key)) next.set(key, "true");
      else next.delete(key);
    }
    if (form.get("category") !== initialCategory || form.get("subcategory") !== (filters.subcategory ?? "")) next.delete("services");
    apply(next);
  }

  return (
    <form onSubmit={submit}>
      <header className={styles.dialogHeader}>
        <h2 id="service-filters-heading">Filter home services</h2>
        <button className={styles.iconButton} type="button" onClick={close} aria-label="Close filters"><X size={21} aria-hidden="true" /></button>
      </header>
      <div className={styles.dialogBody}>
        <SelectField label="Location" name="location" value={place} onChange={setPlace}>
          <option value="">Anywhere in Kenya</option>
          {placeOptions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          <option value="areas">Choose specific areas</option>
        </SelectField>
        <SelectField label="Category" name="category" value={category} onChange={setCategory}>
          <option value="">All services</option>
          {SERVICE_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          {categoryOptions.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          {initialCategory && !SERVICE_CATEGORIES.some((item) => item.id === initialCategory) &&
            !categoryOptions.some((item) => item.slug === initialCategory) &&
            <option value={initialCategory}>{initialCategory.replaceAll("-", " ")}</option>}
        </SelectField>
        {place === "areas" && (
          <fieldset className={styles.areaEditor}>
            <legend>Coverage areas</legend>
            <label className={styles.srOnly} htmlFor="service-area-search">Search areas</label>
            <input id="service-area-search" type="search" placeholder="Search areas" value={areaText}
              onChange={(event) => setAreaText(event.target.value)} />
            <div className={styles.areaOptions}>
              {visibleAreas.map((area) => (
                <label key={area} className={styles.checkbox}>
                  <input type="checkbox" checked={chosenAreas.includes(area)} onChange={(event) => {
                    const checked = event.target.checked;
                    setChosenAreas((previous) => checked ? [...previous, area] : previous.filter((item) => item !== area));
                  }} />{area}
                </label>
              ))}
              {visibleAreas.length === 0 && <p>No matching areas</p>}
            </div>
          </fieldset>
        )}
        {(subcategories.length > 0 || initialSubcategory) && (
          <SelectField key={category} label="Service type" name="subcategory" value={initialSubcategory}>
            <option value="">All service types</option>
            {subcategories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            {initialSubcategory && !subcategories.some((item) => item.slug === initialSubcategory) &&
              <option value={initialSubcategory}>{subcategories.find((item) => item.id === initialSubcategory)?.name ?? initialSubcategory}</option>}
          </SelectField>
        )}
        <SelectField label="Budget" name="price" value={priceMode} onChange={setPriceMode}>
          <option value="">Any budget</option>
          {priceBands.map((band) => <option key={band.id} value={band.id}>{band.label}</option>)}
          {commaValues(current.get("price")).length > 1 && <option value="existing">Current price bands</option>}
          <option value="custom">Custom budget</option>
        </SelectField>
        <SelectField label="Minimum rating" name="rating" value={filters.ratingMin?.toString() ?? ""}>
          <option value="">Any rating</option>
          {Array.from(new Set([...ratingOptions, ...(filters.ratingMin ? [filters.ratingMin] : [])])).map((number) => (
            <option key={number} value={number}>{number}+ stars</option>
          ))}
        </SelectField>
        {priceMode === "custom" && (
          <>
            <label className={styles.number}>Minimum price (KES)<input name="priceMin" min="0" type="number" defaultValue={filters.priceMin ?? ""} /></label>
            <label className={styles.number}>Maximum price (KES)<input name="priceMax" min="0" type="number" defaultValue={filters.priceMax ?? ""} /></label>
          </>
        )}
        <div className={styles.features}>
          {featureFilters.map(({ key, label }) => (
            <label key={key} className={styles.checkbox}><input type="checkbox" name={key} defaultChecked={current.get(key) === "true"} /> {label}</label>
          ))}
        </div>
      </div>
      <footer className={styles.dialogFooter}>
        <button className={styles.textButton} type="button" onClick={() => apply(locationParams(current))}>Reset filters</button>
        <button className={styles.primary} type="submit">Apply filters</button>
      </footer>
    </form>
  );
}
