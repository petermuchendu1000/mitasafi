/**
 * The shape the server component hands the client half of the building detail page.
 *
 * It lives in its own module so neither side can quietly change it: the server
 * builds exactly this and the client renders exactly this. Everything is a plain
 * serialisable value — no Date objects, because those do not survive the server/
 * client boundary intact and the comparisons that matter are already done.
 */

import type { RentStatus } from "@/lib/landlord/rent-status";

export interface BuildingHeader {
  id: string;
  name: string;
  building_type: string;
  address: string;
  area: string;
  city: string | null;
  /** Nullable in the generated types: the column has a default, not NOT NULL. */
  status: string | null;
  photos: string[];
  cover_photo: string | null;
  total_floors: number | null;
  /**
   * buildings.total_units as stored. Shown nowhere as the unit count — the real
   * count is derived from the unit rows — but kept so the page can point out when
   * the stored counter disagrees with reality.
   */
  recorded_total_units: number | null;
  year_built: number | null;
  plot_number: string | null;
  management_type: string | null;
  service_charge: number | null;
  created_at: string | null;
}

export interface UnitTenant {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  verification_level: string | null;
}

export interface UnitLease {
  id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  rent_due_day: number;
  status: string;
}

export interface UnitRent {
  status: RentStatus;
  due: number;
  paid: number;
  balance: number;
  daysLate: number;
  dueDay: number;
}

export interface UnitCard {
  id: string;
  unit_number: string;
  unit_type: string;
  floor_level: string | null;
  wing_block: string | null;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number | null;
  monthly_rent: number;
  status: string;
  listing_status: string | null;
  furnishing: string | null;
  available_from: string | null;
  openMaintenance: number;
  /** Null unless a live lease has a tenant attached. */
  tenant: UnitTenant | null;
  lease: UnitLease | null;
  /** Null when no live lease covers the current month — there is nothing due. */
  rent: UnitRent | null;
}

export interface BuildingStats {
  total: number;
  occupied: number;
  vacant: number;
  maintenance: number;
  reserved: number;
  monthlyRevenue: number;
  occupancyRate: number;
}

export interface MonthCollection {
  label: string;
  year: number;
  month: number;
  expected: number;
  collected: number;
}

export interface ArrearsItem {
  unitId: string;
  unitNumber: string;
  tenantName: string;
  balance: number;
  daysLate: number;
  status: RentStatus;
}

export interface PaymentItem {
  id: string;
  date: string;
  unitNumber: string;
  tenantName: string;
  amount: number;
  method: string;
  type: string;
  reference: string | null;
  periodLabel: string | null;
}

export interface FinanceSummary {
  currentLabel: string;
  expected: number;
  collected: number;
  outstanding: number;
  collectionRate: number;
  depositsHeld: number;
  months: MonthCollection[];
  arrears: ArrearsItem[];
  recentPayments: PaymentItem[];
}

export interface MaintenanceItem {
  id: string;
  unitId: string;
  unitNumber: string;
  category: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
  assignedTo: string | null;
  assignedPhone: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  costPaidBy: string | null;
  reportedAt: string;
  dueDate: string | null;
  completedAt: string | null;
  isOpen: boolean;
}

export interface ExpiringLease {
  unitId: string;
  unitNumber: string;
  tenantName: string;
  endDate: string;
}

export interface BuildingDetailData {
  building: BuildingHeader;
  units: UnitCard[];
  stats: BuildingStats;
  finances: FinanceSummary;
  maintenance: MaintenanceItem[];
  expiringLeases: ExpiringLease[];
  /** Today in Nairobi, as the server judged it, so the client agrees with it. */
  todayIso: string;
}
