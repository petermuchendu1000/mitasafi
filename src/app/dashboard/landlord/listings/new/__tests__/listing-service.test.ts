/**
 * Listing Service - Unit Tests
 * 
 * Tests for listing creation, validation, and publishing logic.
 */

import { publishListing, saveDraft } from '../listing-service';
import type { PropertyFormData } from '../types';
import { DEFAULT_FORM_DATA } from '../types';
import { DEFAULT_COMMERCIAL_FORM_DATA } from '../commercial-types';

// Create a minimal valid residential form data
const createValidResidentialData = (): PropertyFormData => ({
  ...DEFAULT_FORM_DATA,
  listingCategory: 'residential',
  title: 'Beautiful 2BR Apartment in Kilimani',
  description: 'A spacious and modern apartment with excellent amenities. Located in a quiet neighborhood with easy access to shops and restaurants. Perfect for families or professionals.',
  area: 'Kilimani',
  city: 'Nairobi',
  rentAmount: 85000,
  bedrooms: 2,
  bathrooms: 2,
  propertyType: 'apartment',
});

// Create a minimal valid commercial form data
const createValidCommercialData = (pricingModel: 'fixed' | 'per_sqm' | 'revenue_share' = 'fixed'): PropertyFormData => ({
  ...DEFAULT_FORM_DATA,
  listingCategory: 'commercial',
  commercialType: 'office',
  commercialSubtype: 'small_office',
  title: 'Modern Office Space in Westlands',
  description: 'Prime office space in the heart of Westlands business district. Modern finishes, excellent natural light, and great connectivity. Suitable for startups or established businesses.',
  area: 'Westlands',
  city: 'Nairobi',
  rentAmount: pricingModel === 'fixed' ? 150000 : 0,
  commercial: {
    ...DEFAULT_COMMERCIAL_FORM_DATA,
    sizeSqm: 100,
    pricingModel,
    rentPerSqm: pricingModel === 'per_sqm' ? 1500 : (pricingModel === 'fixed' ? 150000 : null),
    revenueSharePercent: pricingModel === 'revenue_share' ? 8 : null,
  },
});

describe('Listing Service', () => {
  describe('publishListing - Validation', () => {
    describe('Common Validations', () => {
      it('should reject empty title', async () => {
        const data = createValidResidentialData();
        data.title = '';
        
        const result = await publishListing(data);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Title');
      });

      it('should reject short title', async () => {
        const data = createValidResidentialData();
        data.title = 'Short';
        
        const result = await publishListing(data);
        expect(result.success).toBe(false);
        expect(result.error).toContain('10 characters');
      });

      it('should reject empty description', async () => {
        const data = createValidResidentialData();
        data.description = '';
        
        const result = await publishListing(data);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Description');
      });

      it('should reject short description', async () => {
        const data = createValidResidentialData();
        data.description = 'Too short';
        
        const result = await publishListing(data);
        expect(result.success).toBe(false);
        expect(result.error).toContain('50 characters');
      });

      it('should reject missing area', async () => {
        const data = createValidResidentialData();
        data.area = '';
        
        const result = await publishListing(data);
        expect(result.success).toBe(false);
        expect(result.error).toContain('location');
      });
    });

    describe('Residential Pricing Validation', () => {
      it('should reject zero rent amount', async () => {
        const data = createValidResidentialData();
        data.rentAmount = 0;
        
        const result = await publishListing(data);
        expect(result.success).toBe(false);
        expect(result.error).toContain('rent');
      });

      it('should reject negative rent amount', async () => {
        const data = createValidResidentialData();
        data.rentAmount = -5000;
        
        const result = await publishListing(data);
        expect(result.success).toBe(false);
        expect(result.error).toContain('rent');
      });

      it('should accept valid rent amount', async () => {
        const data = createValidResidentialData();
        data.rentAmount = 50000;
        
        const result = await publishListing(data);
        // Should not fail on rent validation (may fail on auth in test env)
        if (!result.success) {
          expect(result.error).not.toContain('rent');
        }
      });
    });

    describe('Commercial Fixed Pricing Validation', () => {
      it('should accept valid fixed monthly rent', async () => {
        const data = createValidCommercialData('fixed');
        
        const result = await publishListing(data);
        if (!result.success) {
          expect(result.error).not.toContain('rent');
        }
      });

      it('should reject zero fixed rent', async () => {
        const data = createValidCommercialData('fixed');
        data.rentAmount = 0;
        data.commercial!.rentPerSqm = 0;
        
        const result = await publishListing(data);
        expect(result.success).toBe(false);
        expect(result.error).toContain('rent');
      });
    });

    describe('Commercial Per-SQM Pricing Validation', () => {
      it('should accept valid per-sqm rent', async () => {
        const data = createValidCommercialData('per_sqm');
        data.commercial!.rentPerSqm = 1500;
        data.commercial!.sizeSqm = 100;
        
        const result = await publishListing(data);
        if (!result.success) {
          expect(result.error).not.toContain('rent');
        }
      });

      it('should reject zero per-sqm rent', async () => {
        const data = createValidCommercialData('per_sqm');
        data.commercial!.rentPerSqm = 0;
        
        const result = await publishListing(data);
        expect(result.success).toBe(false);
        expect(result.error).toContain('rent');
      });

      it('should reject null per-sqm rent', async () => {
        const data = createValidCommercialData('per_sqm');
        data.commercial!.rentPerSqm = null;
        
        const result = await publishListing(data);
        expect(result.success).toBe(false);
        expect(result.error).toContain('rent');
      });
    });

    describe('Commercial Revenue Share Pricing Validation', () => {
      it('should accept valid revenue share percentage', async () => {
        const data = createValidCommercialData('revenue_share');
        data.commercial!.revenueSharePercent = 8;
        
        const result = await publishListing(data);
        if (!result.success) {
          expect(result.error).not.toContain('revenue');
        }
      });

      it('should reject zero revenue share', async () => {
        const data = createValidCommercialData('revenue_share');
        data.commercial!.revenueSharePercent = 0;
        
        const result = await publishListing(data);
        expect(result.success).toBe(false);
        expect(result.error).toContain('revenue');
      });

      it('should reject null revenue share', async () => {
        const data = createValidCommercialData('revenue_share');
        data.commercial!.revenueSharePercent = null;
        
        const result = await publishListing(data);
        expect(result.success).toBe(false);
        expect(result.error).toContain('revenue');
      });
    });
  });

  describe('saveDraft', () => {
    it('should allow saving draft without full validation', async () => {
      const data = createValidResidentialData();
      data.rentAmount = 0; // Incomplete data
      
      // Draft should be saveable even with incomplete data
      const result = await saveDraft(data);
      // In test environment, may fail on auth, but shouldn't fail on validation
      if (!result.success) {
        expect(result.error).not.toContain('rent');
      }
    });
  });
});

describe('Edge Cases', () => {
  describe('Boundary Values', () => {
    it('should accept title with exactly 10 characters', async () => {
      const data = createValidResidentialData();
      data.title = '1234567890'; // Exactly 10 chars
      
      const result = await publishListing(data);
      if (!result.success) {
        expect(result.error).not.toContain('Title');
      }
    });

    it('should accept description with exactly 50 characters', async () => {
      const data = createValidResidentialData();
      data.description = 'A'.repeat(50);
      
      const result = await publishListing(data);
      if (!result.success) {
        expect(result.error).not.toContain('Description');
      }
    });

    it('should accept minimum rent amount (1 KES)', async () => {
      const data = createValidResidentialData();
      data.rentAmount = 1;
      
      const result = await publishListing(data);
      if (!result.success) {
        expect(result.error).not.toContain('rent');
      }
    });
  });

  describe('Whitespace Handling', () => {
    it('should reject title with only whitespace', async () => {
      const data = createValidResidentialData();
      data.title = '          '; // 10 spaces
      
      const result = await publishListing(data);
      expect(result.success).toBe(false);
    });

    it('should count trimmed length for title', async () => {
      const data = createValidResidentialData();
      data.title = '   Short   '; // Only 5 chars when trimmed
      
      const result = await publishListing(data);
      expect(result.success).toBe(false);
      expect(result.error).toContain('10 characters');
    });
  });
});
