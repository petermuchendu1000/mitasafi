/**
 * MitaSafi Property Management Types
 * 
 * Enhanced types for the rental management system including:
 * - Buildings (multi-unit properties)
 * - Units
 * - Tenants (landlord-managed)
 * - Leases
 * - Payments
 * - Maintenance Requests
 */

import { Json } from './database';

// ===========================================
// BUILDING TYPES
// ===========================================

export type BuildingType = 
  | 'apartment' 
  | 'flat_block' 
  | 'townhouse_complex' 
  | 'gated_community' 
  | 'student_hostel' 
  | 'mixed_use' 
  | 'other';

export type ManagementType = 'self' | 'caretaker' | 'property_manager';

export type BuildingStatus = 'active' | 'inactive' | 'archived';

export interface SecurityFeatures {
  perimeter_wall?: boolean;
  electric_fence?: boolean;
  security_guards?: 'none' | 'daytime' | '24_hour';
  cctv?: 'none' | 'entry_only' | 'full';
  access_control?: 'none' | 'key' | 'card' | 'biometric';
  intercom?: boolean;
  boom_barrier?: boolean;
}

export interface WaterPowerFeatures {
  water_source?: 'county' | 'borehole' | 'both';
  water_storage?: 'none' | 'tank' | 'multiple_tanks';
  water_capacity_liters?: number;
  water_reliability?: 'rationed' | '24_7';
  backup_generator?: 'none' | 'common_areas' | 'full';
  generator_fuel?: 'shared' | 'included';
  solar?: 'none' | 'lighting' | 'water_heating' | 'partial';
}

export interface ParkingFeatures {
  type?: 'none' | 'open' | 'covered' | 'basement';
  allocation?: 'per_unit' | 'shared' | 'first_come';
  total_spaces?: number;
  visitor_spaces?: number;
  motorcycle?: boolean;
  ev_charging?: boolean;
}

export interface CommonFacilities {
  lift?: boolean;
  swimming_pool?: boolean;
  gym?: boolean;
  playground?: boolean;
  garden?: boolean;
  rooftop?: boolean;
  bbq?: boolean;
  laundry?: boolean;
  clubhouse?: boolean;
  staff_quarters?: boolean;
}

export interface BuildingServices {
  garbage?: 'county' | 'private' | 'building';
  internet_ready?: boolean;
  available_isps?: string[];
  gas?: 'none' | 'cylinder' | 'piped';
  caretaker_onsite?: boolean;
}

export interface BuildingPolicies {
  pets?: 'no' | 'small_only' | 'all' | 'case_by_case';
  smoking?: 'allowed' | 'balcony_only' | 'not_allowed';
  business_use?: 'allowed' | 'not_allowed' | 'approval_needed';
  airbnb?: boolean;
  quiet_hours?: string;
  move_in_out_times?: string;
}

export interface BankDetails {
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  mpesa_paybill?: string;
  mpesa_till?: string;
  mpesa_account?: string;
}

export interface Building {
  id: string;
  landlord_id: string;
  name: string;
  building_type: BuildingType;
  year_built: number | null;
  total_floors: number | null;
  total_units: number;
  plot_number: string | null;
  management_type: ManagementType;
  address: string;
  area: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  landmarks: string | null;
  access_instructions: string | null;
  security_features: SecurityFeatures;
  water_power: WaterPowerFeatures;
  parking: ParkingFeatures;
  common_facilities: CommonFacilities;
  services: BuildingServices;
  policies: BuildingPolicies;
  service_charge: number | null;
  service_charge_includes: string[] | null;
  collection_via_mitasafi: boolean;
  bank_details: BankDetails;
  photos: string[];
  cover_photo: string | null;
  status: BuildingStatus;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface BuildingInsert {
  id?: string;
  landlord_id: string;
  name: string;
  building_type: BuildingType;
  year_built?: number | null;
  total_floors?: number | null;
  total_units?: number;
  plot_number?: string | null;
  management_type?: ManagementType;
  address: string;
  area: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  landmarks?: string | null;
  access_instructions?: string | null;
  security_features?: SecurityFeatures;
  water_power?: WaterPowerFeatures;
  parking?: ParkingFeatures;
  common_facilities?: CommonFacilities;
  services?: BuildingServices;
  policies?: BuildingPolicies;
  service_charge?: number | null;
  service_charge_includes?: string[] | null;
  collection_via_mitasafi?: boolean;
  bank_details?: BankDetails;
  photos?: string[];
  cover_photo?: string | null;
  status?: BuildingStatus;
  metadata?: Json;
}

export interface BuildingUpdate extends Partial<BuildingInsert> {}

// ===========================================
// UNIT TYPES
// ===========================================

export type UnitType = 
  | 'bedsitter' 
  | 'studio' 
  | '1br' 
  | '2br' 
  | '3br' 
  | '4br' 
  | '5br_plus'
  | 'penthouse' 
  | 'duplex' 
  | 'loft' 
  | 'house' 
  | 'townhouse' 
  | 'villa' 
  | 'maisonette' 
  | 'bungalow';

export type UnitStatus = 'vacant' | 'occupied' | 'maintenance' | 'reserved';
export type ListingStatus = 'unlisted' | 'listed' | 'reserved';
export type UnitCondition = 'excellent' | 'good' | 'fair' | 'needs_work';
export type Furnishing = 'unfurnished' | 'partial' | 'fully_furnished';
export type DiningArea = 'separate' | 'open' | 'none';
export type KitchenType = 'open' | 'separate' | 'kitchenette';
export type LightVentilation = 'poor' | 'average' | 'good' | 'excellent';

export interface KitchenFeatures {
  cabinets?: 'none' | 'basic' | 'full';
  countertop?: 'tiles' | 'granite' | 'marble';
  sink?: 'single' | 'double';
  gas_point?: boolean;
  exhaust?: boolean;
}

export interface BathroomFeatures {
  hot_water?: 'none' | 'electric' | 'solar' | 'gas';
  heater_type?: 'instant' | 'storage';
  bathtub?: boolean;
  shower?: 'basic' | 'rain';
  toilet?: 'standard' | 'western' | 'bidet';
}

export interface ClimateControl {
  ac?: 'none' | 'split' | 'central' | 'pre_wired';
  ac_units?: number;
  ceiling_fans?: boolean;
  ceiling_fans_count?: number;
}

export interface StorageFeatures {
  built_in_wardrobes?: boolean;
  wardrobe_count?: number;
  walk_in_closet?: boolean;
  shoe_rack?: boolean;
  linen_closet?: boolean;
}

export interface UnitSecurityFeatures {
  door_type?: 'wooden' | 'steel' | 'security';
  window_grills?: boolean;
  alarm?: boolean;
  video_intercom?: boolean;
  safe_room?: boolean;
}

export interface FurnishedItems {
  living_room?: boolean;
  bedroom?: boolean;
  dining?: boolean;
  appliances?: string[];
  electronics?: string[];
  linens?: boolean;
}

export interface WaterCharge {
  type?: 'metered' | 'flat' | 'included';
  amount?: number;
}

export interface ElectricityInfo {
  type?: 'prepaid' | 'postpaid';
  meter_number?: string;
}

export interface DSQDetails {
  has_bathroom?: boolean;
  has_kitchen?: boolean;
  size_sqm?: number;
}

export interface Unit {
  id: string;
  building_id: string | null;
  landlord_id: string;
  unit_number: string;
  floor_level: string | null;
  wing_block: string | null;
  unit_type: UnitType;
  position: string | null;
  facing: string | null;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number | null;
  has_dsq: boolean;
  dsq_details: DSQDetails;
  living_rooms: number;
  dining_area: DiningArea | null;
  kitchen_type: KitchenType | null;
  balconies: number;
  store_room: boolean;
  overall_condition: UnitCondition;
  last_renovated: number | null;
  flooring: string | null;
  ceiling_type: string | null;
  natural_light: LightVentilation | null;
  ventilation: LightVentilation | null;
  kitchen_features: KitchenFeatures;
  bathroom_features: BathroomFeatures;
  climate_control: ClimateControl;
  storage_features: StorageFeatures;
  security_features: UnitSecurityFeatures;
  furnishing: Furnishing;
  furnished_items: FurnishedItems;
  monthly_rent: number;
  currency: string;
  rent_negotiable: boolean;
  deposit_months: number;
  deposit_amount: number | null;
  service_charge: number | null;
  water_charge: WaterCharge;
  electricity_info: ElectricityInfo;
  parking_fee: number | null;
  pet_deposit: number | null;
  other_fees: Json;
  status: UnitStatus;
  listing_status: ListingStatus;
  available_from: string | null;
  minimum_lease_months: number;
  maximum_lease_months: number | null;
  notice_period_months: number;
  photos: string[];
  cover_photo: string | null;
  floor_plan: string | null;
  video_tour: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface UnitInsert {
  id?: string;
  building_id?: string | null;
  landlord_id: string;
  unit_number: string;
  floor_level?: string | null;
  wing_block?: string | null;
  unit_type: UnitType;
  position?: string | null;
  facing?: string | null;
  bedrooms?: number;
  bathrooms?: number;
  size_sqm?: number | null;
  has_dsq?: boolean;
  dsq_details?: DSQDetails;
  living_rooms?: number;
  dining_area?: DiningArea | null;
  kitchen_type?: KitchenType | null;
  balconies?: number;
  store_room?: boolean;
  overall_condition?: UnitCondition;
  last_renovated?: number | null;
  flooring?: string | null;
  ceiling_type?: string | null;
  natural_light?: LightVentilation | null;
  ventilation?: LightVentilation | null;
  kitchen_features?: KitchenFeatures;
  bathroom_features?: BathroomFeatures;
  climate_control?: ClimateControl;
  storage_features?: StorageFeatures;
  security_features?: UnitSecurityFeatures;
  furnishing?: Furnishing;
  furnished_items?: FurnishedItems;
  monthly_rent: number;
  currency?: string;
  rent_negotiable?: boolean;
  deposit_months?: number;
  deposit_amount?: number | null;
  service_charge?: number | null;
  water_charge?: WaterCharge;
  electricity_info?: ElectricityInfo;
  parking_fee?: number | null;
  pet_deposit?: number | null;
  other_fees?: Json;
  status?: UnitStatus;
  listing_status?: ListingStatus;
  available_from?: string | null;
  minimum_lease_months?: number;
  maximum_lease_months?: number | null;
  notice_period_months?: number;
  photos?: string[];
  cover_photo?: string | null;
  floor_plan?: string | null;
  video_tour?: string | null;
  metadata?: Json;
}

export interface UnitUpdate extends Partial<UnitInsert> {}

// ===========================================
// TENANT TYPES
// ===========================================

export type TenantStatus = 'active' | 'inactive' | 'blacklisted';
export type VerificationLevel = 'basic' | 'phone_verified' | 'id_verified' | 'employment_verified' | 'reference_checked' | 'credit_checked';
export type IDType = 'national_id' | 'passport' | 'alien_id';

export interface EmergencyContact {
  name: string;
  relationship: 'spouse' | 'parent' | 'sibling' | 'friend' | 'other';
  phone: string;
  phone_alt?: string;
}

export interface OccupantInfo {
  adults?: number;
  children?: number;
  pets?: Array<{ type: string; breed?: string; count?: number }>;
  vehicles?: Array<{ type: 'car' | 'motorcycle' | 'other'; plate?: string }>;
}

export interface Tenant {
  id: string;
  user_id: string | null;
  created_by: string;
  full_name: string;
  phone: string;
  phone_secondary: string | null;
  email: string | null;
  id_type: IDType | null;
  id_number: string | null;
  id_document_url: string | null;
  occupation: string | null;
  employer: string | null;
  employer_phone: string | null;
  verification_level: VerificationLevel;
  verified_at: string | null;
  emergency_contact: EmergencyContact | null;
  default_occupants: OccupantInfo;
  status: TenantStatus;
  blacklist_reason: string | null;
  notes: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface TenantInsert {
  id?: string;
  user_id?: string | null;
  created_by: string;
  full_name: string;
  phone: string;
  phone_secondary?: string | null;
  email?: string | null;
  id_type?: IDType | null;
  id_number?: string | null;
  id_document_url?: string | null;
  occupation?: string | null;
  employer?: string | null;
  employer_phone?: string | null;
  verification_level?: VerificationLevel;
  verified_at?: string | null;
  emergency_contact?: EmergencyContact | null;
  default_occupants?: OccupantInfo;
  status?: TenantStatus;
  blacklist_reason?: string | null;
  notes?: string | null;
  metadata?: Json;
}

export interface TenantUpdate extends Partial<TenantInsert> {}

// ===========================================
// LEASE TYPES
// ===========================================

export type LeaseType = 'fixed' | 'month_to_month' | 'renewable';
export type LeaseStatus = 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated' | 'renewed';
export type DepositStatus = 'pending' | 'held' | 'partially_refunded' | 'refunded';
export type PaymentMethod = 'mpesa' | 'bank' | 'cash' | 'cheque' | 'mixed';
export type LateFeeType = 'none' | 'fixed' | 'percentage' | 'daily';
export type TerminatedBy = 'landlord' | 'tenant' | 'mutual' | 'breach';

export interface PaymentAccount {
  mpesa_paybill?: string;
  mpesa_till?: string;
  account_number?: string;
  bank_account?: string;
}

export interface DepositDeduction {
  reason: string;
  amount: number;
  date: string;
}

export interface LeaseInclusions {
  water?: 'included' | 'metered' | 'capped' | 'tenant';
  electricity?: 'included' | 'tenant';
  service_charge?: 'included' | 'separate';
  parking?: 'included' | 'extra' | 'not_available';
  internet?: 'included' | 'tenant';
  generator?: 'included' | 'metered' | 'contribution';
}

export interface Lease {
  id: string;
  unit_id: string;
  tenant_id: string;
  landlord_id: string;
  start_date: string;
  end_date: string | null;
  lease_type: LeaseType;
  monthly_rent: number;
  rent_due_day: number;
  deposit_amount: number | null;
  deposit_status: DepositStatus;
  deposit_refunded: number;
  deposit_deductions: DepositDeduction[];
  payment_method: PaymentMethod;
  payment_account: PaymentAccount;
  late_fee_type: LateFeeType | null;
  late_fee_amount: number | null;
  late_fee_percentage: number | null;
  grace_period_days: number;
  inclusions: LeaseInclusions;
  notice_period_months: number;
  renewal_terms: string | null;
  special_conditions: string | null;
  occupants: OccupantInfo;
  lease_document_url: string | null;
  move_in_checklist: Json;
  move_out_checklist: Json;
  other_documents: string[];
  status: LeaseStatus;
  terminated_at: string | null;
  termination_reason: string | null;
  terminated_by: TerminatedBy | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface LeaseInsert {
  id?: string;
  unit_id: string;
  tenant_id: string;
  landlord_id: string;
  start_date: string;
  end_date?: string | null;
  lease_type?: LeaseType;
  monthly_rent: number;
  rent_due_day?: number;
  deposit_amount?: number | null;
  deposit_status?: DepositStatus;
  deposit_refunded?: number;
  deposit_deductions?: DepositDeduction[];
  payment_method?: PaymentMethod;
  payment_account?: PaymentAccount;
  late_fee_type?: LateFeeType | null;
  late_fee_amount?: number | null;
  late_fee_percentage?: number | null;
  grace_period_days?: number;
  inclusions?: LeaseInclusions;
  notice_period_months?: number;
  renewal_terms?: string | null;
  special_conditions?: string | null;
  occupants?: OccupantInfo;
  lease_document_url?: string | null;
  move_in_checklist?: Json;
  move_out_checklist?: Json;
  other_documents?: string[];
  status?: LeaseStatus;
  terminated_at?: string | null;
  termination_reason?: string | null;
  terminated_by?: TerminatedBy | null;
  metadata?: Json;
}

export interface LeaseUpdate extends Partial<LeaseInsert> {}

// ===========================================
// PAYMENT TYPES
// ===========================================

export type PaymentType = 
  | 'rent' 
  | 'deposit' 
  | 'service_charge' 
  | 'water' 
  | 'electricity' 
  | 'late_fee' 
  | 'deposit_refund' 
  | 'repair_deduction' 
  | 'other';

export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'reversed' | 'disputed';

export interface Payment {
  id: string;
  lease_id: string;
  amount: number;
  payment_type: PaymentType;
  period_month: number | null;
  period_year: number | null;
  period_start: string | null;
  period_end: string | null;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number: string | null;
  mpesa_receipt: string | null;
  mpesa_phone: string | null;
  mpesa_name: string | null;
  auto_matched: boolean;
  status: PaymentStatus;
  confirmed_at: string | null;
  confirmed_by: string | null;
  received_by: string | null;
  receipt_issued: boolean;
  receipt_number: string | null;
  notes: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface PaymentInsert {
  id?: string;
  lease_id: string;
  amount: number;
  payment_type: PaymentType;
  period_month?: number | null;
  period_year?: number | null;
  period_start?: string | null;
  period_end?: string | null;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string | null;
  mpesa_receipt?: string | null;
  mpesa_phone?: string | null;
  mpesa_name?: string | null;
  auto_matched?: boolean;
  status?: PaymentStatus;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  received_by?: string | null;
  receipt_issued?: boolean;
  receipt_number?: string | null;
  notes?: string | null;
  metadata?: Json;
}

export interface PaymentUpdate extends Partial<PaymentInsert> {}

// ===========================================
// MAINTENANCE REQUEST TYPES
// ===========================================

export type MaintenanceCategory = 
  | 'plumbing' 
  | 'electrical' 
  | 'hvac' 
  | 'appliances' 
  | 'structural' 
  | 'locks_security' 
  | 'painting' 
  | 'pest_control' 
  | 'general' 
  | 'other';

export type MaintenanceUrgency = 'emergency' | 'high' | 'normal' | 'low';
export type MaintenanceStatus = 'open' | 'acknowledged' | 'assigned' | 'in_progress' | 'completed' | 'closed' | 'cancelled';
export type CostPaidBy = 'landlord' | 'tenant' | 'building' | 'shared' | 'warranty';

export interface MaintenanceRequest {
  id: string;
  unit_id: string;
  tenant_id: string | null;
  landlord_id: string;
  category: MaintenanceCategory;
  title: string;
  description: string;
  urgency: MaintenanceUrgency;
  photos: string[];
  status: MaintenanceStatus;
  acknowledged_at: string | null;
  assigned_to: string | null;
  assigned_phone: string | null;
  assigned_at: string | null;
  diagnosis: string | null;
  work_performed: string | null;
  parts_used: string[] | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  cost_paid_by: CostPaidBy | null;
  completed_at: string | null;
  completion_photos: string[];
  tenant_rating: number | null;
  tenant_feedback: string | null;
  preferred_time: string | null;
  scheduled_date: string | null;
  scheduled_time_slot: string | null;
  access_instructions: string | null;
  reported_at: string;
  due_date: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequestInsert {
  id?: string;
  unit_id: string;
  tenant_id?: string | null;
  landlord_id: string;
  category: MaintenanceCategory;
  title: string;
  description: string;
  urgency?: MaintenanceUrgency;
  photos?: string[];
  status?: MaintenanceStatus;
  acknowledged_at?: string | null;
  assigned_to?: string | null;
  assigned_phone?: string | null;
  assigned_at?: string | null;
  diagnosis?: string | null;
  work_performed?: string | null;
  parts_used?: string[] | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  cost_paid_by?: CostPaidBy | null;
  completed_at?: string | null;
  completion_photos?: string[];
  tenant_rating?: number | null;
  tenant_feedback?: string | null;
  preferred_time?: string | null;
  scheduled_date?: string | null;
  scheduled_time_slot?: string | null;
  access_instructions?: string | null;
  reported_at?: string;
  due_date?: string | null;
  metadata?: Json;
}

export interface MaintenanceRequestUpdate extends Partial<MaintenanceRequestInsert> {}

// ===========================================
// STATS & AGGREGATES
// ===========================================

export interface BuildingStats {
  total_units: number;
  vacant_units: number;
  occupied_units: number;
  maintenance_units: number;
  total_rent: number | null;
  average_rent: number | null;
}

export interface LandlordPortfolioStats {
  total_buildings: number;
  total_units: number;
  vacant_units: number;
  occupied_units: number;
  active_tenants: number;
  active_leases: number;
  expected_monthly_rent: number;
  open_maintenance: number;
}

export interface PaymentHistoryItem {
  month_year: string;
  rent_due: number;
  rent_paid: number;
  payment_status: 'paid' | 'partial' | 'overdue' | 'pending';
}

// ===========================================
// COMPOSITE TYPES (for UI)
// ===========================================

export interface BuildingWithUnits extends Building {
  units: Unit[];
  stats: BuildingStats;
}

export interface UnitWithTenant extends Unit {
  building?: Building;
  current_lease?: Lease;
  current_tenant?: Tenant;
}

export interface LeaseWithDetails extends Lease {
  unit: Unit;
  tenant: Tenant;
  payments: Payment[];
  building?: Building;
}

export interface TenantWithLeases extends Tenant {
  leases: Lease[];
  current_unit?: Unit;
}

// ===========================================
// FORM TYPES (for wizards)
// ===========================================

export interface BuildingFormData {
  // Step 1: Basics
  name: string;
  building_type: BuildingType;
  address: string;
  area: string;
  city: string;
  latitude?: number;
  longitude?: number;
  total_floors?: number;
  total_units?: number;
  year_built?: number;
  
  // Step 2: Amenities
  security_features: SecurityFeatures;
  water_power: WaterPowerFeatures;
  parking: ParkingFeatures;
  common_facilities: CommonFacilities;
  services: BuildingServices;
  
  // Step 3: Policies
  policies: BuildingPolicies;
  
  // Step 4: Photos
  photos: string[];
  cover_photo?: string;
  
  // Step 5: Financials
  service_charge?: number;
  service_charge_includes?: string[];
  collection_via_mitasafi: boolean;
  bank_details: BankDetails;
  management_type: ManagementType;
}

export interface UnitFormData {
  // Identification
  unit_number: string;
  floor_level?: string;
  wing_block?: string;
  unit_type: UnitType;
  
  // Physical
  bedrooms: number;
  bathrooms: number;
  size_sqm?: number;
  has_dsq: boolean;
  
  // Amenities
  kitchen_features: KitchenFeatures;
  bathroom_features: BathroomFeatures;
  climate_control: ClimateControl;
  storage_features: StorageFeatures;
  security_features: UnitSecurityFeatures;
  
  // Condition
  overall_condition: UnitCondition;
  furnishing: Furnishing;
  furnished_items?: FurnishedItems;
  
  // Photos
  photos: string[];
  cover_photo?: string;
  
  // Pricing
  monthly_rent: number;
  deposit_months: number;
  deposit_amount?: number;
  service_charge?: number;
  water_charge?: WaterCharge;
  parking_fee?: number;
  
  // Status
  status: UnitStatus;
  available_from?: string;
  minimum_lease_months: number;
}

export interface TenantFormData {
  full_name: string;
  phone: string;
  phone_secondary?: string;
  email?: string;
  id_type?: IDType;
  id_number?: string;
  occupation?: string;
  employer?: string;
  emergency_contact?: EmergencyContact;
  default_occupants?: OccupantInfo;
  notes?: string;
}

export interface LeaseFormData {
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date?: string;
  lease_type: LeaseType;
  monthly_rent: number;
  rent_due_day: number;
  deposit_amount?: number;
  payment_method: PaymentMethod;
  payment_account?: PaymentAccount;
  inclusions: LeaseInclusions;
  late_fee_type?: LateFeeType;
  late_fee_amount?: number;
  grace_period_days: number;
  notice_period_months: number;
  special_conditions?: string;
  occupants?: OccupantInfo;
}
