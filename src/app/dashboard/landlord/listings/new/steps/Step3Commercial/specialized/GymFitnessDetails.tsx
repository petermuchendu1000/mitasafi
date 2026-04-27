/**
 * Gym & Fitness Center Details
 * 
 * Specialized form for gyms, fitness centers, and sports facilities.
 * Captures equipment zones, amenities, and specialized fitness features.
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
  ButtonGroup,
} from "./field-configs";
import { isFieldRequired, validateRequiredFields } from "../../../required-fields-config";

const FLOORING_OPTIONS: { id: string; label: string }[] = [
  { id: "rubber", label: "Rubber Flooring" },
  { id: "hardwood", label: "Hardwood" },
  { id: "vinyl", label: "Vinyl/LVT" },
  { id: "concrete", label: "Polished Concrete" },
  { id: "turf", label: "Artificial Turf" },
];

export function GymFitnessDetails() {
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
        title="Gym & Fitness Specifications" 
        description="Training zones, equipment areas, and facilities"
      />

      <div className="space-y-6">
        {/* Training Zones */}
        <FormSection title="Training Zones">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Total Gym Floor" required />
              <NumberInput
                value={commercial.gymFloorSqm}
                onChange={(v) => update({ gymFloorSqm: v })}
                placeholder="e.g., 500"
                unit="sqm"
                min={50}
              />
            </div>
            <div>
              <FieldLabel label="Cardio Zone" />
              <NumberInput
                value={commercial.cardioZoneSqm}
                onChange={(v) => update({ cardioZoneSqm: v })}
                placeholder="e.g., 100"
                unit="sqm"
              />
            </div>
            <div>
              <FieldLabel label="Weights Zone" />
              <NumberInput
                value={commercial.weightsZoneSqm}
                onChange={(v) => update({ weightsZoneSqm: v })}
                placeholder="e.g., 150"
                unit="sqm"
              />
            </div>
          </div>
        </FormSection>

        {/* Flooring Type */}
        <FormSection title="Flooring Type">
          <ButtonGroup
            options={FLOORING_OPTIONS}
            value={commercial.flooringType || null}
            onChange={(v) => update({ flooringType: v })}
          />
          <div className="mt-4">
            <CheckboxInput
              checked={commercial.rubberFlooring || false}
              onChange={(v) => update({ rubberFlooring: v })}
              label="Impact-Resistant Rubber Flooring"
              description="For free weights area"
            />
            <CheckboxInput
              checked={commercial.mirroredWalls || false}
              onChange={(v) => update({ mirroredWalls: v })}
              label="Mirrored Walls"
              description="Full-height mirrors"
            />
          </div>
        </FormSection>

        {/* Group Fitness */}
        <FormSection title="Group Fitness">
          <div>
            <CheckboxInput
              checked={commercial.groupClassStudio || false}
              onChange={(v) => update({ groupClassStudio: v })}
              label="Group Class Studio"
              description="Dedicated studio for classes"
            />
          </div>
        </FormSection>

        {/* Locker & Shower Facilities */}
        <FormSection title="Locker & Shower Facilities">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Locker Rooms" required />
              <CounterInput
                value={commercial.lockerRooms || 0}
                onChange={(v) => update({ lockerRooms: v })}
                min={0}
                max={10}
              />
            </div>
            <div>
              <FieldLabel label="Shower Units" required />
              <CounterInput
                value={commercial.showerCount || 0}
                onChange={(v) => update({ showerCount: v })}
                min={0}
                max={30}
              />
            </div>
          </div>
        </FormSection>

        {/* Recovery & Wellness */}
        <FormSection title="Recovery & Wellness">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxInput
              checked={commercial.saunaOrSteam || false}
              onChange={(v) => update({ saunaOrSteam: v })}
              label="Sauna / Steam Room"
              description="Heat recovery facilities"
            />
            <CheckboxInput
              checked={commercial.swimmingPool || false}
              onChange={(v) => update({ swimmingPool: v })}
              label="Swimming Pool"
              description="On-site pool"
            />
          </div>
          {commercial.swimmingPool && (
            <div className="mt-4 pl-4 border-l-2 border-teal-200">
              <FieldLabel label="Pool Lanes" />
              <CounterInput
                value={commercial.poolLaneCount || 0}
                onChange={(v) => update({ poolLaneCount: v })}
                min={1}
                max={10}
              />
            </div>
          )}
        </FormSection>

        {/* Parking */}
        <FormSection title="Parking">
          <div>
            <FieldLabel label="Parking Spaces" />
            <CounterInput
              value={commercial.parkingSpacesCount || 0}
              onChange={(v) => update({ parkingSpacesCount: v })}
              min={0}
              max={200}
            />
          </div>
        </FormSection>
      </div>
    </div>
  );
}
