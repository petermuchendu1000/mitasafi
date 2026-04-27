/**
 * ATM Site Details
 * 
 * Specialized form for standalone ATM locations and kiosks.
 * Captures security, accessibility, and site characteristics.
 */

"use client";

import { useEffect } from "react";
import { useWizard } from "../../../context";
import {
  FormSection,
  PageHeader,
  FieldLabel,
  TextInput,
  CheckboxInput,
  ButtonGroup,
} from "./field-configs";
import { isFieldRequired, validateRequiredFields } from "../../../required-fields-config";

const FOOT_TRAFFIC_OPTIONS: { id: string; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "very_high", label: "Very High" },
];

type FootTrafficLevel = "low" | "medium" | "high" | "very_high";

export function AtmSiteDetails() {
  const { state, updateFormData, setValidation } = useWizard();
  const { commercial, commercialType, commercialSubtype } = state.formData;

  // Helper to check if field is required
  const isRequired = (field: keyof typeof commercial) => 
    isFieldRequired(field, commercialType, commercialSubtype);

  useEffect(() => {
    const errors = validateRequiredFields(commercial, commercialType, commercialSubtype);
    setValidation(3, { isValid: Object.keys(errors).length === 0, errors, touched: {} });
  }, [commercial, commercialType, commercialSubtype, setValidation]);

  const update = (data: Partial<typeof commercial>) => {
    updateFormData({ commercial: { ...commercial, ...data } });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader 
        title="ATM Site Specifications" 
        description="Location, security, and accessibility features"
      />

      <div className="space-y-6">
        {/* Location Characteristics */}
        <FormSection title="Location Characteristics">
          <div className="space-y-4">
            <div>
              <FieldLabel label="Foot Traffic Level" required />
              <ButtonGroup
                options={FOOT_TRAFFIC_OPTIONS}
                value={commercial.footTrafficLevel || null}
                onChange={(v) => update({ footTrafficLevel: v as FootTrafficLevel })}
              />
            </div>
            <div>
              <FieldLabel label="Nearby Landmarks" description="e.g., Mall, Hospital, University" />
              <TextInput
                value={commercial.nearbyLandmarks || ""}
                onChange={(v) => update({ nearbyLandmarks: v })}
                placeholder="e.g., Next to Westgate Mall entrance"
              />
            </div>
          </div>
        </FormSection>

        {/* Enclosure & Environment */}
        <FormSection title="Enclosure & Environment">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxInput
              checked={commercial.atmBoothSecure || false}
              onChange={(v) => update({ atmBoothSecure: v })}
              label="Secure ATM Booth *"
              description="Enclosed kiosk structure"
            />
            <CheckboxInput
              checked={commercial.lobbyEnclosed || false}
              onChange={(v) => update({ lobbyEnclosed: v })}
              label="Enclosed Lobby"
              description="Indoor waiting area"
            />
            <CheckboxInput
              checked={commercial.airConditioned || false}
              onChange={(v) => update({ airConditioned: v })}
              label="Air Conditioned"
              description="Climate controlled space"
            />
            <CheckboxInput
              checked={commercial.directStreetAccess || false}
              onChange={(v) => update({ directStreetAccess: v })}
              label="Direct Street Access"
              description="Accessible from street"
            />
          </div>
        </FormSection>

        {/* Security Features */}
        <FormSection title="Security Features">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxInput
              checked={commercial.cctvCoverage || false}
              onChange={(v) => update({ cctvCoverage: v })}
              label="CCTV Coverage *"
              description="24/7 video surveillance"
            />
            <CheckboxInput
              checked={commercial.powerBackup24h || false}
              onChange={(v) => update({ powerBackup24h: v })}
              label="24h Power Backup *"
              description="UPS/generator backup"
            />
          </div>
        </FormSection>

        {/* Accessibility */}
        <FormSection title="Accessibility">
          <CheckboxInput
            checked={commercial.disabledAccess || false}
            onChange={(v) => update({ disabledAccess: v })}
            label="Wheelchair Accessible"
            description="Accessible height and approach"
          />
        </FormSection>
      </div>
    </div>
  );
}
