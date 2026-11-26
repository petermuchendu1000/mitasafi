/**
 * Every redirect the proxy issues after refreshing the session must carry
 * the refreshed cookies.
 *
 * WHY A SOURCE SCAN AND NOT A UNIT TEST
 *   The bug is a missing line, not a wrong value. A redirect built with
 *   NextResponse.redirect() and returned on its own is perfectly valid code
 *   and perfectly broken behaviour: updateSession() has already put the new
 *   access and refresh tokens on ITS response, and returning a different
 *   object silently drops them.
 *
 *   Supabase rotates refresh tokens, so the old one is spent the moment a
 *   refresh succeeds. Dropping the new cookies leaves the browser holding a
 *   spent token; the next request cannot refresh, getUser() returns null,
 *   and the dashboard layout sends the user to /login. It looks random,
 *   because it only bites on the request that happened to refresh.
 *
 *   There is nothing to assert about the output of a correct run, so the
 *   shape of the code is what gets asserted.
 */

import fs from "fs";
import path from "path";

const SOURCE = fs.readFileSync(
  path.join(process.cwd(), "src/proxy.ts"),
  "utf8",
);

describe("the proxy never drops a refreshed session", () => {
  it("still has the code this test is about", () => {
    expect(SOURCE).toMatch(/updateSession\(/);
    expect(SOURCE).toMatch(/function withSession\(/);
  });

  it("wraps every redirect issued after the session is refreshed", () => {
    // Everything from the first updateSession() call onwards has a live
    // supabaseResponse holding the new cookies.
    const from = SOURCE.indexOf("const { supabaseResponse, user, supabase }");
    expect(from).toBeGreaterThan(0);
    const after = SOURCE.slice(from);

    const bare: string[] = [];
    // A redirect counts as wrapped when withSession( appears immediately
    // before it on the same expression.
    // No optional prefix group here. The first version wrote
    // /(\w+\()?NextResponse\.redirect\(/ and the group CONSUMED the
    // "withSession(" it was meant to look behind, so every correct call was
    // flagged and the test failed against working code.
    for (const m of after.matchAll(/NextResponse\.redirect\(/g)) {
      const prefix = after.slice(Math.max(0, m.index - 40), m.index);
      if (!/withSession\(\s*$/.test(prefix)) {
        bare.push(after.slice(m.index, m.index + 70).split("\n")[0]);
      }
    }
    expect(bare).toEqual([]);
  });

  it("returns the session response itself on the non-redirect paths", () => {
    // The fall-through and the public-route path must hand back the object
    // updateSession built, not a fresh one.
    expect(SOURCE).toMatch(/return applySecurityHeaders\(supabaseResponse\)/);
  });

  it("copies cookies rather than merely reading them", () => {
    // A helper that read getAll() and never called set() would pass the
    // scan above and fix nothing.
    const helper = SOURCE.slice(
      SOURCE.indexOf("function withSession("),
      SOURCE.indexOf("function applySecurityHeaders("),
    );
    expect(helper).toMatch(/session\.cookies\.getAll\(\)/);
    expect(helper).toMatch(/response\.cookies\.set\(/);
  });
});
