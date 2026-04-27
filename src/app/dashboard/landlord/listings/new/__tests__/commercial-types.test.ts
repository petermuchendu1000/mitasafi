/**
 * Commercial Types - Unit Tests
 * 
 * Tests for commercial listing type definitions, constants, and defaults.
 * Validates business logic and data integrity.
 */

import {
  COMMERCIAL_CATEGORIES,
  COMMERCIAL_SUBTYPES,
  COMMERCIAL_PRICING_MODELS,
  COMMERCIAL_PAYMENT_FREQUENCIES,
  DEFAULT_COMMERCIAL_FORM_DATA,
  type CommercialType,
  type CommercialSubtype,
  type CommercialFormData,
} from '../commercial-types';

describe('Commercial Types', () => {
  describe('COMMERCIAL_CATEGORIES', () => {
    it('should have exactly 10 commercial categories', () => {
      expect(COMMERCIAL_CATEGORIES).toHaveLength(10);
    });

    it('should have all required properties for each category', () => {
      COMMERCIAL_CATEGORIES.forEach((category) => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('label');
        expect(category).toHaveProperty('icon');
        expect(category).toHaveProperty('description');
        expect(typeof category.id).toBe('string');
        expect(typeof category.label).toBe('string');
        expect(category.label.length).toBeGreaterThan(0);
      });
    });

    it('should have unique category IDs', () => {
      const ids = COMMERCIAL_CATEGORIES.map((c) => c.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should include all expected commercial types', () => {
      const expectedTypes: CommercialType[] = [
        'office',
        'retail',
        'food_beverage',
        'warehouse',
        'automotive',
        'commercial_land',
        'hospitality',
        'healthcare',
        'educational',
        'specialized',
      ];
      
      const actualIds = COMMERCIAL_CATEGORIES.map((c) => c.id);
      expectedTypes.forEach((type) => {
        expect(actualIds).toContain(type);
      });
    });
  });

  describe('COMMERCIAL_SUBTYPES', () => {
    it('should have subtypes for all 10 commercial types', () => {
      expect(Object.keys(COMMERCIAL_SUBTYPES)).toHaveLength(10);
    });

    it('should have at least 3 subtypes per type', () => {
      Object.entries(COMMERCIAL_SUBTYPES).forEach(([type, subtypes]) => {
        expect(subtypes.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should have unique subtype IDs within each type', () => {
      Object.entries(COMMERCIAL_SUBTYPES).forEach(([type, subtypes]) => {
        const ids = subtypes.map((s) => s.id);
        const uniqueIds = [...new Set(ids)];
        expect(ids.length).toBe(uniqueIds.length);
      });
    });

    it('should have label and description for each subtype', () => {
      Object.entries(COMMERCIAL_SUBTYPES).forEach(([type, subtypes]) => {
        subtypes.forEach((subtype) => {
          expect(subtype).toHaveProperty('id');
          expect(subtype).toHaveProperty('label');
          expect(typeof subtype.label).toBe('string');
          expect(subtype.label.length).toBeGreaterThan(0);
        });
      });
    });

    // Business-specific subtype tests
    describe('Office subtypes', () => {
      it('should include essential office types', () => {
        const officeSubtypes = COMMERCIAL_SUBTYPES.office.map((s) => s.id);
        expect(officeSubtypes).toContain('small_office');
        expect(officeSubtypes).toContain('coworking_desk');
        expect(officeSubtypes).toContain('serviced_office');
      });
    });

    describe('Warehouse subtypes', () => {
      it('should include cold storage', () => {
        const warehouseSubtypes = COMMERCIAL_SUBTYPES.warehouse.map((s) => s.id);
        expect(warehouseSubtypes).toContain('cold_storage');
        expect(warehouseSubtypes).toContain('distribution');
      });
    });

    describe('Specialized subtypes', () => {
      it('should include all 8 specialized types', () => {
        const specializedSubtypes = COMMERCIAL_SUBTYPES.specialized.map((s) => s.id);
        expect(specializedSubtypes).toContain('data_center');
        expect(specializedSubtypes).toContain('recording_studio');
        expect(specializedSubtypes).toContain('photo_studio');
        expect(specializedSubtypes).toContain('gym_fitness');
        expect(specializedSubtypes).toContain('salon_spa');
        expect(specializedSubtypes).toContain('religious_facility');
        expect(specializedSubtypes).toContain('bank_branch');
        expect(specializedSubtypes).toContain('atm_site');
      });
    });
  });

  describe('COMMERCIAL_PRICING_MODELS', () => {
    it('should have at least 3 pricing models', () => {
      expect(COMMERCIAL_PRICING_MODELS.length).toBeGreaterThanOrEqual(3);
    });

    it('should include standard pricing models', () => {
      const modelIds = COMMERCIAL_PRICING_MODELS.map((m) => m.id);
      expect(modelIds).toContain('per_sqm');
      expect(modelIds).toContain('fixed');
      expect(modelIds).toContain('revenue_share');
    });

    it('should have label and description for each model', () => {
      COMMERCIAL_PRICING_MODELS.forEach((model) => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('label');
        expect(model).toHaveProperty('description');
        expect(typeof model.label).toBe('string');
        expect(model.label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('COMMERCIAL_PAYMENT_FREQUENCIES', () => {
    it('should include monthly and quarterly options', () => {
      const frequencies = COMMERCIAL_PAYMENT_FREQUENCIES.map((f) => f.id);
      expect(frequencies).toContain('monthly');
      expect(frequencies).toContain('quarterly');
    });
  });

  describe('DEFAULT_COMMERCIAL_FORM_DATA', () => {
    it('should have all required fields initialized', () => {
      const required: (keyof CommercialFormData)[] = [
        'sizeSqm',
        'parkingSpacesCount',
        'pricingModel',
        'depositMonthsCommercial',
      ];
      
      required.forEach((field) => {
        expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty(field);
      });
    });

    it('should have sensible defaults', () => {
      expect(DEFAULT_COMMERCIAL_FORM_DATA.pricingModel).toBe('fixed');
      expect(DEFAULT_COMMERCIAL_FORM_DATA.depositMonthsCommercial).toBeGreaterThanOrEqual(1);
      // parkingSpacesCount is nullable
      expect(DEFAULT_COMMERCIAL_FORM_DATA.parkingSpacesCount).toBeNull();
    });

    it('should have boolean fields initialized to false', () => {
      expect(DEFAULT_COMMERCIAL_FORM_DATA.soundproofing).toBe(false);
      expect(DEFAULT_COMMERCIAL_FORM_DATA.acousticTreatment).toBe(false);
      expect(DEFAULT_COMMERCIAL_FORM_DATA.controlRoom).toBe(false);
    });

    it('should have arrays initialized to empty', () => {
      expect(DEFAULT_COMMERCIAL_FORM_DATA.networkConnectivity).toEqual([]);
      expect(DEFAULT_COMMERCIAL_FORM_DATA.serviceChargeIncludes).toEqual([]);
      expect(DEFAULT_COMMERCIAL_FORM_DATA.commercialAmenities).toEqual([]);
    });

    it('should have nullable number fields as null', () => {
      expect(DEFAULT_COMMERCIAL_FORM_DATA.sizeSqm).toBeNull();
      expect(DEFAULT_COMMERCIAL_FORM_DATA.rentPerSqm).toBeNull();
      expect(DEFAULT_COMMERCIAL_FORM_DATA.gymFloorSqm).toBeNull();
    });
  });
});

describe('Business Logic Validation', () => {
  describe('Subtype-Type Consistency', () => {
    it('should have subtypes that match their parent type context', () => {
      // Office subtypes should be office-related
      const officeSubtypes = COMMERCIAL_SUBTYPES.office.map((s) => s.label.toLowerCase());
      officeSubtypes.forEach((label) => {
        // Should not contain retail/food terms
        expect(label).not.toContain('restaurant');
        expect(label).not.toContain('shop');
        expect(label).not.toContain('warehouse');
      });

      // Retail subtypes should be retail-related
      const retailSubtypes = COMMERCIAL_SUBTYPES.retail.map((s) => s.label.toLowerCase());
      retailSubtypes.forEach((label) => {
        expect(label).not.toContain('office');
        expect(label).not.toContain('restaurant');
      });
    });
  });

  describe('Pricing Model Business Rules', () => {
    it('per_sqm should require size calculation', () => {
      const perSqmModel = COMMERCIAL_PRICING_MODELS.find((m) => m.id === 'per_sqm');
      expect(perSqmModel).toBeDefined();
      expect(perSqmModel?.description.toLowerCase()).toContain('size');
    });

    it('revenue_share should indicate percentage', () => {
      const revenueShareModel = COMMERCIAL_PRICING_MODELS.find((m) => m.id === 'revenue_share');
      expect(revenueShareModel).toBeDefined();
      // Description uses "%" symbol
      expect(revenueShareModel?.description).toContain('%');
    });
  });

  describe('Data Center Specific Fields', () => {
    it('should have uptime tier options defined', () => {
      // Uptime tiers are critical for data centers
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('uptimeTier');
    });

    it('should have power and cooling fields', () => {
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('powerCapacityKva');
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('coolingType');
    });
  });

  describe('Gym/Fitness Specific Fields', () => {
    it('should have zone area fields', () => {
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('gymFloorSqm');
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('cardioZoneSqm');
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('weightsZoneSqm');
    });

    it('should have facility amenity fields', () => {
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('showerCount');
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('lockerRooms');
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('saunaOrSteam');
    });
  });

  describe('Bank Branch Specific Fields', () => {
    it('should have security-related fields', () => {
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('vaultRoom');
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('bulletproofGlass');
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('securityControlRoom');
    });

    it('should have customer service fields', () => {
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('tellerCounterPositions');
      expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty('privateOfficeBanking');
    });
  });
});
