/**
 * The rent-status rule.
 *
 * Two groups of these matter more than the rest:
 *
 *   The GRACE BOUNDARY. A tenant whose rent is due on the 5th with five days'
 *   grace is on time on the 10th and late on the 11th. Getting that wrong by one
 *   day labels someone's rent overdue while they are still within the terms of
 *   their own lease — and the landlord acts on that label.
 *
 *   The ZONE. `nairobiToday` is the only clock read in the module. Kenya is UTC+3,
 *   so for three hours of every day the UTC date and the Nairobi date disagree. A
 *   server in UTC that reads its own date is a day behind for those three hours.
 */

import {
  nairobiToday,
  civilFromISO,
  compareCivil,
  addDays,
  formatCivil,
  rentStatusForPeriod,
  leaseCoversPeriod,
  recentPeriods,
  type CivilDate,
} from "../rent-status";

const NOV = { year: 2026, month: 11 };

/** The seed's A101 lease: 85,000 due on the 5th, five days' grace. */
function a101(
  overrides: Partial<Parameters<typeof rentStatusForPeriod>[0]> = {},
) {
  return rentStatusForPeriod({
    monthlyRent: 85000,
    rentDueDay: 5,
    gracePeriodDays: 5,
    amountPaid: 0,
    period: NOV,
    today: { year: 2026, month: 11, day: 23 },
    ...overrides,
  });
}

describe("nairobiToday", () => {
  it("reads the Nairobi calendar, not the server's", () => {
    // 22:30 UTC on the 22nd is 01:30 on the 23rd in Nairobi. A server reading its
    // own UTC date here would say the 22nd.
    const at = new Date("2026-11-22T22:30:00Z");
    expect(nairobiToday(at)).toEqual({ year: 2026, month: 11, day: 23 });
  });

  it("does not run ahead during the Nairobi afternoon", () => {
    const at = new Date("2026-11-22T12:00:00Z");
    expect(nairobiToday(at)).toEqual({ year: 2026, month: 11, day: 22 });
  });

  it("rolls the year over in Nairobi before it does in UTC", () => {
    // 21:10 UTC on 31 December is already 00:10 on 1 January in Nairobi.
    const at = new Date("2026-12-31T21:10:00Z");
    expect(nairobiToday(at)).toEqual({ year: 2027, month: 1, day: 1 });
  });
});

describe("civilFromISO", () => {
  it("reads a date-only column", () => {
    expect(civilFromISO("2026-11-23")).toEqual({
      year: 2026,
      month: 11,
      day: 23,
    });
  });

  it("reads the date half of a timestamp without shifting it", () => {
    expect(civilFromISO("2026-11-23T09:00:00Z")).toEqual({
      year: 2026,
      month: 11,
      day: 23,
    });
  });

  it("returns null for something that is not a date", () => {
    expect(civilFromISO("")).toBeNull();
    expect(civilFromISO("soon")).toBeNull();
    expect(civilFromISO("23/11/2026")).toBeNull();
  });
});

describe("civil date arithmetic", () => {
  it("orders dates across years, months and days", () => {
    const a: CivilDate = { year: 2026, month: 11, day: 5 };
    expect(compareCivil(a, { year: 2027, month: 1, day: 1 })).toBeLessThan(0);
    expect(compareCivil(a, { year: 2026, month: 12, day: 1 })).toBeLessThan(0);
    expect(compareCivil(a, { year: 2026, month: 11, day: 6 })).toBeLessThan(0);
    expect(compareCivil(a, { year: 2026, month: 11, day: 5 })).toBe(0);
    expect(compareCivil(a, { year: 2026, month: 11, day: 4 })).toBeGreaterThan(
      0,
    );
    expect(compareCivil(a, { year: 2025, month: 12, day: 31 })).toBeGreaterThan(
      0,
    );
  });

  it("adds days across a month boundary", () => {
    expect(addDays({ year: 2026, month: 11, day: 28 }, 5)).toEqual({
      year: 2026,
      month: 12,
      day: 3,
    });
  });

  it("adds days across a year boundary", () => {
    expect(addDays({ year: 2026, month: 12, day: 30 }, 5)).toEqual({
      year: 2027,
      month: 1,
      day: 4,
    });
  });

  it("knows February has 29 days in a leap year", () => {
    expect(addDays({ year: 2028, month: 2, day: 28 }, 1)).toEqual({
      year: 2028,
      month: 2,
      day: 29,
    });
    expect(addDays({ year: 2027, month: 2, day: 28 }, 1)).toEqual({
      year: 2027,
      month: 3,
      day: 1,
    });
  });

  it("formats a padded ISO date", () => {
    expect(formatCivil({ year: 2026, month: 1, day: 7 })).toBe("2026-01-07");
  });
});

describe("rent status: what has been paid", () => {
  it("is paid when the full rent is confirmed", () => {
    const r = a101({ amountPaid: 85000 });
    expect(r.status).toBe("paid");
    expect(r.balance).toBe(0);
  });

  it("is paid one shilling over, and the balance does not go negative", () => {
    const r = a101({ amountPaid: 85001 });
    expect(r.status).toBe("paid");
    expect(r.balance).toBe(0);
  });

  it("is partial one shilling under, however late it is", () => {
    // The seed's A201: 70,000 of 140,000 arrived on the 9th. On the 23rd the grace
    // period is long gone, and calling this "overdue" would hide the 70,000.
    const r = a101({ amountPaid: 84999 });
    expect(r.status).toBe("partial");
    expect(r.balance).toBe(1);
  });

  it("reports the balance on a half payment", () => {
    const r = rentStatusForPeriod({
      monthlyRent: 140000,
      rentDueDay: 5,
      gracePeriodDays: 5,
      amountPaid: 70000,
      period: NOV,
      today: { year: 2026, month: 11, day: 23 },
    });
    expect(r.status).toBe("partial");
    expect(r.due).toBe(140000);
    expect(r.paid).toBe(70000);
    expect(r.balance).toBe(70000);
  });

  it("treats a zero-rent lease as paid rather than permanently overdue", () => {
    expect(a101({ monthlyRent: 0, amountPaid: 0 }).status).toBe("paid");
  });

  it("does not let a negative sum invent a credit", () => {
    const r = a101({ amountPaid: -5000 });
    expect(r.paid).toBe(0);
    expect(r.balance).toBe(85000);
    expect(r.status).toBe("overdue");
  });
});

describe("rent status: the grace boundary", () => {
  it("is pending on the due day itself", () => {
    expect(a101({ today: { year: 2026, month: 11, day: 5 } }).status).toBe(
      "pending",
    );
  });

  it("is pending before the due day", () => {
    expect(a101({ today: { year: 2026, month: 11, day: 1 } }).status).toBe(
      "pending",
    );
  });

  it("is still pending on the LAST day of grace", () => {
    // Due on the 5th + 5 days of grace = the 10th is the last day it counts as
    // on time. This is the assertion that fails if the comparison is >= instead
    // of >, which is the easy way to write this wrong.
    const r = a101({ today: { year: 2026, month: 11, day: 10 } });
    expect(r.graceEndsOn).toEqual({ year: 2026, month: 11, day: 10 });
    expect(r.status).toBe("pending");
    expect(r.daysLate).toBe(0);
  });

  it("is overdue the day AFTER grace runs out, by one day", () => {
    const r = a101({ today: { year: 2026, month: 11, day: 11 } });
    expect(r.status).toBe("overdue");
    expect(r.daysLate).toBe(1);
  });

  it("counts the days late from the end of grace, not the due day", () => {
    expect(a101({ today: { year: 2026, month: 11, day: 23 } }).daysLate).toBe(
      13,
    );
  });

  it("counts days late across a month boundary", () => {
    const r = a101({
      rentDueDay: 28,
      gracePeriodDays: 5,
      today: { year: 2026, month: 12, day: 6 },
    });
    expect(r.graceEndsOn).toEqual({ year: 2026, month: 12, day: 3 });
    expect(r.daysLate).toBe(3);
  });

  it("is pending with no grace at all on the due day", () => {
    const r = a101({
      gracePeriodDays: 0,
      today: { year: 2026, month: 11, day: 5 },
    });
    expect(r.graceEndsOn).toEqual({ year: 2026, month: 11, day: 5 });
    expect(r.status).toBe("pending");
  });

  it("is overdue with no grace the day after", () => {
    expect(
      a101({ gracePeriodDays: 0, today: { year: 2026, month: 11, day: 6 } })
        .status,
    ).toBe("overdue");
  });

  it("is pending on the W1 lease, due on the 28th, judged on the 23rd", () => {
    // The seed's third lease. Nothing has been paid for November and nothing is
    // wrong: the rent is not due yet.
    const r = rentStatusForPeriod({
      monthlyRent: 95000,
      rentDueDay: 28,
      gracePeriodDays: 5,
      amountPaid: 0,
      period: NOV,
      today: { year: 2026, month: 11, day: 23 },
    });
    expect(r.status).toBe("pending");
    expect(r.dueDate).toEqual({ year: 2026, month: 11, day: 28 });
  });
});

describe("a tenancy that starts part-way through the month", () => {
  // MEASURED BEFORE THIS: a lease created on 23 Nov with rent due on the 5th
  // rendered "Paid · 13d late" the moment it was created. There was no
  // tenancy on the 5th, so nothing was owed then.

  it("does not owe rent from before it began", () => {
    const r = rentStatusForPeriod({
      monthlyRent: 92500,
      rentDueDay: 5,
      gracePeriodDays: 5,
      amountPaid: 0,
      period: NOV,
      today: { year: 2026, month: 11, day: 23 },
      leaseStart: { year: 2026, month: 11, day: 23 },
    });
    expect(r.dueDate).toEqual({ year: 2026, month: 11, day: 23 });
    expect(r.status).toBe("pending");
    expect(r.daysLate).toBe(0);
  });

  it("still uses the lease's day when the tenancy began before it", () => {
    const r = rentStatusForPeriod({
      monthlyRent: 92500,
      rentDueDay: 5,
      gracePeriodDays: 5,
      amountPaid: 0,
      period: NOV,
      today: { year: 2026, month: 11, day: 23 },
      leaseStart: { year: 2026, month: 11, day: 1 },
    });
    expect(r.dueDate.day).toBe(5);
    expect(r.status).toBe("overdue");
  });

  it("ignores a lease start in an EARLIER month", () => {
    // Only the first month of a tenancy gets this treatment; by December the
    // 5th is the 5th.
    const r = rentStatusForPeriod({
      monthlyRent: 92500,
      rentDueDay: 5,
      gracePeriodDays: 5,
      amountPaid: 0,
      period: { year: 2026, month: 12 },
      today: { year: 2026, month: 12, day: 20 },
      leaseStart: { year: 2026, month: 11, day: 23 },
    });
    expect(r.dueDate).toEqual({ year: 2026, month: 12, day: 5 });
    expect(r.status).toBe("overdue");
  });

  it("goes overdue once the grace from the start date runs out", () => {
    const r = rentStatusForPeriod({
      monthlyRent: 92500,
      rentDueDay: 5,
      gracePeriodDays: 5,
      amountPaid: 0,
      period: NOV,
      today: { year: 2026, month: 11, day: 29 },
      leaseStart: { year: 2026, month: 11, day: 23 },
    });
    expect(r.graceEndsOn).toEqual({ year: 2026, month: 11, day: 28 });
    expect(r.status).toBe("overdue");
    expect(r.daysLate).toBe(1);
  });

  it("behaves exactly as before when no lease start is given", () => {
    const without = rentStatusForPeriod({
      monthlyRent: 85000,
      rentDueDay: 5,
      gracePeriodDays: 5,
      amountPaid: 0,
      period: NOV,
      today: { year: 2026, month: 11, day: 23 },
    });
    const withNull = rentStatusForPeriod({
      monthlyRent: 85000,
      rentDueDay: 5,
      gracePeriodDays: 5,
      amountPaid: 0,
      period: NOV,
      today: { year: 2026, month: 11, day: 23 },
      leaseStart: null,
    });
    expect(without.status).toBe("overdue");
    expect(withNull).toEqual(without);
  });
});

describe("rent status: the due day inside the month", () => {
  it("clamps a due day past the end of February", () => {
    const r = rentStatusForPeriod({
      monthlyRent: 50000,
      rentDueDay: 31,
      gracePeriodDays: 0,
      amountPaid: 0,
      period: { year: 2027, month: 2 },
      today: { year: 2027, month: 2, day: 28 },
    });
    expect(r.dueDate).toEqual({ year: 2027, month: 2, day: 28 });
    expect(r.status).toBe("pending");
  });

  it("clamps a due day of 0 or less to the first", () => {
    expect(a101({ rentDueDay: 0 }).dueDate.day).toBe(1);
    expect(a101({ rentDueDay: -4 }).dueDate.day).toBe(1);
  });

  it("uses the period's month, not today's", () => {
    // Judging September's rent in November: the due date belongs to September.
    const r = a101({
      period: { year: 2026, month: 9 },
      today: { year: 2026, month: 11, day: 23 },
    });
    expect(r.dueDate).toEqual({ year: 2026, month: 9, day: 5 });
    expect(r.status).toBe("overdue");
  });
});

describe("leaseCoversPeriod", () => {
  const lease = { start_date: "2026-07-01", end_date: "2027-06-30" };

  it("covers a month inside the term", () => {
    expect(leaseCoversPeriod(lease, NOV)).toBe(true);
  });

  it("covers the first month of the term", () => {
    expect(leaseCoversPeriod(lease, { year: 2026, month: 7 })).toBe(true);
  });

  it("does not cover the month before it started", () => {
    expect(leaseCoversPeriod(lease, { year: 2026, month: 6 })).toBe(false);
  });

  it("covers a month it started part-way through", () => {
    // Moved in on the 20th: that month is still a month under lease.
    expect(
      leaseCoversPeriod({ start_date: "2026-11-20", end_date: null }, NOV),
    ).toBe(true);
  });

  it("covers a month it ended part-way through", () => {
    expect(
      leaseCoversPeriod(
        { start_date: "2025-01-01", end_date: "2026-11-02" },
        NOV,
      ),
    ).toBe(true);
  });

  it("does not cover the month after it ended", () => {
    expect(
      leaseCoversPeriod(
        { start_date: "2025-01-01", end_date: "2026-10-31" },
        NOV,
      ),
    ).toBe(false);
  });

  it("covers everything when there is no end date", () => {
    expect(
      leaseCoversPeriod({ start_date: "2020-01-01", end_date: null }, NOV),
    ).toBe(true);
  });

  it("covers nothing when the start date is unreadable", () => {
    expect(leaseCoversPeriod({ start_date: "", end_date: null }, NOV)).toBe(
      false,
    );
  });
});

describe("recentPeriods", () => {
  it("ends with the period asked for and runs oldest first", () => {
    expect(recentPeriods(NOV, 3)).toEqual([
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
    ]);
  });

  it("crosses a year boundary backwards", () => {
    expect(recentPeriods({ year: 2027, month: 2 }, 4)).toEqual([
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
      { year: 2027, month: 2 },
    ]);
  });

  it("goes back more than a whole year", () => {
    const got = recentPeriods({ year: 2027, month: 1 }, 14);
    expect(got).toHaveLength(14);
    expect(got[0]).toEqual({ year: 2025, month: 12 });
    expect(got[13]).toEqual({ year: 2027, month: 1 });
  });

  it("returns just the period itself for a count of one", () => {
    expect(recentPeriods(NOV, 1)).toEqual([NOV]);
  });
});
