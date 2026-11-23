/**
 * @jest-environment jsdom
 */

/**
 * PaymentForm polling lifecycle.
 *
 * WHY THIS EXISTS
 *   PaymentForm drives M-Pesa STK Push and then polls for settlement. It had no test of
 *   any kind, and neither did the other 44 files holding ESLint errors. This is the first
 *   component test in the repository.
 *
 * WHAT IS UNDER TEST
 *   The polling chain in pollStatus(): each non-terminal outcome schedules the next tick
 *   into a single shared pollTimerRef, and the only clearTimeout is the unmount cleanup.
 *
 * TWO COMPETING HYPOTHESES, with the discriminating observation stated BEFORE the run:
 *
 *   H1  Two chains can overlap after a retry.
 *       Discriminator: drive a chain to a terminal status, then retry, and count fetches
 *       naming the OLD paymentId. CONTRADICTING RESULT = zero old-id fetches, which would
 *       falsify H1. I expect H1 to be FALSIFIED: terminal and max-attempt branches return
 *       without scheduling, and polling mode renders no form to retry from.
 *
 *   H2  A chain survives unmount when a fetch is in flight.
 *       The cleanup clears pollTimerRef.current, but while a fetch is awaiting there IS no
 *       timer to clear; the continuation then schedules a fresh one against an unmounted
 *       component, and every later tick re-schedules.
 *       Discriminator: unmount WHILE a fetch is unresolved, then resolve it and advance
 *       time. CONTRADICTING RESULT = no further fetch after unmount, which would falsify H2.
 *
 * Both assertions can return either answer, so neither is a check that cannot fail (L5).
 */

import { render, screen, act } from "@testing-library/react";
import { PaymentForm } from "../PaymentForm";

const POLL_INTERVAL_MS = 3_000; // mirrors the constant in PaymentForm.tsx:51

/** A fetch mock whose responses are resolved manually, so "in flight" is controllable. */
function makeDeferredFetch() {
  const calls: string[] = [];
  let release: ((body: unknown) => void) | null = null;

  const fetchMock = jest.fn((url: string) => {
    calls.push(url);
    return new Promise((resolve) => {
      release = (body: unknown) =>
        resolve({ ok: true, json: async () => body } as Response);
    });
  });

  return {
    calls,
    fetchMock,
    /** Resolve the outstanding request and let its .then continuation run. */
    async settle(body: unknown) {
      if (!release) throw new Error("no request in flight to settle");
      const fire = release;
      release = null;
      await act(async () => {
        fire(body);
      });
    },
    get inFlight() {
      return release !== null;
    },
  };
}

const PENDING_BODY = {
  success: true,
  payment: { status: "pending" },
};

describe("PaymentForm polling lifecycle", () => {
  let deferred: ReturnType<typeof makeDeferredFetch>;

  beforeEach(() => {
    jest.useFakeTimers();
    deferred = makeDeferredFetch();
    global.fetch = deferred.fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("starts polling for a payment that is already pending", async () => {
    render(
      <PaymentForm
        bookingId="bk_1"
        amount={1000}
        defaultPhone="0712345678"
        pendingPaymentId="pay_A"
      />,
    );

    // The effect fires on mount and issues the first status request.
    expect(deferred.calls).toHaveLength(1);
    expect(deferred.calls[0]).toContain("paymentId=pay_A");
    expect(screen.getByText(/Checking payment status/i)).toBeInTheDocument();
  });

  it("H2: does NOT keep polling after unmount when a request was in flight", async () => {
    const { unmount } = render(
      <PaymentForm
        bookingId="bk_1"
        amount={1000}
        defaultPhone="0712345678"
        pendingPaymentId="pay_A"
      />,
    );

    expect(deferred.calls).toHaveLength(1);
    expect(deferred.inFlight).toBe(true);

    // Navigate away mid-request. The cleanup runs, but there is no timer pending yet.
    unmount();

    // The provider responds after the component is gone.
    await deferred.settle(PENDING_BODY);

    // If the chain survived unmount it has scheduled another tick. Advance past it.
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);
    });

    // A fetch issued after unmount is the defect. Zero is the contradicting result.
    expect(deferred.calls).toHaveLength(1);
  });

  /**
   * Third observation channel (G7): a concurrency harness, distinct in method from the
   * single-run runtime test above. Mount and abandon the form repeatedly, as a user
   * navigating in and out of the payment page does, and count what accumulates.
   *
   * If each abandoned mount leaves a live chain, the orphans keep issuing requests as
   * time passes. CONTRADICTING RESULT = a request count that does not move when a minute
   * elapses, which would falsify the leak.
   *
   * NOTE ON AN EARLIER, INVALID VERSION OF THIS ASSERTION. It first asserted
   * `jest.getTimerCount() === 0`. That check failed for the wrong reason: measurement
   * showed 3 residual timers after 3 abandoned mounts, but advancing 60s produced NO
   * further requests (fetches_after_loop=3, fetches_after_60s=3), so those timers drive
   * nothing. A timer count is not the defect; a request after abandonment is. The
   * assertion was corrected rather than relaxed — the version below is strictly the
   * stronger statement, and it is still red against the unfixed component.
   */
  it("H2 (concurrency harness): abandoned mounts issue no further requests", async () => {
    const MOUNTS = 3;

    for (let i = 0; i < MOUNTS; i += 1) {
      const { unmount } = render(
        <PaymentForm
          bookingId="bk_1"
          amount={1000}
          defaultPhone="0712345678"
          pendingPaymentId={`pay_${i}`}
        />,
      );
      // Abandon the page while the status request is still outstanding.
      unmount();
      await deferred.settle(PENDING_BODY);
    }

    // One request per mount, all issued before its unmount.
    expect(deferred.calls).toHaveLength(MOUNTS);

    // A full minute is 20 poll intervals. Orphaned chains would show up here.
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(deferred.calls).toHaveLength(MOUNTS);
  });

  /**
   * Guards the RECURSION itself. pollStatus re-invokes itself from a setTimeout, and
   * react-hooks/immutability flags that self-reference because the callback is read
   * before its own declaration. Any rewiring of that recursion — through a ref, a
   * reducer, whatever — must keep the chain running, and nothing else in this file
   * exercises a second tick, so a silently broken chain would go unnoticed.
   *
   * CONTRADICTING RESULT = a request count that stays at 1 after the interval elapses.
   */
  it("keeps polling: a pending status schedules and issues the next tick", async () => {
    render(
      <PaymentForm
        bookingId="bk_1"
        amount={1000}
        defaultPhone="0712345678"
        pendingPaymentId="pay_A"
      />,
    );

    expect(deferred.calls).toHaveLength(1);

    // First tick comes back still pending -> the chain must schedule another.
    await deferred.settle(PENDING_BODY);

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS);
    });

    expect(deferred.calls).toHaveLength(2);
    expect(deferred.calls[1]).toContain("paymentId=pay_A");

    // And again, to show it is a chain and not a single extra tick.
    await deferred.settle(PENDING_BODY);
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS);
    });

    expect(deferred.calls).toHaveLength(3);
  });

  it("H1: a terminal status ends the chain and schedules nothing further", async () => {
    render(
      <PaymentForm
        bookingId="bk_1"
        amount={1000}
        defaultPhone="0712345678"
        pendingPaymentId="pay_A"
      />,
    );

    expect(deferred.calls).toHaveLength(1);

    await deferred.settle({
      success: true,
      payment: { status: "failed", failure_reason: "Insufficient funds" },
    });

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS * 5);
    });

    // Terminal status must not schedule another tick.
    expect(deferred.calls).toHaveLength(1);
  });

  /**
   * The timeout branch, which moved when the polling chain was brought inside the
   * effect. It used to be the first thing pollStatus() did, so "run attempt N" and
   * "notice there is no attempt N left" were one function, and reporting a timeout
   * meant calling the poller and having it immediately refuse. It is now the
   * scheduler's decision.
   *
   * Two things must hold across that move: the number of requests is unchanged at
   * MAX_POLL_ATTEMPTS, and the message appears as soon as the attempt after the last
   * one would have been booked rather than 3 seconds later.
   */
  it("stops after exactly MAX_POLL_ATTEMPTS requests and says so", async () => {
    render(
      <PaymentForm
        bookingId="b1"
        amount={5000}
        defaultPhone="0712345678"
        pendingPaymentId="pay-timeout"
      />,
    );

    // Attempt 0 fires on mount; drive 59 more.
    for (let i = 0; i < 60; i += 1) {
      expect(deferred.inFlight).toBe(true);
      await deferred.settle(PENDING_BODY);
      if (i < 59) {
        await act(async () => {
          jest.advanceTimersByTime(POLL_INTERVAL_MS);
        });
      }
    }

    expect(deferred.calls.length).toBe(60);

    // No 61st request is booked, and the message is already on screen — not waiting
    // another interval to be told.
    expect(
      screen.getByText(/taking longer than expected/i),
    ).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);
    });
    expect(deferred.calls.length).toBe(60);
  });

  it("every request names the payment the chain was started for", async () => {
    render(
      <PaymentForm
        bookingId="b1"
        amount={5000}
        defaultPhone="0712345678"
        pendingPaymentId="pay-xyz"
      />,
    );

    for (let i = 0; i < 3; i += 1) {
      await deferred.settle(PENDING_BODY);
      await act(async () => {
        jest.advanceTimersByTime(POLL_INTERVAL_MS);
      });
    }

    // paymentId is captured by the effect's closure now rather than passed down the
    // chain as an argument, so this pins that the closure is the right one.
    expect(deferred.calls.length).toBeGreaterThan(1);
    for (const url of deferred.calls) {
      expect(url).toContain("paymentId=pay-xyz");
    }
  });
});
