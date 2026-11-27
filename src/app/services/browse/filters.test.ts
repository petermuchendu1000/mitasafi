import { parseBrowseFilters } from "./filters";

it("passes the upper limit of a selected budget to the provider query", () => {
  const { filters } = parseBrowseFilters(new URLSearchParams("price=budget&location=thika"));
  expect(filters).toMatchObject({ priceMin: 0, priceMax: 5000 });
  expect(filters.area).toContain("Thika");
});

it("preserves an open upper limit when legacy links contain several price bands", () => {
  const { filters } = parseBrowseFilters(new URLSearchParams("price=enterprise,moderate"));
  expect(filters).toMatchObject({ priceMin: 5000, priceMax: null });
});
