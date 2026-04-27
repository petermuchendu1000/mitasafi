/**
 * Provider Availability Page
 *
 * Dedicated page for managing weekly working hours.
 * Re-uses WorkingHoursForm from the profile wizard.
 */

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getProviderWorkingHours } from "../profile/actions";
import { AvailabilityClient } from "./AvailabilityClient";

export const metadata: Metadata = {
  title: "Availability | MitaSafi Provider",
};

export default async function AvailabilityPage() {
  const {
    hours,
    emergencyAvailable,
    emergencySurchargeType,
    emergencySurchargeAmount,
    responseTime,
    error,
  } = await getProviderWorkingHours();

  if (error === "Not authenticated") {
    redirect("/auth/signin");
  }

  return (
    <AvailabilityClient
      initialHours={hours}
      initialEmergency={{
        available: emergencyAvailable,
        surchargeType: emergencySurchargeType,
        surchargeAmount: emergencySurchargeAmount,
      }}
      initialResponseTime={responseTime}
    />
  );
}
