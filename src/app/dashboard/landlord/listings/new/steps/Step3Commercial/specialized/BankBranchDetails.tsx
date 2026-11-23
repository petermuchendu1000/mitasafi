/**
 * Bank Branch Details
 *
 * Specialized form for bank branches and financial service centers.
 * Captures secure facilities, customer service areas, and banking infrastructure.
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

export function BankBranchDetails() {
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
        title="Bank Branch Specifications"
        description="Banking facilities, security features, and customer areas"
      />

      <div className="space-y-6">
        {/* Space Dimensions */}
        <FormSection title="Space Dimensions">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel
                htmlFor="bank-branch-total-area"
                label="Total Area"
                required
              />
              <NumberInput
                id="bank-branch-total-area"
                value={commercial.sizeSqm}
                onChange={(v) => update({ sizeSqm: v })}
                placeholder="e.g., 400"
                unit="sqm"
                min={50}
              />
            </div>
            <div>
              <FieldLabel
                htmlFor="bank-branch-customer-service-area"
                label="Customer Service Area"
                required
              />
              <NumberInput
                id="bank-branch-customer-service-area"
                value={commercial.customerServiceArea}
                onChange={(v) => update({ customerServiceArea: v })}
                placeholder="e.g., 150"
                unit="sqm"
              />
            </div>
          </div>
        </FormSection>

        {/* Teller & Service Counters */}
        <FormSection title="Teller & Service Counters">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel
                id="bank-branch-teller-positions"
                label="Teller Positions"
                required
              />
              <CounterInput
                labelledBy="bank-branch-teller-positions"
                value={commercial.tellerCounterPositions || 0}
                onChange={(v) => update({ tellerCounterPositions: v })}
                min={0}
                max={20}
              />
            </div>
            <div>
              <FieldLabel
                id="bank-branch-private-offices"
                label="Private Offices"
              />
              <CounterInput
                labelledBy="bank-branch-private-offices"
                value={commercial.privateOfficeBanking || 0}
                onChange={(v) => update({ privateOfficeBanking: v })}
                min={0}
                max={15}
              />
            </div>
            <div>
              <FieldLabel
                id="bank-branch-atm-locations"
                label="ATM Locations"
              />
              <CounterInput
                labelledBy="bank-branch-atm-locations"
                value={commercial.atmLocations || 0}
                onChange={(v) => update({ atmLocations: v })}
                min={0}
                max={10}
              />
            </div>
          </div>
        </FormSection>

        {/* Secure Facilities */}
        <FormSection title="Secure Facilities">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxInput
              checked={commercial.vaultRoom || false}
              onChange={(v) => update({ vaultRoom: v })}
              label="Vault Room *"
              description="Secure vault facility"
            />
            <CheckboxInput
              checked={commercial.safeDepositArea || false}
              onChange={(v) => update({ safeDepositArea: v })}
              label="Safe Deposit Area"
              description="Customer safe deposit boxes"
            />
            <CheckboxInput
              checked={commercial.securityControlRoom || false}
              onChange={(v) => update({ securityControlRoom: v })}
              label="Security Control Room *"
              description="Monitoring & surveillance center"
            />
            <CheckboxInput
              checked={commercial.bulletproofGlass || false}
              onChange={(v) => update({ bulletproofGlass: v })}
              label="Bulletproof Glass"
              description="Security glass at counters"
            />
          </div>
          {commercial.vaultRoom && (
            <div className="mt-4 pl-4 border-l-2 border-teal-200">
              <FieldLabel
                htmlFor="bank-branch-vault-room-size"
                label="Vault Room Size"
              />
              <NumberInput
                id="bank-branch-vault-room-size"
                value={commercial.vaultRoomSqm}
                onChange={(v) => update({ vaultRoomSqm: v })}
                placeholder="e.g., 25"
                unit="sqm"
              />
            </div>
          )}
        </FormSection>

        {/* Service Options */}
        <FormSection title="Service Options">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxInput
              checked={commercial.driveThruWindow || false}
              onChange={(v) => update({ driveThruWindow: v })}
              label="Drive-Thru Window"
              description="Drive-up service window"
            />
            <CheckboxInput
              checked={commercial.nightDepositBox || false}
              onChange={(v) => update({ nightDepositBox: v })}
              label="Night Deposit Box"
              description="After-hours deposit facility"
            />
          </div>
        </FormSection>

        {/* Accessibility & Parking */}
        <FormSection title="Accessibility & Parking">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <FieldLabel
                id="bank-branch-customer-parking"
                label="Customer Parking"
              />
              <CounterInput
                labelledBy="bank-branch-customer-parking"
                value={commercial.customerParkingSpaces || 0}
                onChange={(v) => update({ customerParkingSpaces: v })}
                min={0}
                max={100}
              />
            </div>
          </div>
          <CheckboxInput
            checked={commercial.disabledAccess || false}
            onChange={(v) => update({ disabledAccess: v })}
            label="Wheelchair Accessible"
            description="Ramps, accessible counters"
          />
        </FormSection>
      </div>
    </div>
  );
}
