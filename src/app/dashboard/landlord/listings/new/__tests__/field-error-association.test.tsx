/**
 * A field's own validation message, next to the field and tied to it.
 *
 * THE RISK THIS IS GUARDING
 *   An earlier per-field pass on this wizard produced two WRONG pairings — a
 *   label for "Rent Amount" attached to the currency <select> in front of the
 *   amount input, which announces the dropdown as "Rent Amount". The failure
 *   mode was manual matching of three things that all had to agree: the error
 *   key, the control, and the id joining them.
 *
 *   FieldError removes the third: the message id is derived from the key, and
 *   the control's aria comes from the same key via fieldErrorProps. These
 *   tests check both halves — that the pairing is structural in the source,
 *   and that it actually resolves in a rendered DOM.
 *
 * THE STATIC HALF
 *   Every <FieldError field="X"> must have a fieldErrorProps("X", …) in the
 *   same file. A message with no control to describe, or a control describing
 *   a message that is never rendered, both fail.
 */

import React from "react";
import fs from "fs";
import path from "path";
import { render } from "@testing-library/react";
import { WizardProvider } from "../context";
import { Step7Review } from "../steps/Step7Review";
import { fieldErrorId } from "../FieldError";

const root = process.cwd();
const STEPS = "src/app/dashboard/landlord/listings/new";

function walk(dir: string, out: string[] = []): string[] {
  const abs = path.join(root, dir);
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "__tests__") continue;
      walk(rel, out);
    } else if (e.name.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

describe("FieldError pairing is structural, not hand-matched", () => {
  const files = walk(STEPS);

  it("finds files that use FieldError (so a rename cannot silently pass)", () => {
    const users = files.filter((f) =>
      /<FieldError\b/.test(fs.readFileSync(path.join(root, f), "utf8")),
    );
    expect(users.length).toBeGreaterThanOrEqual(4);
  });

  it("every rendered message has a control described by the same key", () => {
    const mismatched: Record<string, string[]> = {};
    for (const rel of files) {
      const src = fs.readFileSync(path.join(root, rel), "utf8");
      const shown = [...src.matchAll(/<FieldError\s+field="([^"]+)"/g)].map(
        (m) => m[1],
      );
      if (!shown.length) continue;
      const wired = new Set([
        ...[...src.matchAll(/fieldErrorProps\(\s*"([^"]+)"/g)].map((m) => m[1]),
        ...[...src.matchAll(/fieldErrorId\(\s*"([^"]+)"/g)].map((m) => m[1]),
      ]);
      const bad = shown.filter((f) => !wired.has(f));
      if (bad.length) mismatched[rel] = bad;
    }
    expect(mismatched).toEqual({});
  });
});

describe("the pairing resolves in a rendered DOM", () => {
  it("an invalid field points at its own message, and says it is invalid", () => {
    const { container } = render(
      <WizardProvider initialStep={7} initialData={{ title: "short" } as never}>
        <Step7Review />
      </WizardProvider>,
    );

    const input = container.querySelector("#listingTitle") as HTMLInputElement;
    expect(input).not.toBeNull();

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBe(fieldErrorId("title"));
    expect(input.getAttribute("aria-invalid")).toBe("true");

    // The id must actually exist, and carry the message the wizard computed.
    const message = container.querySelector(`#${CSS.escape(describedBy!)}`);
    expect(message).not.toBeNull();
    expect(message!.textContent).toMatch(/at least 10 characters/);
  });

  it("a valid field carries no stale aria pointing at nothing", () => {
    const { container } = render(
      <WizardProvider
        initialStep={7}
        initialData={
          {
            title: "A perfectly reasonable listing title",
            description:
              "A description comfortably longer than the fifty character minimum this step asks for.",
          } as never
        }
      >
        <Step7Review />
      </WizardProvider>,
    );
    const input = container.querySelector("#listingTitle") as HTMLInputElement;
    expect(input.getAttribute("aria-describedby")).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(
      container.querySelector(`#${CSS.escape(fieldErrorId("title"))}`),
    ).toBeNull();
  });
});
