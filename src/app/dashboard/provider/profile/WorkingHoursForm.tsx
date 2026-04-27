/**
 * Working Hours Form
 * 
 * Weekly schedule with time pickers and emergency availability.
 */

"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateWorkingHours } from "./actions";
import {
  DAY_NAMES,
  RESPONSE_TIME_OPTIONS,
  type DayOfWeek,
  type ProviderWorkingHours,
} from "@/types/provider-profile";

interface WorkingHoursFormProps {
  initialHours: ProviderWorkingHours[];
  initialEmergency: {
    available: boolean;
    surchargeType: string | null;
    surchargeAmount: number | null;
  };
  initialResponseTime: string | null;
  onComplete: () => void;
  onBack: () => void;
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

export function WorkingHoursForm({
  initialHours,
  initialEmergency,
  initialResponseTime,
  onComplete,
  onBack,
}: WorkingHoursFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        onComplete();
      } else {
        setError(result.error || "Failed to save");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Set Your Working Hours
        </h2>
        <p className="text-gray-500 text-sm">
          Let clients know when you&apos;re available for work.
        </p>
      </div>

      {/* Quick Templates */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Templates
        </label>
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
      </div>

      {/* Weekly Schedule */}
      <div className="space-y-3">
        {schedule.map((day, index) => (
          <div
            key={day.day_of_week}
            className={cn(
              "flex items-center gap-4 p-3 rounded-lg border transition-colors",
              day.is_available
                ? "bg-white border-gray-200"
                : "bg-gray-50 border-gray-100"
            )}
          >
            {/* Day Toggle */}
            <button
              type="button"
              onClick={() => handleDayToggle(index)}
              className={cn(
                "w-24 text-left font-medium text-sm",
                day.is_available ? "text-gray-900" : "text-gray-400"
              )}
            >
              {DAY_NAMES[day.day_of_week]}
            </button>

            {/* Availability Toggle */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={day.is_available}
                onChange={() => handleDayToggle(index)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
            </label>

            {/* Time Selectors */}
            {day.is_available ? (
              <div className="flex items-center gap-2 flex-1">
                <select
                  value={day.start_time}
                  onChange={(e) =>
                    handleTimeChange(index, "start_time", e.target.value)
                  }
                  className="px-2 py-1 border border-gray-200 rounded text-sm"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <span className="text-gray-400">to</span>
                <select
                  value={day.end_time}
                  onChange={(e) =>
                    handleTimeChange(index, "end_time", e.target.value)
                  }
                  className="px-2 py-1 border border-gray-200 rounded text-sm"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-sm text-gray-400 flex-1">Unavailable</span>
            )}
          </div>
        ))}
      </div>

      {/* Response Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Response Time Commitment
        </label>
        <select
          value={responseTime}
          onChange={(e) => setResponseTime(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          {RESPONSE_TIME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Emergency Availability */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={emergencyAvailable}
                onChange={(e) => setEmergencyAvailable(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="font-medium text-gray-900">
                Available for emergency/urgent calls
              </span>
            </label>
            <p className="text-sm text-gray-600 mt-1">
              Accept urgent jobs outside your regular hours
            </p>

            {emergencyAvailable && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-gray-700">Surcharge:</span>
                <select
                  value={surchargeType}
                  onChange={(e) =>
                    setSurchargeType(e.target.value as "fixed" | "percent")
                  }
                  className="px-2 py-1 border border-gray-200 rounded text-sm"
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
                <div className="flex items-center">
                  {surchargeType === "fixed" && (
                    <span className="text-sm text-gray-500 mr-1">KES</span>
                  )}
                  <input
                    type="number"
                    value={surchargeAmount}
                    onChange={(e) => setSurchargeAmount(Number(e.target.value))}
                    min={0}
                    className="w-20 px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                  {surchargeType === "percent" && (
                    <span className="text-sm text-gray-500 ml-1">%</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving..." : "Complete Setup"}
        </button>
      </div>
    </form>
  );
}
