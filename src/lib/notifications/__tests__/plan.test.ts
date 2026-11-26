import {
  planNotices,
  preferencesFrom,
  dedupeKey,
  stillOwing,
  type NotifyLease,
  type NotifyPreferences,
  type PlanInput,
} from "../plan";

const TODAY = { year: 2026, month: 11, day: 20 };

function lease(over: Partial<NotifyLease> = {}): NotifyLease {
  return {
    id: "l1",
    landlord_id: "ll1",
    tenant_id: "t1",
    unit_label: "A1",
    building_label: "Riverside",
    status: "active",
    start_date: "2026-06-01",
    end_date: "2027-05-31",
    monthly_rent: 30000,
    rent_due_day: 5,
    grace_period_days: 5,
    ...over,
  };
}

function prefs(over: Partial<NotifyPreferences> = {}): NotifyPreferences {
  return {
    landlord_id: "ll1",
    notify_overdue_summary: true,
    overdue_summary_day_1: 5,
    overdue_summary_day_2: 10,
    notify_lease_expiring: true,
    lease_expiry_notice_days: 90,
    notify_application_submitted: true,
    tenant_notify_invoice_due_soon: true,
    tenant_notify_invoice_due_day: true,
    tenant_notify_invoice_late: true,
    tenant_notify_lease_expiring: true,
    tenant_invoice_due_notice_days: 5,
    tenant_lease_expiry_notice_days: 90,
    ...over,
  };
}

function rent(
  leaseId: string,
  year: number,
  month: number,
  amount: number,
  status = "confirmed",
) {
  return {
    lease_id: leaseId,
    amount,
    payment_type: "rent",
    status,
    period_year: year,
    period_month: month,
  };
}

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    leases: [lease()],
    tenants: [
      { id: "t1", full_name: "Brian Kamau", email: "brian@example.test" },
    ],
    // A ledger that reaches this month, so the late branch is reachable.
    payments: [rent("l1", 2026, 10, 30000)],
    prefs: prefs(),
    landlordEmail: "landlord@example.test",
    today: TODAY,
    ...over,
  };
}

const kinds = (p: ReturnType<typeof planNotices>) =>
  p.map((n) => n.kind).sort();

describe("the notices nobody should ever receive", () => {
  it("says NOTHING to a tenant who has paid this month", () => {
    const p = planNotices(
      input({
        payments: [rent("l1", 2026, 10, 30000), rent("l1", 2026, 11, 30000)],
      }),
    );
    expect(
      p.filter((n) => n.recipientKind === "tenant").map((n) => n.kind),
    ).toEqual([]);
  });

  it("says NOTHING to a tenant who paid EARLY, before the due date", () => {
    // The case the test above cannot reach. With rent due on the 5th and
    // today the 20th, the due-soon and due-day windows have already closed,
    // so a planner with no balance check at all still sends nothing and the
    // test passes for the wrong reason — a mutant removing that check
    // survived it.
    //
    // Due on the 23rd, today the 20th, already paid in full. Without the
    // balance check this tenant is told their rent is due in three days.
    const p = planNotices(
      input({
        leases: [lease({ rent_due_day: 23 })],
        payments: [rent("l1", 2026, 10, 30000), rent("l1", 2026, 11, 30000)],
      }),
    );
    expect(
      p.filter((n) => n.recipientKind === "tenant").map((n) => n.kind),
    ).toEqual([]);
  });

  it("says NOTHING on the due day itself to a tenant who has paid", () => {
    const p = planNotices(
      input({
        leases: [lease({ rent_due_day: 20 })],
        payments: [rent("l1", 2026, 10, 30000), rent("l1", 2026, 11, 30000)],
      }),
    );
    expect(
      p.filter((n) => n.recipientKind === "tenant").map((n) => n.kind),
    ).toEqual([]);
  });

  it("does NOT call rent late while the grace period is still running", () => {
    // Due on the 28th, 5 days' grace, today is the 20th. Not late.
    const p = planNotices(
      input({ leases: [lease({ rent_due_day: 28, grace_period_days: 5 })] }),
    );
    expect(kinds(p)).not.toContain("invoice_late");
  });

  it("does NOT accuse a tenant whose landlord has recorded nothing", () => {
    // THE WORST EMAIL THIS SYSTEM COULD SEND. No rent has ever been recorded
    // against this lease, so there is no evidence the tenant has not paid —
    // only evidence that nobody wrote it down. Rent due on the 5th, today is
    // the 20th, so the calendar alone would call this overdue.
    const p = planNotices(input({ payments: [] }));
    expect(kinds(p)).not.toContain("invoice_late");
  });

  it("DOES tell a part-payer who is past grace that rent is outstanding", () => {
    // The gap a live dry run found. rentStatusForPeriod calls this tenant
    // "partial", never "overdue", so a check on the status label skipped
    // them entirely — and a tenant who pays half is the commonest case
    // there is. Due on the 5th, 5 days' grace, today the 20th, 11,000 of
    // 30,000 paid.
    const p = planNotices(
      input({
        payments: [rent("l1", 2026, 10, 30000), rent("l1", 2026, 11, 11000)],
      }),
    );
    const late = p.find((n) => n.kind === "invoice_late");
    expect(late).toBeDefined();
    expect(late?.data.balance).toBe(19000);
  });

  it("does accuse them once the ledger reaches this month", () => {
    // Same lease and same calendar as above; the only difference is that
    // rent HAS been recorded against it. Without this the test above would
    // pass for a planner that never sends a late notice at all.
    const p = planNotices(input({ payments: [rent("l1", 2026, 10, 30000)] }));
    expect(kinds(p)).toContain("invoice_late");
  });

  it("plans nothing at all for a tenant with no email address", () => {
    const p = planNotices(
      input({ tenants: [{ id: "t1", full_name: "Brian Kamau", email: null }] }),
    );
    expect(p.filter((n) => n.recipientKind === "tenant")).toEqual([]);
  });

  it("ignores a lease that is not live", () => {
    const p = planNotices(input({ leases: [lease({ status: "terminated" })] }));
    expect(p.filter((n) => n.recipientKind === "tenant")).toEqual([]);
  });

  it("ignores another landlord's lease entirely", () => {
    const p = planNotices(input({ leases: [lease({ landlord_id: "ll2" })] }));
    expect(p).toEqual([]);
  });

  it("treats an unconfirmed payment as not paid", () => {
    const p = planNotices(
      input({
        payments: [
          rent("l1", 2026, 10, 30000),
          rent("l1", 2026, 11, 30000, "pending"),
        ],
      }),
    );
    expect(kinds(p)).toContain("invoice_late");
  });

  it("does not let a deposit settle the rent", () => {
    const p = planNotices(
      input({
        payments: [
          rent("l1", 2026, 10, 30000),
          {
            lease_id: "l1",
            amount: 30000,
            payment_type: "deposit",
            status: "confirmed",
            period_year: 2026,
            period_month: 11,
          },
        ],
      }),
    );
    expect(kinds(p)).toContain("invoice_late");
  });
});

describe("rent reminders", () => {
  it("warns a tenant the agreed number of days before rent is due", () => {
    // Due on the 23rd, today the 20th, notice window 5 days.
    const p = planNotices(
      input({
        leases: [lease({ rent_due_day: 23 })],
        payments: [rent("l1", 2026, 10, 30000)],
      }),
    );
    const due = p.find((n) => n.kind === "invoice_due_soon");
    expect(due).toBeDefined();
    expect(due?.data.daysUntilDue).toBe(3);
  });

  it("does not warn earlier than the landlord asked", () => {
    const p = planNotices(
      input({
        leases: [lease({ rent_due_day: 28 })],
        prefs: prefs({ tenant_invoice_due_notice_days: 3 }),
      }),
    );
    expect(kinds(p)).not.toContain("invoice_due_soon");
  });

  it("sends a due-day notice exactly on the day", () => {
    const p = planNotices(input({ leases: [lease({ rent_due_day: 20 })] }));
    expect(kinds(p)).toContain("invoice_due_day");
    expect(kinds(p)).not.toContain("invoice_due_soon");
  });

  it("respects each switch independently", () => {
    const off = planNotices(
      input({
        leases: [lease({ rent_due_day: 23 })],
        prefs: prefs({ tenant_notify_invoice_due_soon: false }),
      }),
    );
    expect(kinds(off)).not.toContain("invoice_due_soon");
  });

  it("stops the late notice when that switch is off", () => {
    const off = planNotices(
      input({ prefs: prefs({ tenant_notify_invoice_late: false }) }),
    );
    expect(kinds(off)).not.toContain("invoice_late");
  });
});

describe("the landlord's own notices", () => {
  it("sends the arrears summary only on a day the landlord chose", () => {
    // A part-paid November, so there IS something to report on either day.
    const owing = [rent("l1", 2026, 10, 30000), rent("l1", 2026, 11, 11000)];

    const quiet = planNotices(
      input({ today: { year: 2026, month: 11, day: 20 }, payments: owing }),
    );
    expect(kinds(quiet)).not.toContain("overdue_summary");

    const onDay = planNotices(
      input({ today: { year: 2026, month: 11, day: 10 }, payments: owing }),
    );
    expect(kinds(onDay)).toContain("overdue_summary");
  });

  it("leaves out a tenant who is not late yet, even on a summary day", () => {
    // Rent due on the 5th with 5 days' grace is NOT overdue on the 10th; an
    // "overdue invoices" summary that listed them would be wrong by its own
    // name. Worth knowing that the shipped defaults — summary on the 5th and
    // 10th, grace to the 10th — mean a tenant who has paid nothing can only
    // appear in the second summary from the 11th onwards.
    const p = planNotices(
      input({
        today: { year: 2026, month: 11, day: 10 },
        payments: [rent("l1", 2026, 10, 30000)],
      }),
    );
    expect(kinds(p)).not.toContain("overdue_summary");

    const later = planNotices(
      input({
        today: { year: 2026, month: 11, day: 11 },
        payments: [rent("l1", 2026, 10, 30000)],
        prefs: prefs({ overdue_summary_day_2: 11 }),
      }),
    );
    expect(kinds(later)).toContain("overdue_summary");
  });

  it("does not send an empty summary", () => {
    // Everyone has paid. A summary saying "nothing is overdue" every month
    // is the kind of mail people filter away, taking the real ones with it.
    const p = planNotices(
      input({
        today: { year: 2026, month: 11, day: 10 },
        payments: [rent("l1", 2026, 10, 30000), rent("l1", 2026, 11, 30000)],
      }),
    );
    expect(kinds(p)).not.toContain("overdue_summary");
  });

  it("counts what is owed in the summary", () => {
    const p = planNotices(
      input({
        today: { year: 2026, month: 11, day: 10 },
        payments: [rent("l1", 2026, 10, 30000), rent("l1", 2026, 11, 11000)],
      }),
    );
    const s = p.find((n) => n.kind === "overdue_summary");
    expect(s?.data).toMatchObject({ leasesBehind: 1, totalOwed: 19000 });
  });

  it("tells the landlord about a lease ending inside the notice window", () => {
    const p = planNotices(
      input({ leases: [lease({ end_date: "2026-12-31" })] }),
    );
    const n = p.find(
      (x) => x.kind === "lease_expiring" && x.recipientKind === "landlord",
    );
    expect(n?.data.daysLeft).toBe(41);
  });

  it("says nothing about a lease ending beyond it", () => {
    const p = planNotices(
      input({
        leases: [lease({ end_date: "2027-05-31" })],
        prefs: prefs({
          lease_expiry_notice_days: 30,
          tenant_lease_expiring: false,
        } as never),
      }),
    );
    expect(
      p.filter(
        (x) => x.kind === "lease_expiring" && x.recipientKind === "landlord",
      ),
    ).toEqual([]);
  });

  it("plans nothing for the landlord when there is no address for them", () => {
    const p = planNotices(
      input({
        landlordEmail: null,
        today: { year: 2026, month: 11, day: 10 },
        payments: [rent("l1", 2026, 10, 30000), rent("l1", 2026, 11, 11000)],
      }),
    );
    expect(p.filter((n) => n.recipientKind === "landlord")).toEqual([]);
  });
});

describe("sending it only once", () => {
  it("gives the same notice the same key on two runs", () => {
    const a = planNotices(input());
    const b = planNotices(input());
    expect(a.map((n) => n.dedupeKey)).toEqual(b.map((n) => n.dedupeKey));
  });

  it("separates the kinds, the recipients, the leases and the months", () => {
    const base = {
      kind: "invoice_late" as const,
      recipient: "t1",
      subjectId: "l1",
      period: "2026-11",
    };
    const k = dedupeKey(base);
    expect(k).not.toBe(dedupeKey({ ...base, kind: "invoice_due_day" }));
    expect(k).not.toBe(dedupeKey({ ...base, recipient: "t2" }));
    expect(k).not.toBe(dedupeKey({ ...base, subjectId: "l2" }));
    expect(k).not.toBe(dedupeKey({ ...base, period: "2026-12" }));
  });

  it("lets next month's notice through", () => {
    const nov = planNotices(input())
      .filter((n) => n.kind === "invoice_late")
      .map((n) => n.dedupeKey);
    const dec = planNotices(
      input({
        today: { year: 2026, month: 12, day: 20 },
        payments: [rent("l1", 2026, 11, 30000)],
      }),
    )
      .filter((n) => n.kind === "invoice_late")
      .map((n) => n.dedupeKey);
    expect(nov.length).toBe(1);
    expect(dec.length).toBe(1);
    expect(nov[0]).not.toBe(dec[0]);
  });

  it("keys a lease-expiry notice on the end date, so a renewal is a new notice", () => {
    const first = planNotices(
      input({ leases: [lease({ end_date: "2026-12-31" })] }),
    ).filter(
      (n) => n.kind === "lease_expiring" && n.recipientKind === "tenant",
    )[0];
    const renewed = planNotices(
      input({ leases: [lease({ end_date: "2027-01-31" })] }),
    ).filter(
      (n) => n.kind === "lease_expiring" && n.recipientKind === "tenant",
    )[0];
    expect(first.dedupeKey).not.toBe(renewed.dedupeKey);
  });
});

describe("the guard between planning and sending", () => {
  it("reports a lease still owing", () => {
    expect(stillOwing(lease(), [rent("l1", 2026, 11, 10000)], TODAY)).toBe(
      true,
    );
  });

  it("reports one that was paid in the meantime", () => {
    // The window between planning and sending is small but not zero, and a
    // tenant who pays inside it is exactly the person who would mind most.
    expect(stillOwing(lease(), [rent("l1", 2026, 11, 30000)], TODAY)).toBe(
      false,
    );
  });
});

describe("every planned notice is deliverable", () => {
  it("always carries an address, a landlord and a key", () => {
    const p = planNotices(
      input({
        today: { year: 2026, month: 11, day: 10 },
        payments: [rent("l1", 2026, 10, 30000), rent("l1", 2026, 11, 11000)],
      }),
    );
    expect(p.length).toBeGreaterThan(0);
    for (const n of p) {
      expect(n.toEmail).toMatch(/@/);
      expect(n.landlordId).toBe("ll1");
      expect(n.dedupeKey.length).toBeGreaterThan(5);
      // A tenant notice without a tenant id cannot satisfy the table's
      // CHECK constraint, so it would fail at insert time instead of here.
      if (n.recipientKind === "tenant") expect(n.tenantId).toBeTruthy();
    }
  });
});

describe("preferences when a landlord has never saved any", () => {
  it("falls back to the documented defaults, not to silence", () => {
    // landlord_settings holds a row only once somebody saves. On this
    // project that was NOBODY, while the Settings page showed every switch
    // on. A notifier driven off the row's existence would promise
    // notifications in the UI and send none, to everyone, for ever.
    const p = preferencesFrom("ll1", null);
    expect(p).toEqual({
      landlord_id: "ll1",
      notify_overdue_summary: true,
      overdue_summary_day_1: 5,
      overdue_summary_day_2: 10,
      notify_lease_expiring: true,
      lease_expiry_notice_days: 90,
      notify_application_submitted: true,
      tenant_notify_invoice_due_soon: true,
      tenant_notify_invoice_due_day: true,
      tenant_notify_invoice_late: true,
      tenant_notify_lease_expiring: true,
      tenant_invoice_due_notice_days: 5,
      tenant_lease_expiry_notice_days: 90,
    });
  });

  it("honours a saved FALSE rather than treating it as missing", () => {
    // The bug this guards: `row.x !== false` and `row.x || default` both
    // turn a deliberate "off" back on when the value is false or 0.
    const p = preferencesFrom("ll1", {
      tenant_notify_invoice_late: false,
      notify_overdue_summary: false,
      tenant_invoice_due_notice_days: 0,
    });
    expect(p.tenant_notify_invoice_late).toBe(false);
    expect(p.notify_overdue_summary).toBe(false);
    expect(p.tenant_invoice_due_notice_days).toBe(0);
  });

  it("keeps the defaults for the keys a partial row does not mention", () => {
    const p = preferencesFrom("ll1", { tenant_notify_invoice_late: false });
    expect(p.tenant_notify_invoice_due_soon).toBe(true);
    expect(p.lease_expiry_notice_days).toBe(90);
  });

  it("plans a full set of notices for a landlord with no settings row", () => {
    const planned = planNotices({
      ...input(),
      prefs: preferencesFrom("ll1", null),
      today: { year: 2026, month: 11, day: 20 },
    });
    expect(planned.length).toBeGreaterThan(0);
  });
});
