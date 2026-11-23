/**
 * @jest-environment jsdom
 */

/**
 * canResend is derived from (step, countdown), not synchronised by the countdown effect.
 *
 * The defect was one frame wide: the effect's `else if (countdown === 0 && step ===
 * "otp") setCanResend(true)` could only run AFTER the render in which countdown had
 * already reached 0, and in that render canResend was still false — so the form showed
 * "Resend in 0s" instead of the Resend button.
 *
 * act() flushes effects, so the final DOM is right in both versions. The commit log
 * below records container.innerHTML at every commit, which is where the bad frame is.
 */

import { render, act } from "@testing-library/react";
import { Profiler } from "react";
import { PhoneVerificationForm } from "../PhoneVerificationForm";

const sendPhoneOTP = jest.fn();
const verifyPhoneOTP = jest.fn();

jest.mock("../actions", () => ({
  sendPhoneOTP: (...args: unknown[]) => sendPhoneOTP(...args),
  verifyPhoneOTP: (...args: unknown[]) => verifyPhoneOTP(...args),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

function renderForm() {
  const commits: string[] = [];
  let container: HTMLElement | null = null;
  const onRender = () => {
    if (container) commits.push(container.innerHTML);
  };

  const view = render(
    <Profiler id="otp" onRender={onRender}>
      <PhoneVerificationForm initialPhone="0712345678" userId="u1" />
    </Profiler>,
  );
  container = view.container;
  commits.unshift(view.container.innerHTML);
  return { view, commits };
}

function button(view: { container: HTMLElement }, text: string) {
  return [...view.container.querySelectorAll("button")].find((b) =>
    b.textContent?.includes(text),
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  sendPhoneOTP.mockReset();
  verifyPhoneOTP.mockReset();
  sendPhoneOTP.mockResolvedValue({ success: true });
});

afterEach(() => {
  jest.useRealTimers();
});

/**
 * Advance the countdown one second at a time.
 *
 * jest.advanceTimersByTime(60_000) in one go only fires the FIRST timeout: the next one
 * is scheduled by the countdown effect, which React runs after the state flush, by
 * which time advanceTimersByTime has already returned. Each second therefore needs its
 * own act() so the effect can schedule the following timer. Getting this wrong showed
 * up as "Resend in 59s" after a nominal sixty seconds.
 */
async function tickSeconds(seconds: number) {
  for (let i = 0; i < seconds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

/** Send the code and land on the OTP step with the 60s countdown running. */
async function reachOtpStep(view: { container: HTMLElement }) {
  await act(async () => {
    button(view, "Send code")?.click();
  });
}

describe("the resend control", () => {
  it("is not offered while the countdown is running", async () => {
    const { view } = renderForm();
    await reachOtpStep(view);

    expect(view.container.textContent).toContain("Resend in 60s");
    expect(button(view, "Resend code")).toBeUndefined();
  });

  it("is offered the moment the countdown reaches zero", async () => {
    const { view } = renderForm();
    await reachOtpStep(view);

    await tickSeconds(60);

    expect(button(view, "Resend code")).toBeDefined();
  });

  it('NO commit ever renders "Resend in 0s"', async () => {
    const { view, commits } = renderForm();
    await reachOtpStep(view);

    await tickSeconds(60);

    // This is the whole defect. With the effect, exactly one commit in this sequence
    // showed a zero-second countdown before the button replaced it.
    const offending = commits.filter((html) => html.includes("Resend in 0s"));
    expect(offending).toEqual([]);
  });

  it("counts all the way down through 1s and never past zero", async () => {
    const { view, commits } = renderForm();
    await reachOtpStep(view);

    await tickSeconds(60);

    // Guards the rewritten effect: `if (countdown <= 0) return` must not stop the
    // timer early, and must not let it run negative.
    expect(commits.some((html) => html.includes("Resend in 1s"))).toBe(true);
    expect(commits.some((html) => html.includes("Resend in -1s"))).toBe(false);
  });

  it("goes back to a running countdown after a resend", async () => {
    const { view } = renderForm();
    await reachOtpStep(view);
    await tickSeconds(60);
    expect(button(view, "Resend code")).toBeDefined();

    await act(async () => {
      button(view, "Resend code")?.click();
    });

    // setCanResend(false) used to be needed at both places that restart the countdown.
    // Nothing puts the derived value back; countdown becoming 60 is what does it.
    expect(view.container.textContent).toContain("Resend in 60s");
    expect(button(view, "Resend code")).toBeUndefined();
    expect(sendPhoneOTP).toHaveBeenCalledTimes(2);
  });

  it("keeps the resend offer open when the resend itself fails", async () => {
    const { view } = renderForm();
    await reachOtpStep(view);
    await tickSeconds(60);

    sendPhoneOTP.mockResolvedValue({ success: false, error: "Carrier down" });
    await act(async () => {
      button(view, "Resend code")?.click();
    });

    // The countdown was never restarted, so the user must still be able to retry.
    expect(view.container.textContent).toContain("Carrier down");
    expect(button(view, "Resend code")).toBeDefined();
  });

  it("does not offer resend on the phone step, even with countdown at zero", async () => {
    // The derivation is gated on step, not only on the counter. On first paint
    // countdown is already 0.
    const { view } = renderForm();
    expect(button(view, "Resend code")).toBeUndefined();
    expect(view.container.textContent).not.toContain("Resend in");
  });
});
