/**
 * In the specialized commercial forms, a control's id IS the field it binds to.
 *
 * WHY THAT RULE
 *   These forms previously carried ids like "bank-branch-total-area" while
 *   their validation errors were keyed "sizeSqm". Joining the two needed a
 *   hand-written mapping, and hand-written mapping is exactly what produced
 *   two WRONG pairings earlier in this wizard — a label for "Rent Amount"
 *   attached to the currency selector in front of the amount input.
 *
 *   The binding was already in the source: every control carries
 *   `value={commercial.X}` and `update({ X: ... })`. Making the id equal X
 *   turns the pairing into something a test can check, which is what this is.
 *   Nothing is mapped, so nothing can be mapped wrongly.
 *
 * WHAT IS ASSERTED, FROM THE SOURCE
 *   For every NumberInput/TextInput: id="X" and fieldErrorProps("X", …)
 *   For every CounterInput/ButtonGroup: describedBy via fieldErrorId("X")
 *   For every control: a <FieldError field="X"> follows it
 *   where X is read off that control's own binding, not from a list here.
 *
 * AND FROM A RENDERED DOM
 *   That an invalid field's control actually points at its own message.
 */

import React from "react";
import fs from "fs";
import path from "path";
import { render } from "@testing-library/react";
import { WizardProvider } from "../context";
import { fieldErrorId } from "../FieldError";
import { BankBranchDetails } from "../steps/Step3Commercial/specialized/BankBranchDetails";

const root = process.cwd();
const DIR =
  "src/app/dashboard/landlord/listings/new/steps/Step3Commercial/specialized";

const INPUTS = new Set(["NumberInput", "TextInput"]);
const CONTROL = /<(NumberInput|TextInput|CounterInput|ButtonGroup)\b/g;

/** The one field this control is bound to, read from its own attributes. */
function boundKey(block: string): string | null {
  const keys = new Set<string>([
    ...[...block.matchAll(/value=\{commercial\.(\w+)/g)].map((m) => m[1]),
    ...[...block.matchAll(/update\(\s*\{\s*(\w+)\s*:/g)].map((m) => m[1]),
  ]);
  return keys.size === 1 ? [...keys][0] : null;
}

function formFiles(): string[] {
  return fs
    .readdirSync(path.join(root, DIR))
    .filter((f) => f.endsWith(".tsx") && f !== "field-configs.tsx")
    .map((f) => path.join(DIR, f));
}

describe("specialized controls are keyed by the field they bind to", () => {
  const files = formFiles();

  it("finds the forms (a rename must not silently pass)", () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  it("every control's wiring uses its own bound key", () => {
    const problems: string[] = [];

    for (const rel of files) {
      const src = fs.readFileSync(path.join(root, rel), "utf8");
      const name = path.basename(rel);
      for (const m of src.matchAll(CONTROL)) {
        const comp = m[1];
        const close = src.indexOf("/>", m.index! + m[0].length);
        const block = src.slice(m.index! + m[0].length, close);
        const key = boundKey(block);
        if (!key) {
          problems.push(`${name}: <${comp}> binds no single field`);
          continue;
        }

        if (INPUTS.has(comp)) {
          if (!new RegExp(`id="${key}"`).test(block))
            problems.push(
              `${name}: <${comp}> bound to ${key} but id is not "${key}"`,
            );
          if (!new RegExp(`fieldErrorProps\\(\\s*"${key}"`).test(block))
            problems.push(
              `${name}: <${comp}> ${key} has no fieldErrorProps("${key}")`,
            );
        } else {
          if (!new RegExp(`fieldErrorId\\(\\s*"${key}"`).test(block))
            problems.push(
              `${name}: <${comp}> ${key} has no describedBy for "${key}"`,
            );
          // A labelledBy, when present, must use the same key.
          const lb = /labelledBy="([^"]+)"/.exec(block);
          if (lb && lb[1] !== `${key}-label`)
            problems.push(`${name}: <${comp}> ${key} labelledBy is "${lb[1]}"`);
        }

        // The message for this field must follow the control.
        const after = src.slice(close, close + 220);
        if (!new RegExp(`<FieldError\\s+field="${key}"`).test(after))
          problems.push(
            `${name}: ${key} has no <FieldError field="${key}"> after it`,
          );
      }
    }

    expect(problems).toEqual([]);
  });

  it("no aria points at an id that is never rendered", () => {
    const dangling: string[] = [];
    for (const rel of files) {
      const src = fs.readFileSync(path.join(root, rel), "utf8");
      for (const m of src.matchAll(/labelledBy="([^"]+)"/g)) {
        if (!src.includes(`id="${m[1]}"`))
          dangling.push(`${path.basename(rel)}: ${m[1]}`);
      }
    }
    expect(dangling).toEqual([]);
  });
});

describe("the derived pairing resolves in a rendered DOM", () => {
  it("an invalid specialized field points at its own message", () => {
    const { container } = render(
      <WizardProvider
        initialStep={3}
        initialData={
          {
            listingCategory: "commercial",
            commercialType: "specialized",
            commercialSubtype: "bank_branch",
          } as never
        }
      >
        <BankBranchDetails />
      </WizardProvider>,
    );

    // sizeSqm is required for a bank branch and is empty here.
    const input = container.querySelector("#sizeSqm") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.getAttribute("aria-describedby")).toBe(
      fieldErrorId("sizeSqm"),
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");

    const message = container.querySelector(
      `#${CSS.escape(fieldErrorId("sizeSqm"))}`,
    );
    expect(message).not.toBeNull();
    expect((message!.textContent || "").trim().length).toBeGreaterThan(0);
  });
});
