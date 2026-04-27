/**
 * Religious Facility Details
 * 
 * Specialized form for churches, mosques, temples, and religious centers.
 * Captures worship spaces, community facilities, and religious amenities.
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
import { isFieldRequired, validateRequiredFields } from "../../../required-fields-config";

export function ReligiousFacilityDetails() {
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
        title="Religious Facility Specifications" 
        description="Worship spaces, community areas, and facilities"
      />

      <div className="space-y-6">
        {/* Main Worship Space */}
        <FormSection title="Main Worship Space">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Worship Hall Capacity" required />
              <NumberInput
                value={commercial.worshipHallCapacity}
                onChange={(v) => update({ worshipHallCapacity: v })}
                placeholder="e.g., 500"
                unit="people"
                min={10}
              />
            </div>
            <div>
              <FieldLabel label="Prayer Hall Area" required />
              <NumberInput
                value={commercial.prayerHallSqm}
                onChange={(v) => update({ prayerHallSqm: v })}
                placeholder="e.g., 300"
                unit="sqm"
              />
            </div>
          </div>
        </FormSection>

        {/* Religious Amenities */}
        <FormSection title="Religious Amenities">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxInput
              checked={commercial.ablutionFacilities || false}
              onChange={(v) => update({ ablutionFacilities: v })}
              label="Ablution Facilities"
              description="Ritual washing areas"
            />
            <CheckboxInput
              checked={commercial.separateGenderAreas || false}
              onChange={(v) => update({ separateGenderAreas: v })}
              label="Separate Gender Areas"
              description="Designated men/women sections"
            />
            <CheckboxInput
              checked={commercial.minaretOrBellTower || false}
              onChange={(v) => update({ minaretOrBellTower: v })}
              label="Minaret / Bell Tower"
              description="Traditional architectural feature"
            />
            <CheckboxInput
              checked={commercial.soundSystemInstalled || false}
              onChange={(v) => update({ soundSystemInstalled: v })}
              label="Sound System"
              description="PA/amplification system"
            />
          </div>
        </FormSection>

        {/* Community Facilities */}
        <FormSection title="Community Facilities">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxInput
              checked={commercial.multipurposeHall || false}
              onChange={(v) => update({ multipurposeHall: v })}
              label="Multipurpose Hall"
              description="Events & gatherings"
            />
            <CheckboxInput
              checked={commercial.kitchenFacilities || false}
              onChange={(v) => update({ kitchenFacilities: v })}
              label="Kitchen Facilities"
              description="Commercial kitchen"
            />
          </div>
        </FormSection>

        {/* Administrative Spaces */}
        <FormSection title="Administrative Spaces">
          <div>
            <FieldLabel label="Office Rooms" />
            <CounterInput
              value={commercial.officeRoomsReligious || 0}
              onChange={(v) => update({ officeRoomsReligious: v })}
              min={0}
              max={20}
            />
          </div>
        </FormSection>

        {/* Parking */}
        <FormSection title="Parking & Access">
          <div>
            <FieldLabel label="Parking Capacity" />
            <CounterInput
              value={commercial.parkingCapacityReligious || 0}
              onChange={(v) => update({ parkingCapacityReligious: v })}
              min={0}
              max={500}
            />
          </div>
          <div className="mt-4">
            <CheckboxInput
              checked={commercial.disabledAccess || false}
              onChange={(v) => update({ disabledAccess: v })}
              label="Wheelchair Accessible"
              description="Ramps, accessible restrooms"
            />
          </div>
        </FormSection>
      </div>
    </div>
  );
}
