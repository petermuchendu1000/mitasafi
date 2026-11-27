import { NAIROBI_AREAS } from "@/lib/constants";
import { townNames } from "./places";

export const marketplaceAreaNames = Array.from(new Set([...NAIROBI_AREAS, ...townNames])).sort((a, b) => a.localeCompare(b, "en-KE"));

function areaKey(area: string) {
  return area.toLowerCase().replace(/[’']/g, "").trim();
}

export function findMarketplaceArea(area?: string) {
  if (!area) return undefined;

  const key = areaKey(area);
  return marketplaceAreaNames.find((option) => areaKey(option) === key);
}

export function areaLabel(area: string) {
  return area === "Langata" ? "Lang’ata" : area;
}
