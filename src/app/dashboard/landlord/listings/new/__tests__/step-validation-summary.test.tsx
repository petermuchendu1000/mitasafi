/**
 * An incomplete step must say what is outstanding.
 *
 * MEASURED BEFORE THIS EXISTED
 *   Fourteen step components computed validation errors and rendered none of
 *   them. Only Step2Location displayed anything. Meanwhile the Continue button
 *   was `disabled`, which removes it from the tab order entirely — so a
 *   screen-reader user could not even find the control that was blocking them,
 *   let alone learn why.
 *
 * WHY THESE PARTICULAR COMPONENTS
 *   The eight specialized commercial forms contain no error markup at all and
 *   are reached only by choosing a commercial sub-type several steps in, which
 *   a browser walk in this project cannot currently get to. They push their
 *   errors into shared wizard state through validateRequiredFields, and the
 *   summary reads that state — so rendering a form next to the summary proves
 *   the mechanism reaches exactly the files no other channel covers.
 *
 * NO NEW RULES
 *   The summary displays what the wizard already decided. These tests assert
 *   that messages SURFACE, never which messages exist, so they cannot quietly
 *   lock in a validation rule.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { WizardProvider } from "../context";
import { StepValidationSummary } from "../StepValidationSummary";

import { BankBranchDetails } from "../steps/Step3Commercial/specialized/BankBranchDetails";
import { DataCenterDetails } from "../steps/Step3Commercial/specialized/DataCenterDetails";
import { GymFitnessDetails } from "../steps/Step3Commercial/specialized/GymFitnessDetails";
import { SalonSpaDetails } from "../steps/Step3Commercial/specialized/SalonSpaDetails";

/**
 * The specialized forms validate step 3, so the wizard must be on step 3 —
 * and their required fields are derived from the commercial type/sub-type
 * chosen back on step 1. Without those, getRequiredFields returns nothing and
 * an empty form is legitimately "valid". Seeding them is what the real flow
 * does, not a workaround: the first version of this test omitted them and
 * measured 0 outstanding items on every form.
 */
function renderOnStep3(Form: React.ComponentType, subtype: string) {
  return render(
    <WizardProvider
      initialStep={3}
      initialData={
        {
          listingCategory: "commercial",
          commercialType: "specialized",
          commercialSubtype: subtype,
        } as never
      }
    >
      <StepValidationSummary />
      <Form />
    </WizardProvider>,
  );
}

const FORMS: [string, React.ComponentType, string][] = [
  ["BankBranchDetails", BankBranchDetails, "bank_branch"],
  ["DataCenterDetails", DataCenterDetails, "data_center"],
  ["GymFitnessDetails", GymFitnessDetails, "gym_fitness"],
  ["SalonSpaDetails", SalonSpaDetails, "salon_spa"],
];

describe("an incomplete specialized form surfaces its outstanding items", () => {
  it.each(FORMS)("%s lists what is missing", (_name, Form, subtype) => {
    const { container } = renderOnStep3(Form, subtype);
    const summary = container.querySelector("#step-validation-summary");
    expect(summary).not.toBeNull();

    const items = Array.from(summary!.querySelectorAll("li")).map((li) =>
      (li.textContent || "").trim(),
    );
    // An empty form cannot be complete, so SOMETHING must be outstanding.
    // Asserting "more than zero" rather than a fixed list keeps this from
    // pinning the validation rules themselves.
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((t) => t.length > 0)).toBe(true);
  });
});

describe("the summary's live region", () => {
  it("exists before it has content, or the first message is never announced", () => {
    const { container } = render(
      <WizardProvider initialStep={1}>
        <StepValidationSummary />
      </WizardProvider>,
    );
    const summary = container.querySelector("#step-validation-summary");
    expect(summary).not.toBeNull();
    expect(summary!.getAttribute("aria-live")).toBe("polite");
    expect(summary!.querySelectorAll("li")).toHaveLength(0);
  });

  it("says nothing when the step has no errors", () => {
    render(
      <WizardProvider initialStep={1}>
        <StepValidationSummary />
      </WizardProvider>,
    );
    // No false alarm: a step with nothing recorded against it stays quiet.
    expect(screen.queryByText(/left before you can continue/)).toBeNull();
  });
});
