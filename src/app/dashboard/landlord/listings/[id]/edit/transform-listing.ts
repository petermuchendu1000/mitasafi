/**
 * Transform Listing Data
 * 
 * Transforms database listing record back to PropertyFormData
 * for editing in the wizard.
 */

import type { PropertyFormData, PropertyPhoto } from "../../new/types";
import { DEFAULT_FORM_DATA } from "../../new/types";
import { DEFAULT_COMMERCIAL_FORM_DATA } from "../../new/commercial-types";
import type { Database } from "@/types/database";

type ListingRow = Database["public"]["Tables"]["listings"]["Row"];

/**
 * Transform database listing to form data
 */
export function transformListingToFormData(listing: ListingRow): PropertyFormData {
  // Parse JSON fields safely
  const securityFeatures = (listing.security_features || {}) as Record<string, unknown>;
  const utilities = (listing.utilities || {}) as Record<string, unknown>;
  const commercialAttributes = (listing.commercial_attributes || {}) as Record<string, unknown>;
  
  // Parse photos array
  const photos: PropertyPhoto[] = Array.isArray(listing.photos) 
    ? (listing.photos as Array<{
        id: string;
        url: string;
        path: string;
        category: string;
        sort_order: number;
      }>).map((photo, index) => ({
        id: photo.id || `photo-${index}`,
        file: undefined,
        preview: photo.url,
        url: photo.url,
        path: photo.path,
        category: photo.category,
        isUploading: false,
      }))
    : [];

  // Determine listing category
  const listingCategory = listing.listing_category === "commercial" ? "commercial" : "residential";
  const isCommercial = listingCategory === "commercial";

  // Base form data
  const formData: PropertyFormData = {
    ...DEFAULT_FORM_DATA,
    
    // Listing Category
    listingCategory,
    
    // Step 1: Property Type
    propertyType: listing.property_type as PropertyFormData["propertyType"],
    
    // Step 2: Location
    buildingName: listing.building_name || "",
    address: listing.address || "",
    streetAddress: listing.address || "",
    latitude: listing.latitude,
    longitude: listing.longitude,
    area: listing.area || "",
    city: listing.city || "Nairobi",
    unitNumber: "",
    hideExactAddress: listing.hide_exact_address ?? false,
    landmarks: listing.landmarks || "",
    plotNumber: "",
    
    // Step 3: Details
    bedrooms: listing.bedrooms || 0,
    bathrooms: listing.bathrooms || 0,
    sizeSqft: listing.size_sqft,
    sizeUnit: (listing.size_unit as "sqft" | "sqm") || "sqft",
    floorLevel: listing.floor_level || "",
    totalFloors: listing.total_floors,
    yearBuilt: listing.year_built,
    condition: listing.condition as PropertyFormData["condition"],
    lastRenovated: null,
    furnishing: (listing.furnishing as PropertyFormData["furnishing"]) || "unfurnished",
    
    // Step 4: Amenities
    amenities: listing.amenities || [],
    parking: (listing.parking as PropertyFormData["parking"]) || "none",
    parkingSpaces: listing.parking_spaces || 0,
    parkingType: [],
    visitorParking: false,
    kitchenType: "full",
    
    // Policies
    petPolicy: (listing.pet_policy as PropertyFormData["petPolicy"]) || "not_allowed",
    smokingPolicy: (listing.smoking_policy as PropertyFormData["smokingPolicy"]) || "not_allowed",
    airbnbAllowed: false,
    partyFriendly: false,
    
    // Security Features from JSON
    securityGuard: (securityFeatures.guard as PropertyFormData["securityGuard"]) || "none",
    cctv: (securityFeatures.cctv as PropertyFormData["cctv"]) || "none",
    accessControl: (securityFeatures.access_control as PropertyFormData["accessControl"]) || "none",
    
    // Utilities from JSON
    waterReliability: (utilities.water as PropertyFormData["waterReliability"]) || "24_7",
    hasWaterStorage: (utilities.has_storage as boolean) || false,
    backupPower: (utilities.backup_power as PropertyFormData["backupPower"]) || "none",
    internetReady: (utilities.internet_ready as boolean) || false,
    availableIsps: (utilities.isps as string[]) || [],
    
    // Legacy fields
    petsAllowed: listing.pet_policy === "all_allowed" || listing.pet_policy === "small_only",
    smokingAllowed: listing.smoking_policy === "allowed",
    petsPolicy: listing.pet_policy as PropertyFormData["petsPolicy"] || "not_allowed",
    
    // Step 5: Photos
    photos,
    videoUrl: listing.video_url || "",
    
    // Step 6: Pricing
    rentAmount: listing.rent_amount,
    currency: listing.currency || "KES",
    rentNegotiable: listing.rent_negotiable ?? false,
    depositMonths: listing.deposit_months || 2,
    depositAmount: listing.deposit_amount,
    agentFee: null,
    agentFeeType: "fixed",
    serviceCharge: listing.service_charge,
    customFees: [],
    leaseTerm: (listing.lease_term as PropertyFormData["leaseTerm"]) || "fixed",
    minLeaseDuration: listing.min_lease_months || 12,
    minLeaseMonths: listing.min_lease_months || 12,
    paymentFrequency: "monthly",
    paymentMethods: listing.payment_methods || ["mpesa"],
    rentDueDay: 5,
    availableFrom: listing.available_from,
    availableNow: listing.available_now ?? true,
    currentStatus: "vacant",
    rentIncludes: listing.rent_includes || [],
    acceptsMpesa: listing.payment_methods?.includes("mpesa") ?? true,
    acceptsBank: listing.payment_methods?.includes("bank") ?? true,
    acceptsCash: listing.payment_methods?.includes("cash") ?? false,
    
    // Step 7: Description
    title: listing.title || "",
    description: listing.description || "",
    termsAccepted: true, // Already accepted when originally created
    
    // Commercial fields
    commercialType: listing.commercial_type as PropertyFormData["commercialType"],
    commercialSubtype: listing.commercial_subtype as PropertyFormData["commercialSubtype"],
    commercial: {
      ...DEFAULT_COMMERCIAL_FORM_DATA,
      listingCategory: listingCategory,
      commercialType: listing.commercial_type as typeof DEFAULT_COMMERCIAL_FORM_DATA.commercialType,
      commercialSubtype: listing.commercial_subtype as typeof DEFAULT_COMMERCIAL_FORM_DATA.commercialSubtype,
      sizeSqm: listing.size_sqm,
      buildingGrade: listing.building_grade as typeof DEFAULT_COMMERCIAL_FORM_DATA.buildingGrade,
      ceilingHeightM: listing.ceiling_height_m,
      fitoutLevel: listing.fitout_level as typeof DEFAULT_COMMERCIAL_FORM_DATA.fitoutLevel,
      floorLevel: listing.floor_level || "",
      
      // Office
      workstationCapacity: listing.workstation_capacity,
      meetingRooms: listing.meeting_rooms || 0,
      privateOffices: listing.private_offices || 0,
      hasReception: listing.has_reception ?? false,
      hasServerRoom: listing.has_server_room ?? false,
      
      // Retail
      frontageWidthM: listing.frontage_width_m,
      hasDisplayWindows: listing.has_display_windows ?? false,
      
      // F&B
      seatingCapacity: listing.seating_capacity,
      kitchenAreaSqm: listing.kitchen_area_sqm,
      greaseTrap: listing.has_grease_trap ?? false,
      exhaustSystem: listing.has_exhaust_system ?? false,
      
      // Warehouse
      clearHeightM: listing.clear_height_m,
      loadingDocks: listing.loading_docks || 0,
      driveInDoors: listing.drive_in_doors || 0,
      floorLoadCapacity: listing.floor_load_capacity,
      hasDockLevelers: listing.has_dock_levelers ?? false,
      vehicleAccess: listing.vehicle_access || [],
      
      // Automotive
      parkingSpacesCount: listing.parking_spaces_count,
      evChargingStations: listing.ev_charging_stations || 0,
      workBays: listing.work_bays || 0,
      
      // Commercial Land
      plotSizeSqm: listing.plot_size_sqm,
      plotSizeAcres: listing.plot_size_acres,
      zoningType: listing.zoning_type as typeof DEFAULT_COMMERCIAL_FORM_DATA.zoningType,
      permittedUses: listing.permitted_uses || [],
      
      // Hospitality
      roomCount: listing.room_count,
      starRating: listing.star_rating,
      eventCapacitySeated: listing.event_capacity_seated,
      eventCapacityStanding: listing.event_capacity_standing,
      
      // Healthcare
      consultationRooms: listing.consultation_rooms || 0,
      treatmentRooms: listing.treatment_rooms || 0,
      hasPharmacyLicense: listing.has_pharmacy_license ?? false,
      
      // Educational
      classroomCount: listing.classroom_count || 0,
      totalStudentCapacity: listing.total_student_capacity,
      ministryApproved: listing.ministry_approved ?? false,
      
      // Additional fields from commercial_attributes JSON if present
      ...(commercialAttributes as Record<string, unknown>),
    },
  };

  return formData;
}
