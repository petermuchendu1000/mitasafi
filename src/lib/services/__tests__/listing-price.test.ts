import { getServiceListingPrice } from "../listing-price";

describe("getServiceListingPrice", () => {
  it.each([
    [{ type: "fixed", amount: 0 }, "fixed", 0, "Ksh 0"],
    [{ type: "starting_from", amount: 2800 }, "starting_from", 2800, "From Ksh 2,800"],
    [{ type: "hourly", amount: "1300" }, "hourly", 1300, "Ksh 1,300/hr"],
    [{ type: "per_sqm", amount: 250 }, "per_sqm", 250, "Ksh 250/sqm"],
  ])("preserves the listed amount and basis for %j", (input, type, amount, label) => {
    const price = getServiceListingPrice(input);
    expect({ ...price, label: price.label.replace(/\u00a0/g, " ") }).toEqual({ type, amount, label });
  });

  it.each([
    { type: "quote", amount: 1000 },
    { type: "quote_only", amount: null },
    { type: "fixed", amount: "" },
    { type: "fixed", amount: -1000 },
    null,
  ])("shows a quote for %j", (input) => {
    expect(getServiceListingPrice(input)).toEqual({
      type: "quote_only",
      amount: null,
      label: "Quote on request",
    });
  });
});
