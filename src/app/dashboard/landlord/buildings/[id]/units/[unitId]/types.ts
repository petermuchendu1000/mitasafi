/**
 * The shape the unit detail server component hands its client half.
 *
 * Plain serialisable values only — the comparisons that need dates are already
 * done on the server, where the Nairobi calendar is known.
 */

import type { RentStatus } from "@/lib/landlord/rent-status";
import type { MaintenanceCardItem } from "@/components/dashboard/landlord/MaintenanceRequestCard";

export interface UnitFacts {
  id: string;
  unit_number: string;
  unit_type: string;
  floor_level: string | null;
  wing_block: string | null;
  bedrooms: number;
  bathrooms: number | null;
  size_sqm: number | null;
  monthly_rent: number;
  deposit_amount: number | null;
  service_charge: number | null;
  status: string;
  listing_status: string | null;
  furnishing: string | null;
  balconies: number;
  kitchen_features: Record<string, boolean>;
  bathroom_features: Record<string, boolean>;
  climate_control: Record<string, boolean>;
  storage_features: Record<string, boolean>;
  security_features: Record<string, boolean>;
  description: string | null;
}

export interface UnitTenantFacts {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  id_type: string | null;
  id_number: string | null;
  occupation: string | null;
  employer: string | null;
  verification_level: string | null;
  emergency: Record<string, string>;
}

export interface UnitLeaseFacts {
  id: string;
  status: string;
  lease_type: string | null;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  rent_due_day: number;
  deposit_amount: number | null;
  deposit_status: string | null;
  payment_method: string | null;
}

export interface UnitRentPosition {
  status: RentStatus;
  due: number;
  paid: number;
  balance: number;
  daysLate: number;
  dueDay: number;
}

export interface UnitPayment {
  id: string;
  amount: number;
  type: string;
  date: string;
  method: string;
  reference: string | null;
  status: string;
  periodYear: number | null;
  periodMonth: number | null;
  notes: string | null;
}

export interface UnitDetailData {
  buildingId: string;
  buildingName: string;
  buildingArea: string;
  unit: UnitFacts;
  /** Null unless a live lease has a tenant attached. */
  tenant: UnitTenantFacts | null;
  lease: UnitLeaseFacts | null;
  /** Leases on this unit that are not the live one. */
  pastLeaseCount: number;
  /** Null when no live lease covers the current month. */
  rent: UnitRentPosition | null;
  payments: UnitPayment[];
  maintenance: MaintenanceCardItem[];
  /** Today in Nairobi, as the server judged it. */
  todayIso: string;
  /** "2026-11" — the month a new rent payment defaults to. */
  currentPeriod: string;
}
