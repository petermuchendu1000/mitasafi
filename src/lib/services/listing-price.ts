import { formatServicePrice } from "@/lib/constants";

export function getServiceListingPrice(pricing: unknown) {
  const data = pricing && typeof pricing === "object" && !Array.isArray(pricing)
    ? pricing as Record<string, unknown>
    : null;
  const rawAmount = data?.amount;
  const amount = typeof rawAmount === "string" && rawAmount.trim() ? Number(rawAmount) : rawAmount;
  const type = data?.type;
  const isQuote = type === "quote" || type === "quote_only" ||
    typeof amount !== "number" || !Number.isFinite(amount) || amount < 0;

  if (isQuote) return { type: "quote_only", amount: null, label: "Quote on request" } as const;

  const unit = type === "hourly" || type === "per_sqm" ? type : "fixed";
  return {
    type: type === "starting_from" ? type : unit,
    amount,
    label: (type === "starting_from" ? "From " : "") + formatServicePrice(amount, unit),
  };
}
