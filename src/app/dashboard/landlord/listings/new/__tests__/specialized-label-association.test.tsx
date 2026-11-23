/**
 * Every specialized commercial form must name its controls.
 *
 * WHY THIS IS A RENDER TEST AND NOT A GREP
 *   These forms contain no literal <label> at all. They call <FieldLabel>,
 *   a shared component that rendered a bare <label> with no `for` — so a
 *   static scan of these files found nothing, while every one of the 45 call
 *   sites produced an unassociated label at runtime. Counting markup in the
 *   file would have reported them clean. Only rendering shows the defect.
 *
 * WHAT IS ASSERTED
 *   1. every rendered <label> resolves to a control (HTMLLabelElement.control
 *      — the browser's own relationship, which drives both click-to-focus and
 *      the accessible name)
 *   2. every role="group" carries an aria-labelledby that resolves to an
 *      element that exists. CounterInput and ButtonGroup render BUTTONS, which
 *      a <label> cannot point at, so they are named groups instead.
 *
 * Both assertions name the offending text on failure, so a regression says
 * which field broke rather than just a count.
 */

import React from "react";
import { render } from "@testing-library/react";
import { WizardProvider } from "../context";

import { AtmSiteDetails } from "../steps/Step3Commercial/specialized/AtmSiteDetails";
import { BankBranchDetails } from "../steps/Step3Commercial/specialized/BankBranchDetails";
import { DataCenterDetails } from "../steps/Step3Commercial/specialized/DataCenterDetails";
import { GymFitnessDetails } from "../steps/Step3Commercial/specialized/GymFitnessDetails";
import { PhotoStudioDetails } from "../steps/Step3Commercial/specialized/PhotoStudioDetails";
import { RecordingStudioDetails } from "../steps/Step3Commercial/specialized/RecordingStudioDetails";
import { ReligiousFacilityDetails } from "../steps/Step3Commercial/specialized/ReligiousFacilityDetails";
import { SalonSpaDetails } from "../steps/Step3Commercial/specialized/SalonSpaDetails";

/**
 * How many associated controls each form must render.
 *
 * THESE COUNTS ARE THE POINT OF THE TEST, not decoration.
 *
 * The first version asserted only "no orphan labels" and "no unnamed groups",
 * went green, and then SURVIVED BOTH MUTANTS: removing an htmlFor makes
 * FieldLabel fall back to a caption <div>, and removing a labelledBy makes the
 * group role disappear. With nothing broken left to find, both assertions
 * passed over an empty set. The degradation path here deletes the evidence.
 *
 * So the test pins what must EXIST. Remove one association and the count drops
 * and this fails. Add one without updating the table and it fails too, which
 * keeps the numbers honest.
 */
const EXPECTED: Record<string, { labels: number; groups: number }> = {
  AtmSiteDetails: { labels: 8, groups: 1 },
  BankBranchDetails: { labels: 9, groups: 4 },
  DataCenterDetails: { labels: 9, groups: 3 },
  GymFitnessDetails: { labels: 8, groups: 3 },
  PhotoStudioDetails: { labels: 9, groups: 1 },
  RecordingStudioDetails: { labels: 6, groups: 3 },
  ReligiousFacilityDetails: { labels: 9, groups: 2 },
  SalonSpaDetails: { labels: 6, groups: 6 },
};

const FORMS: [string, React.ComponentType][] = [
  ["AtmSiteDetails", AtmSiteDetails],
  ["BankBranchDetails", BankBranchDetails],
  ["DataCenterDetails", DataCenterDetails],
  ["GymFitnessDetails", GymFitnessDetails],
  ["PhotoStudioDetails", PhotoStudioDetails],
  ["RecordingStudioDetails", RecordingStudioDetails],
  ["ReligiousFacilityDetails", ReligiousFacilityDetails],
  ["SalonSpaDetails", SalonSpaDetails],
];

describe.each(FORMS)("%s names its controls", (name, Form) => {
  let container: HTMLElement;

  beforeEach(() => {
    ({ container } = render(
      <WizardProvider>
        <Form />
      </WizardProvider>,
    ));
  });

  it("renders exactly the expected number of associated controls", () => {
    const labels = Array.from(container.querySelectorAll("label")).filter(
      (l) => !!(l as HTMLLabelElement).control,
    ).length;
    const groups = Array.from(
      container.querySelectorAll('[role="group"]'),
    ).filter((g) => {
      const id = g.getAttribute("aria-labelledby");
      return !!id && !!container.querySelector(`#${CSS.escape(id)}`);
    }).length;

    // Counting what EXISTS, so that removing an association fails here even
    // though it leaves nothing broken behind for the other two tests to find.
    expect({ labels, groups }).toEqual(EXPECTED[name]);
  });

  it("leaves no FieldLabel caption orphaned (an id nothing points at)", () => {
    // A caption <div id> is only correct when some group names itself by it.
    // Otherwise the field has a visible label and no accessible one.
    const referenced = new Set(
      Array.from(container.querySelectorAll("[aria-labelledby]")).map((g) =>
        g.getAttribute("aria-labelledby"),
      ),
    );
    const stranded = Array.from(container.querySelectorAll("div[id]"))
      .filter((d) => !referenced.has(d.id))
      .map((d) => `${d.id}: ${(d.textContent || "").trim().slice(0, 30)}`);
    expect(stranded).toEqual([]);
  });

  it("every <label> resolves to a control", () => {
    const orphans = Array.from(container.querySelectorAll("label"))
      .filter((l) => !(l as HTMLLabelElement).control)
      .map((l) => (l.textContent || "").trim().slice(0, 40));
    expect(orphans).toEqual([]);
  });

  it("every role=group is named by an element that exists", () => {
    const unnamed = Array.from(container.querySelectorAll('[role="group"]'))
      .filter((g) => {
        const id = g.getAttribute("aria-labelledby");
        return !id || !container.querySelector(`#${CSS.escape(id)}`);
      })
      .map((g) => (g.textContent || "").trim().slice(0, 40));
    expect(unnamed).toEqual([]);
  });
});
