import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { searchListings } from "@/lib/listings/search";
import { getProviders } from "@/lib/services/providers";
import type { Database } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { prioritySearches, resolveLocalSearch, type LocalSearch } from "./local-searches";

export const INVENTORY_REVALIDATE_SECONDS = 600;

type SearchResult = { href: string; title: string; detail: string };
type Inventory =
  | { status: "available"; results: SearchResult[] }
  | { status: "empty" | "unavailable"; results: [] };

// The inventory is shared by the homepage, landing page and sitemap. The anon
// client gives each of them the same public view under the database's RLS policies.
const readInventory = unstable_cache(async (search: LocalSearch): Promise<Inventory> => {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => fetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(4000)])
            : AbortSignal.timeout(4000),
        }),
      },
    },
  );
  const { place, intent } = search;
  let results: SearchResult[];

  if (intent.kind === "rental") {
    const result = await searchListings({
      ...intent.filters, locationAreas: place.areas, residentialOnly: true, limit: 8,
    }, supabase);
    if (result.error) throw new Error(result.error);
    results = result.listings.map((listing) => ({
      href: `/listings/${listing.slug}`,
      title: listing.title,
      detail: `${formatCurrency(listing.rent_amount, listing.currency)} / month · ${listing.area}`,
    }));
  } else {
    const result = await getProviders({
      filters: { area: [...place.areas], category: intent.category, subcategory: intent.subcategory },
      pageSize: 8,
    }, supabase);
    if (result.error) throw new Error(result.error);
    results = result.providers.map((provider) => ({
      href: `/services/provider/${provider.id}`,
      title: provider.business_name,
      detail: provider.tagline || provider.service_names.slice(0, 3).join(", "),
    }));
  }

  return results.length ? { status: "available", results } : { status: "empty", results: [] };
}, ["public-local-search-inventory"], { revalidate: INVENTORY_REVALIDATE_SECONDS });

export const getLocalInventory = cache(async (search: LocalSearch): Promise<Inventory> => {
  try {
    return await readInventory(search);
  } catch {
    // Let cache revalidation retain the last successful result during outages.
    return { status: "unavailable", results: [] };
  }
});

const candidates = prioritySearches.flatMap(([place, intent]) => {
  const search = resolveLocalSearch(place, intent);
  return search ? [search] : [];
});

export async function getAvailablePrioritySearches() {
  const statuses = await Promise.all(candidates.map((search) => getLocalInventory(search)));
  return candidates.filter((_, index) => statuses[index].status === "available");
}
