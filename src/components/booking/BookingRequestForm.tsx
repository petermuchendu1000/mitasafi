"use client";

// =============================================================================
// MITASAFI: BOOKING REQUEST FORM
// =============================================================================
// Multi-step client component for creating a booking request.
//
// Steps:
// 1. Confirm service & provider
// 2. Location (saved or new)
// 3. Date & time preference
// 4. Description & notes
// 5. Review & submit
//
// Uses simple useState for form state (no heavy wizard infrastructure
// needed for a 5-step linear flow).
// =============================================================================

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  Star,
  AlertTriangle,
} from "lucide-react";
import { createBookingRequest } from "@/app/services/provider/[id]/request/actions";
import {
  LocationPicker,
  type LocationData,
  type SavedLocation,
} from "@/components/booking/LocationPicker";
import { formatServicePrice } from "@/lib/constants";
import type { BookingFlowType, LocationType } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

export interface ServiceInfo {
  providerServiceId: string;
  serviceId: string;
  serviceTypeId: string;
  defaultBookingFlow: BookingFlowType;
  name: string;
  category: string;
  subcategory: string;
  priceType: string;
  price: number | null;
}

export interface ProviderInfo {
  id: string;
  businessName: string;
  profilePhotoUrl: string | null;
  ratingAverage: number | null;
  ratingCount: number | null;
  isEmergencyAvailable: boolean;
}

interface BookingRequestFormProps {
  service: ServiceInfo;
  provider: ProviderInfo;
  savedLocations: SavedLocation[];
}

// =============================================================================
// STEPS
// =============================================================================

const STEPS = [
  { id: 1, title: "Service", icon: CheckCircle },
  { id: 2, title: "Location", icon: MapPin },
  { id: 3, title: "Schedule", icon: CalendarDays },
  { id: 4, title: "Details", icon: Clock },
  { id: 5, title: "Review", icon: Star },
] as const;

const TOTAL_STEPS = STEPS.length;

// =============================================================================
// COMPONENT
// =============================================================================

export function BookingRequestForm({
  service,
  provider,
  savedLocations,
}: BookingRequestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const submittingRef = useRef(false);

  // Form state
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Step 2: Location
  const [location, setLocation] = useState<LocationData>({
    locationId: undefined,
    addressLine1: "",
    addressLine2: "",
    area: "",
    city: "Nairobi",
    accessNotes: "",
    locationType: "",
    saveLocation: false,
    locationLabel: "",
  });

  // Step 3: Scheduling
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isFlexible, setIsFlexible] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);

  // Step 4: Details
  const [customerNotes, setCustomerNotes] = useState("");

  // ── Navigation ──

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return true; // Service is pre-selected
      case 2:
        return !!(location.locationId || location.addressLine1.trim());
      case 3:
        return isFlexible || isEmergency || !!scheduledDate;
      case 4:
        return true; // Notes are optional
      case 5:
        return true;
      default:
        return false;
    }
  }

  function goNext() {
    if (step < TOTAL_STEPS && canProceed()) {
      setError(null);
      setStep(step + 1);
    }
  }

  function goBack() {
    if (step > 1) {
      setError(null);
      setStep(step - 1);
    }
  }

  // ── Submit ──

  function handleSubmit() {
    // Prevent duplicate submissions
    if (isPending || submittingRef.current) return;
    submittingRef.current = true;
    setError(null);

    // Build scheduled_start from date + time
    let scheduledStart: string | undefined;
    if (scheduledDate) {
      const dateStr = scheduledTime
        ? `${scheduledDate}T${scheduledTime}:00`
        : `${scheduledDate}T09:00:00`;
      scheduledStart = new Date(dateStr).toISOString();
    }

    startTransition(async () => {
      const result = await createBookingRequest({
        providerServiceId: service.providerServiceId,
        providerId: provider.id,
        // Location
        locationId: location.locationId,
        addressLine1: location.addressLine1 || undefined,
        addressLine2: location.addressLine2 || undefined,
        area: location.area || undefined,
        city: location.city || undefined,
        accessNotes: location.accessNotes || undefined,
        locationType: (location.locationType as LocationType) || undefined,
        saveLocation: location.saveLocation,
        locationLabel: location.locationLabel || undefined,
        // Scheduling
        scheduledStart,
        isFlexible,
        // Details
        customerNotes: customerNotes || undefined,
        isEmergency,
      });

      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        submittingRef.current = false;
        return;
      }

      // Redirect to confirmation
      router.push(`/bookings/${result.bookingId}/confirmation`);
    });
  }

  // ── Render helpers ──

  function renderStepIndicator() {
    return (
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, idx) => {
          const isActive = s.id === step;
          const isComplete = s.id < step;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isComplete
                      ? "bg-teal-600 text-white"
                      : isActive
                        ? "bg-teal-600 text-white"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    s.id
                  )}
                </div>
                <span
                  className={`text-xs mt-1 hidden sm:block ${
                    isActive ? "text-teal-700 font-medium" : "text-gray-400"
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded ${
                    isComplete ? "bg-teal-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Step 1: Confirm Service ───

  function renderStep1() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Confirm your service
          </h2>
          <p className="text-sm text-gray-500">
            You&apos;re requesting this service from {provider.businessName}.
          </p>
        </div>

        {/* Service card */}
        <div className="rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {service.name}
              </h3>
              {(service.category || service.subcategory) && (
                <p className="text-sm text-gray-400 mt-0.5">
                  {service.category}
                  {service.subcategory && ` · ${service.subcategory}`}
                </p>
              )}
            </div>
            <div className="text-right">
              {service.priceType === "quote" ? (
                <span className="text-sm text-gray-500">Quote on request</span>
              ) : (
                <div>
                  {service.priceType === "starting_from" && (
                    <span className="text-xs text-gray-400">From </span>
                  )}
                  <span className="text-base font-semibold text-gray-900">
                    {formatServicePrice(service.price)}
                  </span>
                  {service.priceType === "hourly" && (
                    <span className="text-xs text-gray-400">/hr</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Provider card */}
        <div className="rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {provider.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={provider.profilePhotoUrl}
                  alt={provider.businessName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-teal-700">
                  {provider.businessName.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {provider.businessName}
              </p>
              {provider.ratingAverage != null && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Star className="w-3.5 h-3.5 text-gray-900 fill-gray-900" />
                  <span className="font-medium text-gray-900">
                    {provider.ratingAverage.toFixed(1)}
                  </span>
                  {provider.ratingCount != null && (
                    <span>({provider.ratingCount})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 2: Location ───

  function renderStep2() {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Where do you need the service?
          </h2>
          <p className="text-sm text-gray-500">
            Choose a saved address or enter a new one.
          </p>
        </div>

        <LocationPicker
          savedLocations={savedLocations}
          value={location}
          onChange={setLocation}
        />
      </div>
    );
  }

  // ─── Step 3: Schedule ───

  function renderStep3() {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            When do you need this done?
          </h2>
          <p className="text-sm text-gray-500">
            Pick a preferred date and time, or mark as flexible.
          </p>
        </div>

        {/* Emergency toggle (only if category supports it) */}
        {provider.isEmergencyAvailable && (
          <button
            type="button"
            onClick={() => {
              setIsEmergency(!isEmergency);
              if (!isEmergency) setIsFlexible(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
              isEmergency
                ? "border-red-500 bg-red-50 text-red-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 ${isEmergency ? "text-red-500" : "text-gray-400"}`}
            />
            <div className="text-left">
              <p className="text-sm font-medium">
                {isEmergency ? "Emergency request" : "This is an emergency"}
              </p>
              <p className="text-xs text-gray-400">
                Provider will be notified for urgent response
              </p>
            </div>
          </button>
        )}

        {/* Date */}
        {!isEmergency && (
          <>
            <div>
              <label
                htmlFor="sched-date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Preferred date
              </label>
              <input
                id="sched-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                disabled={isFlexible}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:bg-gray-50"
              />
            </div>

            {/* Time */}
            <div>
              <label
                htmlFor="sched-time"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Preferred time (optional)
              </label>
              <input
                id="sched-time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                disabled={isFlexible}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:bg-gray-50"
              />
            </div>

            {/* Flexible toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isFlexible}
                onChange={(e) => {
                  setIsFlexible(e.target.checked);
                  if (e.target.checked) {
                    setScheduledDate("");
                    setScheduledTime("");
                  }
                }}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              I&apos;m flexible — the provider can suggest a time
            </label>
          </>
        )}
      </div>
    );
  }

  // ─── Step 4: Details ───

  function renderStep4() {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Any additional details?
          </h2>
          <p className="text-sm text-gray-500">
            Help the provider understand what you need. The more detail, the
            better the quote.
          </p>
        </div>

        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description of work needed
          </label>
          <textarea
            id="notes"
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value.slice(0, 500))}
            maxLength={500}
            placeholder="e.g. I have a leaking kitchen pipe under the sink. The leak started 2 days ago. Easy access to the area."
            rows={5}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            {customerNotes.length}/500 characters
          </p>
        </div>
      </div>
    );
  }

  // ─── Step 5: Review ───

  function renderStep5() {
    const locationDisplay =
      location.locationId
        ? savedLocations.find((l) => l.id === location.locationId)
            ?.address_line1 || "Saved location"
        : [location.addressLine1, location.area, location.city]
            .filter(Boolean)
            .join(", ");

    const scheduleDisplay = isEmergency
      ? "Emergency — ASAP"
      : isFlexible
        ? "Flexible — provider will suggest"
        : scheduledDate
          ? `${new Date(scheduledDate).toLocaleDateString("en-KE", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}${scheduledTime ? ` at ${scheduledTime}` : ""}`
          : "Not specified";

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Review your request
          </h2>
          <p className="text-sm text-gray-500">
            Confirm everything looks right before submitting.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
          {/* Service */}
          <div className="px-5 py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Service
            </p>
            <p className="text-sm font-medium text-gray-900">{service.name}</p>
            <p className="text-sm text-gray-500">by {provider.businessName}</p>
          </div>

          {/* Location */}
          <div className="px-5 py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Location
            </p>
            <p className="text-sm text-gray-900">{locationDisplay}</p>
            {location.accessNotes && (
              <p className="text-xs text-gray-400 mt-0.5">
                Access: {location.accessNotes}
              </p>
            )}
          </div>

          {/* Schedule */}
          <div className="px-5 py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Schedule
            </p>
            <p className="text-sm text-gray-900">{scheduleDisplay}</p>
          </div>

          {/* Notes */}
          {customerNotes && (
            <div className="px-5 py-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Notes
              </p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {customerNotes}
              </p>
            </div>
          )}

          {/* Price indication */}
          <div className="px-5 py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Estimated price
            </p>
            {service.priceType === "quote" ? (
              <p className="text-sm text-gray-900">
                Provider will send a quote
              </p>
            ) : (
              <p className="text-sm font-semibold text-gray-900">
                {service.priceType === "starting_from" && "From "}
                {formatServicePrice(service.price)}
                {service.priceType === "hourly" && "/hr"}
              </p>
            )}
          </div>
        </div>

        {isEmergency && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">
              This is an <strong>emergency request</strong>. The provider will
              be notified for an urgent response.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Main render ──

  return (
    <div>
      {renderStepIndicator()}

      {/* Error banner */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="min-h-[320px]">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
        {step > 1 ? (
          <button
            type="button"
            onClick={goBack}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        ) : (
          <div />
        )}

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed()}
            className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit request"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
