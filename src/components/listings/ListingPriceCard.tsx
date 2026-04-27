/**
 * Listing Price Card Component
 * 
 * Sticky sidebar with:
 * - Price breakdown (rent, service charge, total)
 * - Move-in cost calculation
 * - Included amenities
 * - CTA buttons (Contact, Schedule)
 * 
 * Theme: 70% Teal, 30% Orange (CTA buttons in orange)
 */

"use client";

import { useState } from "react";
import { 
  MessageCircle, 
  Calendar, 
  Phone,
  CheckCircle,
  Info,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriceBreakdown } from "@/lib/listings/types";

interface ListingPriceCardProps {
  price: PriceBreakdown;
  availableNow: boolean;
  availableFrom: string | null;
  onContact: () => void;
  onScheduleViewing: () => void;
  isAuthenticated: boolean;
  isUnavailable?: boolean;
  className?: string;
}

// Format currency (KES)
function formatPrice(amount: number, currency: string = "KES"): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format included items nicely
const RENT_INCLUDES_LABELS: Record<string, string> = {
  water: "Water",
  garbage: "Garbage Collection",
  security: "Security",
  wifi: "WiFi",
  parking: "Parking",
  electricity: "Electricity",
  gas: "Gas",
};

export function ListingPriceCard({
  price,
  availableNow,
  availableFrom,
  onContact,
  onScheduleViewing,
  isAuthenticated,
  isUnavailable = false,
  className,
}: ListingPriceCardProps) {
  const [showMoveInDetails, setShowMoveInDetails] = useState(false);

  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200 overflow-hidden",
      className
    )}>
      {/* Price Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">
            {formatPrice(price.rent, price.currency)}
          </span>
          <span className="text-gray-500 text-lg">/month</span>
        </div>

        {/* Monthly breakdown */}
        {price.serviceCharge && price.serviceCharge > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Rent</span>
              <span className="text-gray-700">{formatPrice(price.rent, price.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Service charge</span>
              <span className="text-gray-700">{formatPrice(price.serviceCharge, price.currency)}</span>
            </div>
            <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between font-medium">
              <span className="text-gray-700">Total monthly</span>
              <span className="text-brand-600">{formatPrice(price.totalMonthly, price.currency)}</span>
            </div>
          </div>
        )}

        {/* Rent includes */}
        {price.rentIncludes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {price.rentIncludes.map(item => (
              <span 
                key={item}
                className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded"
              >
                <CheckCircle className="w-3 h-3 text-gray-400" />
                {RENT_INCLUDES_LABELS[item] || item}
              </span>
            ))}
          </div>
        )}

        {/* Negotiable badge */}
        {price.isNegotiable && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-cta-600">
            <Info className="w-4 h-4" />
            <span>Price is negotiable</span>
          </div>
        )}
      </div>

      {/* Move-in Cost */}
      <div className="p-5 bg-gray-50 border-b border-gray-100">
        <button
          onClick={() => setShowMoveInDetails(!showMoveInDetails)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Move-in cost</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(price.moveInCost, price.currency)}
            </span>
            <ArrowRight className={cn(
              "w-4 h-4 text-gray-400 transition-transform",
              showMoveInDetails && "rotate-90"
            )} />
          </div>
        </button>

        {/* Expanded details */}
        {showMoveInDetails && (
          <div className="mt-3 space-y-2 pt-3 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">First month</span>
              <span className="text-gray-700">{formatPrice(price.totalMonthly, price.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Deposit ({price.depositMonths} {price.depositMonths === 1 ? "month" : "months"})
              </span>
              <span className="text-gray-700">{formatPrice(price.depositAmount, price.currency)}</span>
            </div>
            <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between font-medium">
              <span className="text-gray-700">Total</span>
              <span className="text-gray-900">{formatPrice(price.moveInCost, price.currency)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Availability */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          {availableNow ? (
            <span className="text-green-600 font-medium">Available now</span>
          ) : availableFrom ? (
            <span className="text-gray-600">
              Available from{" "}
              <span className="font-medium text-gray-900">
                {new Date(availableFrom).toLocaleDateString("en-KE", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </span>
            </span>
          ) : (
            <span className="text-sm text-gray-500">Check availability</span>
          )}
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="p-5 space-y-2">
        {isUnavailable ? (
          /* Unavailable - Notify Me CTA */
          <>
            <button
              onClick={onContact}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Get Notified
            </button>
            <p className="text-xs text-center text-gray-500 mt-1">
              We&apos;ll notify you when similar properties become available
            </p>
          </>
        ) : (
          /* Available - Contact CTAs */
          <>
            {/* Primary CTA - Orange */}
            <button
              onClick={onContact}
              className="w-full bg-cta-500 hover:bg-cta-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Contact Landlord
            </button>

            {/* Secondary CTA - subtle */}
            <button
              onClick={onScheduleViewing}
              className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Phone className="w-5 h-5" />
              Schedule Viewing
            </button>

            {/* Auth hint */}
            {!isAuthenticated && (
              <p className="text-xs text-center text-gray-400 mt-1">
                Sign in to contact the landlord
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ListingPriceCard;
