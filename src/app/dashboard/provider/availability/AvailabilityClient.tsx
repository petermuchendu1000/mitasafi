/**
 * Availability Client Component
 *
 * Standalone availability editor for the dedicated /availability page.
 * Re-uses logic from WorkingHoursForm but with page-appropriate UI.
 */

"use client";

import { useState, useTransition } from "react";
import { Clock, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateWorkingHours } from "../profile/actions";
import { useToast } from "@/components/ui";
import {
  DAY_NAMES,
  RESPONSE_TIME_OPTIONS,
  type DayOfWeek,
  type ProviderWorkingHours,
} from "@/types/provider-profile";

interface AvailabilityClientProps {
  initialHours: ProviderWorkingHours[];
  initialEmergency: {
    available: boolean;
    surchargeType: string | null;
    surchargeAmount: number | null;
  };
  initialResponseTime: string | null;
}

interface DaySchedule {
  day_of_week: DayOfWeek;
  is_available: boolean;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
}

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"
];

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day_of_week: 0, is_available: false, start_time: "08:00", end_time: "18:00", break_start: "", break_end: "" },
  { day_of_week: 1, is_available: true, start_time: "08:00", end_time: "18:00", break_start: "", break_end: "" },
  { day_of_week: 2, is_available: true, start_time: "08:00", end_time: "18:00", break_start: "", break_end: "" },
  { day_of_week: 3, is_available: true, start_time: "08:00", end_time: "18:00", break_start: "", break_end: "" },
  { day_of_week: 4, is_available: true, start_time: "08:00", end_time: "18:00", break_start: "", break_end: "" },
  { day_of_week: 5, is_available: true, start_time: "08:00", end_time: "18:00", break_start: "", break_end: "" },
  { day_of_week: 6, is_available: true, start_time: "09:00", end_time: "14:00", break_start: "", break_end: "" },
];

export function AvailabilityClient({
  initialHours,
  initialEmergency,
  initialResponseTime,
}: AvailabilityClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { success: showSuccess, error: showError } = useToast();

  // Initialize schedule from initial hours or defaults
  const getInitialSchedule = (): DaySchedule[] => {
    if (initialHours.length === 0) return DEFAULT_SCHEDULE;

    return DEFAULT_SCHEDULE.map((defaultDay) => {
      const existing = initialHours.find(
        (h) => h.day_of_week === defaultDay.day_of_week
      );
      if (existing) {
        return {
          day_of_week: existing.day_of_week as DayOfWeek,
          is_available: existing.is_available,
          start_time: existing.start_time || "08:00",
          end_time: existing.end_time || "18:00",
          break_start: existing.break_start || "",
          break_end: existing.break_end || "",
        };
      }
      return defaultDay;
    });
  };

  const [schedule, setSchedule] = useState<DaySchedule[]>(getInitialSchedule());
  const [emergencyAvailable, setEmergencyAvailable] = useState(
    initialEmergency.available
  );
  const [surchargeType, setSurchargeType] = useState<"fixed" | "percent">(
    (initialEmergency.surchargeType as "fixed" | "percent") || "percent"
  );
  const [surchargeAmount, setSurchargeAmount] = useState<number>(
    initialEmergency.surchargeAmount || 50
  );
  const [responseTime, setResponseTime] = useState(
    initialResponseTime || "within_few_hours"
  );

  const handleDayToggle = (dayIndex: number) => {
    setSchedule((prev) =>
      prev.map((day, i) =>
        i === dayIndex ? { ...day, is_available: !day.is_available } : day
      )
    );
  };

  const handleTimeChange = (
    dayIndex: number,
    field: "start_time" | "end_time",
    value: string
  ) => {
    setSchedule((prev) =>
      prev.map((day, i) =>
        i === dayIndex ? { ...day, [field]: value } : day
      )
    );
  };

  const applyTemplate = (template: "standard" | "extended" | "weekends") => {
    switch (template) {
      case "standard":
        setSchedule(
          DEFAULT_SCHEDULE.map((day) => ({
            ...day,
            is_available: day.day_of_week >= 1 && day.day_of_week <= 5,
            start_time: "08:00",
            end_time: "18:00",
          }))
        );
        break;
      case "extended":
        setSchedule(
          DEFAULT_SCHEDULE.map((day) => ({
            ...day,
            is_available: day.day_of_week >= 1 && day.day_of_week <= 6,
            start_time: "07:00",
            end_time: "19:00",
          }))
        );
        break;
      case "weekends":
        setSchedule(
          DEFAULT_SCHEDULE.map((day) => ({
            ...day,
            is_available: true,
            start_time: day.day_of_week === 0 || day.day_of_week === 6 ? "09:00" : "08:00",
            end_time: day.day_of_week === 0 || day.day_of_week === 6 ? "15:00" : "18:00",
          }))
        );
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate at least one available day
    const hasAvailableDay = schedule.some((s) => s.is_available);
    if (!hasAvailableDay) {
      setError("Please set at least one available day");
      return;
    }

    // Validate times
    for (const day of schedule) {
      if (day.is_available && day.start_time >= day.end_time) {
        setError(`End time must be after start time for ${DAY_NAMES[day.day_of_week]}`);
        return;
      }
    }

    startTransition(async () => {
      const result = await updateWorkingHours({
        schedule: schedule.map((s) => ({
          ...s,
          break_start: s.break_start || undefined,
          break_end: s.break_end || undefined,
        })),
        emergency_available: emergencyAvailable,
        emergency_surcharge_type: emergencyAvailable ? surchargeType : undefined,
        emergency_surcharge_amount: emergencyAvailable ? surchargeAmount : undefined,
        response_time: responseTime,
      });

      if (result.success) {
        showSuccess("Availability saved successfully");
      } else {
        showError(result.error || "Failed to save");
      }
    });
  };

  const availableDays = schedule.filter((d) => d.is_available).length;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Availability</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set your weekly working hours so clients know when to reach you
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Quick Templates */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-teal-600" />
            <h2 className="text-sm font-semibold text-gray-900">Quick Templates</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyTemplate("standard")}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Mon-Fri (8am-6pm)
            </button>
            <button
              type="button"
              onClick={() => applyTemplate("extended")}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Mon-Sat (7am-7pm)
            </button>
            <button
              type="button"
              onClick={() => applyTemplate("weekends")}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              All Week
            </button>
          </div>
        </section>

        {/* Weekly Schedule */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-700">
              Weekly Schedule
              <span className="ml-2 text-xs text-gray-400">
                {availableDays} day{availableDays !== 1 ? "s" : ""} available
              </span>
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {schedule.map((day, index) => (
              <div
                key={day.day_of_week}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 transition-colors",
                  !day.is_available && "bg-gray-50/50"
                )}
              >
                {/* Toggle */}
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={day.is_available}
                    onChange={() => handleDayToggle(index)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600" />
                </label>

                {/* Day Name */}
                <span
                  className={cn(
                    "w-12 text-sm font-medium",
                    day.is_available ? "text-gray-900" : "text-gray-400"
                  )}
                >
                  {DAY_NAMES[day.day_of_week].slice(0, 3)}
                </span>

                {/* Time Selectors */}
                {day.is_available ? (
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={day.start_time}
                      onChange={(e) => handleTimeChange(index, "start_time", e.target.value)}
                      className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-400"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <span className="text-gray-400 text-sm">to</span>
                    <select
                      value={day.end_time}
                      onChange={(e) => handleTimeChange(index, "end_time", e.target.value)}
                      className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-400"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400 italic">Not available</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Response Time */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-semibold text-gray-900">Response Time</h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            How quickly do you typically respond to new inquiries?
          </p>
          <select
            value={responseTime}
            onChange={(e) => setResponseTime(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-400"
          >
            {RESPONSE_TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </section>

        {/* Emergency Availability */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">Emergency Availability</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emergencyAvailable}
                onChange={(e) => setEmergencyAvailable(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
            </label>
          </div>
          <p className="text-sm text-gray-500">
            Accept jobs outside normal hours for urgent situations
          </p>

          {emergencyAvailable && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surcharge Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSurchargeType("percent")}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                      surchargeType === "percent"
                        ? "bg-amber-50 border-amber-300 text-amber-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setSurchargeType("fixed")}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                      surchargeType === "fixed"
                        ? "bg-amber-50 border-amber-300 text-amber-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    Fixed Amount
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {surchargeType === "percent" ? "Surcharge %" : "Surcharge Amount (KES)"}
                </label>
                <input
                  type="number"
                  value={surchargeAmount}
                  onChange={(e) => setSurchargeAmount(Number(e.target.value))}
                  min={0}
                  max={surchargeType === "percent" ? 100 : 50000}
                  className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-teal-400"
                />
              </div>
            </div>
          )}
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Saving..." : "Save Availability"}
          </button>
        </div>
      </form>
    </div>
  );
}
