export interface Town {
  slug: string;
  name: string;
  county: string;
  areas?: readonly string[];
}

export const towns: readonly Town[] = [
  { slug: "juja", name: "Juja", county: "Kiambu", areas: ["Gachororo", "Juja Farm", "Highpoint"] },
  { slug: "ruiru", name: "Ruiru", county: "Kiambu", areas: ["Membley", "Kamakis", "Kimbo", "Ruiru Bypass"] },
  { slug: "thika", name: "Thika", county: "Kiambu", areas: ["Ngoingwa", "Section 9"] },
  { slug: "kikuyu", name: "Kikuyu", county: "Kiambu", areas: ["Kinoo", "Sigona", "Zambezi"] },
  { slug: "kiambu", name: "Kiambu", county: "Kiambu", areas: ["Ndumberi", "Riabai"] },
  { slug: "ruaka", name: "Ruaka", county: "Kiambu" },
  { slug: "limuru", name: "Limuru", county: "Kiambu" },
  { slug: "machakos", name: "Machakos", county: "Machakos", areas: ["Mua Hills", "Katoloni"] },
  { slug: "athi-river", name: "Athi River", county: "Machakos", areas: ["Mavoko"] },
  { slug: "syokimau", name: "Syokimau", county: "Machakos" },
  { slug: "mlolongo", name: "Mlolongo", county: "Machakos" },
  { slug: "kangundo", name: "Kangundo", county: "Machakos" },
  { slug: "narok", name: "Narok", county: "Narok" },
  { slug: "kilgoris", name: "Kilgoris", county: "Narok" },
  { slug: "nakuru", name: "Nakuru", county: "Nakuru", areas: ["Lanet", "Kiamunyi", "Shabab", "Nakuru East", "Nakuru West"] },
  { slug: "naivasha", name: "Naivasha", county: "Nakuru", areas: ["Karagita"] },
  { slug: "mombasa", name: "Mombasa", county: "Mombasa", areas: ["Nyali", "Bamburi", "Likoni", "Tudor", "Shanzu", "Changamwe"] },
  { slug: "kisumu", name: "Kisumu", county: "Kisumu", areas: ["Kisumu Central", "Kisumu East", "Kisumu West", "Migosi", "Kondele"] },
  { slug: "eldoret", name: "Eldoret", county: "Uasin Gishu", areas: ["Kapsoya", "Langas", "Elgon View"] },
  { slug: "kitengela", name: "Kitengela", county: "Kajiado" },
  { slug: "ngong", name: "Ngong", county: "Kajiado" },
  { slug: "ongata-rongai", name: "Ongata Rongai", county: "Kajiado", areas: ["Nkoroi"] },
  { slug: "kisii", name: "Kisii", county: "Kisii" },
  { slug: "kakamega", name: "Kakamega", county: "Kakamega" },
  { slug: "kitale", name: "Kitale", county: "Trans Nzoia" },
  { slug: "bungoma", name: "Bungoma", county: "Bungoma" },
  { slug: "busia", name: "Busia", county: "Busia" },
  { slug: "nyeri", name: "Nyeri", county: "Nyeri" },
  { slug: "nanyuki", name: "Nanyuki", county: "Laikipia" },
  { slug: "meru", name: "Meru", county: "Meru" },
  { slug: "embu", name: "Embu", county: "Embu" },
  { slug: "kericho", name: "Kericho", county: "Kericho" },
  { slug: "kilifi", name: "Kilifi", county: "Kilifi" },
  { slug: "malindi", name: "Malindi", county: "Kilifi" },
  { slug: "ukunda", name: "Ukunda", county: "Kwale", areas: ["Diani"] },
  { slug: "voi", name: "Voi", county: "Taita Taveta" },
  { slug: "isiolo", name: "Isiolo", county: "Isiolo" },
  { slug: "garissa", name: "Garissa", county: "Garissa" },
  { slug: "homa-bay", name: "Homa Bay", county: "Homa Bay" },
  { slug: "migori", name: "Migori", county: "Migori" },
  { slug: "lodwar", name: "Lodwar", county: "Turkana" },
  { slug: "nairobi", name: "Nairobi", county: "Nairobi", areas: ["Westlands", "Kilimani", "Kileleshwa", "Lavington", "Parklands", "Langata", "South B", "South C", "Karen", "Upper Hill", "Kasarani", "Roysambu", "Embakasi"] },
];

const countyNames = ["Kiambu", "Machakos", "Narok", "Kajiado"] as const;

export interface MarketplacePlace {
  slug: string;
  name: string;
  areas: readonly string[];
  county?: string;
}

export const counties: MarketplacePlace[] = countyNames.map((county) => ({
  slug: `${county.toLowerCase()}-county`,
  name: `${county} County`,
  areas: [
    `${county} County`,
    ...towns.filter((town) => town.county === county).flatMap((town) => [town.name, ...(town.areas ?? [])]),
  ],
}));

export const places: MarketplacePlace[] = [
  ...counties,
  ...towns.map((town) => ({ ...town, areas: [town.name, ...(town.areas ?? [])] })),
  ...["Westlands", "Kilimani", "Lavington", "Kileleshwa", "South B", "South C", "Langata", "Karen", "Parklands", "Upper Hill"].map((area) => ({
    slug: area.toLowerCase().replace(/ /g, "-"),
    name: area === "Langata" ? "Lang’ata" : area,
    areas: [area],
    county: "Nairobi",
  })),
];

export function findPlace(slug?: string) {
  return places.find((place) => place.slug === slug);
}

export const townNames = towns.map(({ name }) => name).sort((a, b) => a.localeCompare(b, "en-KE"));
