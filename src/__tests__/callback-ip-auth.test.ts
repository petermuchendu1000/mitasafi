/**
 * Callback source-IP authorization.
 *
 * These tests exist because the M-Pesa callback endpoint's only authenticator
 * is the source IP, and that check was bypassable three different ways:
 *
 *   1. isSafaricomIp() returned true unconditionally in "sandbox", and the
 *      route defaulted to sandbox whenever config loading threw or
 *      MPESA_ENVIRONMENT was simply unset — so a misconfigured deploy accepted
 *      a forged settlement callback from anywhere on the internet.
 *   2. The client IP was read as x-forwarded-for[0], the one position an
 *      attacker fully controls.
 *   3. The production whitelist contained 127.0.0., 192.168. and a
 *      DigitalOcean range, matched with startsWith() rather than CIDR.
 *
 * A fourth was introduced by the first fix and is covered here too: trusting a
 * platform header (fly-client-ip) BY DEFAULT. This repo deploys to Vercel,
 * which neither writes nor strips that header, so the default made it
 * attacker-controlled and it was preferred over x-forwarded-for.
 *
 * Every "ATTACK" case below was verified to pass the whitelist before its fix.
 */

import {
  authorizeCallbackIp,
  extractTrustedClientIp,
  isInsecureCallbackModeEnabled,
} from "@/lib/payments/mpesa-config";

const SAFARICOM = "196.201.214.206";
const EDGE = "203.0.113.9";

const PROD = {
  MPESA_ENVIRONMENT: "production",
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_ENV: "production",
};

/** Minimal Headers-like reader. */
const H = (o: Record<string, string>) => ({
  get: (k: string) => o[k.toLowerCase()] ?? null,
});

/** Mirrors the route: extract a trusted IP, then authorize it. */
function decide(
  hdrs: Record<string, string>,
  env: Record<string, string | undefined> = PROD,
  environment: "sandbox" | "production" = "production"
): boolean {
  const { ip } = extractTrustedClientIp(H(hdrs), env);
  return authorizeCallbackIp(ip, environment, env).allowed;
}

describe("callback IP authorization: the genuine path works", () => {
  it("allows a Safaricom IP appended by our own edge", () => {
    expect(decide({ "x-forwarded-for": `1.2.3.4, ${SAFARICOM}` })).toBe(true);
  });

  it("allows a Safaricom IP arriving as the only entry", () => {
    expect(decide({ "x-forwarded-for": SAFARICOM })).toBe(true);
  });

  it("allows the second and third whitelisted /24s", () => {
    expect(decide({ "x-forwarded-for": "196.201.213.44" })).toBe(true);
    expect(decide({ "x-forwarded-for": "196.201.212.127" })).toBe(true);
  });
});

describe("ATTACK: spoofed x-forwarded-for positions", () => {
  it("denies a prepended Safaricom IP (the XFF[0] defect)", () => {
    expect(decide({ "x-forwarded-for": `${SAFARICOM}, ${EDGE}` })).toBe(false);
  });

  it("denies loopback, which used to be whitelisted", () => {
    expect(decide({ "x-forwarded-for": "127.0.0.1" })).toBe(false);
    expect(decide({ "x-forwarded-for": "::1" })).toBe(false);
    expect(decide({ "x-forwarded-for": "::ffff:127.0.0.1" })).toBe(false);
  });

  it("denies RFC1918 and the DigitalOcean range", () => {
    expect(decide({ "x-forwarded-for": "192.168.1.1" })).toBe(false);
    expect(decide({ "x-forwarded-for": "104.248.1.1" })).toBe(false);
  });

  it("denies near-miss addresses that startsWith() would have matched", () => {
    expect(decide({ "x-forwarded-for": "196.201.2140" })).toBe(false);
    expect(decide({ "x-forwarded-for": "196.201.215.1" })).toBe(false);
    expect(decide({ "x-forwarded-for": "1196.201.214.1" })).toBe(false);
  });

  it("denies an absurdly long chain used to push the trusted hop out of range", () => {
    expect(decide({ "x-forwarded-for": Array(200).fill(SAFARICOM).join(", ") })).toBe(false);
  });

  it("denies absent, empty and unparseable sources", () => {
    expect(decide({})).toBe(false);
    expect(decide({ "x-forwarded-for": "" })).toBe(false);
    expect(decide({ "x-forwarded-for": ",,," })).toBe(false);
    expect(decide({ "x-forwarded-for": "not-an-ip" })).toBe(false);
  });
});

describe("ATTACK: forged platform headers", () => {
  it("ignores fly-client-ip when no platform header is configured", () => {
    // The default used to be "fly-client-ip" and it was preferred over XFF, so
    // this exact request passed the production whitelist.
    expect(decide({ "fly-client-ip": SAFARICOM, "x-forwarded-for": EDGE })).toBe(false);
  });

  it("ignores x-real-ip when no platform header is configured", () => {
    expect(decide({ "x-real-ip": SAFARICOM, "x-forwarded-for": EDGE })).toBe(false);
  });

  it("honours a platform header only once the operator names it", () => {
    const env = { ...PROD, MPESA_TRUSTED_CLIENT_IP_HEADER: "fly-client-ip" };
    expect(decide({ "fly-client-ip": SAFARICOM, "x-forwarded-for": EDGE }, env)).toBe(true);
  });

  it("rejects a configured platform header carrying a list (not platform-written)", () => {
    const env = { ...PROD, MPESA_TRUSTED_CLIENT_IP_HEADER: "fly-client-ip" };
    expect(decide({ "fly-client-ip": `${SAFARICOM}, 1.2.3.4`, "x-forwarded-for": EDGE }, env)).toBe(false);
  });
});

describe("the sandbox fail-open is closed", () => {
  it("does not allow everything just because the environment is sandbox", () => {
    expect(decide({ "x-forwarded-for": "127.0.0.1" }, PROD, "sandbox")).toBe(false);
  });

  it("stays closed on a deploy where MPESA_ENVIRONMENT is simply unset", () => {
    const env = { NODE_ENV: "production" };
    expect(decide({ "x-forwarded-for": "127.0.0.1" }, env, "sandbox")).toBe(false);
  });

  it("requires every insecure-mode condition at once", () => {
    // flag alone is not enough
    expect(isInsecureCallbackModeEnabled({ MPESA_ALLOW_INSECURE_CALLBACKS: "true" })).toBe(false);
    // flag + explicit sandbox, but a production app env
    expect(
      isInsecureCallbackModeEnabled({
        MPESA_ALLOW_INSECURE_CALLBACKS: "true",
        MPESA_ENVIRONMENT: "sandbox",
        NEXT_PUBLIC_APP_ENV: "production",
      })
    ).toBe(false);
    // flag + explicit sandbox, but NODE_ENV production
    expect(
      isInsecureCallbackModeEnabled({
        MPESA_ALLOW_INSECURE_CALLBACKS: "true",
        MPESA_ENVIRONMENT: "sandbox",
        NODE_ENV: "production",
      })
    ).toBe(false);
    // all conditions met
    expect(
      isInsecureCallbackModeEnabled({
        MPESA_ALLOW_INSECURE_CALLBACKS: "true",
        MPESA_ENVIRONMENT: "sandbox",
        NODE_ENV: "development",
      })
    ).toBe(true);
  });

  it("never allows a non-dev address even in explicit insecure mode", () => {
    const env = {
      MPESA_ALLOW_INSECURE_CALLBACKS: "true",
      MPESA_ENVIRONMENT: "sandbox",
      NODE_ENV: "development",
    };
    expect(decide({ "x-forwarded-for": "8.8.8.8" }, env, "sandbox")).toBe(false);
    expect(decide({ "x-forwarded-for": "127.0.0.1" }, env, "sandbox")).toBe(true);
  });
});
