/**
 * A rejected field must say so, not just turn red.
 *
 * MEASURED BEFORE THE FIX
 *   Rejecting a National ID left #id_number with aria-invalid=null and no
 *   aria-describedby. The message was rendered and announced to nobody. The
 *   error-association work earlier in this session covered the two wizards;
 *   this form was not among them.
 *
 * WHY THIS IS A RENDER TEST
 *   The aria is injected by the shared Field component, derived from the
 *   htmlFor it already has, rather than written out at each of the eighteen
 *   call sites. A static check could confirm the code exists; only rendering
 *   confirms the id it derives actually matches the control and resolves to
 *   the message. That distinction has bitten twice in this session already.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddTenantForm } from "../AddTenantForm";

// The component calls a server action on submit; nothing here submits, but the
// import has to resolve.
jest.mock("../../actions", () => ({
  createTenancy: jest.fn(async () => ({ ok: true })),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

function renderForm() {
  return render(
    <AddTenantForm
      buildingId="b1"
      buildingName="Riverside Court"
      unitId="u1"
      unitNumber="A102"
      defaultRent={55000}
      defaultDeposit={55000}
      alreadyLet={false}
    />,
  );
}

/** What a screen reader would be told about this control. */
function aria(container: HTMLElement, id: string) {
  const el = container.querySelector(
    `#${CSS.escape(id)}`,
  ) as HTMLElement | null;
  if (!el) return null;
  const describedBy = el.getAttribute("aria-describedby");
  return {
    invalid: el.getAttribute("aria-invalid"),
    describedBy,
    message: describedBy
      ? (
          container.querySelector(`#${CSS.escape(describedBy)}`)?.textContent ??
          ""
        ).trim()
      : null,
  };
}

describe("the add-tenant form announces its errors", () => {
  it("marks nothing invalid before anything has been rejected", () => {
    const { container } = renderForm();
    const invalid = container.querySelectorAll('[aria-invalid="true"]');
    expect(invalid).toHaveLength(0);
  });

  it("points a hint-bearing field at its hint", () => {
    const { container } = renderForm();
    const a = aria(container, "id_number");
    expect(a).not.toBeNull();
    // A hint is a description too; the field should carry it when valid.
    expect(a!.describedBy).toBe("id_number-hint");
    expect((a!.message ?? "").length).toBeGreaterThan(0);
  });

  it("marks a rejected field invalid and points it at its own message", () => {
    const { container } = renderForm();

    // The exact value that was stored as a National ID before validation
    // existed, which is what made this form worth looking at.
    fireEvent.change(container.querySelector("#id_number")!, {
      target: { value: "Tenancy Probe" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    const a = aria(container, "id_number");
    expect(a!.invalid).toBe("true");
    expect(a!.describedBy).toBe("id_number-error");
    expect(a!.message ?? "").toMatch(/digits only/i);
  });

  it("leaves the fields it did not reject alone", () => {
    const { container } = renderForm();
    fireEvent.change(container.querySelector("#id_number")!, {
      target: { value: "Tenancy Probe" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // occupation is optional and was not filled, so it must not be marked.
    expect(aria(container, "occupation")!.invalid).toBeNull();
  });

  it("never points at an id that is not rendered", () => {
    const { container } = renderForm();
    fireEvent.change(container.querySelector("#id_number")!, {
      target: { value: "Tenancy Probe" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    const dangling = Array.from(
      container.querySelectorAll("[aria-describedby]"),
    )
      .map((el) => el.getAttribute("aria-describedby")!)
      .filter((id) => !container.querySelector(`#${CSS.escape(id)}`));
    expect(dangling).toEqual([]);
  });
});
