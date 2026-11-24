/**
 * Salon & Spa Details
 *
 * Specialized form for beauty salons, spas, and wellness centers.
 * Captures treatment rooms, stations, and specialized equipment.
 */

"use client";

import { useEffect } from "react";
import { useWizard } from "../../../context";
import { FieldError, fieldErrorProps, fieldErrorId } from "../../../FieldError";
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
  const stepErrors = state.validation[3]?.errors ?? {};
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
              <FieldLabel htmlFor="sizeSqm" label="Total Area" required />
              <NumberInput
                id="sizeSqm"
                {...fieldErrorProps("sizeSqm", stepErrors.sizeSqm)}
                value={commercial.sizeSqm}
                onChange={(v) => update({ sizeSqm: v })}
                placeholder="e.g., 150"
                unit="sqm"
                min={20}
              />
              <FieldError field="sizeSqm" error={stepErrors.sizeSqm} />
            </div>
            <div>
              <FieldLabel
                htmlFor="waitingAreaCapacitySalon"
                label="Waiting Area"
              />
              <NumberInput
                id="waitingAreaCapacitySalon"
                {...fieldErrorProps(
                  "waitingAreaCapacitySalon",
                  stepErrors.waitingAreaCapacitySalon,
                )}
                value={commercial.waitingAreaCapacitySalon}
                onChange={(v) => update({ waitingAreaCapacitySalon: v })}
                placeholder="e.g., 8"
                unit="seats"
              />
              <FieldError
                field="waitingAreaCapacitySalon"
                error={stepErrors.waitingAreaCapacitySalon}
              />
            </div>
          </div>
        </FormSection>

        {/* Salon Stations */}
        <FormSection title="Salon Stations">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel
                id="stylingStations-label"
                label="Styling Stations"
                required
              />
              <CounterInput
                labelledBy="stylingStations-label"
                describedBy={
                  stepErrors.stylingStations
                    ? fieldErrorId("stylingStations")
                    : undefined
                }
                value={commercial.stylingStations || 0}
                onChange={(v) => update({ stylingStations: v })}
                min={0}
                max={30}
              />
              <FieldError
                field="stylingStations"
                error={stepErrors.stylingStations}
              />
            </div>
            <div>
              <FieldLabel id="washBasins-label" label="Wash Basins" required />
              <CounterInput
                labelledBy="washBasins-label"
                describedBy={
                  stepErrors.washBasins ? fieldErrorId("washBasins") : undefined
                }
                value={commercial.washBasins || 0}
                onChange={(v) => update({ washBasins: v })}
                min={0}
                max={15}
              />
              <FieldError field="washBasins" error={stepErrors.washBasins} />
            </div>
            <div>
              <FieldLabel
                id="manicurePedicureStations-label"
                label="Mani/Pedi Stations"
              />
              <CounterInput
                labelledBy="manicurePedicureStations-label"
                describedBy={
                  stepErrors.manicurePedicureStations
                    ? fieldErrorId("manicurePedicureStations")
                    : undefined
                }
                value={commercial.manicurePedicureStations || 0}
                onChange={(v) => update({ manicurePedicureStations: v })}
                min={0}
                max={20}
              />
              <FieldError
                field="manicurePedicureStations"
                error={stepErrors.manicurePedicureStations}
              />
            </div>
          </div>
        </FormSection>

        {/* Treatment Rooms */}
        <FormSection title="Treatment Rooms">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel
                id="treatmentRoomsSpa-label"
                label="Treatment Rooms"
              />
              <CounterInput
                labelledBy="treatmentRoomsSpa-label"
                describedBy={
                  stepErrors.treatmentRoomsSpa
                    ? fieldErrorId("treatmentRoomsSpa")
                    : undefined
                }
                value={commercial.treatmentRoomsSpa || 0}
                onChange={(v) => update({ treatmentRoomsSpa: v })}
                min={0}
                max={20}
              />
              <FieldError
                field="treatmentRoomsSpa"
                error={stepErrors.treatmentRoomsSpa}
              />
            </div>
            <div>
              <FieldLabel id="treatmentBeds-label" label="Treatment Beds" />
              <CounterInput
                labelledBy="treatmentBeds-label"
                describedBy={
                  stepErrors.treatmentBeds
                    ? fieldErrorId("treatmentBeds")
                    : undefined
                }
                value={commercial.treatmentBeds || 0}
                onChange={(v) => update({ treatmentBeds: v })}
                min={0}
                max={30}
              />
              <FieldError
                field="treatmentBeds"
                error={stepErrors.treatmentBeds}
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
            <FieldLabel id="parkingSpacesCount-label" label="Parking Spaces" />
            <CounterInput
              labelledBy="parkingSpacesCount-label"
              describedBy={
                stepErrors.parkingSpacesCount
                  ? fieldErrorId("parkingSpacesCount")
                  : undefined
              }
              value={commercial.parkingSpacesCount || 0}
              onChange={(v) => update({ parkingSpacesCount: v })}
              min={0}
              max={50}
            />
            <FieldError
              field="parkingSpacesCount"
              error={stepErrors.parkingSpacesCount}
            />
          </div>
        </FormSection>
      </div>
    </div>
  );
}
