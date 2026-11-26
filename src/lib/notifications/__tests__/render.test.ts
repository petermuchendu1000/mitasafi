import { renderNotice } from "../render";
import type { PlannedNotice } from "../plan";

function notice(over: Partial<PlannedNotice> = {}): PlannedNotice {
  return {
    kind: "invoice_due_soon",
    landlordId: "ll1",
    recipientKind: "tenant",
    tenantId: "t1",
    toEmail: "tenant@example.test",
    subjectType: "lease",
    subjectId: "l1",
    period: "2026-11",
    dedupeKey: "k",
    data: {
      tenant: "Wanjiru Kariuki",
      unit: "A101",
      building: "Riverside Court",
      rent: 85000,
      balance: 85000,
      dueDate: "2026-11-23",
      daysUntilDue: 3,
      daysLate: 9,
      endDate: "2027-01-31",
      daysLeft: 66,
    },
    ...over,
  } as PlannedNotice;
}

const KINDS: PlannedNotice["kind"][] = [
  "invoice_due_soon",
  "invoice_due_day",
  "invoice_late",
  "lease_expiring",
];

describe("every notice renders", () => {
  it.each(KINDS)("produces a subject, text and html for %s", (kind) => {
    const r = renderNotice(notice({ kind }));
    expect(r.subject.length).toBeGreaterThan(5);
    expect(r.text.length).toBeGreaterThan(40);
    expect(r.html).toContain("<!doctype html>");
    // Both parts must carry the facts. A text part that says less than the
    // HTML is what a plain-text mail client shows.
    expect(r.text).toContain("A101");
  });

  it("renders the landlord's arrears summary", () => {
    const r = renderNotice(
      notice({
        kind: "overdue_summary",
        recipientKind: "landlord",
        tenantId: null,
        subjectType: "portfolio",
        subjectId: null,
        data: { leasesBehind: 2, totalOwed: 165000, month: "2026-11" },
      }),
    );
    expect(r.subject).toBe("2 leases behind on rent");
    expect(r.text).toContain("KES 165,000");
  });

  it("says 'lease' not 'leases' for one", () => {
    const r = renderNotice(
      notice({
        kind: "overdue_summary",
        recipientKind: "landlord",
        tenantId: null,
        subjectType: "portfolio",
        subjectId: null,
        data: { leasesBehind: 1, totalOwed: 85000, month: "2026-11" },
      }),
    );
    expect(r.subject).toBe("1 lease behind on rent");
  });
});

describe("what goes in the message", () => {
  it("never accuses a tenant outright of not paying", () => {
    // The late notice is the one capable of damage. It states what has not
    // been RECORDED and says so, because a tenant who paid in cash this
    // morning will read it before the landlord has written anything down.
    const r = renderNotice(notice({ kind: "invoice_late" }));
    expect(r.text).toContain("has not been recorded as received");
    expect(r.text).toContain("your landlord may not have recorded it yet");
  });

  it("tells a tenant MitaSafi will never ask for their PIN", () => {
    const r = renderNotice(notice({ kind: "invoice_late" }));
    expect(r.text).toContain("never ask you for your M-Pesa PIN");
    expect(r.html).toContain("never ask you for your M-Pesa PIN");
  });

  it("tells a tenant the landlord controls these messages", () => {
    // MitaSafi cannot unsubscribe somebody from their own landlord.
    const r = renderNotice(notice({}));
    expect(r.text).toContain("speak to your landlord");
  });

  it("tells a landlord where to turn them off", () => {
    const r = renderNotice(
      notice({
        kind: "overdue_summary",
        recipientKind: "landlord",
        tenantId: null,
        subjectType: "portfolio",
        subjectId: null,
        data: { leasesBehind: 1, totalOwed: 1, month: "2026-11" },
      }),
    );
    expect(r.text).toContain("turn these off under Settings");
  });

  it("ESCAPES a name that contains markup", () => {
    // Tenant names are typed by people and land in an HTML email.
    const r = renderNotice(
      notice({
        data: { ...notice().data, tenant: '<img src=x onerror="alert(1)">' },
      }),
    );
    expect(r.html).not.toContain("<img src=x");
    expect(r.html).toContain("&lt;img");
  });

  it("escapes a building name too, not just the tenant", () => {
    const r = renderNotice(
      notice({
        data: { ...notice().data, building: "<script>bad()</script>" },
      }),
    );
    expect(r.html).not.toContain("<script>bad()");
  });
});
