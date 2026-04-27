/**
 * Required Fields Configuration - Unit Tests
 * 
 * Tests for the required fields validation logic.
 */

import {
  getRequiredFields,
  isFieldRequired,
  validateRequiredFields,
  areRequiredFieldsComplete,
  getMissingRequiredFields,
  getPricingRequiredFields,
} from '../required-fields-config';
import { DEFAULT_COMMERCIAL_FORM_DATA } from '../commercial-types';

describe('Required Fields Configuration', () => {
  describe('getRequiredFields', () => {
    it('should return empty array for null type', () => {
      const fields = getRequiredFields(null, null);
      expect(fields).toEqual([]);
    });

    it('should return base requirements for office', () => {
      const fields = getRequiredFields('office', null);
      const fieldNames = fields.map((f) => f.field);
      expect(fieldNames).toContain('sizeSqm');
      expect(fieldNames).toContain('fitoutLevel');
      expect(fieldNames).toContain('layoutType');
    });

    it('should include subtype requirements for coworking_desk', () => {
      const fields = getRequiredFields('office', 'coworking_desk');
      const fieldNames = fields.map((f) => f.field);
      expect(fieldNames).toContain('workstationCapacity');
    });

    it('should return warehouse requirements with clear height', () => {
      const fields = getRequiredFields('warehouse', null);
      const fieldNames = fields.map((f) => f.field);
      expect(fieldNames).toContain('warehouseAreaSqm');
      expect(fieldNames).toContain('clearHeightM');
    });

    it('should include cold storage requirements for cold_storage subtype', () => {
      const fields = getRequiredFields('warehouse', 'cold_storage');
      const fieldNames = fields.map((f) => f.field);
      expect(fieldNames).toContain('coldStorage');
      expect(fieldNames).toContain('coldStorageTempRange');
    });

    it('should return ATM site requirements', () => {
      const fields = getRequiredFields('specialized', 'atm_site');
      const fieldNames = fields.map((f) => f.field);
      expect(fieldNames).toContain('atmBoothSecure');
      expect(fieldNames).toContain('powerBackup24h');
      expect(fieldNames).toContain('cctvCoverage');
      expect(fieldNames).toContain('footTrafficLevel');
    });

    it('should return bank branch requirements', () => {
      const fields = getRequiredFields('specialized', 'bank_branch');
      const fieldNames = fields.map((f) => f.field);
      expect(fieldNames).toContain('customerServiceArea');
      expect(fieldNames).toContain('tellerCounterPositions');
      expect(fieldNames).toContain('vaultRoom');
      expect(fieldNames).toContain('securityControlRoom');
    });

    it('should return data center requirements', () => {
      const fields = getRequiredFields('specialized', 'data_center');
      const fieldNames = fields.map((f) => f.field);
      expect(fieldNames).toContain('rackCapacity');
      expect(fieldNames).toContain('powerCapacityKva');
      expect(fieldNames).toContain('uptimeTier');
      expect(fieldNames).toContain('coolingType');
    });
  });

  describe('isFieldRequired', () => {
    it('should return true for sizeSqm in office', () => {
      expect(isFieldRequired('sizeSqm', 'office', null)).toBe(true);
    });

    it('should return false for optional field in office', () => {
      expect(isFieldRequired('powerKva', 'office', null)).toBe(false);
    });

    it('should return true for warehouseAreaSqm in warehouse', () => {
      expect(isFieldRequired('warehouseAreaSqm', 'warehouse', null)).toBe(true);
    });

    it('should return true for coldStorageTempRange in cold_storage', () => {
      expect(isFieldRequired('coldStorageTempRange', 'warehouse', 'cold_storage')).toBe(true);
    });

    it('should return false for coldStorageTempRange in regular warehouse', () => {
      expect(isFieldRequired('coldStorageTempRange', 'warehouse', 'distribution')).toBe(false);
    });

    it('should handle billboard site requirements', () => {
      expect(isFieldRequired('plotSizeSqm', 'commercial_land', 'billboard_site')).toBe(true);
      expect(isFieldRequired('billboardSize', 'commercial_land', 'billboard_site')).toBe(true);
      expect(isFieldRequired('billboardFacing', 'commercial_land', 'billboard_site')).toBe(true);
    });
  });

  describe('validateRequiredFields', () => {
    it('should return errors for missing office fields', () => {
      const formData = { ...DEFAULT_COMMERCIAL_FORM_DATA };
      const errors = validateRequiredFields(formData, 'office', null);
      
      expect(errors).toHaveProperty('sizeSqm');
      expect(errors).toHaveProperty('fitoutLevel');
      expect(errors).toHaveProperty('layoutType');
    });

    it('should return no errors when all office fields are filled', () => {
      const formData = {
        ...DEFAULT_COMMERCIAL_FORM_DATA,
        sizeSqm: 100,
        fitoutLevel: 'fitted' as const,
        layoutType: 'open_plan' as const,
      };
      const errors = validateRequiredFields(formData, 'office', 'small_office');
      
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should validate food & beverage required fields', () => {
      const formData = { ...DEFAULT_COMMERCIAL_FORM_DATA };
      const errors = validateRequiredFields(formData, 'food_beverage', 'restaurant_space');
      
      expect(errors).toHaveProperty('sizeSqm');
      expect(errors).toHaveProperty('fitoutLevel');
      expect(errors).toHaveProperty('seatingCapacity');
      expect(errors).toHaveProperty('kitchenAreaSqm');
    });

    it('should validate automotive parking requirements', () => {
      const formData = { ...DEFAULT_COMMERCIAL_FORM_DATA };
      const errors = validateRequiredFields(formData, 'automotive', 'parking_lot');
      
      expect(errors).toHaveProperty('parkingSpacesCount');
    });

    it('should not require parking spaces for non-parking automotive types', () => {
      const formData = {
        ...DEFAULT_COMMERCIAL_FORM_DATA,
        sizeSqm: 500,
      };
      const errors = validateRequiredFields(formData, 'automotive', 'garage_workshop');
      
      // garage_workshop requires workBays instead
      expect(errors).toHaveProperty('workBays');
      expect(errors).not.toHaveProperty('parkingSpacesCount');
    });
  });

  describe('areRequiredFieldsComplete', () => {
    it('should return false when fields are missing', () => {
      const formData = { ...DEFAULT_COMMERCIAL_FORM_DATA };
      expect(areRequiredFieldsComplete(formData, 'office', null)).toBe(false);
    });

    it('should return true when all office fields are complete', () => {
      const formData = {
        ...DEFAULT_COMMERCIAL_FORM_DATA,
        sizeSqm: 100,
        fitoutLevel: 'fitted' as const,
        layoutType: 'open_plan' as const,
      };
      expect(areRequiredFieldsComplete(formData, 'office', 'small_office')).toBe(true);
    });
  });

  describe('getMissingRequiredFields', () => {
    it('should return human-readable list of missing fields', () => {
      const formData = { ...DEFAULT_COMMERCIAL_FORM_DATA };
      const missing = getMissingRequiredFields(formData, 'office', null);
      
      expect(missing.length).toBeGreaterThan(0);
      expect(missing.some((m) => m.toLowerCase().includes('size'))).toBe(true);
    });
  });

  describe('getPricingRequiredFields', () => {
    it('should require rentPerSqm for per_sqm model', () => {
      const required = getPricingRequiredFields('per_sqm');
      expect(required.rentPerSqm).toBe(true);
      expect(required.rentAmount).toBe(false);
      expect(required.revenueSharePercent).toBe(false);
    });

    it('should require rentAmount for fixed model', () => {
      const required = getPricingRequiredFields('fixed');
      expect(required.rentAmount).toBe(true);
      expect(required.rentPerSqm).toBe(false);
      expect(required.revenueSharePercent).toBe(false);
    });

    it('should require rentAmount for per_unit model', () => {
      const required = getPricingRequiredFields('per_unit');
      expect(required.rentAmount).toBe(true);
      expect(required.rentPerSqm).toBe(false);
    });

    it('should require revenueSharePercent for revenue_share model', () => {
      const required = getPricingRequiredFields('revenue_share');
      expect(required.revenueSharePercent).toBe(true);
      expect(required.rentAmount).toBe(false);
      expect(required.rentPerSqm).toBe(false);
    });

    it('should always require deposit and lease months', () => {
      const models = ['per_sqm', 'fixed', 'per_unit', 'revenue_share'];
      models.forEach((model) => {
        const required = getPricingRequiredFields(model);
        expect(required.depositMonthsCommercial).toBe(true);
        expect(required.minLeaseMonths).toBe(true);
      });
    });
  });
});

describe('Specialized Subtype Requirements', () => {
  describe('Data Center', () => {
    it('should require critical infrastructure fields', () => {
      const fields = getRequiredFields('specialized', 'data_center');
      const fieldNames = fields.map((f) => f.field);
      
      expect(fieldNames).toContain('rackCapacity');
      expect(fieldNames).toContain('powerCapacityKva');
      expect(fieldNames).toContain('uptimeTier');
      expect(fieldNames).toContain('coolingType');
    });
  });

  describe('Recording Studio', () => {
    it('should require soundproofing and room count', () => {
      const fields = getRequiredFields('specialized', 'recording_studio');
      const fieldNames = fields.map((f) => f.field);
      
      expect(fieldNames).toContain('soundproofing');
      expect(fieldNames).toContain('studioRoomCount');
    });
  });

  describe('Photo Studio', () => {
    it('should require ceiling height and blackout capability', () => {
      const fields = getRequiredFields('specialized', 'photo_studio');
      const fieldNames = fields.map((f) => f.field);
      
      expect(fieldNames).toContain('ceilingHeightStudios');
      expect(fieldNames).toContain('blackoutCapability');
    });
  });

  describe('Gym & Fitness', () => {
    it('should require gym floor area and facilities', () => {
      const fields = getRequiredFields('specialized', 'gym_fitness');
      const fieldNames = fields.map((f) => f.field);
      
      expect(fieldNames).toContain('gymFloorSqm');
      expect(fieldNames).toContain('showerCount');
      expect(fieldNames).toContain('lockerRooms');
    });
  });

  describe('Salon & Spa', () => {
    it('should require styling stations and ventilation', () => {
      const fields = getRequiredFields('specialized', 'salon_spa');
      const fieldNames = fields.map((f) => f.field);
      
      expect(fieldNames).toContain('stylingStations');
      expect(fieldNames).toContain('washBasins');
      expect(fieldNames).toContain('ventilationForChemicals');
    });
  });

  describe('Religious Facility', () => {
    it('should require worship hall capacity and size', () => {
      const fields = getRequiredFields('specialized', 'religious_facility');
      const fieldNames = fields.map((f) => f.field);
      
      expect(fieldNames).toContain('worshipHallCapacity');
      expect(fieldNames).toContain('prayerHallSqm');
    });
  });

  describe('Bank Branch', () => {
    it('should require security and service features', () => {
      const fields = getRequiredFields('specialized', 'bank_branch');
      const fieldNames = fields.map((f) => f.field);
      
      expect(fieldNames).toContain('customerServiceArea');
      expect(fieldNames).toContain('tellerCounterPositions');
      expect(fieldNames).toContain('vaultRoom');
      expect(fieldNames).toContain('securityControlRoom');
    });
  });

  describe('ATM Site', () => {
    it('should require all security features', () => {
      const fields = getRequiredFields('specialized', 'atm_site');
      const fieldNames = fields.map((f) => f.field);
      
      expect(fieldNames).toContain('atmBoothSecure');
      expect(fieldNames).toContain('powerBackup24h');
      expect(fieldNames).toContain('cctvCoverage');
      expect(fieldNames).toContain('footTrafficLevel');
    });
  });
});
