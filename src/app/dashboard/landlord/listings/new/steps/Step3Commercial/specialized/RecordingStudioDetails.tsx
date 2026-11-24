/**
 * Recording Studio Details
 *
 * Specialized form for audio recording studios.
 * Captures acoustic and technical specifications.
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
  TextInput,
  CheckboxInput,
} from "./field-configs";
import {
  isFieldRequired,
  validateRequiredFields,
} from "../../../required-fields-config";

export function RecordingStudioDetails() {
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
        title="Recording Studio Specifications"
        description="Audio production facility details and acoustic features"
      />

      <div className="space-y-6">
        {/* Space Layout */}
        <FormSection title="Space Layout">
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
                htmlFor="ceilingHeightStudios"
                label="Ceiling Height"
                description="Important for acoustics"
              />
              <NumberInput
                id="ceilingHeightStudios"
                {...fieldErrorProps(
                  "ceilingHeightStudios",
                  stepErrors.ceilingHeightStudios,
                )}
                value={commercial.ceilingHeightStudios}
                onChange={(v) => update({ ceilingHeightStudios: v })}
                placeholder="e.g., 3.5"
                unit="m"
              />
              <FieldError
                field="ceilingHeightStudios"
                error={stepErrors.ceilingHeightStudios}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <FieldLabel
                id="studioRoomCount-label"
                label="Studio Rooms"
                required
                description="Main recording spaces"
              />
              <CounterInput
                labelledBy="studioRoomCount-label"
                describedBy={
                  stepErrors.studioRoomCount
                    ? fieldErrorId("studioRoomCount")
                    : undefined
                }
                value={commercial.studioRoomCount || 0}
                onChange={(v) => update({ studioRoomCount: v })}
                min={0}
                max={10}
              />
              <FieldError
                field="studioRoomCount"
                error={stepErrors.studioRoomCount}
              />
            </div>
            <div>
              <FieldLabel
                id="isoBoothCount-label"
                label="Isolation Booths"
                description="Vocal/instrument booths"
              />
              <CounterInput
                labelledBy="isoBoothCount-label"
                describedBy={
                  stepErrors.isoBoothCount
                    ? fieldErrorId("isoBoothCount")
                    : undefined
                }
                value={commercial.isoBoothCount || 0}
                onChange={(v) => update({ isoBoothCount: v })}
                min={0}
                max={10}
              />
              <FieldError
                field="isoBoothCount"
                error={stepErrors.isoBoothCount}
              />
            </div>
          </div>
        </FormSection>

        {/* Acoustic Treatment */}
        <FormSection title="Acoustic Treatment">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxInput
              checked={commercial.soundproofing || false}
              onChange={(v) => update({ soundproofing: v })}
              label="Soundproofing *"
              description="Isolated from external noise"
            />
            <CheckboxInput
              checked={commercial.acousticTreatment || false}
              onChange={(v) => update({ acousticTreatment: v })}
              label="Acoustic Treatment"
              description="Sound absorption panels"
            />
            <CheckboxInput
              checked={commercial.controlRoom || false}
              onChange={(v) => update({ controlRoom: v })}
              label="Control Room"
              description="Separate mixing room"
            />
          </div>
        </FormSection>

        {/* Flooring */}
        <FormSection title="Flooring & Infrastructure">
          <div>
            <FieldLabel
              htmlFor="flooringType"
              label="Flooring Type"
              description="Floating floor, concrete, wood, etc."
            />
            <TextInput
              id="flooringType"
              {...fieldErrorProps("flooringType", stepErrors.flooringType)}
              value={commercial.flooringType || ""}
              onChange={(v) => update({ flooringType: v })}
              placeholder="e.g., Floating hardwood floor"
            />
            <FieldError field="flooringType" error={stepErrors.flooringType} />
          </div>
        </FormSection>

        {/* Parking */}
        <FormSection title="Access & Parking">
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
