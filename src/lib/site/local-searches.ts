import { findPlace } from "./places";
import type { SearchParams } from "@/lib/listings/search";

type RentalFilters = Pick<SearchParams, "propertyType" | "minBedrooms" | "maxBedrooms" | "sortBy">;

type Intent =
  | { kind: "rental"; label: string; filters: RentalFilters; advice: string }
  | { kind: "service"; label: string; category?: string; subcategory?: string; advice: string };

const intents = {
  "homes-for-rent": { kind: "rental", label: "Homes for rent", filters: {}, advice: "Compare monthly rent, deposit, water supply and service charges before arranging a viewing." },
  "houses-to-let": { kind: "rental", label: "Houses to let", filters: { propertyType: "house" }, advice: "Ask whether you’ll have exclusive use of the compound and who handles outdoor maintenance." },
  "bedsitters-for-rent": { kind: "rental", label: "Bedsitters for rent", filters: { propertyType: "bedsitter" }, advice: "Check the floor plan and ask whether the bathroom, water meter and electricity meter are private or shared." },
  "cheap-bedsitters": { kind: "rental", label: "Cheap bedsitters", filters: { propertyType: "bedsitter", sortBy: "price_low" }, advice: "Listings are sorted by rent, lowest first. Compare the full monthly cost, including water, electricity and service charges, before shortlisting." },
  "one-bedroom-rentals": { kind: "rental", label: "One-bedroom rentals", filters: { minBedrooms: 1, maxBedrooms: 1 }, advice: "Check that the bedroom is separate from the living area and ask which bills are included in the rent." },
  "two-bedroom-rentals": { kind: "rental", label: "Two-bedroom rentals", filters: { minBedrooms: 2, maxBedrooms: 2 }, advice: "Check storage, parking and water supply. If you plan to share, ask who will be named on the rental agreement." },
  "apartments-for-rent": { kind: "rental", label: "Apartments for rent", filters: { propertyType: "apartment" }, advice: "Ask about building charges, visitor parking and lift access. Confirm any rules about moving in before booking transport." },
  "home-services": { kind: "service", label: "Home services", advice: "Compare provider profiles and confirm coverage for your address. Share the scope, date and photos of the job when requesting a quote." },
  "house-movers": { kind: "service", label: "House movers", category: "moving", advice: "Give the mover both addresses, the expected load and details about stairs, lifts and vehicle access. Ask which packing materials and labour are included." },
  "house-cleaning": { kind: "service", label: "House cleaning", category: "cleaning", subcategory: "house-cleaning", advice: "Tell the cleaner how many rooms you need cleaned and whether the job is a routine clean, deep clean or move-in clean. Ask who brings supplies." },
  plumbers: { kind: "service", label: "Plumbers", category: "plumbing", advice: "Describe the leak, blockage or fitting you need help with. Ask how call-out fees, labour and spare parts are priced." },
  electricians: { kind: "service", label: "Electricians", category: "electrical", advice: "Describe the repair or installation and ask the provider to explain the work, parts and labour in the quote." },
} satisfies Record<string, Intent>;

type IntentSlug = keyof typeof intents;

// Each location has a small set of distinct searches with supported filters.
const directory: Record<string, readonly IntentSlug[]> = {
  juja: ["cheap-bedsitters", "one-bedroom-rentals", "house-movers"],
  ruiru: ["one-bedroom-rentals", "bedsitters-for-rent", "house-cleaning"],
  thika: ["apartments-for-rent", "house-movers", "plumbers"],
  kikuyu: ["bedsitters-for-rent", "house-cleaning"],
  ruaka: ["apartments-for-rent"],
  "kiambu-county": ["homes-for-rent", "house-movers", "plumbers"],
  "machakos-county": ["homes-for-rent", "house-cleaning", "plumbers"],
  machakos: ["houses-to-let", "one-bedroom-rentals"],
  "athi-river": ["bedsitters-for-rent", "house-movers"],
  syokimau: ["two-bedroom-rentals", "house-cleaning"],
  "narok-county": ["homes-for-rent", "home-services"],
  narok: ["houses-to-let", "bedsitters-for-rent", "electricians"],
  nakuru: ["one-bedroom-rentals", "apartments-for-rent", "house-movers", "house-cleaning"],
  naivasha: ["houses-to-let", "home-services"],
  mombasa: ["apartments-for-rent", "two-bedroom-rentals", "house-movers", "house-cleaning", "plumbers"],
  kisumu: ["one-bedroom-rentals", "apartments-for-rent", "house-cleaning", "plumbers"],
  eldoret: ["bedsitters-for-rent", "one-bedroom-rentals", "house-movers", "electricians"],
  kitengela: ["two-bedroom-rentals", "homes-for-rent", "houses-to-let", "plumbers"],
  "ongata-rongai": ["bedsitters-for-rent", "house-cleaning"],
  "kajiado-county": ["homes-for-rent", "home-services"],
  kisii: ["houses-to-let", "home-services"],
  kakamega: ["one-bedroom-rentals", "home-services"],
  kitale: ["houses-to-let", "home-services"],
  nyeri: ["homes-for-rent", "home-services"],
  meru: ["homes-for-rent", "home-services"],
  embu: ["homes-for-rent"],
  kericho: ["homes-for-rent"],
  kilifi: ["homes-for-rent"],
  malindi: ["apartments-for-rent", "house-cleaning"],
  ukunda: ["homes-for-rent", "house-cleaning"],
  bungoma: ["homes-for-rent"],
  garissa: ["homes-for-rent"],
  nairobi: ["apartments-for-rent", "house-movers"],
};

const localAdvice: Record<string, string> = {
  juja: "If you’re looking near JKUAT, check the walking route or commute from the property to the gate you use. Compare total cost with the convenience of living closer to campus.",
  ruiru: "If your commute uses Thika Road, test the trip from the estate at the time you normally travel. Include the walk to your usual stop.",
  thika: "If you’re moving between Thika town and an estate off the main road, confirm the vehicle can reach the building and where it can stop to unload.",
  syokimau: "If you plan to use the railway station, measure your door-to-station journey and check the train schedule for your usual travel days.",
  "kiambu-county": "Compare Kiambu town, Juja, Ruiru, Thika and Kikuyu as separate searches if you have a specific commute or campus in mind.",
  "machakos-county": "Machakos town, Athi River, Syokimau and Mlolongo are separate destinations. Use the town name when confirming where a listing or job is located.",
  "narok-county": "For Narok town or Kilgoris, confirm the exact area before arranging a viewing or agreeing to a provider’s travel fees.",
  nakuru: "If you’re comparing areas such as Lanet, Shabab and Kiamunyi, check how long the trip is to your work or school at the time you’ll actually travel.",
  mombasa: "For a move across town, share both estates and your preferred time with the mover. Check if the quote covers the full route and all shuttles to the building.",
  kisumu: "In Kisumu, set your search around your regular trips rather than the town name alone. Confirm the estate, street access and whether a provider will travel there.",
  eldoret: "If you’re moving for work or study, check the commute from the actual building. Compare the total monthly cost before choosing an estate.",
};

const priorityContent: Record<string, { summary: string; heading: string; detail: string }> = {
  "ruiru/bedsitters-for-rent": {
    summary: "Browse bedsitters for rent in Ruiru and compare the rent, location and photos before asking for a viewing.",
    heading: "Which part of Ruiru works for your commute?",
    detail: "If you’re considering Kamakis, Kimbo or an estate near the bypass, ask where the building is and check the walk to your usual matatu stop. At the viewing, confirm whether water and electricity are metered separately.",
  },
  "juja/cheap-bedsitters": {
    summary: "Browse bedsitters in Juja by monthly rent, lowest first. Set a KES 5,000 rent cap or compare homes by their route to JKUAT.",
    heading: "Looking for a bedsitter near JKUAT?",
    detail: "Check the walking route from the building to the gate you actually use. Add the deposit, water, electricity and any service charge to your budget before comparing two homes.",
  },
  "kitengela/houses-to-let": {
    summary: "Browse houses to let in Kitengela. Compare rent, location and property details before contacting a landlord.",
    heading: "What should you check when viewing a house in Kitengela?",
    detail: "Ask whether the compound and parking are shared. Check the route to the main road, how water is supplied, and which charges are included in the advertised rent.",
  },
  "nakuru/one-bedroom-rentals": {
    summary: "Compare rentals with exactly one bedroom in Nakuru. Check the estate, monthly rent and listing details before booking a viewing.",
    heading: "How do you compare one-bedroom homes in Nakuru?",
    detail: "Check the address and your usual commute before viewing homes in areas such as Kiamunyi or Lanet. Ask about the water supply, deposit and monthly service charges.",
  },
  "mombasa/plumbers": {
    summary: "Find plumbers who list Mombasa as an area they serve. Compare profiles for help with leaks, blocked drains and fittings.",
    heading: "What should you include in a plumbing quote request?",
    detail: "Name your estate, describe the problem and share a photo if you can. Ask if the quote includes the call-out, labour and replacement parts, and confirm the earliest time the plumber can come.",
  },
  "mombasa/house-cleaning": {
    summary: "Compare house cleaning providers who list Mombasa in their service areas. Check what each provider covers before requesting a quote.",
    heading: "What’s included in a house cleaning quote?",
    detail: "Share your estate, room count and whether you need routine, deep or move-in cleaning. Ask who brings supplies, whether windows and appliances are included, and whether transport costs extra.",
  },
  "kisumu/house-cleaning": {
    summary: "Find house cleaning providers serving Kisumu. Compare their profiles and request a quote for your home.",
    heading: "How do you compare cleaning quotes in Kisumu?",
    detail: "Give each cleaner the same job description, including the rooms, preferred date and supplies needed. If you also need sofa or carpet cleaning, ask for those jobs to be priced separately.",
  },
  "eldoret/house-movers": {
    summary: "Compare house movers who serve Eldoret. Share the pickup, destination and load when asking for a quote.",
    heading: "What affects the price of moving in Eldoret?",
    detail: "Give each mover both addresses, the number of floors, and a list of bulky items. Ask whether packing, dismantling furniture and carrying items up stairs are included.",
  },
};

export const prioritySearches = [
  ["ruiru", "bedsitters-for-rent"],
  ["juja", "cheap-bedsitters"],
  ["nakuru", "one-bedroom-rentals"],
  ["kitengela", "houses-to-let"],
  ["ruiru", "one-bedroom-rentals"],
  ["kisumu", "one-bedroom-rentals"],
  ["machakos", "houses-to-let"],
  ["narok", "houses-to-let"],
  ["eldoret", "bedsitters-for-rent"],
  ["mombasa", "plumbers"],
  ["mombasa", "house-cleaning"],
  ["kisumu", "house-cleaning"],
  ["eldoret", "house-movers"],
  ["mombasa", "house-movers"],
  ["thika", "house-movers"],
  ["nakuru", "house-movers"],
  ["nakuru", "house-cleaning"],
  ["kisumu", "plumbers"],
] as const satisfies readonly (readonly [string, IntentSlug])[];

export const jujaBedsitterBudgetHref = "/properties?location=juja&type=bedsitter&maxPrice=5000&currency=KES&sort=price_low&residential=1";

export function resolveLocalSearch(placeSlug: string, intentSlug: string) {
  const place = findPlace(placeSlug);
  const key = intentSlug as IntentSlug;
  if (!place || !Object.hasOwn(directory, placeSlug) || !directory[placeSlug].includes(key)) return undefined;

  const intent: Intent = intents[key];
  const title = `${intent.label} in ${place.name}`;
  const query = new URLSearchParams({ location: place.slug });
  if (intent.kind === "rental") {
    const { propertyType, minBedrooms, sortBy } = intent.filters;
    if (propertyType) query.set("type", propertyType);
    if (minBedrooms) query.set("bedrooms", String(minBedrooms));
    if (sortBy) query.set("sort", sortBy);
    query.set("residential", "1");
  } else if (intent.category) {
    query.set("category", intent.category);
    if (intent.subcategory) query.set("subcategory", intent.subcategory);
  }

  return {
    path: `/find/${place.slug}/${key}`,
    title,
    place,
    intent,
    priorityContent: priorityContent[`${place.slug}/${key}`],
    localAdvice: localAdvice[place.slug],
    browseHref: `${intent.kind === "rental" ? "/properties" : "/services/browse"}?${query}`,
  };
}

export type LocalSearch = NonNullable<ReturnType<typeof resolveLocalSearch>>;

export const localSearches = Object.entries(directory).flatMap(([place, keys]) =>
  keys.flatMap((key) => {
    const search = resolveLocalSearch(place, key);
    return search ? [search] : [];
  }),
);
