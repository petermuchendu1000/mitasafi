/**
 * Schedule Job Form (Client Component)
 *
 * Provider selects a date, start time, and optional end time to
 * schedule a confirmed booking. Calls `scheduleJob()` server action.
 */

"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui";
import { scheduleJob } from "@/lib/services/booking-lifecycle";

// =============================================================================
// TYPES
// =============================================================================

interface ScheduleJobFormProps {
  bookingId: string;
  existingStart?: string | null;
  existingEnd?: string | null;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Generate 30-minute time slots from 06:00 to 22:00 */
function generateTimeSlots(): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      if (h === 22 && m === 30) continue; // stop at 22:00
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      const value = `${hh}:${mm}`;
      const period = h >= 12 ? "PM" : "AM";
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const label = `${displayHour}:${mm} ${period}`;
      slots.push({ value, label });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

/** Parse an ISO date string into { date, time } strings for form inputs */
function parseDateTime(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  try {
    const d = new Date(iso);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
  } catch {
    return { date: "", time: "" };
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ScheduleJobForm({ bookingId, existingStart, existingEnd }: ScheduleJobFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { success: showSuccess, error: showError } = useToast();

  // Parse existing values for pre-fill
  const parsedStart = useMemo(() => parseDateTime(existingStart), [existingStart]);
  const parsedEnd = useMemo(() => parseDateTime(existingEnd), [existingEnd]);

  const [date, setDate] = useState(parsedStart.date);
  const [startTime, setStartTime] = useState(parsedStart.time);
  const [endTime, setEndTime] = useState(parsedEnd.time);
  const [error, setError] = useState<string | null>(null);

  // Minimum date: today
  const minDate = new Date().toISOString().split("T")[0];

  // Validation
  const isValid = date && startTime;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date || !startTime) {
      setError("Please select a date and start time.");
      return;
    }

    // Build ISO timestamps
    const scheduledStart = `${date}T${startTime}:00`;
    const scheduledEnd = endTime ? `${date}T${endTime}:00` : undefined;

    // Validate end > start if both provided
    if (scheduledEnd && scheduledEnd <= scheduledStart) {
      setError("End time must be after start time.");
      return;
    }

    // Validate not in the past
    if (new Date(scheduledStart) < new Date()) {
      setError("Cannot schedule in the past. Please select a future date and time.");
      return;
    }

    startTransition(async () => {
      const result = await scheduleJob(bookingId, scheduledStart, scheduledEnd);
      if (result.success) {
        showSuccess("Job Scheduled", "The customer will be notified of the schedule.");
        router.push(`/dashboard/provider/jobs/${bookingId}`);
        router.refresh();
      } else {
        showError("Scheduling Failed", result.error || "Something went wrong.");
        setError(result.error || "Something went wrong.");
      }
    });
  };

  // Input styling
  const inputClass =
    "w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:bg-gray-50";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Date */}
      <div>
        <label htmlFor="schedule-date" className={labelClass}>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gray-400" />
            Date <span className="text-red-500">*</span>
          </span>
        </label>
        <input
          id="schedule-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={minDate}
          disabled={isPending}
          className={inputClass}
          required
        />
      </div>

      {/* Start Time */}
      <div>
        <label htmlFor="schedule-start-time" className={labelClass}>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-400" />
            Start Time <span className="text-red-500">*</span>
          </span>
        </label>
        <select
          id="schedule-start-time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          disabled={isPending}
          className={inputClass}
          required
        >
          <option value="">Select a time</option>
          {TIME_SLOTS.map((slot) => (
            <option key={slot.value} value={slot.value}>
              {slot.label}
            </option>
          ))}
        </select>
      </div>

      {/* End Time (optional) */}
      <div>
        <label htmlFor="schedule-end-time" className={labelClass}>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-400" />
            End Time <span className="text-gray-400 font-normal">(optional)</span>
          </span>
        </label>
        <select
          id="schedule-end-time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          disabled={isPending}
          className={inputClass}
        >
          <option value="">No end time</option>
          {TIME_SLOTS.filter((slot) => !startTime || slot.value > startTime).map((slot) => (
            <option key={slot.value} value={slot.value}>
              {slot.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Estimated duration. Leave blank if uncertain.
        </p>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isPending}
          disabled={!isValid || isPending}
        >
          {existingStart ? "Reschedule Job" : "Schedule Job"}
        </Button>
      </div>
    </form>
  );
}
