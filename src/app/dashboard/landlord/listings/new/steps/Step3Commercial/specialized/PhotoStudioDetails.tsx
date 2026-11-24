/**
 * Photo Studio Details
 *
 * Specialized form for photography studios.
 * Captures lighting, backdrop, and facility features.
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

export function PhotoStudioDetails() {
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
        title="Photo Studio Specifications"
        description="Photography space features and facilities"
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
                placeholder="e.g., 200"
                unit="sqm"
                min={30}
              />
              <FieldError field="sizeSqm" error={stepErrors.sizeSqm} />
            </div>
            <div>
              <FieldLabel
                htmlFor="ceilingHeightStudios"
                label="Ceiling Height"
                required
                description="Higher is better for lighting"
              />
              <NumberInput
                id="ceilingHeightStudios"
                {...fieldErrorProps(
                  "ceilingHeightStudios",
                  stepErrors.ceilingHeightStudios,
                )}
                value={commercial.ceilingHeightStudios}
                onChange={(v) => update({ ceilingHeightStudios: v })}
                placeholder="e.g., 4.5"
                unit="m"
              />
              <FieldError
                field="ceilingHeightStudios"
                error={stepErrors.ceilingHeightStudios}
              />
            </div>
          </div>
        </FormSection>

        {/* Lighting Features */}
        <FormSection title="Lighting Features">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxInput
              checked={commercial.blackoutCapability || false}
              onChange={(v) => update({ blackoutCapability: v })}
              label="Blackout Capability *"
              description="Full light control"
            />
            <CheckboxInput
              checked={commercial.naturalLightControl || false}
              onChange={(v) => update({ naturalLightControl: v })}
              label="Natural Light Control"
              description="Controllable windows"
            />
            <CheckboxInput
              checked={commercial.studioLightingRig || false}
              onChange={(v) => update({ studioLightingRig: v })}
              label="Lighting Rig Installed"
              description="Ceiling-mounted system"
            />
          </div>
        </FormSection>

        {/* Backdrop & Set */}
        <FormSection title="Backdrop & Set">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxInput
              checked={commercial.cycloramaWall || false}
              onChange={(v) => update({ cycloramaWall: v })}
              label="Cyclorama Wall"
              description="Seamless curved backdrop"
            />
            <CheckboxInput
              checked={commercial.propStorageArea || false}
              onChange={(v) => update({ propStorageArea: v })}
              label="Prop Storage Area"
              description="Dedicated storage space"
            />
          </div>
        </FormSection>

        {/* Support Facilities */}
        <FormSection title="Support Facilities">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxInput
              checked={commercial.makeupRoom || false}
              onChange={(v) => update({ makeupRoom: v })}
              label="Makeup Room"
              description="Dedicated makeup station"
            />
            <CheckboxInput
              checked={commercial.changeRoom || false}
              onChange={(v) => update({ changeRoom: v })}
              label="Changing Room"
              description="Private changing area"
            />
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
