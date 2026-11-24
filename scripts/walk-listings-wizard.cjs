/**
 * Walk the listings wizard end to end and audit each step.
 *
 *   BRANCH=residential|commercial|specialized \
 *   SUPABASE_URL=… SUPABASE_PUBLISHABLE_KEY=… SUPABASE_PROJECT_REF=… \
 *   OUT=/tmp/walk node scripts/walk-listings-wizard.cjs
 *
 * It signs in as a test landlord (password read from /tmp/e2e-pw.txt), fills
 * each step, screenshots it, and reports what the wizard still considers
 * outstanding plus a label/group audit of that screen.
 *
 * REQUIREMENTS, STATED PLAINLY
 *   Playwright is NOT a dependency of this project. It happened to be present
 *   in the environment this was written in. Running this elsewhere needs
 *   `npm i -D playwright` and a browser first, and a dev server on :3000.
 *
 * WHY IT EXISTS
 *   An earlier version of this walk silently measured step 2 six times and
 *   reported it as six steps of coverage. Several accessibility claims were
 *   therefore certified from jsdom and static evidence alone. This version
 *   hashes every screenshot and flags a repeat as "SAME SCREEN AS AN EARLIER
 *   STEP", so a stall can no longer look like progress.
 *
 * FOUR THINGS IT GETS RIGHT THAT THE FIRST VERSION DID NOT
 *   - The street address commits on BLUR, after a 200ms delay that lets a
 *     Google prediction click win the race. fill() alone never commits it, so
 *     the field looked full while the wizard called it missing.
 *   - Number fields are filled within their own min/max. A flat value failed
 *     Year Built, which wants 1900-2026.
 *   - An ABSENT min/max reads as "", and Number("") is 0, which is finite — so
 *     "no maximum" silently became "max 0" and clamped every number to zero.
 *   - A CounterInput is [minus] value [plus]; clicking the first button is the
 *     MINUS, which leaves a required count at zero.
 *
 * It stops at step 7 without publishing. Publishing is a production write.
 */

/**
 * Walk the listings wizard end to end, screenshotting each step.
 *
 * WHY THE EARLIER WALK STALLED
 *   The street address input is bound to LOCAL state (addressSearch). The
 *   wizard's formData.streetAddress is committed only when a Google prediction
 *   is chosen or on BLUR, after a 200ms delay that lets a prediction click
 *   land first. Playwright's fill() sets the value and fires input, but never
 *   blurs — so the field looked filled and the wizard still called it missing.
 *   A person typing and clicking away was always fine. Harness bug, not a
 *   product bug: this types, blurs, and waits out the delay.
 *
 *   The area control is a custom dropdown built from a <button>; it needs
 *   opening and an option clicking, not a fill().
 *
 * At each step it records what the wizard still considers outstanding, so a
 * stall is reported as a fact rather than looking like success.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const BASE = "http://127.0.0.1:3000";
const OUT = process.env.OUT;
const BRANCH = process.env.BRANCH || "residential";

function cookiesFor(session) {
  const v = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64");
  const MAX = 3180;
  const out = [];
  if (v.length <= MAX)
    out.push({
      name: `sb-${process.env.SUPABASE_PROJECT_REF}-auth-token`,
      value: v,
    });
  else
    for (let i = 0, n = 0; i < v.length; i += MAX, n++)
      out.push({
        name: `sb-${process.env.SUPABASE_PROJECT_REF}-auth-token.${n}`,
        value: v.slice(i, i + MAX),
      });
  return out.map((c) => ({
    ...c,
    domain: "127.0.0.1",
    path: "/",
    sameSite: "Lax",
  }));
}

/** Type into a field and commit it the way leaving the field would. */
async function typeAndCommit(page, selector, text) {
  const el = page.locator(selector);
  if (!(await el.count())) return false;
  await el.click();
  await el.fill(text);
  await el.blur();
  // handleAddressBlur defers by 200ms so a prediction click can win the race.
  await page.waitForTimeout(450);
  return true;
}

async function state(page) {
  return page.evaluate(() => {
    const sum = document.getElementById("step-validation-summary");
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      /^(Continue|Publish|Save & Review|Update Listing)/.test(
        b.textContent.trim(),
      ),
    );
    const active = Array.from(document.querySelectorAll("button")).find(
      (b) =>
        /^[1-7]$/.test(b.textContent.trim()) && b.className.includes("teal"),
    );
    return {
      heading:
        document.querySelector("h2")?.textContent?.trim().slice(0, 44) ?? "",
      outstanding: sum
        ? Array.from(sum.querySelectorAll("li")).map((l) =>
            l.textContent.trim(),
          )
        : [],
      blocked: btn ? btn.getAttribute("aria-disabled") === "true" : null,
      buttonLabel: btn ? btn.textContent.trim().slice(0, 20) : null,
      stepChip: active ? active.textContent.trim() : null,
    };
  });
}

/** Best effort at satisfying whatever this step is asking for. */
async function satisfy(page, step) {
  if (step === 1) {
    // EXACT names. A loose regex for the sub-type matched the CATEGORY
    // "Retail Shop" and clicked that instead, so step 1 never got a sub-type.
    const plan = {
      residential: {
        chip: "Residential",
        category: "Apartment",
        subtype: null,
      },
      commercial: {
        chip: "Commercial",
        category: "Office Space",
        subtype: "Small Office",
      },
      specialized: {
        chip: "Commercial",
        category: "Specialized",
        subtype: "Bank Branch",
      },
    }[BRANCH];

    const chip = page
      .getByRole("button", { name: new RegExp(`^${plan.chip}$`) })
      .first();
    if (await chip.count()) {
      await chip.click();
      await page.waitForTimeout(600);
    }

    const card = page
      .getByRole("button", { name: new RegExp(`^${plan.category}`) })
      .first();
    if (await card.count()) {
      await card.click();
      await page.waitForTimeout(800);
    }

    if (plan.subtype) {
      const sub = page
        // No trailing anchor: a card's accessible name includes its
        // description, so "Small Office" is really "Small Office Up to …".
        .getByRole("button", { name: new RegExp(`^${plan.subtype}`) })
        .first();
      if (await sub.count()) {
        await sub.click();
        await page.waitForTimeout(700);
      }
    }
    return;
  }

  if (step === 2) {
    await typeAndCommit(page, "#buildingName", "Harness Test Apartments");
    await typeAndCommit(page, "#streetAddress", "12 Testing Lane, Kilimani");
    const area = page.locator("#area");
    if (await area.count()) {
      await area.click();
      await page.waitForTimeout(600);
      const opt = page.getByRole("button", { name: /^Kilimani$/ }).first();
      if (await opt.count()) {
        await opt.click();
        await page.waitForTimeout(500);
      }
    }
    return;
  }

  // Later steps: fill any empty required-looking control, then pick the first
  // option of any unanswered button group.
  const boxes = page.locator(
    'input[type="text"], input[type="number"], input[type="date"]',
  );
  const n = await boxes.count();
  if (process.env.DIAG) {
    const dump = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input"))
        .filter((i) => i.offsetParent)
        .map((i) => ({
          id: i.id,
          type: i.type,
          min: i.min,
          max: i.max,
          value: i.value,
        })),
    );
    console.log("  DIAG inputs:", JSON.stringify(dump));
  }
  for (let i = 0; i < Math.min(n, 40); i++) {
    const el = boxes.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    if ((await el.inputValue().catch(() => "x")) !== "") continue;
    const type = await el.getAttribute("type");
    let value = "Harness value for testing";
    // A money field is type="text" with inputMode="numeric"; prose in it parses
    // to null and the step reports the amount as missing.
    const mode = await el.getAttribute("inputMode");
    if (mode === "numeric") value = "85000";
    else if (type === "date") value = "2026-12-31";
    else if (type === "number") {
      // Respect the field's own bounds. A flat "12" failed Year Built, which
      // requires 1900-2026 — the stall looked like a wizard problem and was
      // the harness feeding an out-of-range number.
      // An ABSENT attribute reads as "", and Number("") is 0 — which is
      // finite, so the previous version turned "no maximum" into "max 0" and
      // clamped every number to zero. The fields then looked untouched and the
      // step reported them missing. Treat empty as absent.
      const rawMin = await el.getAttribute("min");
      const rawMax = await el.getAttribute("max");
      const lo = rawMin ? Number(rawMin) : 1;
      const hi = rawMax ? Number(rawMax) : 10000;
      value = String(Math.min(Math.max(12, lo), hi));
    }
    await el.fill(value);
    await el.blur();
    await page.waitForTimeout(120);
  }
  const groups = page.locator('[role="group"]');
  const g = await groups.count();
  for (let i = 0; i < Math.min(g, 16); i++) {
    const grp = groups.nth(i);
    const btns = grp.locator("button");
    const count = await btns.count();
    if (!count) continue;
    // A CounterInput is [minus] value [plus]. Clicking the FIRST button is
    // the MINUS, which leaves the count at its minimum — which is how
    // "Number of teller positions must be greater than 0" survived a filler
    // that looked like it had answered the field.
    const isCounter =
      count === 2 &&
      /^\s*\d+\s*$/.test(
        (await grp.innerText().catch(() => "")).replace(/[^\d\s]/g, " ").trim(),
      );
    if (isCounter) {
      const plus = btns.nth(1);
      for (let k = 0; k < 2; k++) {
        await plus.click().catch(() => {});
        await page.waitForTimeout(90);
      }
    } else {
      await btns
        .first()
        .click()
        .catch(() => {});
      await page.waitForTimeout(120);
    }
  }

  // Tick every unchecked checkbox: several commercial sub-types require a
  // specific facility to be present before the step will validate.
  const boxesChk = page.locator('input[type="checkbox"]');
  const cb = await boxesChk.count();
  for (let i = 0; i < Math.min(cb, 24); i++) {
    const c = boxesChk.nth(i);
    if (await c.isChecked().catch(() => true)) continue;
    await c.check({ force: true }).catch(() => {});
    await page.waitForTimeout(80);
  }
  // A long free-text field may need a minimum length.
  const areas = page.locator("textarea");
  const ta = await areas.count();
  for (let i = 0; i < ta; i++) {
    const el = areas.nth(i);
    if ((await el.inputValue().catch(() => "x")) !== "") continue;
    await el.fill(
      "A harness-written description, comfortably past any minimum length this step asks for, so the step can be reached and photographed.",
    );
    await el.blur();
    await page.waitForTimeout(150);
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const r = await fetch(
    `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "landlord.e2e@mitasafi.test",
        password: fs.readFileSync("/tmp/e2e-pw.txt", "utf8").trim(),
      }),
    },
  );
  const session = await r.json();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
  });
  await ctx.addCookies(cookiesFor(session));
  const page = await ctx.newPage();
  page.on("pageerror", (e) =>
    console.log("  PAGEERROR:", e.message.slice(0, 110)),
  );

  await page.goto(`${BASE}/dashboard/landlord/listings/new`, {
    waitUntil: "networkidle",
    timeout: 180000,
  });
  await page.waitForTimeout(2000);

  const seen = new Set();
  let reached = 0;
  const a11yTotals = {
    labels: 0,
    resolved: 0,
    groups: 0,
    unnamed: 0,
    dangling: 0,
    orphanList: [],
  };

  for (let step = 1; step <= 7; step++) {
    const before = await state(page);
    await satisfy(page, step);
    if (process.env.DIAG) {
      const after2 = await page.evaluate(() =>
        Array.from(document.querySelectorAll("input"))
          .filter((i) => i.offsetParent && i.type !== "checkbox")
          .map((i) => `${i.id}=${i.value}`),
      );
      console.log("  DIAG after fill:", JSON.stringify(after2));
    }
    await page.waitForTimeout(700);
    const after = await state(page);

    await page.evaluate(() => window.scrollTo(0, 0));
    const shot = `${OUT}/${BRANCH}-step${step}.png`;
    await page.screenshot({ path: shot });
    const hash = require("crypto")
      .createHash("md5")
      .update(fs.readFileSync(shot))
      .digest("hex")
      .slice(0, 8);
    const dup = seen.has(hash);
    seen.add(hash);
    reached = step;

    // The point of reaching these steps: check the labels there.
    const a11y = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll("label"));
      const groups = Array.from(document.querySelectorAll('[role="group"]'));
      return {
        labels: labels.length,
        resolved: labels.filter((l) => !!l.control).length,
        orphans: labels
          .filter((l) => !l.control)
          .map((l) => (l.textContent || "").trim().slice(0, 26)),
        groups: groups.length,
        unnamedGroups: groups.filter((g) => {
          const id = g.getAttribute("aria-labelledby");
          return !id || !document.getElementById(id);
        }).length,
        danglingDesc: Array.from(
          document.querySelectorAll("[aria-describedby]"),
        ).filter(
          (e) =>
            !e
              .getAttribute("aria-describedby")
              .split(/\s+/)
              .every((i) => document.getElementById(i)),
        ).length,
      };
    });
    a11yTotals.labels += a11y.labels;
    a11yTotals.resolved += a11y.resolved;
    a11yTotals.groups += a11y.groups;
    a11yTotals.unnamed += a11y.unnamedGroups;
    a11yTotals.dangling += a11y.danglingDesc;
    if (a11y.orphans.length)
      a11yTotals.orphanList.push(`step${step}:${JSON.stringify(a11y.orphans)}`);

    console.log(
      `STEP ${step} | labels ${a11y.resolved}/${a11y.labels} resolve | groups ${a11y.groups} ` +
        `(unnamed ${a11y.unnamedGroups}) | dangling describedby ${a11y.danglingDesc} | ` +
        `outstanding=${JSON.stringify(after.outstanding)} | blocked=${after.blocked}` +
        (dup ? "   <<< SAME SCREEN AS AN EARLIER STEP — did not advance" : ""),
    );

    if (step === 7) break;
    const next = page
      .getByRole("button", { name: /^(Continue|Next|Save & Review)/ })
      .first();
    if (!(await next.count())) {
      console.log("  (no Continue button)");
      break;
    }
    if (after.blocked) {
      console.log(
        `  STALLED at step ${step}: ${JSON.stringify(after.outstanding)}`,
      );
      break;
    }
    await next.click();
    await page.waitForTimeout(1800);
  }

  console.log(
    `\n${BRANCH}: reached step ${reached} of 7; distinct screens: ${seen.size}`,
  );
  console.log(
    `  A11Y across those steps: labels ${a11yTotals.resolved}/${a11yTotals.labels} resolve, ` +
      `groups ${a11yTotals.groups} (unnamed ${a11yTotals.unnamed}), ` +
      `dangling aria-describedby ${a11yTotals.dangling}` +
      (a11yTotals.orphanList.length
        ? `\n  ORPHAN LABELS: ${a11yTotals.orphanList.join(" ")}`
        : ""),
  );
  await browser.close();
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
