/**
 * Wizard Content Configuration System
 * 
 * Centralized configuration for all dynamic text content in the listing wizard.
 * Uses an inheritance model:
 * 1. _default: Base content (residential)
 * 2. commercial._default: Overrides for all commercial types
 * 3. commercial.[type]: Type-specific overrides
 * 4. commercial.[subtype]: Subtype-specific overrides (highest priority)
 * 
 * This enables accurate, contextual content for 2 categories, 10 commercial types,
 * and 70+ subtypes without code duplication.
 */

import type { CommercialType, CommercialSubtype, ListingCategory } from "./commercial-types";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface FieldContent {
  label?: string;
  placeholder?: string;
  helper?: string;
  optionalText?: string;
}

export interface HeaderContent {
  title?: string;
  subtitle?: string;
}

export interface InfoBoxContent {
  title?: string;
  message?: string;
}

export interface Step2Content {
  header: HeaderContent;
  buildingName: FieldContent;
  streetAddress: FieldContent;
  area: FieldContent;
  city: FieldContent;
  unitNumber: FieldContent;
  landmarks: FieldContent;
  plotNumber: FieldContent;
  privacyOption: {
    label?: string;
    helper?: string;
  };
  infoBox: InfoBoxContent;
}

export interface Step5Content {
  header: HeaderContent;
  progress: {
    counterLabel?: string; // "{count} of {max} photos"
    minLabel?: string; // "Minimum {min} recommended"
  };
  uploadButton: {
    label?: string;
  };
  tips: {
    title?: string;
    items?: string[];
  };
}

export interface Step7Content {
  header: HeaderContent;
  title: FieldContent & {
    sectionLabel?: string;
    maxLength?: number;
    autoGenerate?: string;
  };
  description: FieldContent & {
    minLength?: number;
    autoGenerate?: string;
  };
  preview: {
    sectionTitle?: string;
  };
}

export interface SuccessModalContent {
  title?: string;
  message?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export interface WizardContent {
  step2: Step2Content;
  step5: Step5Content;
  step7: Step7Content;
  successModal: SuccessModalContent;
}

// Deep partial type for overrides
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// =============================================================================
// DEFAULT CONTENT (RESIDENTIAL)
// =============================================================================

const DEFAULT_CONTENT: WizardContent = {
  step2: {
    header: {
      title: "Where is it located?",
      subtitle: "Enter your property's address so tenants can find it",
    },
    buildingName: {
      label: "Property/Building Name",
      placeholder: "e.g., Sunrise Apartments, Green Valley Estate",
      helper: "This helps tenants identify your property",
    },
    streetAddress: {
      label: "Street Address",
      placeholder: "Search address or building name (e.g. GG Heights, Kilimani)",
      helper: "Search for your address or enter it manually",
    },
    area: {
      label: "Area/Neighborhood",
    },
    city: {
      label: "City",
      helper: "Currently available in Nairobi",
    },
    unitNumber: {
      label: "Unit/Apartment Number",
      placeholder: "e.g., Unit 4B, Apt 12",
      optionalText: "(Optional)",
    },
    landmarks: {
      label: "Nearby Landmarks",
      placeholder: "e.g., Near Yaya Centre, Behind Shell Petrol Station",
      helper: "Helps tenants find your property more easily",
      optionalText: "(Optional but helpful)",
    },
    plotNumber: {
      label: "LR/Plot Number",
      placeholder: "e.g., LR No. 209/12345",
      helper: "Land reference number for legal documentation",
      optionalText: "(Optional)",
    },
    privacyOption: {
      label: "Hide exact address until tenant is approved",
      helper: "Only the area will be shown in the listing. Full address revealed after approval.",
    },
    infoBox: {
      title: "Accurate location matters",
      message: "Properties with accurate addresses get 40% more views. Tenants filter by neighborhood, so make sure yours is correct.",
    },
  },
  step5: {
    header: {
      title: "Add photos",
      subtitle: "Great photos get 3× more inquiries",
    },
    progress: {
      counterLabel: "{count} of {max} photos",
      minLabel: "Minimum {min} recommended",
    },
    uploadButton: {
      label: "Add more photos",
    },
    tips: {
      title: "Photo Tips",
      items: [
        "Use natural daylight when possible",
        "Show each room from multiple angles",
        "Keep spaces tidy before photographing",
        "Capture special features and views",
      ],
    },
  },
  step7: {
    header: {
      title: "Review & publish",
      subtitle: "Add a title and description, then go live",
    },
    title: {
      sectionLabel: "Listing Details",
      label: "Title",
      placeholder: "e.g., 3BR Apartment in Kilimani",
      helper: "Keep it short and descriptive",
      maxLength: 60,
      autoGenerate: "Auto-generate",
    },
    description: {
      label: "Description",
      placeholder: "Describe your property in detail. Mention key features, nearby amenities, transportation access, and what makes it special...",
      helper: "Minimum 50 characters",
      minLength: 50,
      autoGenerate: "✨ Auto-generate",
    },
    preview: {
      sectionTitle: "Preview",
    },
  },
  successModal: {
    title: "Your listing is live! 🎉",
    message: "Your property is now visible to thousands of tenants searching for their next home.",
    primaryLabel: "View My Listings",
    secondaryLabel: "Create Another",
  },
};

// =============================================================================
// COMMERCIAL BASE CONTENT (Applies to all commercial types)
// =============================================================================

const COMMERCIAL_BASE_CONTENT: DeepPartial<WizardContent> = {
  step2: {
    header: {
      subtitle: "Enter your property's address so businesses can find it",
    },
    buildingName: {
      label: "Facility/Building Name",
      placeholder: "e.g., Westlands Business Centre, Industrial Area Complex",
      helper: "This helps businesses identify your property",
    },
    unitNumber: {
      label: "Suite/Floor/Unit Number",
      placeholder: "e.g., Suite 200, Floor 3, Unit B2",
    },
    landmarks: {
      helper: "Helps businesses find your property more easily",
    },
    privacyOption: {
      label: "Hide exact address until client is approved",
      helper: "Only the area will be shown. Full address revealed after approval.",
    },
    infoBox: {
      message: "Properties with accurate addresses get 40% more views. Businesses filter by location, so make sure yours is correct.",
    },
  },
  step5: {
    header: {
      subtitle: "Quality photos help your listing stand out",
    },
    tips: {
      items: [
        "Capture the space from wide angles",
        "Show key features and specifications",
        "Include building exterior and entrance",
        "Highlight unique selling points",
      ],
    },
  },
  step7: {
    header: {
      subtitle: "Add a title and description, then publish your listing",
    },
    title: {
      sectionLabel: "Listing Content",
      placeholder: "e.g., 150 sqm Fitted Office in Westlands",
      maxLength: 80,
      helper: "Make it descriptive and searchable",
    },
    description: {
      placeholder: "Describe your commercial space. Include details about the building, location advantages, amenities, and any special features...",
    },
  },
  successModal: {
    message: "Your commercial listing is now visible to potential clients.",
  },
};

// =============================================================================
// COMMERCIAL TYPE-SPECIFIC CONTENT
// =============================================================================

const COMMERCIAL_TYPE_CONTENT: Partial<Record<CommercialType, DeepPartial<WizardContent>>> = {
  office: {
    step2: {
      buildingName: {
        placeholder: "e.g., Delta Corner Tower, ABC Place, Piedmont Plaza",
      },
      unitNumber: {
        label: "Suite/Floor Number",
        placeholder: "e.g., Suite 5A, 3rd Floor, Tower B",
      },
    },
    step5: {
      tips: {
        items: [
          "Show the main workspace and layout",
          "Capture meeting rooms and common areas",
          "Highlight natural lighting and views",
          "Include reception and entrance areas",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., 200 sqm Grade A Office in Upper Hill",
      },
    },
    successModal: {
      message: "Your office space is now visible to businesses searching for their ideal workspace.",
    },
  },

  retail: {
    step2: {
      buildingName: {
        label: "Building/Mall Name",
        placeholder: "e.g., The Hub Karen, Sarit Centre, Junction Mall",
      },
      unitNumber: {
        label: "Shop/Unit Number",
        placeholder: "e.g., Shop G-15, Unit 204",
      },
    },
    step5: {
      tips: {
        items: [
          "Capture the storefront and display windows",
          "Show the sales floor layout",
          "Include storage and back-office areas",
          "Highlight foot traffic and visibility",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Prime Retail Space in Westgate Mall",
      },
    },
    successModal: {
      message: "Your retail space is now visible to businesses looking for the perfect storefront.",
    },
  },

  food_beverage: {
    step2: {
      buildingName: {
        label: "Building/Location Name",
        placeholder: "e.g., The Alchemist, K1 Clubhouse, Diamond Plaza",
      },
      unitNumber: {
        label: "Unit/Floor Number",
        placeholder: "e.g., Ground Floor, Unit F-3",
      },
    },
    step5: {
      tips: {
        items: [
          "Show the dining area and ambiance",
          "Capture the kitchen setup and equipment",
          "Include outdoor seating if available",
          "Highlight the bar/counter area",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Restaurant Space with Outdoor Seating in Karen",
      },
    },
    successModal: {
      message: "Your F&B space is now visible to restaurateurs and entrepreneurs.",
    },
  },

  warehouse: {
    step2: {
      buildingName: {
        label: "Warehouse/Facility Name",
        placeholder: "e.g., Sameer Industrial Park, Baba Dogo Godowns",
      },
      unitNumber: {
        label: "Unit/Bay Number",
        placeholder: "e.g., Warehouse 3, Bay A-12",
      },
      landmarks: {
        placeholder: "e.g., Off Mombasa Road, Near JKIA",
      },
    },
    step5: {
      tips: {
        items: [
          "Show the main floor space and height",
          "Capture loading docks and access points",
          "Include office/admin areas if any",
          "Highlight racking and storage systems",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., 2000 sqm Warehouse with Loading Dock in Industrial Area",
      },
    },
    successModal: {
      message: "Your warehouse is now visible to businesses seeking storage and logistics solutions.",
    },
  },

  automotive: {
    step2: {
      buildingName: {
        label: "Facility/Location Name",
        placeholder: "e.g., Total Muthangari, Shell Waiyaki Way",
      },
      unitNumber: {
        label: "Bay/Unit Number",
        placeholder: "e.g., Service Bay 2, Unit C",
      },
    },
    step5: {
      tips: {
        items: [
          "Show service bays and equipment",
          "Capture parking/display areas",
          "Include customer waiting area",
          "Highlight specialized features",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Auto Service Center on Ngong Road",
      },
    },
    successModal: {
      message: "Your automotive space is now visible to businesses in the automotive industry.",
    },
  },

  commercial_land: {
    step2: {
      buildingName: {
        label: "Plot/Land Name",
        placeholder: "e.g., Tatu City Plot, Konza Techno City Land",
      },
      unitNumber: {
        label: "Plot/Block Number",
        placeholder: "e.g., Plot 45, Block B",
      },
      plotNumber: {
        label: "Title/LR Number",
        placeholder: "e.g., LR No. 209/12345/1",
        helper: "Official land reference number",
      },
    },
    step5: {
      header: {
        subtitle: "Photos help buyers visualize the land potential",
      },
      tips: {
        items: [
          "Take aerial/wide shots if possible",
          "Show road access and boundaries",
          "Capture surrounding developments",
          "Include utility connection points",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., 1 Acre Commercial Plot in Ruiru",
      },
    },
    successModal: {
      message: "Your commercial land is now visible to developers and investors.",
    },
  },

  hospitality: {
    step2: {
      buildingName: {
        label: "Property/Venue Name",
        placeholder: "e.g., Sarova Stanley, Villa Rosa Kempinski",
      },
      unitNumber: {
        label: "Floor/Wing",
        placeholder: "e.g., Conference Wing, 2nd Floor",
      },
    },
    step5: {
      tips: {
        items: [
          "Showcase the lobby and reception",
          "Capture sample rooms and suites",
          "Include restaurant and amenities",
          "Highlight event/conference spaces",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Boutique Hotel in Westlands - 30 Rooms",
      },
    },
    successModal: {
      message: "Your hospitality space is now visible to businesses in the tourism and events industry.",
    },
  },

  healthcare: {
    step2: {
      buildingName: {
        label: "Medical Facility Name",
        placeholder: "e.g., Nairobi Hospital Doctors Plaza, AAR Clinic Building",
      },
      unitNumber: {
        label: "Suite/Room Number",
        placeholder: "e.g., Suite 301, Room 5B",
      },
    },
    step5: {
      tips: {
        items: [
          "Show waiting and reception areas",
          "Capture consultation rooms",
          "Include treatment/procedure rooms",
          "Highlight accessibility features",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Medical Suite in Upperhill Medical Center",
      },
    },
    successModal: {
      message: "Your healthcare facility is now visible to medical professionals and organizations.",
    },
  },

  educational: {
    step2: {
      buildingName: {
        label: "Institution/Building Name",
        placeholder: "e.g., Strathmore Business School, USIU Campus",
      },
      unitNumber: {
        label: "Block/Building Number",
        placeholder: "e.g., Block A, Building 3",
      },
    },
    step5: {
      tips: {
        items: [
          "Show classrooms and learning spaces",
          "Capture common areas and facilities",
          "Include playground/outdoor areas",
          "Highlight labs and specialized rooms",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., School Premises in Lavington - 8 Classrooms",
      },
    },
    successModal: {
      message: "Your educational facility is now visible to institutions and educators.",
    },
  },

  specialized: {
    step2: {
      buildingName: {
        label: "Facility Name",
        placeholder: "e.g., Nairobi Film Centre, iHub",
      },
    },
    step5: {
      tips: {
        items: [
          "Show the main specialized space",
          "Capture equipment and installations",
          "Include support and utility areas",
          "Highlight unique features",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Recording Studio in Westlands",
      },
    },
    successModal: {
      message: "Your specialized space is now visible to businesses seeking unique facilities.",
    },
  },
};

// =============================================================================
// COMMERCIAL SUBTYPE-SPECIFIC CONTENT
// =============================================================================

const COMMERCIAL_SUBTYPE_CONTENT: Partial<Record<CommercialSubtype, DeepPartial<WizardContent>>> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // OFFICE SUBTYPES
  // ─────────────────────────────────────────────────────────────────────────────
  coworking_desk: {
    step2: {
      buildingName: {
        placeholder: "e.g., Nairobi Garage, iHub, Workify",
      },
      unitNumber: {
        label: "Desk/Zone",
        placeholder: "e.g., Hot Desk Zone, Dedicated Desk 15",
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Hot Desk at Premium Coworking Space in Westlands",
      },
    },
  },
  coworking_private: {
    step2: {
      unitNumber: {
        label: "Office/Room Number",
        placeholder: "e.g., Private Office 3, Room B2",
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Private Office for 4 at Nairobi Garage",
      },
    },
  },
  serviced_office: {
    step7: {
      title: {
        placeholder: "e.g., Serviced Office Suite in KICC",
      },
    },
  },
  virtual_office: {
    step2: {
      header: {
        subtitle: "Enter the business address for your virtual office service",
      },
    },
    step5: {
      header: {
        subtitle: "Add photos of the building and reception area",
      },
      tips: {
        items: [
          "Show the building exterior",
          "Capture the reception/lobby area",
          "Include meeting room (if available)",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Virtual Office Address in Upper Hill",
      },
      description: {
        placeholder: "Describe the virtual office services included, mail handling, meeting room access, and business address prestige...",
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // RETAIL SUBTYPES
  // ─────────────────────────────────────────────────────────────────────────────
  kiosk: {
    step2: {
      buildingName: {
        placeholder: "e.g., Galleria Mall, Village Market, Near Bus Stage",
      },
      unitNumber: {
        label: "Kiosk Number/Location",
        placeholder: "e.g., Kiosk K-5, Near Entrance A",
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Kiosk Space at Yaya Centre Entrance",
      },
    },
  },
  market_stall: {
    step2: {
      buildingName: {
        label: "Market Name",
        placeholder: "e.g., Maasai Market, City Market, Gikomba",
      },
      unitNumber: {
        label: "Stall Number",
        placeholder: "e.g., Stall 45, Row B",
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Market Stall at City Market",
      },
    },
  },
  pop_up: {
    step2: {
      unitNumber: {
        label: "Space/Location",
        placeholder: "e.g., Atrium Space, Corridor Zone C",
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Pop-up Space at Two Rivers Mall",
      },
    },
  },
  mall_unit: {
    step2: {
      buildingName: {
        label: "Mall Name",
        placeholder: "e.g., Garden City Mall, The Hub Karen",
      },
      unitNumber: {
        label: "Shop Number",
        placeholder: "e.g., Shop UG-23, Unit L1-15",
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Ground Floor Shop at Sarit Centre",
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // F&B SUBTYPES
  // ─────────────────────────────────────────────────────────────────────────────
  cloud_kitchen: {
    step2: {
      buildingName: {
        label: "Kitchen/Building Name",
        placeholder: "e.g., CloudChef Hub, Industrial Kitchen Complex",
      },
      unitNumber: {
        label: "Kitchen Unit",
        placeholder: "e.g., Kitchen 3, Unit K-5",
      },
    },
    step5: {
      tips: {
        items: [
          "Show the kitchen layout and equipment",
          "Capture prep and cooking stations",
          "Include storage and cold room",
          "Show delivery/dispatch area",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Cloud Kitchen with Full Equipment in Industrial Area",
      },
    },
  },
  food_court: {
    step2: {
      buildingName: {
        label: "Mall/Food Court Name",
        placeholder: "e.g., Westgate Food Court, Junction Mall",
      },
      unitNumber: {
        label: "Stall/Counter Number",
        placeholder: "e.g., Counter FC-12, Stall 8",
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Food Court Counter at Garden City Mall",
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WAREHOUSE SUBTYPES
  // ─────────────────────────────────────────────────────────────────────────────
  cold_storage: {
    step2: {
      buildingName: {
        label: "Cold Storage Facility Name",
        placeholder: "e.g., Cooling Solutions Ltd, Fresh Chain Warehouse",
      },
    },
    step5: {
      tips: {
        items: [
          "Show cold room interior and capacity",
          "Capture temperature monitoring systems",
          "Include loading/unloading areas",
          "Show backup power systems",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Cold Storage Facility - 500 sqm at -20°C",
      },
    },
  },
  fulfillment_center: {
    step7: {
      title: {
        placeholder: "e.g., Fulfillment Center with 10 Loading Docks",
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTOMOTIVE SUBTYPES
  // ─────────────────────────────────────────────────────────────────────────────
  parking_lot: {
    step2: {
      buildingName: {
        label: "Parking Lot Name/Location",
        placeholder: "e.g., CBD Parking, Westlands Open Parking",
      },
      unitNumber: {
        label: "Section/Zone",
        placeholder: "e.g., Zone A, Section 3",
      },
    },
    step5: {
      header: {
        subtitle: "Show the parking layout and access points",
      },
      tips: {
        items: [
          "Show the overall parking layout",
          "Capture entry/exit points",
          "Include payment systems",
          "Show security features",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., 50-Space Parking Lot in CBD",
      },
    },
    successModal: {
      message: "Your parking space is now visible to businesses and motorists.",
    },
  },
  parking_building: {
    step2: {
      buildingName: {
        label: "Parking Building Name",
        placeholder: "e.g., KICC Parking, Hilton Parking Tower",
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Multi-Level Parking Building - 200 Spaces",
      },
    },
    successModal: {
      message: "Your parking facility is now visible to businesses and motorists.",
    },
  },
  garage_workshop: {
    step2: {
      buildingName: {
        label: "Workshop/Garage Name",
        placeholder: "e.g., AutoFix Garage, Quick Service Center",
      },
      unitNumber: {
        label: "Bay/Unit Number",
        placeholder: "e.g., Bay 3, Unit W-5",
      },
    },
    step5: {
      tips: {
        items: [
          "Show service bays and lifts",
          "Capture tool and equipment areas",
          "Include customer reception",
          "Show parts storage area",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Auto Workshop with 4 Service Bays",
      },
    },
  },
  car_wash: {
    step2: {
      buildingName: {
        label: "Car Wash Name",
        placeholder: "e.g., Splash Car Wash, Quick Clean",
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Car Wash Bay on Thika Road",
      },
    },
  },
  petrol_station: {
    step2: {
      buildingName: {
        label: "Station Name/Brand",
        placeholder: "e.g., Total Westlands, Shell Mombasa Road",
      },
    },
    step5: {
      tips: {
        items: [
          "Show the forecourt and pump islands",
          "Capture the convenience store",
          "Include service bays if any",
          "Show the canopy and signage",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Petrol Station Site on Waiyaki Way",
      },
    },
  },
  car_showroom: {
    step2: {
      buildingName: {
        label: "Showroom/Dealership Name",
        placeholder: "e.g., Toyota Kenya, DT Dobie",
      },
    },
    step5: {
      tips: {
        items: [
          "Show the showroom floor",
          "Capture the customer lounge",
          "Include service reception",
          "Show exterior and parking",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Car Showroom with Service Center on Mombasa Road",
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMMERCIAL LAND SUBTYPES
  // ─────────────────────────────────────────────────────────────────────────────
  billboard_site: {
    step2: {
      buildingName: {
        label: "Billboard Location",
        placeholder: "e.g., Uhuru Highway Billboard, Mombasa Road Site",
      },
      unitNumber: {
        label: "Billboard ID/Reference",
        placeholder: "e.g., BH-001, Site A",
      },
    },
    step5: {
      header: {
        subtitle: "Show the billboard location and visibility",
      },
      tips: {
        items: [
          "Show the billboard from driver's view",
          "Capture traffic flow and visibility",
          "Include different angles",
          "Show size reference",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Prime Billboard Site on Uhuru Highway",
      },
    },
    successModal: {
      message: "Your billboard site is now visible to advertisers.",
    },
  },
  storage_yard: {
    step2: {
      buildingName: {
        label: "Yard Name/Location",
        placeholder: "e.g., Embakasi Storage Yard, Athi River Yard",
      },
    },
    step7: {
      title: {
        placeholder: "e.g., 2-Acre Storage Yard in Industrial Area",
      },
    },
  },
  container_yard: {
    step2: {
      buildingName: {
        label: "Container Yard Name",
        placeholder: "e.g., ICD Nairobi, Embakasi Container Depot",
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Container Storage Yard - 100 TEU Capacity",
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HOSPITALITY SUBTYPES
  // ─────────────────────────────────────────────────────────────────────────────
  event_venue: {
    step2: {
      buildingName: {
        label: "Venue Name",
        placeholder: "e.g., The Waterfront, Uhuru Gardens",
      },
    },
    step5: {
      tips: {
        items: [
          "Show the main event space",
          "Capture different setup configurations",
          "Include outdoor areas if any",
          "Show catering/kitchen facilities",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Event Venue with 500 Capacity in Karen",
      },
    },
    successModal: {
      message: "Your event venue is now visible to event planners.",
    },
  },
  wedding_venue: {
    step2: {
      buildingName: {
        label: "Venue Name",
        placeholder: "e.g., Windsor Golf Hotel, Karura Forest",
      },
    },
    step5: {
      tips: {
        items: [
          "Show ceremony and reception areas",
          "Capture gardens and photo spots",
          "Include bridal preparation rooms",
          "Show parking and guest areas",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Wedding Garden Venue - Up to 300 Guests",
      },
    },
    successModal: {
      message: "Your wedding venue is now visible to couples planning their special day.",
    },
  },
  conference_center: {
    step7: {
      title: {
        placeholder: "e.g., Conference Center with 5 Meeting Rooms",
      },
    },
    successModal: {
      message: "Your conference center is now visible to corporate clients.",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SPECIALIZED SUBTYPES
  // ─────────────────────────────────────────────────────────────────────────────
  data_center: {
    step2: {
      buildingName: {
        label: "Data Center Name",
        placeholder: "e.g., ICOLO Nairobi, Africa Data Centres, Liquid Telecom",
      },
      unitNumber: {
        label: "Suite/Cage/Rack ID",
        placeholder: "e.g., Cage A-101, Suite DC-5, Rack R-23",
      },
    },
    step5: {
      header: {
        subtitle: "Showcase your facility's infrastructure",
      },
      tips: {
        items: [
          "Show server room and racks",
          "Capture cooling infrastructure",
          "Include power/UPS systems",
          "Show security and access controls",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Tier 3 Data Center Space - 10 Rack Capacity",
      },
      description: {
        placeholder: "Describe the data center specifications, power redundancy, cooling systems, network connectivity, security certifications, and compliance standards...",
      },
    },
    successModal: {
      message: "Your data center space is now visible to IT businesses and enterprises.",
    },
  },
  recording_studio: {
    step2: {
      buildingName: {
        label: "Studio Name",
        placeholder: "e.g., Ogopa DJs, Decimal Records",
      },
      unitNumber: {
        label: "Studio/Room Number",
        placeholder: "e.g., Studio A, Room 3",
      },
    },
    step5: {
      tips: {
        items: [
          "Show the live room acoustics",
          "Capture the control room setup",
          "Include isolation booths",
          "Show equipment and gear",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Professional Recording Studio with Isolation Booth",
      },
    },
    successModal: {
      message: "Your recording studio is now visible to artists and producers.",
    },
  },
  photo_studio: {
    step2: {
      buildingName: {
        label: "Studio Name",
        placeholder: "e.g., Antony Trivet Studios, Frame Studios",
      },
    },
    step5: {
      tips: {
        items: [
          "Show the shooting space and height",
          "Capture cyclorama/backdrop options",
          "Include lighting equipment",
          "Show makeup/prep rooms",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Photo Studio with Cyclorama and Natural Light",
      },
    },
    successModal: {
      message: "Your photo studio is now visible to photographers and brands.",
    },
  },
  gym_fitness: {
    step2: {
      buildingName: {
        label: "Gym/Fitness Center Name",
        placeholder: "e.g., Smart Gyms, Tribe Fitness",
      },
    },
    step5: {
      tips: {
        items: [
          "Show the main gym floor",
          "Capture cardio and weights areas",
          "Include group fitness studios",
          "Show locker rooms and amenities",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Gym Space with Full Equipment - 300 sqm",
      },
    },
    successModal: {
      message: "Your fitness facility is now visible to gym operators and fitness entrepreneurs.",
    },
  },
  salon_spa: {
    step2: {
      buildingName: {
        label: "Salon/Spa Name",
        placeholder: "e.g., Kenyatta Avenue Salon Space, Village Market Spa",
      },
    },
    step5: {
      tips: {
        items: [
          "Show styling stations layout",
          "Capture treatment rooms",
          "Include waiting/reception area",
          "Show wash stations",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Salon Space with 6 Styling Stations",
      },
    },
    successModal: {
      message: "Your salon/spa space is now visible to beauty professionals.",
    },
  },
  bank_branch: {
    step2: {
      buildingName: {
        label: "Building Name",
        placeholder: "e.g., View Park Towers, Anniversary Towers",
      },
      unitNumber: {
        label: "Suite/Floor",
        placeholder: "e.g., Ground Floor, Suite G-1",
      },
    },
    step5: {
      tips: {
        items: [
          "Show the banking hall layout",
          "Capture teller counter area",
          "Include vault room (if showing)",
          "Show private office spaces",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Bank Branch Space with Vault - Ground Floor",
      },
    },
    successModal: {
      message: "Your banking space is now visible to financial institutions.",
    },
  },
  atm_site: {
    step2: {
      buildingName: {
        label: "ATM Location",
        placeholder: "e.g., Shell Westlands, Quickmart Kilimani",
      },
      unitNumber: {
        label: "ATM Booth/Position",
        placeholder: "e.g., ATM 1, Exterior Booth",
      },
    },
    step5: {
      header: {
        subtitle: "Show the ATM site location and accessibility",
      },
      tips: {
        items: [
          "Show the street-level view",
          "Capture foot traffic flow",
          "Include security features",
          "Show enclosure/booth",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Prime ATM Site at Busy Petrol Station",
      },
    },
    successModal: {
      message: "Your ATM site is now visible to banks and financial service providers.",
    },
  },
  religious_facility: {
    step2: {
      buildingName: {
        label: "Facility/Building Name",
        placeholder: "e.g., Faith Centre, Community Hall",
      },
    },
    step5: {
      tips: {
        items: [
          "Show the worship/assembly hall",
          "Capture seating arrangement",
          "Include parking and grounds",
          "Show support facilities",
        ],
      },
    },
    step7: {
      title: {
        placeholder: "e.g., Worship Hall with 200 Seating Capacity",
      },
    },
    successModal: {
      message: "Your facility is now visible to religious organizations.",
    },
  },
};

// =============================================================================
// HELPER: DEEP MERGE
// =============================================================================

/**
 * Deep merge objects, with later objects overriding earlier ones
 */
function deepMerge<T extends object>(...objects: (DeepPartial<T> | undefined)[]): T {
  const result: Record<string, unknown> = {};

  for (const obj of objects) {
    if (!obj) continue;
    
    for (const key of Object.keys(obj)) {
      const value = (obj as Record<string, unknown>)[key];
      const existing = result[key];
      
      if (
        value !== undefined &&
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        typeof existing === "object" &&
        existing !== null &&
        !Array.isArray(existing)
      ) {
        result[key] = deepMerge(
          existing as Record<string, unknown>,
          value as Record<string, unknown>
        );
      } else if (value !== undefined) {
        result[key] = value;
      }
    }
  }

  return result as T;
}

// =============================================================================
// MAIN EXPORT: GET CONTENT
// =============================================================================

/**
 * Get the merged content configuration for a given listing context.
 * 
 * Merges in order of priority (later overrides earlier):
 * 1. DEFAULT_CONTENT (residential base)
 * 2. COMMERCIAL_BASE_CONTENT (if commercial)
 * 3. COMMERCIAL_TYPE_CONTENT[type] (if commercial)
 * 4. COMMERCIAL_SUBTYPE_CONTENT[subtype] (if commercial with subtype)
 */
export function getWizardContent(
  listingCategory: ListingCategory | null,
  commercialType: CommercialType | null,
  commercialSubtype: CommercialSubtype | null
): WizardContent {
  // Start with default (residential) content
  if (!listingCategory || listingCategory === "residential") {
    return DEFAULT_CONTENT;
  }

  // Commercial: merge in order of specificity
  const layers: DeepPartial<WizardContent>[] = [
    DEFAULT_CONTENT,
    COMMERCIAL_BASE_CONTENT,
  ];

  if (commercialType && COMMERCIAL_TYPE_CONTENT[commercialType]) {
    layers.push(COMMERCIAL_TYPE_CONTENT[commercialType]!);
  }

  if (commercialSubtype && COMMERCIAL_SUBTYPE_CONTENT[commercialSubtype]) {
    layers.push(COMMERCIAL_SUBTYPE_CONTENT[commercialSubtype]!);
  }

  return deepMerge<WizardContent>(...layers);
}

/**
 * Get step-specific content
 */
export function getStep2Content(
  listingCategory: ListingCategory | null,
  commercialType: CommercialType | null,
  commercialSubtype: CommercialSubtype | null
): Step2Content {
  return getWizardContent(listingCategory, commercialType, commercialSubtype).step2;
}

export function getStep5Content(
  listingCategory: ListingCategory | null,
  commercialType: CommercialType | null,
  commercialSubtype: CommercialSubtype | null
): Step5Content {
  return getWizardContent(listingCategory, commercialType, commercialSubtype).step5;
}

export function getStep7Content(
  listingCategory: ListingCategory | null,
  commercialType: CommercialType | null,
  commercialSubtype: CommercialSubtype | null
): Step7Content {
  return getWizardContent(listingCategory, commercialType, commercialSubtype).step7;
}

export function getSuccessModalContent(
  listingCategory: ListingCategory | null,
  commercialType: CommercialType | null,
  commercialSubtype: CommercialSubtype | null
): SuccessModalContent {
  return getWizardContent(listingCategory, commercialType, commercialSubtype).successModal;
}
