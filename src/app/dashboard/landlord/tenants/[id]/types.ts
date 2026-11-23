/**
 * The shape the tenant detail server component hands its client half.
 *
 * Plain serialisable values only; every date comparison that matters was
 * already made on the server, where Nairobi's today is known.
 */

import type { RentStatus } from "@/lib/landlord/rent-status";
import type { MaintenanceCardItem } from "@/components/dashboard/landlord/MaintenanceRequestCard";

export interface TenantFacts {
  id: string;
  name: string;
  initial: string;
  phone: string;
  phoneSecondary: string | null;
  email: string | null;
  idType: string | null;
  idNumber: string | null;
  occupation: string | null;
  employer: string | null;
  employerPhone: string | null;
  verificationLevel: string | null;
  verifiedAt: string | null;
  /** tenants_status_check: active | inactive | blacklisted */
  status: string;
  blacklistReason: string | null;
  emergency: Record<string, string>;
  occupants: { adults: number | null; children: number | null };
  notes: string | null;
  createdAt: string | null;
}

export interface TenantLease {
  id: string;
  unitId: string;
  unitNumber: string;
  buildingId: string | null;
  buildingName: string | null;
  buildingArea: string | null;
  status: string;
  leaseType: string | null;
  startDate: string;
  endDate: string | null;
  monthlyRent: number;
  rentDueDay: number;
  depositAmount: number | null;
  depositStatus: string | null;
  depositRefunded: number | null;
  paymentMethod: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  terminatedBy: string | null;
  isLive: boolean;
}

export interface TenantPayment {
  id: string;
  amount: number;
  type: string;
  status: string;
  date: string;
  method: string;
  reference: string | null;
  periodLabel: string | null;
  unitNumber: string | null;
}

export interface TenantRentPosition {
  status: RentStatus;
  due: number;
  paid: number;
  balance: number;
  daysLate: number;
}

export interface TenantMonth {
  label: string;
  expected: number;
  collected: number;
}

export interface TenantProfileData {
  tenant: TenantFacts;
  /** Every lease on record, newest first; isLive marks the current one(s). */
  leases: TenantLease[];
  payments: TenantPayment[];
  maintenance: MaintenanceCardItem[];
  /** Null when no live lease covers the current month. */
  rent: TenantRentPosition | null;
  months: TenantMonth[];
  depositsHeld: number;
  periodLabel: string;
}
