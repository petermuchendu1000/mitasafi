/**
 * Data Center Details
 *
 * Specialized form for data center / colocation facilities.
 * Captures critical infrastructure specifications.
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
  ButtonGroup,
} from "./field-configs";
import {
  isFieldRequired,
  validateRequiredFields,
} from "../../../required-fields-config";

const UPTIME_TIERS = [
  { id: "tier_1" as const, label: "Tier 1", description: "99.67%" },
  { id: "tier_2" as const, label: "Tier 2", description: "99.75%" },
  { id: "tier_3" as const, label: "Tier 3", description: "99.98%" },
  { id: "tier_4" as const, label: "Tier 4", description: "99.99%" },
];

const SECURITY_LEVELS = [
  { id: "basic" as const, label: "Basic", description: "Card access" },
  { id: "enhanced" as const, label: "Enhanced", description: "Biometric" },
  { id: "maximum" as const, label: "Maximum", description: "Multi-factor" },
];

const CONNECTIVITY_OPTIONS = [
  { id: "fiber", label: "Fiber Optic" },
  { id: "carrier_neutral", label: "Carrier Neutral" },
  { id: "redundant_paths", label: "Redundant Paths" },
  { id: "meet_me_room", label: "Meet-Me Room" },
];

export function DataCenterDetails() {
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

  const toggleConnectivity = (id: string) => {
    const current = commercial.networkConnectivity || [];
    const updated = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    update({ networkConnectivity: updated });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Data Center Specifications"
        description="Infrastructure and capacity details for your data center facility"
      />

      <div className="space-y-6">
        {/* Space & Capacity */}
        <FormSection title="Space & Capacity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="sizeSqm" label="Floor Area" required />
              <NumberInput
                id="sizeSqm"
                {...fieldErrorProps("sizeSqm", stepErrors.sizeSqm)}
                value={commercial.sizeSqm}
                onChange={(v) => update({ sizeSqm: v })}
                placeholder="e.g., 1000"
                unit="sqm"
                min={10}
              />
              <FieldError field="sizeSqm" error={stepErrors.sizeSqm} />
            </div>
            <div>
              <FieldLabel
                id="rackCapacity-label"
                label="Rack Capacity"
                required
                description="Total rack units available"
              />
              <CounterInput
                labelledBy="rackCapacity-label"
                describedBy={
                  stepErrors.rackCapacity
                    ? fieldErrorId("rackCapacity")
                    : undefined
                }
                value={commercial.rackCapacity || 0}
                onChange={(v) => update({ rackCapacity: v })}
                min={0}
                max={1000}
              />
              <FieldError
                field="rackCapacity"
                error={stepErrors.rackCapacity}
              />
            </div>
          </div>
        </FormSection>

        {/* Uptime & Reliability */}
        <FormSection title="Uptime & Reliability">
          <div>
            <FieldLabel
              id="uptimeTier-label"
              label="Uptime Tier"
              required
              description="TIA-942 data center tier classification"
            />
            <ButtonGroup
              labelledBy="uptimeTier-label"
              describedBy={
                stepErrors.uptimeTier ? fieldErrorId("uptimeTier") : undefined
              }
              value={commercial.uptimeTier}
              onChange={(v) => update({ uptimeTier: v })}
              options={UPTIME_TIERS}
              columns={4}
            />
            <FieldError field="uptimeTier" error={stepErrors.uptimeTier} />
          </div>
        </FormSection>

        {/* Power Infrastructure */}
        <FormSection title="Power Infrastructure">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel
                htmlFor="powerCapacityKva"
                label="Power Capacity"
                required
              />
              <NumberInput
                id="powerCapacityKva"
                {...fieldErrorProps(
                  "powerCapacityKva",
                  stepErrors.powerCapacityKva,
                )}
                value={commercial.powerCapacityKva}
                onChange={(v) => update({ powerCapacityKva: v })}
                placeholder="e.g., 500"
                unit="kVA"
              />
              <FieldError
                field="powerCapacityKva"
                error={stepErrors.powerCapacityKva}
              />
            </div>
            <div>
              <FieldLabel
                htmlFor="powerRedundancy"
                label="Power Redundancy"
                description="N+1, 2N, 2N+1"
              />
              <TextInput
                id="powerRedundancy"
                {...fieldErrorProps(
                  "powerRedundancy",
                  stepErrors.powerRedundancy,
                )}
                value={commercial.powerRedundancy || ""}
                onChange={(v) => update({ powerRedundancy: v })}
                placeholder="e.g., 2N"
              />
              <FieldError
                field="powerRedundancy"
                error={stepErrors.powerRedundancy}
              />
            </div>
          </div>
        </FormSection>

        {/* Cooling & Fire Suppression */}
        <FormSection title="Cooling & Fire Suppression">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="coolingType" label="Cooling Type" required />
              <TextInput
                id="coolingType"
                {...fieldErrorProps("coolingType", stepErrors.coolingType)}
                value={commercial.coolingType || ""}
                onChange={(v) => update({ coolingType: v })}
                placeholder="e.g., CRAC, In-row, Chilled water"
              />
              <FieldError field="coolingType" error={stepErrors.coolingType} />
            </div>
            <div>
              <FieldLabel
                htmlFor="fireSuppressionType"
                label="Fire Suppression"
              />
              <TextInput
                id="fireSuppressionType"
                {...fieldErrorProps(
                  "fireSuppressionType",
                  stepErrors.fireSuppressionType,
                )}
                value={commercial.fireSuppressionType || ""}
                onChange={(v) => update({ fireSuppressionType: v })}
                placeholder="e.g., FM200, Novec 1230"
              />
              <FieldError
                field="fireSuppressionType"
                error={stepErrors.fireSuppressionType}
              />
            </div>
          </div>
        </FormSection>

        {/* Network Connectivity */}
        <FormSection title="Network Connectivity">
          <div className="grid grid-cols-2 gap-3">
            {CONNECTIVITY_OPTIONS.map((opt) => (
              <CheckboxInput
                key={opt.id}
                checked={(commercial.networkConnectivity || []).includes(
                  opt.id,
                )}
                onChange={() => toggleConnectivity(opt.id)}
                label={opt.label}
              />
            ))}
          </div>
        </FormSection>

        {/* Physical Security */}
        <FormSection title="Physical Security">
          <div>
            <FieldLabel
              id="physicalSecurityLevel-label"
              label="Security Level"
            />
            <ButtonGroup
              labelledBy="physicalSecurityLevel-label"
              describedBy={
                stepErrors.physicalSecurityLevel
                  ? fieldErrorId("physicalSecurityLevel")
                  : undefined
              }
              value={commercial.physicalSecurityLevel}
              onChange={(v) => update({ physicalSecurityLevel: v })}
              options={SECURITY_LEVELS}
              columns={3}
            />
            <FieldError
              field="physicalSecurityLevel"
              error={stepErrors.physicalSecurityLevel}
            />
          </div>
        </FormSection>
      </div>
    </div>
  );
}
