/**
 * One maintenance request, as a card.
 *
 * Shared by the building detail page's Maintenance tab and the portfolio-wide
 * /dashboard/landlord/maintenance list. They show the same record and differ
 * only in whether the building name is worth repeating on every row, which is
 * what `showBuilding` is for.
 */

import Link from "next/link";
import {
  Home,
  Clock,
  Calendar,
  CheckCircle,
  Building2,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  maintenanceCategoryLabels,
  maintenanceStatusLabels,
  maintenanceUrgencyLabels,
  labelFor,
  formatKes,
} from "@/lib/landlord/labels";

export interface MaintenanceCardItem {
  id: string;
  unitId: string;
  unitNumber: string;
  /** Only used when showBuilding is set. */
  buildingId?: string | null;
  buildingName?: string | null;
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

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * "23 Nov 2026", from a fixed month list.
 *
 * toLocaleDateString reads the server's locale during SSR and the browser's
 * during hydration; on a page this full of dates that is a mismatch waiting to
 * happen.
 */
export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "—";
  return `${Number(m[3])} ${MONTH_SHORT[Number(m[2]) - 1]} ${m[1]}`;
}

const urgencyStyle: Record<string, string> = {
  emergency: "bg-red-100 text-red-800",
  high: "bg-orange-50 text-orange-700",
  normal: "bg-gray-100 text-gray-700",
  low: "bg-gray-50 text-gray-500",
};

const statusStyle: Record<string, string> = {
  open: "bg-red-50 text-red-700",
  acknowledged: "bg-amber-50 text-amber-700",
  assigned: "bg-blue-50 text-blue-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  closed: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-100 text-gray-500",
};

export function MaintenanceRequestCard({
  item,
  buildingId,
  showBuilding = false,
}: {
  item: MaintenanceCardItem;
  /** The building the unit links belong to. */
  buildingId: string | null;
  showBuilding?: boolean;
}) {
  const unitHref = buildingId
    ? `/dashboard/landlord/buildings/${buildingId}/units/${item.unitId}`
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-medium text-gray-900">{item.title}</h4>
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                urgencyStyle[item.urgency] ?? "bg-gray-100 text-gray-700",
              )}
            >
              {labelFor(maintenanceUrgencyLabels, item.urgency)}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                statusStyle[item.status] ?? "bg-gray-100 text-gray-700",
              )}
            >
              {labelFor(maintenanceStatusLabels, item.status)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
          {/* The three links in this strip are 12px icons beside 12px text
              and measured 16px tall. min-h-[44px] on the links alone would
              leave them sitting oddly against the plain spans beside them,
              so the row gives every item the same height and the links
              become real targets by filling it. */}
          <div className="flex items-center gap-x-4 flex-wrap text-xs text-gray-500 [&>*]:min-h-[44px] [&>*]:inline-flex [&>*]:items-center [&_a]:min-h-[44px]">
            {showBuilding && item.buildingName && (
              <Link
                href={`/dashboard/landlord/buildings/${item.buildingId}`}
                className="inline-flex items-center gap-1 font-medium text-gray-700 hover:text-teal-600"
              >
                <Building2 className="w-3 h-3" />
                {item.buildingName}
              </Link>
            )}
            {unitHref ? (
              <Link
                href={unitHref}
                className="inline-flex items-center gap-1 font-medium text-gray-700 hover:text-teal-600"
              >
                <Home className="w-3 h-3" />
                {item.unitNumber}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                <Home className="w-3 h-3" />
                {item.unitNumber}
              </span>
            )}
            <span>{labelFor(maintenanceCategoryLabels, item.category)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              reported {formatShortDate(item.reportedAt)}
            </span>
            {item.dueDate && item.isOpen && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                due {formatShortDate(item.dueDate)}
              </span>
            )}
            {item.completedAt && (
              <span className="inline-flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                done {formatShortDate(item.completedAt)}
              </span>
            )}
            {item.assignedTo && (
              <span className="inline-flex items-center gap-1">
                {item.assignedTo}
                {item.assignedPhone && (
                  <a
                    href={`tel:${item.assignedPhone}`}
                    className="inline-flex items-center gap-1 hover:text-teal-600"
                  >
                    <Phone className="w-3 h-3" />
                    {item.assignedPhone}
                  </a>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {item.actualCost !== null ? (
            <>
              <p className="font-semibold text-gray-900">
                {formatKes(item.actualCost)}
              </p>
              <p className="text-xs text-gray-500">
                actual{item.costPaidBy ? ` · ${item.costPaidBy}` : ""}
              </p>
            </>
          ) : item.estimatedCost !== null ? (
            <>
              <p className="font-semibold text-gray-700">
                {formatKes(item.estimatedCost)}
              </p>
              <p className="text-xs text-gray-500">estimate</p>
            </>
          ) : (
            <p className="text-xs text-gray-400">no cost yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
