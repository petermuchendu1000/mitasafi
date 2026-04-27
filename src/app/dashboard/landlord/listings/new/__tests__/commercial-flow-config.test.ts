/**
 * Commercial Flow Configuration - Unit Tests
 * 
 * Tests for step configuration, amenity filtering, pricing model selection,
 * and photo category assignment based on commercial type/subtype.
 */

import {
  getFlowConfig,
  shouldSkipAmenities,
  getAmenityCategories,
  getDefaultPricingModel,
  getMinPhotos,
  getCommercialSteps,
  getPhotoCategories,
  BUILDING_AMENITY_CATEGORIES,
  LAND_AMENITY_CATEGORIES,
  type CommercialFlowConfig,
} from '../commercial-flow-config';
import type { CommercialType, CommercialSubtype } from '../commercial-types';

describe('Commercial Flow Configuration', () => {
  describe('getFlowConfig', () => {
    it('should return config for all commercial types', () => {
      const types: CommercialType[] = [
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

      types.forEach((type) => {
        const config = getFlowConfig(type, null);
        expect(config).toBeDefined();
        expect(config?.type).toBe(type);
      });
    });

    it('should return null for invalid type', () => {
      const config = getFlowConfig('invalid' as CommercialType, null);
      expect(config).toBeNull();
    });

    it('should apply subtype overrides when available', () => {
      // Billboard should have different config
      const billboardConfig = getFlowConfig('commercial_land', 'billboard_site');
      const plotConfig = getFlowConfig('commercial_land', 'development_plot');
      
      expect(billboardConfig?.minPhotos).not.toBe(plotConfig?.minPhotos);
    });
  });

  describe('shouldSkipAmenities', () => {
    it('should skip amenities for billboard sites', () => {
      expect(shouldSkipAmenities('commercial_land', 'billboard_site')).toBe(true);
    });

    it('should skip amenities for ATM sites', () => {
      expect(shouldSkipAmenities('specialized', 'atm_site')).toBe(true);
    });

    it('should not skip amenities for offices', () => {
      expect(shouldSkipAmenities('office', 'small_office')).toBe(false);
    });

    it('should not skip amenities for retail', () => {
      expect(shouldSkipAmenities('retail', 'street_front')).toBe(false);
    });

    it('should not skip amenities for warehouses', () => {
      expect(shouldSkipAmenities('warehouse', 'distribution')).toBe(false);
    });
  });

  describe('getAmenityCategories', () => {
    it('should return building amenities for office spaces', () => {
      const categories = getAmenityCategories('office', 'small_office');
      expect(categories).toContain('building');
      expect(categories).toContain('security');
      expect(categories).toContain('parking');
    });

    it('should return land amenities for commercial land', () => {
      const categories = getAmenityCategories('commercial_land', 'development_plot');
      expect(categories).toContain('security');
      expect(categories).toContain('utilities');
      // Land shouldn't have building amenities
      expect(categories).not.toContain('building');
    });

    it('should return minimal amenities for billboard', () => {
      const categories = getAmenityCategories('commercial_land', 'billboard_site');
      expect(categories.length).toBeLessThanOrEqual(2);
    });

    it('should return full amenities for hospitality', () => {
      const categories = getAmenityCategories('hospitality', 'hotel_building');
      expect(categories.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('getDefaultPricingModel', () => {
    it('should return per_sqm for office spaces', () => {
      expect(getDefaultPricingModel('office', 'small_office')).toBe('per_sqm');
    });

    it('should return per_sqm for retail (area-based)', () => {
      expect(getDefaultPricingModel('retail', 'street_front')).toBe('per_sqm');
    });

    it('should return per_sqm for food & beverage (area-based)', () => {
      expect(getDefaultPricingModel('food_beverage', 'restaurant_space')).toBe('per_sqm');
    });

    it('should return per_unit for parking', () => {
      expect(getDefaultPricingModel('automotive', 'parking_lot')).toBe('per_unit');
    });

    it('should return per_unit for data center', () => {
      expect(getDefaultPricingModel('specialized', 'data_center')).toBe('per_unit');
    });

    it('should return fixed for billboard', () => {
      expect(getDefaultPricingModel('commercial_land', 'billboard_site')).toBe('fixed');
    });
  });

  describe('getMinPhotos', () => {
    it('should require same min photos for billboard and office (both 3)', () => {
      const billboardMin = getMinPhotos('commercial_land', 'billboard_site');
      const officeMin = getMinPhotos('office', 'small_office');
      // Billboard requires 3 photos (location, facing, traffic), same as office
      expect(billboardMin).toBe(3);
      expect(officeMin).toBe(3);
    });

    it('should require more photos for cold storage', () => {
      const coldStorageMin = getMinPhotos('warehouse', 'cold_storage');
      const regularWarehouseMin = getMinPhotos('warehouse', 'distribution');
      expect(coldStorageMin).toBeGreaterThanOrEqual(regularWarehouseMin);
    });

    it('should return at least 1 photo for any type', () => {
      const types: CommercialType[] = ['office', 'retail', 'warehouse', 'specialized'];
      types.forEach((type) => {
        const minPhotos = getMinPhotos(type, null);
        expect(minPhotos).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('getCommercialSteps', () => {
    it('should return 7 steps for standard types', () => {
      const steps = getCommercialSteps('office', 'small_office');
      expect(steps.length).toBe(7);
    });

    it('should skip amenities step for billboard', () => {
      const steps = getCommercialSteps('commercial_land', 'billboard_site');
      expect(steps).not.toContain(4); // Step 4 is amenities
    });

    it('should include all steps for warehouse', () => {
      const steps = getCommercialSteps('warehouse', 'distribution');
      expect(steps).toContain(1);
      expect(steps).toContain(2);
      expect(steps).toContain(3);
      expect(steps).toContain(4);
      expect(steps).toContain(5);
      expect(steps).toContain(6);
      expect(steps).toContain(7);
    });
  });
});

describe('Photo Categories', () => {
  describe('getPhotoCategories', () => {
    it('should always include cover photo', () => {
      const types: CommercialType[] = ['office', 'retail', 'warehouse', 'specialized'];
      types.forEach((type) => {
        const categories = getPhotoCategories(type, null);
        const hasCover = categories.some((c) => c.id === 'cover');
        expect(hasCover).toBe(true);
      });
    });

    it('should mark cover photo as required', () => {
      const categories = getPhotoCategories('office', 'small_office');
      const cover = categories.find((c) => c.id === 'cover');
      expect(cover?.required).toBe(true);
    });

    it('should have office-specific categories for office type', () => {
      const categories = getPhotoCategories('office', 'small_office');
      const categoryIds = categories.map((c) => c.id);
      expect(categoryIds).toContain('workspace');
      expect(categoryIds).toContain('meeting_room');
    });

    it('should have retail-specific categories for retail type', () => {
      const categories = getPhotoCategories('retail', 'street_front');
      const categoryIds = categories.map((c) => c.id);
      expect(categoryIds).toContain('storefront');
      expect(categoryIds).toContain('sales_floor');
    });

    it('should have food-specific categories for F&B type', () => {
      const categories = getPhotoCategories('food_beverage', 'restaurant_space');
      const categoryIds = categories.map((c) => c.id);
      expect(categoryIds).toContain('dining_area');
      expect(categoryIds).toContain('kitchen');
    });

    it('should have warehouse-specific categories', () => {
      const categories = getPhotoCategories('warehouse', 'distribution');
      const categoryIds = categories.map((c) => c.id);
      expect(categoryIds).toContain('floor_space');
      expect(categoryIds).toContain('loading_dock');
    });

    it('should have minimal categories for billboard', () => {
      const categories = getPhotoCategories('commercial_land', 'billboard_site');
      expect(categories.length).toBeLessThanOrEqual(4);
    });

    it('should have data center-specific categories', () => {
      const categories = getPhotoCategories('specialized', 'data_center');
      const categoryIds = categories.map((c) => c.id);
      expect(categoryIds).toContain('server_room');
      expect(categoryIds).toContain('power');
    });

    it('should have recording studio-specific categories', () => {
      const categories = getPhotoCategories('specialized', 'recording_studio');
      const categoryIds = categories.map((c) => c.id);
      expect(categoryIds).toContain('live_room');
      expect(categoryIds).toContain('control_room');
    });

    it('should have gym-specific categories', () => {
      const categories = getPhotoCategories('specialized', 'gym_fitness');
      const categoryIds = categories.map((c) => c.id);
      expect(categoryIds).toContain('cardio');
      expect(categoryIds).toContain('weights');
    });

    it('should have bank-specific categories', () => {
      const categories = getPhotoCategories('specialized', 'bank_branch');
      const categoryIds = categories.map((c) => c.id);
      expect(categoryIds).toContain('banking_hall');
      expect(categoryIds).toContain('vault');
    });
  });

  describe('Photo Category Structure', () => {
    it('should have icon for each category', () => {
      const types: CommercialType[] = ['office', 'retail', 'warehouse'];
      types.forEach((type) => {
        const categories = getPhotoCategories(type, null);
        categories.forEach((category) => {
          expect(category).toHaveProperty('icon');
          expect(typeof category.icon).toBe('string');
          expect(category.icon.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have unique category IDs within a type', () => {
      const types: CommercialType[] = ['office', 'retail', 'food_beverage', 'warehouse'];
      types.forEach((type) => {
        const categories = getPhotoCategories(type, null);
        const ids = categories.map((c) => c.id);
        const uniqueIds = [...new Set(ids)];
        expect(ids.length).toBe(uniqueIds.length);
      });
    });
  });
});

describe('Business Rules Cross-Validation', () => {
  describe('Billboard Site Consistency', () => {
    it('should have aligned configuration for billboard', () => {
      // Billboard should skip amenities
      expect(shouldSkipAmenities('commercial_land', 'billboard_site')).toBe(true);
      
      // Billboard should have fixed pricing (not per_sqm)
      expect(getDefaultPricingModel('commercial_land', 'billboard_site')).toBe('fixed');
      
      // Billboard should have minimal photos
      expect(getMinPhotos('commercial_land', 'billboard_site')).toBeLessThanOrEqual(3);
      
      // Billboard should skip step 4
      const steps = getCommercialSteps('commercial_land', 'billboard_site');
      expect(steps).not.toContain(4);
    });
  });

  describe('ATM Site Consistency', () => {
    it('should have aligned configuration for ATM', () => {
      // ATM should skip amenities
      expect(shouldSkipAmenities('specialized', 'atm_site')).toBe(true);
      
      // ATM should have fixed pricing
      expect(getDefaultPricingModel('specialized', 'atm_site')).toBe('fixed');
      
      // ATM should have minimal photos
      expect(getMinPhotos('specialized', 'atm_site')).toBeLessThanOrEqual(3);
    });
  });

  describe('Data Center Consistency', () => {
    it('should have per_unit pricing for rack-based billing', () => {
      expect(getDefaultPricingModel('specialized', 'data_center')).toBe('per_unit');
    });

    it('should not skip amenities (security is important)', () => {
      expect(shouldSkipAmenities('specialized', 'data_center')).toBe(false);
    });
  });

  describe('Parking Consistency', () => {
    it('should have per_unit pricing for space-based billing', () => {
      expect(getDefaultPricingModel('automotive', 'parking_lot')).toBe('per_unit');
      expect(getDefaultPricingModel('automotive', 'parking_building')).toBe('per_unit');
    });
  });
});
