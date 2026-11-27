"use client";

import { Bell, CalendarDays, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/components/shared/listing-types";
import { cn } from "@/lib/utils";
import type { PriceBreakdown } from "@/lib/listings/types";
import styles from "./listing-price.module.css";

interface ListingPriceCardProps {
  price: PriceBreakdown;
  availableNow: boolean;
  availableFrom: string | null;
  onContact: () => void;
  onApply?: () => void;
  onScheduleViewing: () => void;
  isUnavailable?: boolean;
  className?: string;
}

const includedItems: Record<string, string> = {
  water: "Water", garbage: "Garbage collection", security: "Security",
  wifi: "Wi-Fi", parking: "Parking", electricity: "Electricity", gas: "Gas",
};

export function ListingPriceCard({
  price,
  availableNow,
  availableFrom,
  onContact,
  onApply,
  onScheduleViewing,
  isUnavailable = false,
  className,
}: ListingPriceCardProps) {
  const amount = (value: number) => formatCurrency(value, price.currency);
  const date = availableFrom ? new Date(availableFrom) : null;
  const availableDate = date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric", timeZone: "Africa/Nairobi" })
    : null;

  return (
    <section className={cn(styles.card, className)} aria-label="Rent and move-in costs">
      <div className={styles.head}>
        <p className={styles.label}>{price.serviceCharge ? "Total monthly cost" : "Monthly rent"}</p>
        <p className={styles.amount}>{amount(price.totalMonthly)} <span>/ month</span></p>
        {!!price.serviceCharge && (
          <dl className={styles.costs}>
            <div><dt>Rent</dt><dd>{amount(price.rent)}</dd></div>
            <div><dt>Service charge</dt><dd>{amount(price.serviceCharge)}</dd></div>
          </dl>
        )}
        {price.rentIncludes.length > 0 && (
          <p className={styles.note}>Includes {price.rentIncludes.map((item) => includedItems[item] || item).join(", ")}</p>
        )}
        {price.isNegotiable && <p className={styles.note}>Rent is negotiable</p>}
      </div>

      <details className={styles.moveIn}>
        <summary>
          <span>Estimated move-in cost</span>
          <span>{amount(price.moveInCost)} <ChevronDown size={16} aria-hidden="true" /></span>
        </summary>
        <dl className={styles.costs}>
          <div><dt>First month</dt><dd>{amount(price.totalMonthly)}</dd></div>
          <div><dt>Deposit</dt><dd>{amount(price.depositAmount)}</dd></div>
        </dl>
      </details>

      <p className={styles.availability}>
        <CalendarDays size={16} aria-hidden="true" />
        {isUnavailable ? "Currently unavailable" : availableNow ? "Available now"
          : availableDate ? `Available from ${availableDate}` : "Confirm availability with the landlord"}
      </p>

      <div className={styles.actions}>
        {isUnavailable ? (
          <button type="button" className={styles.primary} onClick={onContact}><Bell size={17} aria-hidden="true" /> Notify me</button>
        ) : (
          <>
            <div className={styles.desktopActions}>
              {onApply && <button type="button" className={styles.primary} onClick={onApply}>Apply</button>}
              <button type="button" className={styles.secondary} onClick={onContact}>Contact landlord</button>
            </div>
            <button type="button" className={styles.viewing} onClick={onScheduleViewing}>Request a viewing</button>
          </>
        )}
      </div>
    </section>
  );
}

export default ListingPriceCard;
