/**
 * Specialized Details - Business Logic Tests
 * 
 * Tests for specialized commercial subtypes to ensure
 * field definitions and business logic are correct.
 */

import { DEFAULT_COMMERCIAL_FORM_DATA, type CommercialFormData } from '../commercial-types';

describe('Specialized Subtype Field Validation', () => {
  describe('Data Center Fields', () => {
    it('should have all required data center fields', () => {
      const requiredFields: (keyof CommercialFormData)[] = [
        'rackCapacity',
        'uptimeTier',
        'powerRedundancy',
        'coolingType',
        'fireSuppressionType',
        'powerCapacityKva',
        'networkConnectivity',
        'physicalSecurityLevel',
      ];

      requiredFields.forEach((field) => {
        expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty(field);
      });
    });

    it('should have valid uptime tier options', () => {
      const validTiers = ['tier_1', 'tier_2', 'tier_3', 'tier_4'];
      // Default should be null or a valid tier
      const defaultTier = DEFAULT_COMMERCIAL_FORM_DATA.uptimeTier;
      expect(defaultTier === null || validTiers.includes(defaultTier)).toBe(true);
    });

    it('should have networkConnectivity as array', () => {
      expect(Array.isArray(DEFAULT_COMMERCIAL_FORM_DATA.networkConnectivity)).toBe(true);
    });
  });

  describe('Recording Studio Fields', () => {
    it('should have all required studio fields', () => {
      const requiredFields: (keyof CommercialFormData)[] = [
        'soundproofing',
        'acousticTreatment',
        'controlRoom',
        'isoBoothCount',
        'studioRoomCount',
        'ceilingHeightStudios',
      ];

      requiredFields.forEach((field) => {
        expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty(field);
      });
    });

    it('should have acoustic features as booleans', () => {
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.soundproofing).toBe('boolean');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.acousticTreatment).toBe('boolean');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.controlRoom).toBe('boolean');
    });

    it('should have room counts as numbers', () => {
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.isoBoothCount).toBe('number');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.studioRoomCount).toBe('number');
    });
  });

  describe('Photo Studio Fields', () => {
    it('should have all required photo studio fields', () => {
      const requiredFields: (keyof CommercialFormData)[] = [
        'cycloramaWall',
        'blackoutCapability',
        'naturalLightControl',
        'studioLightingRig',
        'makeupRoom',
        'changeRoom',
        'propStorageArea',
      ];

      requiredFields.forEach((field) => {
        expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty(field);
      });
    });

    it('should have all photo studio features as booleans', () => {
      const booleanFields: (keyof CommercialFormData)[] = [
        'cycloramaWall',
        'blackoutCapability',
        'naturalLightControl',
        'studioLightingRig',
        'makeupRoom',
        'changeRoom',
        'propStorageArea',
      ];

      booleanFields.forEach((field) => {
        expect(typeof DEFAULT_COMMERCIAL_FORM_DATA[field]).toBe('boolean');
      });
    });
  });

  describe('Gym/Fitness Fields', () => {
    it('should have all required gym fields', () => {
      const requiredFields: (keyof CommercialFormData)[] = [
        'gymFloorSqm',
        'cardioZoneSqm',
        'weightsZoneSqm',
        'showerCount',
        'lockerRooms',
        'mirroredWalls',
        'rubberFlooring',
        'groupClassStudio',
        'saunaOrSteam',
        'swimmingPool',
        'poolLaneCount',
      ];

      requiredFields.forEach((field) => {
        expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty(field);
      });
    });

    it('should have zone areas as nullable numbers', () => {
      expect(DEFAULT_COMMERCIAL_FORM_DATA.gymFloorSqm).toBeNull();
      expect(DEFAULT_COMMERCIAL_FORM_DATA.cardioZoneSqm).toBeNull();
      expect(DEFAULT_COMMERCIAL_FORM_DATA.weightsZoneSqm).toBeNull();
    });

    it('should have facility counts as numbers', () => {
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.showerCount).toBe('number');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.lockerRooms).toBe('number');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.poolLaneCount).toBe('number');
    });

    it('should have pool lane count dependent on pool existence', () => {
      // When pool is false, lane count should default to 0
      expect(DEFAULT_COMMERCIAL_FORM_DATA.swimmingPool).toBe(false);
      expect(DEFAULT_COMMERCIAL_FORM_DATA.poolLaneCount).toBe(0);
    });
  });

  describe('Salon/Spa Fields', () => {
    it('should have all required salon fields', () => {
      const requiredFields: (keyof CommercialFormData)[] = [
        'stylingStations',
        'washBasins',
        'treatmentBeds',
        'treatmentRoomsSpa',
        'manicurePedicureStations',
        'ventilationForChemicals',
        'waitingAreaCapacitySalon',
        'retailDisplayArea',
      ];

      requiredFields.forEach((field) => {
        expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty(field);
      });
    });

    it('should have station/room counts as numbers', () => {
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.stylingStations).toBe('number');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.washBasins).toBe('number');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.treatmentBeds).toBe('number');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.treatmentRoomsSpa).toBe('number');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.manicurePedicureStations).toBe('number');
    });

    it('should have ventilation as boolean (safety requirement)', () => {
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.ventilationForChemicals).toBe('boolean');
    });
  });

  describe('Religious Facility Fields', () => {
    it('should have all required religious facility fields', () => {
      const requiredFields: (keyof CommercialFormData)[] = [
        'worshipHallCapacity',
        'prayerHallSqm',
        'ablutionFacilities',
        'separateGenderAreas',
        'minaretOrBellTower',
        'multipurposeHall',
        'kitchenFacilities',
        'officeRoomsReligious',
        'soundSystemInstalled',
        'parkingCapacityReligious',
      ];

      requiredFields.forEach((field) => {
        expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty(field);
      });
    });

    it('should have capacity fields as nullable numbers', () => {
      expect(DEFAULT_COMMERCIAL_FORM_DATA.worshipHallCapacity).toBeNull();
      expect(DEFAULT_COMMERCIAL_FORM_DATA.prayerHallSqm).toBeNull();
    });
  });

  describe('Bank Branch Fields', () => {
    it('should have all required bank fields', () => {
      const requiredFields: (keyof CommercialFormData)[] = [
        'customerServiceArea',
        'tellerCounterPositions',
        'privateOfficeBanking',
        'vaultRoom',
        'vaultRoomSqm',
        'safeDepositArea',
        'atmLocations',
        'driveThruWindow',
        'nightDepositBox',
        'securityControlRoom',
        'bulletproofGlass',
        'customerParkingSpaces',
      ];

      requiredFields.forEach((field) => {
        expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty(field);
      });
    });

    it('should have security features as booleans', () => {
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.vaultRoom).toBe('boolean');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.safeDepositArea).toBe('boolean');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.securityControlRoom).toBe('boolean');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.bulletproofGlass).toBe('boolean');
    });

    it('should have counter positions as numbers', () => {
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.tellerCounterPositions).toBe('number');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.privateOfficeBanking).toBe('number');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.atmLocations).toBe('number');
    });
  });

  describe('ATM Site Fields', () => {
    it('should have all required ATM fields', () => {
      const requiredFields: (keyof CommercialFormData)[] = [
        'atmBoothSecure',
        'powerBackup24h',
        'cctvCoverage',
        'directStreetAccess',
        'lobbyEnclosed',
        'airConditioned',
        'footTrafficLevel',
        'nearbyLandmarks',
      ];

      requiredFields.forEach((field) => {
        expect(DEFAULT_COMMERCIAL_FORM_DATA).toHaveProperty(field);
      });
    });

    it('should have security features as booleans', () => {
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.atmBoothSecure).toBe('boolean');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.powerBackup24h).toBe('boolean');
      expect(typeof DEFAULT_COMMERCIAL_FORM_DATA.cctvCoverage).toBe('boolean');
    });

    it('should have footTrafficLevel with valid options', () => {
      const validLevels = ['low', 'medium', 'high', 'very_high', null];
      expect(validLevels).toContain(DEFAULT_COMMERCIAL_FORM_DATA.footTrafficLevel);
    });
  });
});

describe('Business Rule Validation', () => {
  describe('Field Dependencies', () => {
    it('vault room size should only matter when vault room exists', () => {
      // vaultRoomSqm is only relevant if vaultRoom is true
      expect(DEFAULT_COMMERCIAL_FORM_DATA.vaultRoom).toBe(false);
      // When vault is false, size should be null
      expect(DEFAULT_COMMERCIAL_FORM_DATA.vaultRoomSqm).toBeNull();
    });

    it('pool lane count should only matter when pool exists', () => {
      // poolLaneCount is only relevant if swimmingPool is true
      expect(DEFAULT_COMMERCIAL_FORM_DATA.swimmingPool).toBe(false);
      // When pool is false, lanes should be 0
      expect(DEFAULT_COMMERCIAL_FORM_DATA.poolLaneCount).toBe(0);
    });
  });

  describe('Default Values Sanity', () => {
    it('should not have negative default values', () => {
      const numericFields: (keyof CommercialFormData)[] = [
        'rackCapacity',
        'isoBoothCount',
        'studioRoomCount',
        'showerCount',
        'lockerRooms',
        'poolLaneCount',
        'stylingStations',
        'washBasins',
        'treatmentBeds',
        'treatmentRoomsSpa',
        'manicurePedicureStations',
        'tellerCounterPositions',
        'privateOfficeBanking',
        'atmLocations',
        'customerParkingSpaces',
        'depositMonthsCommercial',
      ];

      numericFields.forEach((field) => {
        const value = DEFAULT_COMMERCIAL_FORM_DATA[field];
        if (typeof value === 'number') {
          expect(value).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should have reasonable deposit months default', () => {
      expect(DEFAULT_COMMERCIAL_FORM_DATA.depositMonthsCommercial).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_COMMERCIAL_FORM_DATA.depositMonthsCommercial).toBeLessThanOrEqual(12);
    });
  });
});
