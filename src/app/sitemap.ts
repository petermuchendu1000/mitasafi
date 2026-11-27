import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site/urls";
import { getAvailablePrioritySearches } from "@/lib/site/local-search-inventory";

export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const searches = await getAvailablePrioritySearches();
  return [
    "/",
    "/find",
    "/properties",
    "/services",
    "/services/browse",
    "/landlords",
    "/service-providers",
    "/guides/tenants",
    "/contact",
    ...searches.map(({ path }) => path),
  ].map((path) => ({ url: siteUrl(path) }));
}
