import {
  buildRentRoll,
  buildArrears,
  buildDepositRegister,
  buildExpiries,
  buildOccupancy,
  buildCollections,
  csvCell,
  toCsv,
  type ReportData,
  type ReportLease,
} from "../reports";

const TODAY = { year: 2026, month: 11, day: 20 };

function lease(over: Partial<ReportLease> = {}): ReportLease {
  return {
    id: "l1",
    unit_id: "u1",
    tenant_id: "t1",
    status: "active",
    start_date: "2026-06-01",
    end_date: "2027-05-31",
    monthly_rent: 30000,
    rent_due_day: 5,
    grace_period_days: 5,
    deposit_amount: 60000,
    deposit_status: "held",
    ...over,
  };
}

function data(over: Partial<ReportData> = {}): ReportData {
  return {
    buildings: [{ id: "b1", name: "Riverside" }],
    units: [
      { id: "u1", building_id: "b1", unit_number: "A1", status: "occupied" },
    ],
    tenants: [
      { id: "t1", full_name: "Brian Kamau", phone: "+254700", email: null },
    ],
    leases: [lease()],
    payments: [],
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
    payment_date: `${year}-${String(month).padStart(2, "0")}-05`,
  };
}

describe("rent roll", () => {
  it("names the unit, building and tenant on each row", () => {
    const r = buildRentRoll(data(), TODAY);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      unit: "A1",
      building: "Riverside",
      tenant: "Brian Kamau",
      monthlyRent: 30000,
    });
  });

  it("shows the balance still owed this month", () => {
    const d = data({ payments: [rent("l1", 2026, 11, 10000)] });
    const r = buildRentRoll(d, TODAY);
    expect(r.rows[0].status).toBe("partial");
    expect(r.rows[0].balance).toBe(20000);
  });

  it("does not count a lease that has not started toward the rent total", () => {
    // Signed, live, starts next month. Including its rent would overstate
    // what the portfolio brings in this month.
    const d = data({ leases: [lease({ start_date: "2026-12-01" })] });
    const r = buildRentRoll(d, TODAY);
    expect(r.rows[0].status).toBe("not in force");
    expect(r.totalRent).toBe(0);
    // It is still LISTED — it is a real lease — and its deposit is real money.
    expect(r.rows).toHaveLength(1);
    expect(r.totalDeposit).toBe(60000);
  });

  it("leaves out leases that are not live at all", () => {
    const d = data({ leases: [lease({ status: "terminated" })] });
    expect(buildRentRoll(d, TODAY).rows).toHaveLength(0);
  });
});

describe("arrears", () => {
  it("reports a month that was never paid", () => {
    // Ledger starts in June (June was paid), July was not.
    const d = data({
      payments: [rent("l1", 2026, 6, 30000), rent("l1", 2026, 8, 30000)],
    });
    const r = buildArrears(d, TODAY);
    const july = r.rows.find((x) => x.period === "Jul 2026");
    expect(july).toBeDefined();
    expect(july?.balance).toBe(30000);
  });

  it("NEVER invents debt from before the landlord started recording", () => {
    // The lease runs from February; the first recorded rent is August. The
    // six months before that are missing records, not arrears. Reporting
    // them would put 180,000 of imaginary debt in front of a landlord.
    const d = data({
      leases: [lease({ start_date: "2026-02-01" })],
      payments: [
        rent("l1", 2026, 8, 30000),
        rent("l1", 2026, 9, 30000),
        rent("l1", 2026, 10, 30000),
        rent("l1", 2026, 11, 30000),
      ],
    });
    const r = buildArrears(d, TODAY);
    expect(r.rows).toHaveLength(0);
    expect(r.total).toBe(0);
  });

  it("excludes a lease with no recorded rent at all, and says how many", () => {
    const r = buildArrears(data(), TODAY);
    expect(r.rows).toHaveLength(0);
    expect(r.leasesWithNoLedger).toBe(1);
  });

  it("does not chase a tenant who is still inside the grace period", () => {
    // Rent due on the 28th, grace 5 days, today is the 20th: November is not
    // late yet. Only October should appear.
    const d = data({
      leases: [lease({ rent_due_day: 28, grace_period_days: 5 })],
      payments: [rent("l1", 2026, 9, 30000)],
    });
    const r = buildArrears(d, TODAY);
    expect(r.rows.map((x) => x.period)).toEqual(["Oct 2026"]);
  });

  it("counts only the unpaid part of a part-paid month", () => {
    const d = data({
      payments: [rent("l1", 2026, 6, 30000), rent("l1", 2026, 7, 12000)],
    });
    const r = buildArrears(d, TODAY);
    const july = r.rows.find((x) => x.period === "Jul 2026");
    expect(july?.paid).toBe(12000);
    expect(july?.balance).toBe(18000);
  });

  it("ignores payments that are not confirmed", () => {
    const d = data({
      payments: [
        rent("l1", 2026, 6, 30000),
        rent("l1", 2026, 7, 30000, "pending"),
      ],
    });
    const r = buildArrears(d, TODAY);
    expect(r.rows.find((x) => x.period === "Jul 2026")?.balance).toBe(30000);
  });

  it("ignores a deposit sitting in the payments table", () => {
    const d = data({
      payments: [
        rent("l1", 2026, 6, 30000),
        {
          lease_id: "l1",
          amount: 60000,
          payment_type: "deposit",
          status: "confirmed",
          period_year: 2026,
          period_month: 7,
          payment_date: "2026-07-01",
        },
      ],
    });
    // A deposit must not settle July's rent.
    expect(
      buildArrears(d, TODAY).rows.find((x) => x.period === "Jul 2026")?.balance,
    ).toBe(30000);
  });
});

describe("deposits held", () => {
  it("totals what is owed back, and names who it belongs to", () => {
    const r = buildDepositRegister(data());
    expect(r.total).toBe(60000);
    expect(r.rows[0]).toMatchObject({ tenant: "Brian Kamau", amount: 60000 });
  });

  it("leaves out leases with no deposit", () => {
    const d = data({ leases: [lease({ deposit_amount: 0 })] });
    expect(buildDepositRegister(d).rows).toHaveLength(0);
  });
});

describe("lease expiries", () => {
  it("lists a lease ending inside the window", () => {
    const d = data({ leases: [lease({ end_date: "2026-12-31" })] });
    const r = buildExpiries(d, TODAY, 90);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].daysLeft).toBe(41);
  });

  it("leaves out one ending beyond it", () => {
    const d = data({ leases: [lease({ end_date: "2027-05-31" })] });
    expect(buildExpiries(d, TODAY, 90).rows).toHaveLength(0);
  });

  it("surfaces a lease already past its end date and still marked active", () => {
    // The one the landlord most needs to see, so it is reported rather than
    // filtered out for being in the past.
    const d = data({ leases: [lease({ end_date: "2026-10-31" })] });
    const r = buildExpiries(d, TODAY, 90);
    expect(r.lapsed).toBe(1);
    expect(r.rows[0].daysLeft).toBeLessThan(0);
  });

  it("ignores an open-ended lease", () => {
    const d = data({ leases: [lease({ end_date: null })] });
    expect(buildExpiries(d, TODAY, 90).rows).toHaveLength(0);
  });
});

describe("occupancy", () => {
  it("counts each unit once, by status", () => {
    const d = data({
      units: [
        { id: "u1", building_id: "b1", unit_number: "A1", status: "occupied" },
        { id: "u2", building_id: "b1", unit_number: "A2", status: "vacant" },
        {
          id: "u3",
          building_id: "b1",
          unit_number: "A3",
          status: "maintenance",
        },
      ],
    });
    const r = buildOccupancy(d);
    expect(r.rows[0]).toMatchObject({
      total: 3,
      occupied: 1,
      vacant: 1,
      other: 1,
    });
    expect(r.rate).toBe(33);
  });

  it("still counts a unit whose building is missing", () => {
    const d = data({
      units: [
        { id: "u1", building_id: null, unit_number: "X", status: "occupied" },
      ],
    });
    const r = buildOccupancy(d);
    expect(r.total).toBe(1);
    expect(r.rows.some((x) => x.building === "No building recorded")).toBe(
      true,
    );
  });

  it("reports no rate at all for a building with no units", () => {
    // 0% would read as a crisis; the honest answer is that there is none.
    const r = buildOccupancy(data({ units: [] }));
    expect(r.rows[0].rate).toBeNull();
    expect(r.rate).toBeNull();
  });
});

describe("collections by month", () => {
  it("compares what was due against what was confirmed", () => {
    const d = data({ payments: [rent("l1", 2026, 10, 30000)] });
    const r = buildCollections(d, TODAY, 12);
    const oct = r.find((x) => x.period === "Oct 2026");
    expect(oct).toMatchObject({ expected: 30000, collected: 30000, rate: 100 });
  });

  it("counts a terminated lease for the months it was actually in force", () => {
    // Dropping it would make past months look under-let and flatter the
    // collection rate for every month the tenant was there.
    const d = data({
      leases: [
        lease({
          status: "terminated",
          start_date: "2026-06-01",
          end_date: "2026-09-30",
        }),
      ],
      payments: [rent("l1", 2026, 7, 30000)],
    });
    const r = buildCollections(d, TODAY, 12);
    expect(r.find((x) => x.period === "Jul 2026")?.expected).toBe(30000);
    expect(r.find((x) => x.period === "Nov 2026")?.expected).toBe(0);
  });

  it("gives no rate for a month when nothing was due", () => {
    const d = data({ leases: [lease({ start_date: "2026-11-01" })] });
    expect(buildCollections(d, TODAY, 12)[0].rate).toBeNull();
  });

  it("does not report 0% for months before any rent was recorded", () => {
    // THE CONTRADICTION THIS EXISTS TO PREVENT. A lease running since
    // February whose first recorded rent is August: reporting Feb-Jul as 0%
    // collected says the landlord collected nothing for six months, while
    // the arrears report — correctly — says nothing was owed then. A month
    // with no records gets no rate, and is counted as such.
    const d = data({
      leases: [lease({ start_date: "2026-02-01" })],
      payments: [rent("l1", 2026, 8, 30000)],
    });
    const r = buildCollections(d, TODAY, 12);
    const may = r.find((x) => x.period === "May 2026");
    expect(may).toMatchObject({
      expected: 0,
      collected: 0,
      rate: null,
      leasesNotYetRecorded: 1,
    });
    // August, where the ledger begins, is counted normally.
    expect(r.find((x) => x.period === "Aug 2026")).toMatchObject({
      expected: 30000,
      collected: 30000,
      rate: 100,
      leasesNotYetRecorded: 0,
    });
  });
});

describe("CSV", () => {
  it("quotes a value containing a comma", () => {
    expect(csvCell("Kamau, Brian")).toBe('"Kamau, Brian"');
  });

  it("doubles embedded quotes", () => {
    expect(csvCell('He said "no"')).toBe('"He said ""no"""');
  });

  it("neutralises a formula hidden in a tenant-supplied name", () => {
    // These fields are typed by tenants. Without the apostrophe this is a
    // live formula the moment the landlord opens the file.
    expect(csvCell('=HYPERLINK("http://x")')).toBe(
      '"\'=HYPERLINK(""http://x"")"',
    );
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-2")).toBe("'-2");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("still neutralises one hidden behind leading whitespace", () => {
    // A spreadsheet skips the whitespace when looking for the marker; a
    // check that only looked at character zero would miss this.
    // No comma or quote in the value, so no wrapping is needed — the
    // apostrophe alone is what makes the cell text.
    expect(csvCell(" =1+1")).toBe("' =1+1");
  });

  it("leaves an ordinary negative number readable", () => {
    // Still escaped, because it has to be — but the value is intact.
    expect(csvCell(-2)).toBe("'-2");
  });

  it("builds a sheet with CRLF rows", () => {
    expect(toCsv(["a", "b"], [[1, 2]])).toBe("a,b\r\n1,2");
  });
});
