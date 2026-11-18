/**
 * The search-alerts scheduler.
 *
 * The handler itself is old code and is not changed here. What is new is that
 * it now actually RUNS, and these tests pin the two things that can be wrong
 * in a way nobody would notice:
 *
 *   1. the schedule → frequency mapping. GitHub tells a scheduled run only
 *      which cron expression fired. If a `schedule:` entry is added without a
 *      matching arm in the resolver, the job would either send the wrong
 *      digest to the wrong people or silently default. It must fail instead.
 *
 *   2. the absence of a second scheduler. vercel.json declared these three
 *      schedules and they never fired — production is Fly, which does not read
 *      vercel.json. They are removed rather than left in place, because two
 *      declared schedulers for one endpoint is a latent duplicate-send: if the
 *      app were ever also deployed to Vercel, every user would get every
 *      notification twice.
 *
 * Read as text rather than executed: this is CI configuration, and the house
 * style for "the config says what it should" is already a source scan.
 */

import fs from "fs";
import path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

const WORKFLOW = ".github/workflows/search-alerts.yml";
const ROUTE = "src/app/api/cron/search-alerts/route.ts";

const workflow = read(WORKFLOW);
const route = read(ROUTE);
const vercel = read("vercel.json");

/** The cron expressions declared under `on.schedule:`. */
function declaredSchedules(yml: string): string[] {
  const block = /schedule:\n([\s\S]*?)\n  workflow_dispatch:/.exec(yml);
  if (!block) throw new Error("on.schedule block not found");
  return [...block[1].matchAll(/-\s*cron:\s*"([^"]+)"/g)].map((m) => m[1]);
}

describe("every declared schedule is mapped to a frequency", () => {
  const schedules = declaredSchedules(workflow);

  it("declares exactly the three frequencies the handler accepts", () => {
    expect(schedules).toHaveLength(3);
    // The handler rejects anything outside this set with HTTP 400
    // (route.ts: if (!["instant","daily","weekly"].includes(frequency))).
    expect(route).toMatch(
      /\["instant", "daily", "weekly"\]\.includes\(frequency\)/,
    );
  });

  it("each cron expression has a case arm in the resolver", () => {
    // This is the coupling that breaks silently: add a schedule, forget the
    // arm, and the run either sends the wrong digest or dies at 3am.
    //
    // Asserted against the CASE-ARM shape `|"<cron>")`, not merely that the
    // string appears somewhere in the file. The first version of this test
    // used toContain(`"${cron}"`), which the schedule declaration itself
    // satisfies -- so it passed for an unmapped schedule. Caught by mutating
    // the workflow, not by reading the test.
    for (const cron of schedules) {
      expect(workflow).toMatch(
        new RegExp(`\\|"${cron.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\)`),
      );
    }
  });

  it("the resolver's arms cover exactly the declared schedules", () => {
    // The other direction: an arm for a cron that is no longer declared is
    // dead config that outlives the schedule it served — which is precisely
    // how vercel.json got into the state this change fixes.
    const arms = [...workflow.matchAll(/\|"([0-9*/, ]+)"\)/g)].map((m) => m[1]);
    expect(arms.sort()).toEqual([...schedules].sort());
  });

  it("an unrecognised trigger fails the job instead of defaulting", () => {
    expect(workflow).toMatch(/Unrecognised trigger/);
    // the catch-all arm must exit non-zero
    expect(workflow).toMatch(
      /\*\)\n\s*echo "::error::Unrecognised trigger[\s\S]*?exit 1/,
    );
  });

  it("no schedule fires on the hour", () => {
    // Not cosmetic. The handler's window is a fixed lookback from now, so a
    // late run leaves a hole no later run covers, and GitHub's shared
    // scheduler is at its most delayed at :00.
    for (const cron of schedules) {
      expect(cron.split(" ")[0]).not.toBe("0");
    }
  });
});

describe("there is exactly one scheduler", () => {
  it("vercel.json no longer declares crons", () => {
    const parsed = JSON.parse(vercel);
    expect(parsed.crons).toBeUndefined();
    expect(vercel).not.toMatch(/search-alerts/);
  });

  it("the route no longer tells the reader to add Vercel crons", () => {
    // The old header carried a copy-paste block for vercel.json. Leaving it
    // would invite someone to recreate the double-send this removes.
    expect(route).not.toMatch(/"crons":/);
    expect(route).toMatch(
      /SCHEDULED BY \.github\/workflows\/search-alerts\.yml/,
    );
  });

  it("the route documents how windowing actually works", () => {
    // SUPERSEDED, not weakened. This assertion used to require the header to
    // carry a "KNOWN DEFECT" note, because the handler was scheduled before the
    // fixed-window defect was fixed and a reader had to be warned. The defect
    // is now gone (per-alert watermarks, src/lib/search-alerts/window.ts), so
    // demanding that the file still describe it would be demanding a lie.
    //
    // The replacement is stronger: it pins the model the code now relies on,
    // and fails if the header reverts to describing an unfixed handler.
    expect(route).toMatch(/HIGH-WATER MARK/);
    expect(route).toMatch(/last_notified_at/);
    expect(route).not.toMatch(/KNOWN DEFECT/);
  });
});

describe("the workflow fails loudly rather than quietly", () => {
  it("refuses to run without its secrets", () => {
    expect(workflow).toMatch(/SITE_URL secret is not set/);
    expect(workflow).toMatch(/CRON_SECRET secret is not set/);
  });

  it("treats 401, 400 and any non-200 as a failed run", () => {
    expect(workflow).toMatch(/does not match the one deployed on the Fly app/);
    expect(workflow).toMatch(/rejected frequency=/);
    expect(workflow).toMatch(/no alerts were processed/);
  });

  it("uses the same fail-closed auth guard as the other cron route", () => {
    // src/__tests__/cron-auth.test.ts exists because this endpoint once
    // returned 200 to anyone when CRON_SECRET was unset.
    expect(route).toMatch(
      /import \{ authorizeCronRequest \} from "@\/lib\/security\/cron-auth"/,
    );
    expect(route).toMatch(/status: 401/);
  });

  it("serialises runs of the same frequency", () => {
    expect(workflow).toMatch(/concurrency:/);
    expect(workflow).toMatch(/cancel-in-progress: false/);
  });
});

describe("this suite can fail", () => {
  it("the schedule extractor really extracts", () => {
    const fake = `on:\n  schedule:\n    - cron: "5 * * * *"\n  workflow_dispatch:\n`;
    expect(declaredSchedules(fake)).toEqual(["5 * * * *"]);
  });

  it("the mapping check would notice an unmapped schedule", () => {
    const schedules = declaredSchedules(workflow);
    // a cron that is NOT declared must also not be mapped
    expect(schedules).not.toContain("0 * * * *");
    expect(workflow).not.toMatch(/\|"0 \* \* \* \*"\)/);
  });
});
