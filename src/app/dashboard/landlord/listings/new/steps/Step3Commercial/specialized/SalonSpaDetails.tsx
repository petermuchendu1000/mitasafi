/**
 * Salon & Spa Details
 *
 * Specialized form for beauty salons, spas, and wellness centers.
 * Captures treatment rooms, stations, and specialized equipment.
 */

"use client";

import { useEffect } from "react";
import { useWizard } from "../../../context";
import {
  FormSection,
  PageHeader,
  FieldLabel,
  NumberInput,
  CounterInput,
  CheckboxInput,
} from "./field-configs";
import {
  isFieldRequired,
  validateRequiredFields,
} from "../../../required-fields-config";

export function SalonSpaDetails() {
  const { state, updateFormData, setValidation } = useWizard();
  const { commercial, commercialType, commercialSubtype } = state.formData;

  // Helper to check if field is required
  const isRequired = (field: keyof typeof commercial) =>
    isFieldRequired(field, commercialType, commercialSubtype);

  useEffect(() => {
    const errors = validateRequiredFields(
      commercial,
      commercialType,
      commercialSubtype,
    );
    setValidation(3, {
      isValid: Object.keys(errors).length === 0,
      errors,
      touched: {},
    });
  }, [commercial, commercialType, commercialSubtype, setValidation]);

  const update = (data: Partial<typeof commercial>) => {
    updateFormData({ commercial: { ...commercial, ...data } });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Salon & Spa Specifications"
        description="Treatment rooms, styling stations, and facilities"
      />

      <div className="space-y-6">
        {/* Space Dimensions */}
        <FormSection title="Space Dimensions">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel
                htmlFor="salon-spa-total-area"
                label="Total Area"
                required
              />
              <NumberInput
                id="salon-spa-total-area"
                value={commercial.sizeSqm}
                onChange={(v) => update({ sizeSqm: v })}
                placeholder="e.g., 150"
                unit="sqm"
                min={20}
              />
            </div>
            <div>
              <FieldLabel
                htmlFor="salon-spa-waiting-area"
                label="Waiting Area"
              />
              <NumberInput
                id="salon-spa-waiting-area"
                value={commercial.waitingAreaCapacitySalon}
                onChange={(v) => update({ waitingAreaCapacitySalon: v })}
                placeholder="e.g., 8"
                unit="seats"
              />
            </div>
          </div>
        </FormSection>

        {/* Salon Stations */}
        <FormSection title="Salon Stations">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel
                id="salon-spa-styling-stations"
                label="Styling Stations"
                required
              />
              <CounterInput
                labelledBy="salon-spa-styling-stations"
                value={commercial.stylingStations || 0}
                onChange={(v) => update({ stylingStations: v })}
                min={0}
                max={30}
              />
            </div>
            <div>
              <FieldLabel
                id="salon-spa-wash-basins"
                label="Wash Basins"
                required
              />
              <CounterInput
                labelledBy="salon-spa-wash-basins"
                value={commercial.washBasins || 0}
                onChange={(v) => update({ washBasins: v })}
                min={0}
                max={15}
              />
            </div>
            <div>
              <FieldLabel
                id="salon-spa-mani-pedi-stations"
                label="Mani/Pedi Stations"
              />
              <CounterInput
                labelledBy="salon-spa-mani-pedi-stations"
                value={commercial.manicurePedicureStations || 0}
                onChange={(v) => update({ manicurePedicureStations: v })}
                min={0}
                max={20}
              />
            </div>
          </div>
        </FormSection>

        {/* Treatment Rooms */}
        <FormSection title="Treatment Rooms">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel
                id="salon-spa-treatment-rooms"
                label="Treatment Rooms"
              />
              <CounterInput
                labelledBy="salon-spa-treatment-rooms"
                value={commercial.treatmentRoomsSpa || 0}
                onChange={(v) => update({ treatmentRoomsSpa: v })}
                min={0}
                max={20}
              />
            </div>
            <div>
              <FieldLabel
                id="salon-spa-treatment-beds"
                label="Treatment Beds"
              />
              <CounterInput
                labelledBy="salon-spa-treatment-beds"
                value={commercial.treatmentBeds || 0}
                onChange={(v) => update({ treatmentBeds: v })}
                min={0}
                max={30}
              />
            </div>
          </div>
        </FormSection>

        {/* Ventilation & Infrastructure */}
        <FormSection title="Infrastructure">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxInput
              checked={commercial.ventilationForChemicals || false}
              onChange={(v) => update({ ventilationForChemicals: v })}
              label="Chemical Ventilation *"
              description="Proper extraction system"
            />
            <CheckboxInput
              checked={commercial.retailDisplayArea || false}
              onChange={(v) => update({ retailDisplayArea: v })}
              label="Retail Display Area"
              description="Product display space"
            />
          </div>
        </FormSection>

        {/* Wellness Amenities */}
        <FormSection title="Wellness Amenities">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxInput
              checked={commercial.saunaOrSteam || false}
              onChange={(v) => update({ saunaOrSteam: v })}
              label="Sauna / Steam Room"
              description="Heat facilities"
            />
            <CheckboxInput
              checked={commercial.swimmingPool || false}
              onChange={(v) => update({ swimmingPool: v })}
              label="Plunge Pool"
              description="Cold plunge or pool"
            />
          </div>
        </FormSection>

        {/* Parking */}
        <FormSection title="Parking">
          <div>
            <FieldLabel id="salon-spa-parking-spaces" label="Parking Spaces" />
            <CounterInput
              labelledBy="salon-spa-parking-spaces"
              value={commercial.parkingSpacesCount || 0}
              onChange={(v) => update({ parkingSpacesCount: v })}
              min={0}
              max={50}
            />
          </div>
        </FormSection>
      </div>
    </div>
  );
}
