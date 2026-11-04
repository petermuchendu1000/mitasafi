/**
 * @jest-environment node
 */

/**
 * "We don't know" is not "it failed".
 *
 * THE DEFECT THIS LOCKS DOWN
 *
 * initiateStkPush wraps the Safaricom call in AbortSignal.timeout(6_000). Every
 * throw used to come back as a flat `success: false`, and initiatePayment fed
 * that to fail_booking_payment, which sets the payment `failed` and the booking
 * `payment_failed`.
 *
 * `payment_failed` is in initiatePayment's own `allowedStatuses`, and a `failed`
 * row does not hold the partial unique index
 * booking_payments_one_open_per_booking (verified live:
 * `UNIQUE (booking_id) WHERE status IN ('pending','processing')`). So an abort on
 * a request Safaricom had ALREADY ACCEPTED marked a live payment failed, invited
 * the customer to pay again, and left the first charge unmatchable forever --
 * mpesa_checkout_request_id is only written after a successful push.
 *
 * THE INVARIANT: a payment may be recorded `failed` only on positive evidence
 * that no charge occurred. Absence of evidence is not evidence of absence.
 *
 * These tests assert the classification at the boundary where it is decided.
 * They are deliberately asymmetric: a WRONG `indeterminate: true` only delays a
 * retry, while a WRONG `indeterminate: false`/absent can charge someone twice.
 */

// NODE environment, deliberately. The default jsdom environment has no
// AbortSignal.timeout, so getAccessToken threw before any fetch was attempted,
// `pushDispatched` stayed false, and every "definite rejection" case below went
// green without the push ever being classified. Four tests passed for the wrong
// reason. mpesa.ts only ever runs on the server, so the server runtime is also
// the honest place to test it.
const ORIGINAL_ENV = process.env;

/** getMpesaConfig caches, so each case needs a fresh module registry. */
async function freshStkPush() {
  let mod: typeof import("@/lib/payments/mpesa");
  await jest.isolateModulesAsync(async () => {
    mod = await import("@/lib/payments/mpesa");
  });
  // @ts-expect-error assigned inside isolateModulesAsync
  return mod.initiateStkPush;
}

const VALID_PARAMS = {
  amount: 1000,
  phoneNumber: "0712345678",
  accountReference: "MS-TEST",
  transactionDesc: "MitaSafi Pay",
};

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    MPESA_ENVIRONMENT: "sandbox",
    MPESA_CONSUMER_KEY: "k",
    MPESA_CONSUMER_SECRET: "s",
    MPESA_PASSKEY: "p",
    MPESA_SHORTCODE: "174379",
    MPESA_CALLBACK_URL: "https://example.invalid/api/payments/mpesa/callback",
  };
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

/** OAuth succeeds; the STK push itself behaves as the test dictates. */
function mockFetch(stkBehaviour: () => Promise<Response>) {
  global.fetch = jest.fn(async (url: RequestInfo | URL) => {
    const href = String(url);
    if (href.includes("oauth")) {
      return new Response(
        JSON.stringify({ access_token: "tok", expires_in: "3599" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return stkBehaviour();
  }) as unknown as typeof fetch;
}

describe("the push was dispatched but gave no verdict — must be indeterminate", () => {
  it("a timeout/abort is NOT a failure", async () => {
    const initiateStkPush = await freshStkPush();
    mockFetch(async () => {
      const err = new Error("The operation was aborted due to timeout");
      err.name = "TimeoutError";
      throw err;
    });

    const result = await initiateStkPush(VALID_PARAMS);

    expect(result.success).toBe(false);
    // THE ASSERTION THAT BITES: without it, the caller records a failure and
    // the customer can be charged twice.
    expect(result.indeterminate).toBe(true);
  });

  it("a dropped connection is NOT a failure", async () => {
    const initiateStkPush = await freshStkPush();
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });

    const result = await initiateStkPush(VALID_PARAMS);
    expect(result.success).toBe(false);
    expect(result.indeterminate).toBe(true);
  });

  it("a 5xx is NOT a failure — Safaricom may have accepted it already", async () => {
    const initiateStkPush = await freshStkPush();
    mockFetch(async () => new Response("upstream exploded", { status: 503 }));

    const result = await initiateStkPush(VALID_PARAMS);
    expect(result.success).toBe(false);
    expect(result.indeterminate).toBe(true);
  });

  it("a 200 with an unparseable body is NOT a failure", async () => {
    const initiateStkPush = await freshStkPush();
    mockFetch(
      async () =>
        new Response("<html>gateway</html>", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    const result = await initiateStkPush(VALID_PARAMS);
    expect(result.success).toBe(false);
    expect(result.indeterminate).toBe(true);
  });
});

describe("a definite refusal — recording a failure is safe", () => {
  it("ResponseCode != 0 is a real rejection", async () => {
    const initiateStkPush = await freshStkPush();
    mockFetch(
      async () =>
        new Response(
          JSON.stringify({
            ResponseCode: "1",
            ResponseDescription: "Invalid Access Token",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    const result = await initiateStkPush(VALID_PARAMS);
    expect(result.success).toBe(false);
    expect(result.indeterminate).toBeFalsy();
  });

  it("a 4xx is a real rejection — understood and declined", async () => {
    const initiateStkPush = await freshStkPush();
    mockFetch(async () => new Response("bad request", { status: 400 }));

    const result = await initiateStkPush(VALID_PARAMS);
    expect(result.success).toBe(false);
    expect(result.indeterminate).toBeFalsy();
  });

  it("an amount rejected locally never reached Safaricom", async () => {
    const initiateStkPush = await freshStkPush();
    mockFetch(async () => {
      throw new Error("must not be called");
    });

    const result = await initiateStkPush({ ...VALID_PARAMS, amount: 0 });
    expect(result.success).toBe(false);
    expect(result.indeterminate).toBeFalsy();
  });

  it("an OAuth failure never reached the push endpoint", async () => {
    const initiateStkPush = await freshStkPush();
    global.fetch = jest.fn(
      async () => new Response("denied", { status: 401 }),
    ) as unknown as typeof fetch;

    const result = await initiateStkPush(VALID_PARAMS);
    expect(result.success).toBe(false);
    // Nothing was dispatched, so this is a definite failure, not an unknown.
    expect(result.indeterminate).toBeFalsy();
  });
});

describe("the happy path still works", () => {
  it("returns the checkout id on ResponseCode 0", async () => {
    const initiateStkPush = await freshStkPush();
    mockFetch(
      async () =>
        new Response(
          JSON.stringify({
            ResponseCode: "0",
            CheckoutRequestID: "ws_CO_123",
            MerchantRequestID: "mr_456",
            CustomerMessage: "Success. Request accepted",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    const result = await initiateStkPush(VALID_PARAMS);
    expect(result.success).toBe(true);
    expect(result.checkoutRequestId).toBe("ws_CO_123");
    expect(result.indeterminate).toBeFalsy();
  });
});
