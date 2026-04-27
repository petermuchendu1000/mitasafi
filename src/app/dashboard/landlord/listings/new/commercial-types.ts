/**
 * Commercial Property Types & Constants
 * 
 * Comprehensive type definitions for commercial property listings.
 * Supports 10 categories with 70+ sub-types.
 */

// =============================================================================
// LISTING CATEGORY
// =============================================================================

export type ListingCategory = "residential" | "commercial";

// =============================================================================
// COMMERCIAL TYPE DEFINITIONS
// =============================================================================

export type CommercialType =
  | "office"
  | "retail"
  | "food_beverage"
  | "warehouse"
  | "automotive"
  | "commercial_land"
  | "hospitality"
  | "healthcare"
  | "educational"
  | "specialized";

// Sub-types for each commercial category
export type OfficeSubtype =
  | "executive_suite"
  | "small_office"
  | "medium_office"
  | "large_office"
  | "full_floor"
  | "entire_building"
  | "coworking_desk"
  | "coworking_private"
  | "virtual_office"
  | "serviced_office";

export type RetailSubtype =
  | "street_front"
  | "mall_unit"
  | "anchor_store"
  | "kiosk"
  | "showroom"
  | "pop_up"
  | "market_stall";

export type FoodBeverageSubtype =
  | "restaurant_space"
  | "cafe_space"
  | "fast_food"
  | "bar_lounge"
  | "club_space"
  | "cloud_kitchen"
  | "food_court"
  | "bakery_space";

export type WarehouseSubtype =
  | "distribution"
  | "storage"
  | "cold_storage"
  | "godown"
  | "fulfillment_center"
  | "light_manufacturing"
  | "heavy_industrial"
  | "flex_space";

export type AutomotiveSubtype =
  | "parking_lot"
  | "parking_building"
  | "garage_workshop"
  | "car_wash"
  | "petrol_station"
  | "car_showroom"
  | "auto_yard";

export type CommercialLandSubtype =
  | "development_plot"
  | "industrial_plot"
  | "commercial_plot"
  | "mixed_use_plot"
  | "billboard_site"
  | "storage_yard"
  | "container_yard";

export type HospitalitySubtype =
  | "hotel_building"
  | "guest_house"
  | "serviced_apartment"
  | "hostel"
  | "event_venue"
  | "conference_center"
  | "wedding_venue";

export type HealthcareSubtype =
  | "clinic_space"
  | "dental_clinic"
  | "pharmacy_space"
  | "lab_space"
  | "hospital_building"
  | "rehab_facility"
  | "medical_office";

export type EducationalSubtype =
  | "school_building"
  | "training_center"
  | "classroom_rental"
  | "daycare_space"
  | "tutoring_center"
  | "driving_school";

export type SpecializedSubtype =
  | "data_center"
  | "recording_studio"
  | "photo_studio"
  | "gym_fitness"
  | "salon_spa"
  | "religious_facility"
  | "bank_branch"
  | "atm_site";

export type CommercialSubtype =
  | OfficeSubtype
  | RetailSubtype
  | FoodBeverageSubtype
  | WarehouseSubtype
  | AutomotiveSubtype
  | CommercialLandSubtype
  | HospitalitySubtype
  | HealthcareSubtype
  | EducationalSubtype
  | SpecializedSubtype;

// =============================================================================
// COMMERCIAL CATEGORIES CONFIG
// =============================================================================

export const COMMERCIAL_CATEGORIES = [
  {
    id: "office" as CommercialType,
    label: "Office Space",
    icon: "building-2",
    description: "Workspaces for businesses",
  },
  {
    id: "retail" as CommercialType,
    label: "Retail Shop",
    icon: "store",
    description: "Shops & showrooms",
  },
  {
    id: "food_beverage" as CommercialType,
    label: "Restaurant & F&B",
    icon: "utensils",
    description: "Food service spaces",
  },
  {
    id: "warehouse" as CommercialType,
    label: "Warehouse",
    icon: "warehouse",
    description: "Storage & logistics",
  },
  {
    id: "automotive" as CommercialType,
    label: "Automotive",
    icon: "car",
    description: "Parking, car wash, garage",
  },
  {
    id: "commercial_land" as CommercialType,
    label: "Commercial Land",
    icon: "map",
    description: "Plots & billboards",
  },
  {
    id: "hospitality" as CommercialType,
    label: "Hospitality",
    icon: "hotel",
    description: "Hotels & venues",
  },
  {
    id: "healthcare" as CommercialType,
    label: "Healthcare",
    icon: "heart-pulse",
    description: "Medical facilities",
  },
  {
    id: "educational" as CommercialType,
    label: "Educational",
    icon: "graduation-cap",
    description: "Schools & training",
  },
  {
    id: "specialized" as CommercialType,
    label: "Specialized",
    icon: "cog",
    description: "Data centers, studios, gyms",
  },
] as const;

// =============================================================================
// SUB-TYPES BY CATEGORY
// =============================================================================

export const COMMERCIAL_SUBTYPES: Record<CommercialType, { id: string; label: string; description: string }[]> = {
  office: [
    { id: "executive_suite", label: "Executive Suite", description: "10-50 sqm" },
    { id: "small_office", label: "Small Office", description: "50-150 sqm" },
    { id: "medium_office", label: "Medium Office", description: "150-500 sqm" },
    { id: "large_office", label: "Large Office", description: "500+ sqm" },
    { id: "full_floor", label: "Full Floor", description: "Entire floor" },
    { id: "entire_building", label: "Entire Building", description: "Whole building" },
    { id: "coworking_desk", label: "Coworking Desk", description: "Hot desk / dedicated" },
    { id: "coworking_private", label: "Private Office", description: "In coworking space" },
    { id: "serviced_office", label: "Serviced Office", description: "Fully managed" },
  ],
  retail: [
    { id: "street_front", label: "Street Front Shop", description: "High visibility" },
    { id: "mall_unit", label: "Mall Unit", description: "Shopping center" },
    { id: "anchor_store", label: "Anchor Store", description: "Large format" },
    { id: "kiosk", label: "Kiosk / Cart", description: "Small footprint" },
    { id: "showroom", label: "Showroom", description: "Display focused" },
    { id: "pop_up", label: "Pop-up Space", description: "Short term" },
    { id: "market_stall", label: "Market Stall", description: "Traditional market" },
  ],
  food_beverage: [
    { id: "restaurant_space", label: "Restaurant", description: "Full service dining" },
    { id: "cafe_space", label: "Café / Coffee Shop", description: "Casual dining" },
    { id: "fast_food", label: "Fast Food / QSR", description: "Quick service" },
    { id: "bar_lounge", label: "Bar / Lounge", description: "Beverage focused" },
    { id: "club_space", label: "Club / Nightlife", description: "Entertainment venue" },
    { id: "cloud_kitchen", label: "Cloud Kitchen", description: "Delivery only" },
    { id: "food_court", label: "Food Court Unit", description: "Shared dining area" },
    { id: "bakery_space", label: "Bakery", description: "Baking facility" },
  ],
  warehouse: [
    { id: "distribution", label: "Distribution Center", description: "Logistics hub" },
    { id: "storage", label: "Storage Facility", description: "General storage" },
    { id: "cold_storage", label: "Cold Storage", description: "Refrigerated" },
    { id: "godown", label: "Godown", description: "Traditional warehouse" },
    { id: "fulfillment_center", label: "Fulfillment Center", description: "E-commerce" },
    { id: "light_manufacturing", label: "Light Manufacturing", description: "Assembly" },
    { id: "heavy_industrial", label: "Heavy Industrial", description: "Manufacturing" },
    { id: "flex_space", label: "Flex Space", description: "Office + warehouse" },
  ],
  automotive: [
    { id: "parking_lot", label: "Parking Lot", description: "Open air parking" },
    { id: "parking_building", label: "Parking Building", description: "Multi-story" },
    { id: "garage_workshop", label: "Garage / Workshop", description: "Auto repair" },
    { id: "car_wash", label: "Car Wash", description: "Vehicle cleaning" },
    { id: "petrol_station", label: "Petrol Station", description: "Fuel retail" },
    { id: "car_showroom", label: "Car Showroom", description: "Vehicle sales" },
    { id: "auto_yard", label: "Auto Yard", description: "Open vehicle storage" },
  ],
  commercial_land: [
    { id: "development_plot", label: "Development Plot", description: "For construction" },
    { id: "industrial_plot", label: "Industrial Plot", description: "Industrial zone" },
    { id: "commercial_plot", label: "Commercial Plot", description: "Business zone" },
    { id: "mixed_use_plot", label: "Mixed-Use Plot", description: "Multiple uses" },
    { id: "billboard_site", label: "Billboard Site", description: "Advertising space" },
    { id: "storage_yard", label: "Storage Yard", description: "Open storage" },
    { id: "container_yard", label: "Container Yard", description: "Container storage" },
  ],
  hospitality: [
    { id: "hotel_building", label: "Hotel Building", description: "Full hotel" },
    { id: "guest_house", label: "Guest House", description: "Small lodging" },
    { id: "serviced_apartment", label: "Serviced Apartments", description: "Extended stay" },
    { id: "hostel", label: "Hostel", description: "Budget accommodation" },
    { id: "event_venue", label: "Event Venue", description: "Functions & parties" },
    { id: "conference_center", label: "Conference Center", description: "Business events" },
    { id: "wedding_venue", label: "Wedding Venue", description: "Ceremonies" },
  ],
  healthcare: [
    { id: "clinic_space", label: "Clinic Space", description: "Medical clinic" },
    { id: "dental_clinic", label: "Dental Clinic", description: "Dental practice" },
    { id: "pharmacy_space", label: "Pharmacy", description: "Drug store" },
    { id: "lab_space", label: "Laboratory", description: "Medical lab" },
    { id: "hospital_building", label: "Hospital Building", description: "Full hospital" },
    { id: "rehab_facility", label: "Rehab Facility", description: "Recovery center" },
    { id: "medical_office", label: "Medical Office", description: "Doctor's office" },
  ],
  educational: [
    { id: "school_building", label: "School Building", description: "Full school" },
    { id: "training_center", label: "Training Center", description: "Corporate training" },
    { id: "classroom_rental", label: "Classroom Rental", description: "Single rooms" },
    { id: "daycare_space", label: "Daycare", description: "Childcare facility" },
    { id: "tutoring_center", label: "Tutoring Center", description: "Extra classes" },
    { id: "driving_school", label: "Driving School", description: "Driver training" },
  ],
  specialized: [
    { id: "data_center", label: "Data Center", description: "Server hosting" },
    { id: "recording_studio", label: "Recording Studio", description: "Audio production" },
    { id: "photo_studio", label: "Photo Studio", description: "Photography" },
    { id: "gym_fitness", label: "Gym / Fitness", description: "Exercise facility" },
    { id: "salon_spa", label: "Salon / Spa", description: "Beauty services" },
    { id: "religious_facility", label: "Religious Facility", description: "Church / Mosque" },
    { id: "bank_branch", label: "Bank Branch", description: "Financial services" },
    { id: "atm_site", label: "ATM Site", description: "ATM location" },
  ],
};

// =============================================================================
// FIT-OUT LEVELS
// =============================================================================

export const FITOUT_LEVELS = [
  { id: "shell", label: "Shell", description: "Bare space, concrete walls" },
  { id: "semi_fitted", label: "Semi-Fitted", description: "Basic utilities installed" },
  { id: "fitted", label: "Fitted", description: "Ready for business" },
  { id: "furnished", label: "Furnished", description: "Furniture included" },
] as const;

export type FitoutLevel = typeof FITOUT_LEVELS[number]["id"];

// =============================================================================
// OFFICE-SPECIFIC OPTIONS
// =============================================================================

export const OFFICE_LAYOUT_OPTIONS = [
  { id: "open_plan", label: "Open Plan", description: "No partitions" },
  { id: "partitioned", label: "Partitioned", description: "Divided rooms" },
  { id: "mixed", label: "Mixed", description: "Open + private offices" },
] as const;

export type OfficeLayoutType = typeof OFFICE_LAYOUT_OPTIONS[number]["id"];

export const HVAC_OPTIONS = [
  { id: "none", label: "None", description: "No AC" },
  { id: "central", label: "Central AC", description: "Building-wide" },
  { id: "split", label: "Split Units", description: "Individual AC" },
] as const;

export type HVACType = typeof HVAC_OPTIONS[number]["id"];

export const BUILDING_GRADES = [
  { id: "A", label: "Grade A", description: "Premium, modern" },
  { id: "B", label: "Grade B", description: "Good quality" },
  { id: "C", label: "Grade C", description: "Basic, functional" },
] as const;

export type BuildingGrade = typeof BUILDING_GRADES[number]["id"];

// =============================================================================
// RETAIL-SPECIFIC OPTIONS
// =============================================================================

export const FOOT_TRAFFIC_OPTIONS = [
  { id: "low", label: "Low", description: "Quiet area" },
  { id: "medium", label: "Medium", description: "Moderate traffic" },
  { id: "high", label: "High", description: "Busy location" },
  { id: "very_high", label: "Very High", description: "Prime location" },
] as const;

export type FootTrafficType = typeof FOOT_TRAFFIC_OPTIONS[number]["id"];

export const SIGNAGE_OPTIONS = [
  { id: "none", label: "None Allowed", description: "" },
  { id: "fascia", label: "Fascia Only", description: "Above storefront" },
  { id: "fascia_projecting", label: "Fascia + Projecting", description: "Both allowed" },
  { id: "building", label: "Building Signage", description: "Full building" },
] as const;

export type SignageType = typeof SIGNAGE_OPTIONS[number]["id"];

// =============================================================================
// WAREHOUSE-SPECIFIC OPTIONS
// =============================================================================

export const OPERATING_HOURS_OPTIONS = [
  { id: "business_hours", label: "Business Hours", description: "8am - 6pm" },
  { id: "24_7", label: "24/7 Access", description: "Round the clock" },
  { id: "extended", label: "Extended Hours", description: "6am - 10pm" },
  { id: "custom", label: "Custom Schedule", description: "As agreed" },
] as const;

export type OperatingHoursType = typeof OPERATING_HOURS_OPTIONS[number]["id"];

export const VEHICLE_ACCESS_OPTIONS = [
  { id: "small_truck", label: "Small Trucks", description: "Up to 3 ton" },
  { id: "medium_truck", label: "Medium Trucks", description: "Up to 10 ton" },
  { id: "large_truck", label: "Large Trucks", description: "Up to 20 ton" },
  { id: "trailer", label: "Trailers", description: "Semi-trailers" },
  { id: "container", label: "Container Trucks", description: "20/40ft containers" },
] as const;

// =============================================================================
// COMMERCIAL LAND OPTIONS
// =============================================================================

export const ZONING_OPTIONS = [
  { id: "commercial", label: "Commercial", description: "Business use" },
  { id: "industrial", label: "Industrial", description: "Manufacturing" },
  { id: "mixed_use", label: "Mixed Use", description: "Commercial + residential" },
  { id: "special", label: "Special Zone", description: "Specific permits" },
] as const;

export type ZoningType = typeof ZONING_OPTIONS[number]["id"];

export const TITLE_TYPE_OPTIONS = [
  { id: "freehold", label: "Freehold", description: "Full ownership" },
  { id: "leasehold", label: "Leasehold", description: "Government lease" },
] as const;

export type TitleType = typeof TITLE_TYPE_OPTIONS[number]["id"];

// =============================================================================
// PRICING OPTIONS
// =============================================================================

export const COMMERCIAL_PRICING_MODELS = [
  { id: "per_sqm", label: "Per sqm", description: "Rate × size" },
  { id: "fixed", label: "Fixed", description: "Set amount" },
  { id: "revenue_share", label: "Revenue %", description: "% of sales" },
  { id: "turnover", label: "Turnover", description: "% of turnover" },
  { id: "per_unit", label: "Per Unit", description: "Per space/room" },
] as const;

export type PricingModelType = typeof COMMERCIAL_PRICING_MODELS[number]["id"];

export const COMMERCIAL_PAYMENT_FREQUENCIES = [
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "semi_annual", label: "Semi-Annual" },
  { id: "annually", label: "Annually" },
] as const;

export type CommercialPaymentFrequency = typeof COMMERCIAL_PAYMENT_FREQUENCIES[number]["id"];

export const SERVICE_CHARGE_ITEMS = [
  { id: "security", label: "Security" },
  { id: "cleaning", label: "Cleaning" },
  { id: "elevator", label: "Elevator" },
  { id: "water", label: "Water" },
  { id: "electricity_common", label: "Common Area Power" },
  { id: "garbage", label: "Garbage Collection" },
  { id: "parking", label: "Parking Maintenance" },
  { id: "landscaping", label: "Landscaping" },
  { id: "insurance", label: "Building Insurance" },
  { id: "management", label: "Management Fee" },
] as const;

// =============================================================================
// COMMERCIAL AMENITIES
// =============================================================================

export const COMMERCIAL_AMENITY_CATEGORIES = {
  building: {
    title: "Building Features",
    icon: "building",
    amenities: [
      { id: "24_7_access", label: "24/7 Access" },
      { id: "elevator", label: "Lift/Elevator" },
      { id: "backup_generator", label: "Backup Generator" },
      { id: "fiber_internet", label: "Fiber Internet Ready" },
      { id: "loading_bay", label: "Loading Bay" },
      { id: "goods_lift", label: "Goods Lift" },
    ],
  },
  security: {
    title: "Security",
    icon: "shield",
    amenities: [
      { id: "security_24hr", label: "24hr Security Guards" },
      { id: "cctv", label: "CCTV Surveillance" },
      { id: "access_control", label: "Access Control System" },
      { id: "fire_system", label: "Fire Detection & Suppression" },
      { id: "visitor_management", label: "Visitor Management" },
    ],
  },
  parking: {
    title: "Parking",
    icon: "car",
    amenities: [
      { id: "dedicated_parking", label: "Dedicated Parking" },
      { id: "visitor_parking", label: "Visitor Parking" },
      { id: "covered_parking", label: "Covered Parking" },
      { id: "basement_parking", label: "Basement Parking" },
      { id: "ev_charging", label: "EV Charging Stations" },
    ],
  },
  facilities: {
    title: "Shared Facilities",
    icon: "coffee",
    amenities: [
      { id: "reception_lobby", label: "Reception/Lobby" },
      { id: "meeting_rooms", label: "Meeting Rooms" },
      { id: "conference_facility", label: "Conference Facility" },
      { id: "cafeteria", label: "Cafeteria" },
      { id: "gym", label: "Gym/Fitness" },
      { id: "rooftop_access", label: "Rooftop Access" },
    ],
  },
  utilities: {
    title: "Utilities",
    icon: "zap",
    amenities: [
      { id: "water_24_7", label: "24/7 Water Supply" },
      { id: "water_tank", label: "Water Storage Tank" },
      { id: "borehole", label: "Borehole" },
      { id: "solar_power", label: "Solar Power" },
      { id: "three_phase", label: "3-Phase Power" },
    ],
  },
} as const;

// =============================================================================
// COMMERCIAL FORM DATA INTERFACE
// =============================================================================

export interface CommercialFormData {
  // Category & Type
  listingCategory: ListingCategory;
  commercialType: CommercialType | null;
  commercialSubtype: CommercialSubtype | null;

  // Space Details (All Commercial)
  sizeSqm: number | null;
  fitoutLevel: FitoutLevel | null;
  floorLevel: string;
  buildingGrade: BuildingGrade | null;
  ceilingHeightM: number | null;
  
  // Office-Specific
  workstationCapacity: number | null;
  privateOffices: number;
  meetingRooms: number;
  layoutType: OfficeLayoutType | null;
  hvacType: HVACType | null;
  hasServerRoom: boolean;
  hasFiberReady: boolean;
  hasReception: boolean;
  hasPantry: "none" | "shared" | "private";
  
  // Retail-Specific
  frontageWidthM: number | null;
  footTraffic: FootTrafficType | null;
  visibilityRating: number;
  signageRights: SignageType | null;
  hasDisplayWindows: boolean;
  displayWindowSize: string;
  mallName: string;
  anchorTenantNearby: string;
  
  // F&B-Specific
  greaseTrap: boolean;
  exhaustSystem: boolean;
  exhaustDuctingToRoof: boolean;
  gasConnection: boolean;
  waterPoints: number;
  outdoorSeating: boolean;
  outdoorSeatingCapacity: number | null;
  liquorLicenseEligible: boolean;
  kitchenAreaSqm: number | null;
  seatingCapacity: number | null;
  barCounter: boolean;
  walkInCooler: boolean;
  deliveryReady: boolean;
  
  // Warehouse-Specific
  warehouseAreaSqm: number | null;
  officeAreaSqm: number | null;
  yardAreaSqm: number | null;
  clearHeightM: number | null;
  floorLoadCapacity: number | null;
  loadingDocks: number;
  driveInDoors: number;
  driveInDoorSize: string;
  hasDockLevelers: boolean;
  hasSprinklers: boolean;
  coldStorage: boolean;
  coldStorageTempRange: string;
  hasCrane: boolean;
  craneCapacity: string;
  hazmatApproved: boolean;
  operatingHours: OperatingHoursType;
  vehicleAccess: string[];
  hasWeighbridge: boolean;
  eaccBonded: boolean;
  
  // Automotive-Specific
  parkingSpacesCount: number | null;
  parkingType: "open" | "covered" | "basement" | "multi_story" | null;
  evChargingStations: number;
  vehicleLiftCount: number;
  workBays: number;
  inspectionPit: boolean;
  carWashType: "manual" | "automatic" | "self_service" | "tunnel" | null;
  waterRecyclingSystem: boolean;
  fuelTanks: { type: string; capacity: number }[];
  pumpIslands: number;
  convenienceStoreSqm: number | null;
  canopyCovered: boolean;
  dailyTrafficCount: number | null;
  
  // Commercial Land-Specific
  plotSizeSqm: number | null;
  plotSizeAcres: number | null;
  zoningType: ZoningType | null;
  permittedUses: string[];
  maxCoverageRatio: number | null;
  maxPlotRatio: number | null;
  roadFrontageM: number | null;
  isFenced: boolean;
  hasUtilities: boolean;
  utilitiesAvailable: string[];
  isTitled: boolean;
  titleType: TitleType | null;
  leaseRemainingYears: number | null;
  // Billboard specific
  billboardFacing: string;
  billboardSize: string;
  billboardIlluminated: boolean;
  billboardDigital: boolean;
  dailyImpressions: number | null;
  
  // Hospitality-Specific
  roomCount: number | null;
  bedCount: number | null;
  starRating: number | null;
  hasRestaurant: boolean;
  hasConferenceRooms: boolean;
  conferenceCapacity: number | null;
  hasSwimmingPool: boolean;
  eventCapacitySeated: number | null;
  eventCapacityStanding: number | null;
  hasCateringKitchen: boolean;
  hasStage: boolean;
  hasAvEquipment: boolean;
  outdoorSpaceSqm: number | null;
  tentedAllowed: boolean;
  
  // Healthcare-Specific
  consultationRooms: number;
  treatmentRooms: number;
  waitingAreaCapacity: number | null;
  hasPharmacyLicense: boolean;
  hasLabLicense: boolean;
  medicalWasteDisposal: boolean;
  dentalChairPlumbing: boolean;
  xrayShielding: boolean;
  wheelchairAccessible: boolean;
  hasElevator: boolean;
  backupPowerMedical: boolean;
  
  // Educational-Specific
  classroomCount: number;
  classroomCapacity: number | null;
  totalStudentCapacity: number | null;
  hasPlayground: boolean;
  playgroundSqm: number | null;
  hasComputerLab: boolean;
  hasScienceLab: boolean;
  hasLibrary: boolean;
  hasCafeteria: boolean;
  hasSickBay: boolean;
  approvedCurriculum: string[];
  ministryApproved: boolean;
  
  // Specialized-Specific
  // Data Center
  rackCapacity: number | null;
  powerRedundancy: string;
  coolingType: string;
  uptimeTier: "tier_1" | "tier_2" | "tier_3" | "tier_4" | null;
  fireSuppressionType: string;
  powerCapacityKva: number | null;
  networkConnectivity: string[];
  physicalSecurityLevel: "basic" | "enhanced" | "maximum" | null;
  // Studio (Recording)
  soundproofing: boolean;
  acousticTreatment: boolean;
  controlRoom: boolean;
  isoBoothCount: number;
  studioRoomCount: number;
  ceilingHeightStudios: number | null;
  flooringType: string;
  // Studio (Photo)
  cycloramaWall: boolean;
  blackoutCapability: boolean;
  naturalLightControl: boolean;
  studioLightingRig: boolean;
  makeupRoom: boolean;
  changeRoom: boolean;
  propStorageArea: boolean;
  // Gym/Fitness
  gymFloorSqm: number | null;
  highCeilingForGym: boolean;
  showerCount: number;
  lockerRooms: number;
  mirroredWalls: boolean;
  rubberFlooring: boolean;
  cardioZoneSqm: number | null;
  weightsZoneSqm: number | null;
  groupClassStudio: boolean;
  saunaOrSteam: boolean;
  swimmingPool: boolean;
  poolLaneCount: number;
  // Salon/Spa
  stylingStations: number;
  washBasins: number;
  treatmentBeds: number;
  treatmentRoomsSpa: number;
  manicurePedicureStations: number;
  ventilationForChemicals: boolean;
  waitingAreaCapacitySalon: number | null;
  retailDisplayArea: boolean;
  // Religious Facility
  worshipHallCapacity: number | null;
  prayerHallSqm: number | null;
  ablutionFacilities: boolean;
  separateGenderAreas: boolean;
  minaretOrBellTower: boolean;
  parkingCapacityReligious: number | null;
  multipurposeHall: boolean;
  kitchenFacilities: boolean;
  officeRoomsReligious: number;
  soundSystemInstalled: boolean;
  // Bank Branch
  customerServiceArea: number | null;
  tellerCounterPositions: number;
  privateOfficeBanking: number;
  vaultRoom: boolean;
  vaultRoomSqm: number | null;
  safeDepositArea: boolean;
  atmLocations: number;
  driveThruWindow: boolean;
  nightDepositBox: boolean;
  securityControlRoom: boolean;
  bulletproofGlass: boolean;
  disabledAccess: boolean;
  customerParkingSpaces: number | null;
  // ATM Site
  atmBoothSecure: boolean;
  powerBackup24h: boolean;
  cctvCoverage: boolean;
  directStreetAccess: boolean;
  lobbyEnclosed: boolean;
  airConditioned: boolean;
  footTrafficLevel: "low" | "medium" | "high" | "very_high" | null;
  nearbyLandmarks: string;
  
  // Commercial Pricing
  rentPerSqm: number | null;
  pricingModel: PricingModelType;
  serviceChargeMonthly: number | null;
  serviceChargePerSqm: number | null;
  serviceChargeIncludes: string[];
  rentEscalationPercent: number | null;
  minLeaseMonths: number | null;
  maxLeaseYears: number | null;
  tiAllowance: number | null;
  tiAllowancePerSqm: number | null;
  commercialPaymentFrequency: CommercialPaymentFrequency;
  revenueSharePercent: number | null;
  baseRentPlusShare: boolean;
  depositMonthsCommercial: number;
  rentFreePeriodMonths: number | null;
  goodwillAmount: number | null;
  
  // Commercial Amenities
  commercialAmenities: string[];
  powerKva: number | null;
  has3PhasePower: boolean;
  
  // Commercial Lease Terms
  minimumLease: string;
  fitoutAllowed: boolean;
  subleaseAllowed: boolean;
}

// =============================================================================
// DEFAULT COMMERCIAL FORM DATA
// =============================================================================

export const DEFAULT_COMMERCIAL_FORM_DATA: CommercialFormData = {
  listingCategory: "commercial",
  commercialType: null,
  commercialSubtype: null,
  
  sizeSqm: null,
  fitoutLevel: null,
  floorLevel: "",
  buildingGrade: null,
  ceilingHeightM: null,
  
  // Office
  workstationCapacity: null,
  privateOffices: 0,
  meetingRooms: 0,
  layoutType: null,
  hvacType: null,
  hasServerRoom: false,
  hasFiberReady: false,
  hasReception: false,
  hasPantry: "none",
  
  // Retail
  frontageWidthM: null,
  footTraffic: null,
  visibilityRating: 3,
  signageRights: null,
  hasDisplayWindows: false,
  displayWindowSize: "",
  mallName: "",
  anchorTenantNearby: "",
  
  // F&B
  greaseTrap: false,
  exhaustSystem: false,
  exhaustDuctingToRoof: false,
  gasConnection: false,
  waterPoints: 0,
  outdoorSeating: false,
  outdoorSeatingCapacity: null,
  liquorLicenseEligible: false,
  kitchenAreaSqm: null,
  seatingCapacity: null,
  barCounter: false,
  walkInCooler: false,
  deliveryReady: false,
  
  // Warehouse
  warehouseAreaSqm: null,
  officeAreaSqm: null,
  yardAreaSqm: null,
  clearHeightM: null,
  floorLoadCapacity: null,
  loadingDocks: 0,
  driveInDoors: 0,
  driveInDoorSize: "",
  hasDockLevelers: false,
  hasSprinklers: false,
  coldStorage: false,
  coldStorageTempRange: "",
  hasCrane: false,
  craneCapacity: "",
  hazmatApproved: false,
  operatingHours: "business_hours",
  vehicleAccess: [],
  hasWeighbridge: false,
  eaccBonded: false,
  
  // Automotive
  parkingSpacesCount: null,
  parkingType: null,
  evChargingStations: 0,
  vehicleLiftCount: 0,
  workBays: 0,
  inspectionPit: false,
  carWashType: null,
  waterRecyclingSystem: false,
  fuelTanks: [],
  pumpIslands: 0,
  convenienceStoreSqm: null,
  canopyCovered: false,
  dailyTrafficCount: null,
  
  // Commercial Land
  plotSizeSqm: null,
  plotSizeAcres: null,
  zoningType: null,
  permittedUses: [],
  maxCoverageRatio: null,
  maxPlotRatio: null,
  roadFrontageM: null,
  isFenced: false,
  hasUtilities: false,
  utilitiesAvailable: [],
  isTitled: true,
  titleType: null,
  leaseRemainingYears: null,
  billboardFacing: "",
  billboardSize: "",
  billboardIlluminated: false,
  billboardDigital: false,
  dailyImpressions: null,
  
  // Hospitality
  roomCount: null,
  bedCount: null,
  starRating: null,
  hasRestaurant: false,
  hasConferenceRooms: false,
  conferenceCapacity: null,
  hasSwimmingPool: false,
  eventCapacitySeated: null,
  eventCapacityStanding: null,
  hasCateringKitchen: false,
  hasStage: false,
  hasAvEquipment: false,
  outdoorSpaceSqm: null,
  tentedAllowed: false,
  
  // Healthcare
  consultationRooms: 0,
  treatmentRooms: 0,
  waitingAreaCapacity: null,
  hasPharmacyLicense: false,
  hasLabLicense: false,
  medicalWasteDisposal: false,
  dentalChairPlumbing: false,
  xrayShielding: false,
  wheelchairAccessible: false,
  hasElevator: false,
  backupPowerMedical: false,
  
  // Educational
  classroomCount: 0,
  classroomCapacity: null,
  totalStudentCapacity: null,
  hasPlayground: false,
  playgroundSqm: null,
  hasComputerLab: false,
  hasScienceLab: false,
  hasLibrary: false,
  hasCafeteria: false,
  hasSickBay: false,
  approvedCurriculum: [],
  ministryApproved: false,
  
  // Specialized
  // Data Center
  rackCapacity: null,
  powerRedundancy: "",
  coolingType: "",
  uptimeTier: null,
  fireSuppressionType: "",
  powerCapacityKva: null,
  networkConnectivity: [],
  physicalSecurityLevel: null,
  // Studio (Recording)
  soundproofing: false,
  acousticTreatment: false,
  controlRoom: false,
  isoBoothCount: 0,
  studioRoomCount: 0,
  ceilingHeightStudios: null,
  flooringType: "",
  // Studio (Photo)
  cycloramaWall: false,
  blackoutCapability: false,
  naturalLightControl: false,
  studioLightingRig: false,
  makeupRoom: false,
  changeRoom: false,
  propStorageArea: false,
  // Gym/Fitness
  gymFloorSqm: null,
  highCeilingForGym: false,
  showerCount: 0,
  lockerRooms: 0,
  mirroredWalls: false,
  rubberFlooring: false,
  cardioZoneSqm: null,
  weightsZoneSqm: null,
  groupClassStudio: false,
  saunaOrSteam: false,
  swimmingPool: false,
  poolLaneCount: 0,
  // Salon/Spa
  stylingStations: 0,
  washBasins: 0,
  treatmentBeds: 0,
  treatmentRoomsSpa: 0,
  manicurePedicureStations: 0,
  ventilationForChemicals: false,
  waitingAreaCapacitySalon: null,
  retailDisplayArea: false,
  // Religious Facility
  worshipHallCapacity: null,
  prayerHallSqm: null,
  ablutionFacilities: false,
  separateGenderAreas: false,
  minaretOrBellTower: false,
  parkingCapacityReligious: null,
  multipurposeHall: false,
  kitchenFacilities: false,
  officeRoomsReligious: 0,
  soundSystemInstalled: false,
  // Bank Branch
  customerServiceArea: null,
  tellerCounterPositions: 0,
  privateOfficeBanking: 0,
  vaultRoom: false,
  vaultRoomSqm: null,
  safeDepositArea: false,
  atmLocations: 0,
  driveThruWindow: false,
  nightDepositBox: false,
  securityControlRoom: false,
  bulletproofGlass: false,
  disabledAccess: false,
  customerParkingSpaces: null,
  // ATM Site
  atmBoothSecure: false,
  powerBackup24h: false,
  cctvCoverage: false,
  directStreetAccess: false,
  lobbyEnclosed: false,
  airConditioned: false,
  footTrafficLevel: null,
  nearbyLandmarks: "",
  
  // Commercial Pricing
  rentPerSqm: null,
  pricingModel: "fixed",
  serviceChargeMonthly: null,
  serviceChargePerSqm: null,
  serviceChargeIncludes: [],
  rentEscalationPercent: null,
  minLeaseMonths: 12,
  maxLeaseYears: null,
  tiAllowance: null,
  tiAllowancePerSqm: null,
  commercialPaymentFrequency: "monthly",
  revenueSharePercent: null,
  baseRentPlusShare: false,
  depositMonthsCommercial: 3,
  rentFreePeriodMonths: null,
  goodwillAmount: null,
  
  // Commercial Amenities
  commercialAmenities: [],
  powerKva: null,
  has3PhasePower: false,
  
  // Commercial Lease Terms
  minimumLease: "1_year",
  fitoutAllowed: false,
  subleaseAllowed: false,
};
