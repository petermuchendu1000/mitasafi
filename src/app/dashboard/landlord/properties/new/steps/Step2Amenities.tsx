/**
 * Step 2: Building Amenities
 * 
 * Collects building-wide amenities:
 * - Security features
 * - Water & power infrastructure
 * - Parking configuration
 * - Common facilities
 * - Services (garbage, internet, gas)
 */

"use client";

import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { 
  Shield,
  Droplets,
  Zap,
  Car,
  Dumbbell,
  Wifi,
  Check,
} from "lucide-react";
import { useWizard } from "../context";
import { 
  type StepValidation,
  SECURITY_GUARD_OPTIONS,
  CCTV_OPTIONS,
  ACCESS_CONTROL_OPTIONS,
  WATER_SOURCE_OPTIONS,
  WATER_STORAGE_OPTIONS,
  WATER_RELIABILITY_OPTIONS,
  GENERATOR_OPTIONS,
  GENERATOR_FUEL_OPTIONS,
  SOLAR_OPTIONS,
  PARKING_TYPE_OPTIONS,
  PARKING_ALLOCATION_OPTIONS,
  GARBAGE_OPTIONS,
  GAS_OPTIONS,
  ISP_OPTIONS,
} from "../types";

export function Step2Amenities() {
  const { state, updateFormData, dispatch } = useWizard();
  const { formData, validation } = state;

  // Validation - Step 2 is always valid (all fields optional or have defaults)
  const validate = useCallback((): StepValidation => {
    return {
      isValid: true,
      errors: {},
      touched: validation[2]?.touched || {},
    };
  }, [validation]);

  useEffect(() => {
    const stepValidation = validate();
    dispatch({ 
      type: "SET_VALIDATION", 
      payload: { step: 2, validation: stepValidation } 
    });
  }, [formData, validate, dispatch]);

  // Helper to update nested objects
  const updateSecurityFeatures = (key: string, value: unknown) => {
    updateFormData({
      security_features: { ...formData.security_features, [key]: value }
    });
  };

  const updateWaterPower = (key: string, value: unknown) => {
    updateFormData({
      water_power: { ...formData.water_power, [key]: value }
    });
  };

  const updateParking = (key: string, value: unknown) => {
    updateFormData({
      parking: { ...formData.parking, [key]: value }
    });
  };

  const updateCommonFacilities = (key: string, value: boolean) => {
    updateFormData({
      common_facilities: { ...formData.common_facilities, [key]: value }
    });
  };

  const updateServices = (key: string, value: unknown) => {
    updateFormData({
      services: { ...formData.services, [key]: value }
    });
  };

  const toggleISP = (isp: string) => {
    const current = formData.services.available_isps || [];
    const updated = current.includes(isp)
      ? current.filter(i => i !== isp)
      : [...current, isp];
    updateServices("available_isps", updated);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Building Amenities</h2>
        <p className="mt-1 text-gray-500">
          What amenities and facilities does your building offer?
        </p>
      </div>

      {/* ============== SECURITY SECTION ============== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-900">Security Features</h3>
        </div>

        {/* Toggle Features */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: "perimeter_wall", label: "Perimeter Wall" },
            { key: "electric_fence", label: "Electric Fence" },
            { key: "intercom", label: "Intercom System" },
            { key: "boom_barrier", label: "Boom Barrier" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => updateSecurityFeatures(item.key, !formData.security_features[item.key as keyof typeof formData.security_features])}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2",
                "transition-all text-sm font-medium",
                formData.security_features[item.key as keyof typeof formData.security_features]
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              {formData.security_features[item.key as keyof typeof formData.security_features] && (
                <Check className="w-4 h-4" />
              )}
              {item.label}
            </button>
          ))}
        </div>

        {/* Dropdown Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Security Guards
            </label>
            <select
              value={formData.security_features.security_guards}
              onChange={(e) => updateSecurityFeatures("security_guards", e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {SECURITY_GUARD_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CCTV Coverage
            </label>
            <select
              value={formData.security_features.cctv}
              onChange={(e) => updateSecurityFeatures("cctv", e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {CCTV_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Control
            </label>
            <select
              value={formData.security_features.access_control}
              onChange={(e) => updateSecurityFeatures("access_control", e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {ACCESS_CONTROL_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ============== WATER & POWER SECTION ============== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Water & Power</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Water Source
            </label>
            <select
              value={formData.water_power.water_source}
              onChange={(e) => updateWaterPower("water_source", e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {WATER_SOURCE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Water Storage
            </label>
            <select
              value={formData.water_power.water_storage}
              onChange={(e) => updateWaterPower("water_storage", e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {WATER_STORAGE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Water Reliability
            </label>
            <select
              value={formData.water_power.water_reliability}
              onChange={(e) => updateWaterPower("water_reliability", e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {WATER_RELIABILITY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup Generator
            </label>
            <select
              value={formData.water_power.backup_generator}
              onChange={(e) => updateWaterPower("backup_generator", e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {GENERATOR_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {formData.water_power.backup_generator !== "none" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generator Fuel Cost
              </label>
              <select
                value={formData.water_power.generator_fuel || "shared"}
                onChange={(e) => updateWaterPower("generator_fuel", e.target.value)}
                className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {GENERATOR_FUEL_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Solar Power
            </label>
            <select
              value={formData.water_power.solar}
              onChange={(e) => updateWaterPower("solar", e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {SOLAR_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ============== PARKING SECTION ============== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Parking</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parking Type
            </label>
            <select
              value={formData.parking.type}
              onChange={(e) => updateParking("type", e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {PARKING_TYPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {formData.parking.type !== "none" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parking Allocation
                </label>
                <select
                  value={formData.parking.allocation}
                  onChange={(e) => updateParking("allocation", e.target.value)}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {PARKING_ALLOCATION_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Parking Spaces
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.parking.total_spaces || ""}
                  onChange={(e) => updateParking("total_spaces", e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 30"
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visitor Spaces
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.parking.visitor_spaces || ""}
                  onChange={(e) => updateParking("visitor_spaces", e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 5"
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </>
          )}
        </div>

        {formData.parking.type !== "none" && (
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => updateParking("motorcycle", !formData.parking.motorcycle)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm",
                formData.parking.motorcycle
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              {formData.parking.motorcycle && <Check className="w-4 h-4" />}
              Motorcycle Parking
            </button>

            <button
              type="button"
              onClick={() => updateParking("ev_charging", !formData.parking.ev_charging)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm",
                formData.parking.ev_charging
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              {formData.parking.ev_charging && <Check className="w-4 h-4" />}
              EV Charging
            </button>
          </div>
        )}
      </section>

      {/* ============== COMMON FACILITIES SECTION ============== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Common Facilities</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { key: "lift", label: "Lift/Elevator", emoji: "🛗" },
            { key: "swimming_pool", label: "Swimming Pool", emoji: "🏊" },
            { key: "gym", label: "Gym", emoji: "💪" },
            { key: "playground", label: "Playground", emoji: "🎢" },
            { key: "garden", label: "Garden", emoji: "🌳" },
            { key: "rooftop", label: "Rooftop Terrace", emoji: "🌆" },
            { key: "bbq", label: "BBQ Area", emoji: "🍖" },
            { key: "laundry", label: "Laundry Room", emoji: "🧺" },
            { key: "clubhouse", label: "Clubhouse", emoji: "🏠" },
            { key: "staff_quarters", label: "Staff Quarters", emoji: "🛏️" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => updateCommonFacilities(item.key, !formData.common_facilities[item.key as keyof typeof formData.common_facilities])}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2",
                "transition-all text-sm",
                formData.common_facilities[item.key as keyof typeof formData.common_facilities]
                  ? "border-teal-600 bg-teal-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className={cn(
                "text-xs font-medium text-center",
                formData.common_facilities[item.key as keyof typeof formData.common_facilities]
                  ? "text-teal-700"
                  : "text-gray-600"
              )}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ============== SERVICES SECTION ============== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Wifi className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Services & Connectivity</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Garbage Collection
            </label>
            <select
              value={formData.services.garbage}
              onChange={(e) => updateServices("garbage", e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {GARBAGE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gas Infrastructure
            </label>
            <select
              value={formData.services.gas}
              onChange={(e) => updateServices("gas", e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {GAS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle Options */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => updateServices("internet_ready", !formData.services.internet_ready)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm",
              formData.services.internet_ready
                ? "border-teal-600 bg-teal-50 text-teal-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            )}
          >
            {formData.services.internet_ready && <Check className="w-4 h-4" />}
            Fiber Internet Ready
          </button>

          <button
            type="button"
            onClick={() => updateServices("caretaker_onsite", !formData.services.caretaker_onsite)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm",
              formData.services.caretaker_onsite
                ? "border-teal-600 bg-teal-50 text-teal-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            )}
          >
            {formData.services.caretaker_onsite && <Check className="w-4 h-4" />}
            Caretaker On-site
          </button>
        </div>

        {/* ISP Selection */}
        {formData.services.internet_ready && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Internet Providers
            </label>
            <div className="flex flex-wrap gap-2">
              {ISP_OPTIONS.map((isp) => (
                <button
                  key={isp.id}
                  type="button"
                  onClick={() => toggleISP(isp.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border-2 transition-all",
                    formData.services.available_isps.includes(isp.id)
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  {isp.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
