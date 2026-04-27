#!/usr/bin/env node
/**
 * CANONICAL SERVICE SEEDING SCRIPT
 * Based on comprehensive service definitions from chat.md
 * 
 * Services are organized per the locked 20-category structure:
 * - 12 Main Categories (is_primary = true)
 * - 8 More Services (is_primary = false)
 * 
 * Service Types (Booking Flows):
 * - emergency: Immediate response, damage risk, unknown pricing
 * - standard: Scheduled repair/installation with known scope
 * - delivery: Pickup/dropoff with quantity tracking
 * - project: Large scope, quote-based, site visit likely
 * - personal: Human-to-human, trust-critical, preference-sensitive
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================================
// SERVICE TYPES (5 Booking Flows)
// ============================================================================
const SERVICE_TYPES = [
  {
    code: 'emergency_service',
    name: 'Emergency Service',
    booking_flow: 'emergency',
    description: 'Immediate response required, damage risk, urgent pricing',
    risk_level: 5,
    trust_level: 4,
    requires_quote: false
  },
  {
    code: 'standard_service',
    name: 'Standard Service',
    booking_flow: 'standard',
    description: 'Scheduled repair/installation with known scope',
    risk_level: 3,
    trust_level: 3,
    requires_quote: false
  },
  {
    code: 'delivery_service',
    name: 'Delivery Service',
    booking_flow: 'delivery',
    description: 'Pickup/dropoff with quantity tracking',
    risk_level: 2,
    trust_level: 2,
    requires_quote: false
  },
  {
    code: 'project_service',
    name: 'Project Service',
    booking_flow: 'project',
    description: 'Large scope, quote-based, site visit likely',
    risk_level: 4,
    trust_level: 4,
    requires_quote: true
  },
  {
    code: 'personal_service',
    name: 'Personal Service',
    booking_flow: 'personal',
    description: 'Human-to-human, trust-critical, preference-sensitive',
    risk_level: 3,
    trust_level: 5,
    requires_quote: false
  }
];

// ============================================================================
// SERVICES BY CATEGORY (From chat.md comprehensive definitions)
// ============================================================================
const SERVICES_BY_CATEGORY = {
  // ─────────────────────────────────────────────────────────────────────────
  // MAIN CATEGORIES (12)
  // ─────────────────────────────────────────────────────────────────────────
  
  'plumbing': {
    services: [
      // Emergency
      { name: 'Emergency Burst Pipe Repair', type: 'emergency_service', emergency: true, sla: 60, description: 'Urgent repair for burst pipes to prevent water damage' },
      { name: 'Emergency Drain Unblocking', type: 'emergency_service', emergency: true, sla: 90, description: 'Urgent unblocking of severely clogged drains' },
      { name: 'Emergency Water Leak Repair', type: 'emergency_service', emergency: true, sla: 60, description: 'Urgent repair for active water leaks' },
      // Standard
      { name: 'Tap Installation', type: 'standard_service', description: 'Install new taps in kitchen or bathroom' },
      { name: 'Tap Repair', type: 'standard_service', description: 'Fix leaking or faulty taps' },
      { name: 'Toilet Repair', type: 'standard_service', description: 'Fix running, leaking, or clogged toilets' },
      { name: 'Toilet Installation', type: 'standard_service', description: 'Install new toilet fixtures' },
      { name: 'Sink Installation', type: 'standard_service', description: 'Install kitchen or bathroom sinks' },
      { name: 'Pipe Repair', type: 'standard_service', description: 'Repair damaged or leaking pipes' },
      { name: 'Drain Cleaning', type: 'standard_service', description: 'Clean and clear slow drains', recurring: true },
      { name: 'Water Heater Installation', type: 'standard_service', siteVisit: true, description: 'Install instant or tank water heaters' },
      { name: 'Water Heater Repair', type: 'standard_service', description: 'Repair faulty water heaters' },
      // Project
      { name: 'Bathroom Plumbing Installation', type: 'project_service', siteVisit: true, description: 'Complete bathroom plumbing setup' },
      { name: 'Kitchen Plumbing Installation', type: 'project_service', siteVisit: true, description: 'Complete kitchen plumbing setup' },
      { name: 'Water Tank Installation', type: 'project_service', siteVisit: true, description: 'Install overhead or underground water tanks' },
      { name: 'Water Pump Installation', type: 'project_service', siteVisit: true, description: 'Install booster or borehole pumps' },
      { name: 'Sewer Line Repair', type: 'project_service', siteVisit: true, description: 'Major sewer line repairs' },
    ]
  },

  'electrical': {
    services: [
      // Emergency
      { name: 'Emergency Power Restoration', type: 'emergency_service', emergency: true, sla: 60, description: 'Urgent restoration of power outages' },
      { name: 'Emergency Short Circuit Repair', type: 'emergency_service', emergency: true, sla: 90, description: 'Fix dangerous short circuits and sparking' },
      { name: 'Emergency Electrical Safety Check', type: 'emergency_service', emergency: true, sla: 60, description: 'Urgent safety assessment after electrical incident' },
      // Standard
      { name: 'Socket Installation', type: 'standard_service', description: 'Install new power sockets' },
      { name: 'Socket Repair', type: 'standard_service', description: 'Fix faulty or damaged sockets' },
      { name: 'Light Fixture Installation', type: 'standard_service', description: 'Install ceiling lights, wall lights, chandeliers' },
      { name: 'Light Switch Installation', type: 'standard_service', description: 'Install or replace light switches' },
      { name: 'Ceiling Fan Installation', type: 'standard_service', description: 'Install and wire ceiling fans' },
      { name: 'Circuit Breaker Replacement', type: 'standard_service', description: 'Replace faulty circuit breakers' },
      { name: 'Electrical Troubleshooting', type: 'standard_service', description: 'Diagnose and fix electrical issues' },
      // Project
      { name: 'House Rewiring', type: 'project_service', siteVisit: true, description: 'Complete electrical rewiring of house' },
      { name: 'Distribution Board Installation', type: 'project_service', siteVisit: true, description: 'Install main distribution board' },
      { name: 'Electrical Inspection', type: 'project_service', siteVisit: true, description: 'Comprehensive electrical safety inspection' },
    ]
  },

  'water-gas-delivery': {
    services: [
      // Delivery
      { name: 'Water Bowser Delivery', type: 'delivery_service', multiLocation: true, description: 'Bulk water delivery by bowser truck' },
      { name: 'Drinking Water Delivery', type: 'delivery_service', multiLocation: true, recurring: true, description: '20L bottled drinking water delivery' },
      { name: 'Gas Cylinder Delivery', type: 'delivery_service', multiLocation: true, description: 'LPG gas cylinder delivery and exchange' },
      { name: 'Gas Cylinder Refill', type: 'delivery_service', multiLocation: true, description: 'Refill your existing gas cylinder' },
      // Standard
      { name: 'Gas Cooker Installation', type: 'standard_service', description: 'Safe installation of gas cookers' },
      { name: 'Gas Pipe Installation', type: 'standard_service', description: 'Install gas piping for appliances' },
      { name: 'Gas Leak Check', type: 'standard_service', description: 'Safety inspection for gas leaks' },
    ]
  },

  'cleaning': {
    services: [
      // Standard (Scheduled Service)
      { name: 'House Cleaning', type: 'standard_service', recurring: true, description: 'Regular house cleaning service' },
      { name: 'Apartment Cleaning', type: 'standard_service', recurring: true, description: 'Regular apartment cleaning service' },
      { name: 'Office Cleaning', type: 'standard_service', recurring: true, description: 'Regular office cleaning service' },
      { name: 'Deep Cleaning', type: 'standard_service', description: 'Thorough deep cleaning of entire space' },
      { name: 'Move-In Cleaning', type: 'standard_service', description: 'Prepare new home before moving in' },
      { name: 'Move-Out Cleaning', type: 'standard_service', description: 'Clean property before moving out' },
      { name: 'Post-Construction Cleaning', type: 'standard_service', description: 'Clean up after renovations or construction' },
      { name: 'Kitchen Deep Cleaning', type: 'standard_service', description: 'Intensive kitchen cleaning including appliances' },
      { name: 'Bathroom Deep Cleaning', type: 'standard_service', description: 'Intensive bathroom sanitization' },
      { name: 'Window Cleaning', type: 'standard_service', description: 'Interior and exterior window cleaning' },
      { name: 'Carpet Cleaning', type: 'standard_service', description: 'Deep carpet shampooing and cleaning' },
      { name: 'Sofa Cleaning', type: 'standard_service', description: 'Professional sofa and upholstery cleaning' },
      { name: 'Mattress Cleaning', type: 'standard_service', description: 'Mattress deep cleaning and sanitization' },
      { name: 'Curtain Cleaning', type: 'standard_service', description: 'Curtain cleaning and refreshing' },
    ]
  },

  'laundry': {
    services: [
      // Delivery
      { name: 'Wash & Fold', type: 'delivery_service', multiLocation: true, recurring: true, description: 'Laundry pickup, wash, fold and delivery' },
      { name: 'Wash & Iron', type: 'delivery_service', multiLocation: true, recurring: true, description: 'Laundry pickup, wash, iron and delivery' },
      { name: 'Dry Cleaning', type: 'delivery_service', multiLocation: true, description: 'Professional dry cleaning service' },
      { name: 'Shoe Cleaning', type: 'delivery_service', multiLocation: true, description: 'Professional shoe cleaning and restoration' },
      { name: 'Bag Cleaning', type: 'delivery_service', multiLocation: true, description: 'Handbag and luggage cleaning' },
      { name: 'Curtain Laundry', type: 'delivery_service', multiLocation: true, description: 'Curtain pickup, washing and delivery' },
      { name: 'Duvet & Blanket Cleaning', type: 'delivery_service', multiLocation: true, description: 'Large bedding item cleaning' },
    ]
  },

  'pest-control': {
    services: [
      // Standard
      { name: 'General Fumigation', type: 'standard_service', recurring: true, description: 'Comprehensive pest control treatment' },
      { name: 'Cockroach Control', type: 'standard_service', description: 'Targeted cockroach elimination' },
      { name: 'Bedbug Treatment', type: 'standard_service', description: 'Professional bedbug elimination' },
      { name: 'Ant Control', type: 'standard_service', description: 'Ant infestation treatment' },
      { name: 'Rodent Control', type: 'standard_service', description: 'Rat and mouse elimination' },
      { name: 'Termite Treatment', type: 'standard_service', description: 'Termite inspection and treatment' },
      { name: 'Mosquito Control', type: 'standard_service', recurring: true, description: 'Mosquito spraying and prevention' },
      { name: 'Flea Treatment', type: 'standard_service', description: 'Flea elimination for pet owners' },
      // Project
      { name: 'Pre-Construction Termite Treatment', type: 'project_service', siteVisit: true, description: 'Preventive termite treatment before building' },
    ]
  },

  'carpentry': {
    services: [
      // Standard
      { name: 'Door Repair', type: 'standard_service', description: 'Fix sticking, squeaking, or damaged doors' },
      { name: 'Door Installation', type: 'standard_service', description: 'Install new interior or exterior doors' },
      { name: 'Lock Installation', type: 'standard_service', description: 'Install door locks and handles' },
      { name: 'Lock Repair', type: 'standard_service', description: 'Fix faulty door locks' },
      { name: 'Shelf Installation', type: 'standard_service', description: 'Install wall shelves and brackets' },
      { name: 'Furniture Repair', type: 'standard_service', description: 'Repair broken furniture' },
      { name: 'Furniture Assembly', type: 'standard_service', description: 'Assemble flat-pack furniture' },
      { name: 'Window Frame Repair', type: 'standard_service', description: 'Repair wooden window frames' },
      // Project
      { name: 'Custom Wardrobe', type: 'project_service', siteVisit: true, description: 'Build custom fitted wardrobes' },
      { name: 'Kitchen Cabinet Making', type: 'project_service', siteVisit: true, description: 'Custom kitchen cabinet construction' },
      { name: 'Built-in Furniture', type: 'project_service', siteVisit: true, description: 'Custom built-in storage and furniture' },
      { name: 'Wooden Deck Construction', type: 'project_service', siteVisit: true, description: 'Build outdoor wooden decks' },
      { name: 'Pergola Construction', type: 'project_service', siteVisit: true, description: 'Build outdoor pergolas' },
    ]
  },

  'painting': {
    services: [
      // Standard
      { name: 'Wall Touch-Up', type: 'standard_service', description: 'Minor wall paint touch-ups' },
      { name: 'Door Painting', type: 'standard_service', description: 'Paint doors and frames' },
      { name: 'Window Frame Painting', type: 'standard_service', description: 'Paint window frames and sills' },
      { name: 'Fence Painting', type: 'standard_service', description: 'Paint wooden or metal fences' },
      { name: 'Ceiling Painting', type: 'standard_service', description: 'Paint ceilings and cornices' },
      // Project
      { name: 'Interior House Painting', type: 'project_service', siteVisit: true, description: 'Complete interior painting of house' },
      { name: 'Exterior House Painting', type: 'project_service', siteVisit: true, description: 'Complete exterior painting of house' },
      { name: 'Room Painting', type: 'project_service', siteVisit: true, description: 'Paint a complete room including prep' },
      { name: 'Office Painting', type: 'project_service', siteVisit: true, description: 'Commercial office painting' },
      { name: 'Apartment Painting', type: 'project_service', siteVisit: true, description: 'Complete apartment painting' },
    ]
  },

  'moving-relocation': {
    services: [
      // Project
      { name: 'House Moving (Local)', type: 'project_service', siteVisit: true, multiLocation: true, description: 'Local house moving within city' },
      { name: 'House Moving (Long Distance)', type: 'project_service', siteVisit: true, multiLocation: true, description: 'Long distance house relocation' },
      { name: 'Office Moving', type: 'project_service', siteVisit: true, multiLocation: true, description: 'Office and business relocation' },
      { name: 'Single Item Moving', type: 'standard_service', multiLocation: true, description: 'Move individual large items like furniture' },
      // Standard
      { name: 'Packing Services', type: 'standard_service', description: 'Professional packing of belongings' },
      { name: 'Unpacking Services', type: 'standard_service', description: 'Unpacking and arrangement at new location' },
      { name: 'Furniture Disassembly', type: 'standard_service', description: 'Disassemble furniture for moving' },
      { name: 'Furniture Reassembly', type: 'standard_service', description: 'Reassemble furniture after moving' },
    ]
  },

  'internet-networking': {
    services: [
      // Standard
      { name: 'Router Setup', type: 'standard_service', description: 'WiFi router installation and configuration' },
      { name: 'WiFi Troubleshooting', type: 'standard_service', description: 'Diagnose and fix WiFi issues' },
      { name: 'Network Cable Installation', type: 'standard_service', description: 'Install ethernet cables and points' },
      { name: 'WiFi Range Extension', type: 'standard_service', description: 'Extend WiFi coverage with repeaters/mesh' },
      { name: 'Smart TV Setup', type: 'standard_service', description: 'Connect and configure smart TVs' },
      { name: 'Printer Network Setup', type: 'standard_service', description: 'Connect printers to network' },
      // Project
      { name: 'Home Network Installation', type: 'project_service', siteVisit: true, description: 'Complete home networking setup' },
      { name: 'Office Network Setup', type: 'project_service', siteVisit: true, description: 'Business network infrastructure setup' },
      { name: 'CCTV Installation', type: 'project_service', siteVisit: true, description: 'Security camera system installation' },
    ]
  },

  'taxi-rides': {
    services: [
      // Personal
      { name: 'Airport Transfer', type: 'personal_service', multiLocation: true, description: 'Reliable airport pickup and dropoff' },
      { name: 'School Run', type: 'personal_service', multiLocation: true, recurring: true, description: 'Safe school pickup and dropoff for kids' },
      { name: 'Corporate Shuttle', type: 'personal_service', multiLocation: true, recurring: true, description: 'Regular work commute service' },
      { name: 'Private Driver (Hourly)', type: 'personal_service', description: 'Private driver by the hour' },
      { name: 'Private Driver (Daily)', type: 'personal_service', description: 'Private driver for the full day' },
      { name: 'Wedding Car Hire', type: 'personal_service', description: 'Chauffeur service for weddings' },
      { name: 'Event Transportation', type: 'personal_service', multiLocation: true, description: 'Transportation for events and functions' },
    ]
  },

  'shopping-assistance': {
    services: [
      // Personal
      { name: 'Grocery Shopping', type: 'personal_service', multiLocation: true, recurring: true, description: 'Someone shops for your groceries' },
      { name: 'Errand Running', type: 'personal_service', description: 'Run errands on your behalf' },
      { name: 'Bill Payment', type: 'personal_service', description: 'Pay bills at various service centers' },
      { name: 'Document Pickup', type: 'personal_service', multiLocation: true, description: 'Collect documents on your behalf' },
      { name: 'Parcel Delivery', type: 'delivery_service', multiLocation: true, description: 'Same-day parcel delivery within city' },
      { name: 'Medicine Pickup', type: 'personal_service', multiLocation: true, description: 'Pick up prescriptions from pharmacy' },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MORE SERVICES (8)
  // ─────────────────────────────────────────────────────────────────────────

  'garbage-junk-removal': {
    services: [
      // Standard
      { name: 'Garbage Collection', type: 'standard_service', recurring: true, description: 'Regular garbage pickup service' },
      { name: 'Junk Removal', type: 'standard_service', multiLocation: true, description: 'Remove unwanted items and junk' },
      { name: 'Construction Debris Removal', type: 'standard_service', multiLocation: true, description: 'Clear construction waste' },
      { name: 'Garden Waste Removal', type: 'standard_service', multiLocation: true, description: 'Remove garden trimmings and waste' },
      { name: 'Old Furniture Disposal', type: 'standard_service', multiLocation: true, description: 'Dispose of old furniture responsibly' },
      { name: 'E-Waste Disposal', type: 'standard_service', multiLocation: true, description: 'Safe disposal of electronic waste' },
    ]
  },

  'gardening-landscaping': {
    services: [
      // Standard
      { name: 'Lawn Mowing', type: 'standard_service', recurring: true, description: 'Regular lawn mowing service' },
      { name: 'Garden Maintenance', type: 'standard_service', recurring: true, description: 'Ongoing garden care and maintenance' },
      { name: 'Hedge Trimming', type: 'standard_service', recurring: true, description: 'Shape and trim hedges' },
      { name: 'Tree Trimming', type: 'standard_service', description: 'Trim and prune trees' },
      { name: 'Weed Control', type: 'standard_service', recurring: true, description: 'Remove and prevent weeds' },
      { name: 'Flower Planting', type: 'standard_service', description: 'Plant flowers and seasonal plants' },
      // Project
      { name: 'Landscape Design', type: 'project_service', siteVisit: true, description: 'Design and plan garden landscapes' },
      { name: 'Garden Installation', type: 'project_service', siteVisit: true, description: 'Complete garden setup from scratch' },
      { name: 'Irrigation System Installation', type: 'project_service', siteVisit: true, description: 'Install automatic irrigation systems' },
      { name: 'Paving & Pathways', type: 'project_service', siteVisit: true, description: 'Install garden paths and paving' },
    ]
  },

  'it-tech-support': {
    services: [
      // Standard
      { name: 'Computer Repair', type: 'standard_service', description: 'Fix hardware and software issues' },
      { name: 'Laptop Repair', type: 'standard_service', description: 'Laptop troubleshooting and repair' },
      { name: 'Virus Removal', type: 'standard_service', description: 'Remove malware and viruses' },
      { name: 'Data Recovery', type: 'standard_service', description: 'Recover lost or deleted data' },
      { name: 'Software Installation', type: 'standard_service', description: 'Install and configure software' },
      { name: 'Computer Setup', type: 'standard_service', description: 'Set up new computers' },
      { name: 'Phone Screen Repair', type: 'standard_service', description: 'Replace cracked phone screens' },
      { name: 'Printer Repair', type: 'standard_service', description: 'Fix printer issues' },
    ]
  },

  'welding-metal-works': {
    services: [
      // Standard
      { name: 'Welding Repair', type: 'standard_service', description: 'Fix broken metal items' },
      { name: 'Gate Repair', type: 'standard_service', description: 'Repair metal gates' },
      { name: 'Burglar Proofing Repair', type: 'standard_service', description: 'Repair window and door grilles' },
      // Project
      { name: 'Gate Fabrication', type: 'project_service', siteVisit: true, description: 'Custom metal gate construction' },
      { name: 'Burglar Proofing Installation', type: 'project_service', siteVisit: true, description: 'Install security grilles' },
      { name: 'Balcony Railing', type: 'project_service', siteVisit: true, description: 'Custom balcony railing fabrication' },
      { name: 'Staircase Railing', type: 'project_service', siteVisit: true, description: 'Metal staircase railing' },
      { name: 'Metal Roofing', type: 'project_service', siteVisit: true, description: 'Metal roofing installation' },
    ]
  },

  'glass-aluminium-works': {
    services: [
      // Standard
      { name: 'Window Glass Replacement', type: 'standard_service', description: 'Replace broken window glass' },
      { name: 'Mirror Installation', type: 'standard_service', description: 'Install mirrors and looking glasses' },
      { name: 'Glass Door Repair', type: 'standard_service', description: 'Fix sliding glass doors' },
      // Project
      { name: 'Aluminium Window Installation', type: 'project_service', siteVisit: true, description: 'Install aluminium window frames' },
      { name: 'Aluminium Door Installation', type: 'project_service', siteVisit: true, description: 'Install aluminium doors' },
      { name: 'Glass Partition', type: 'project_service', siteVisit: true, description: 'Install office glass partitions' },
      { name: 'Shower Enclosure', type: 'project_service', siteVisit: true, description: 'Install glass shower enclosures' },
      { name: 'Shop Front Glass', type: 'project_service', siteVisit: true, description: 'Commercial storefront glass installation' },
    ]
  },

  'beauty-home-services': {
    services: [
      // Personal
      { name: 'Home Haircut (Men)', type: 'personal_service', description: 'Barber service at your home' },
      { name: 'Home Haircut (Kids)', type: 'personal_service', description: 'Children haircut at home' },
      { name: 'Home Hair Styling (Women)', type: 'personal_service', description: 'Braiding, blow-dry, styling at home' },
      { name: 'Makeup Artist', type: 'personal_service', description: 'Professional makeup for events' },
      { name: 'Bridal Makeup', type: 'personal_service', description: 'Wedding day makeup service' },
      { name: 'Manicure & Pedicure', type: 'personal_service', description: 'Nail care service at home' },
      { name: 'Massage Therapy', type: 'personal_service', description: 'Professional massage at your location' },
      { name: 'Henna/Mehndi', type: 'personal_service', description: 'Henna art for events and celebrations' },
    ]
  },

  'events-planning': {
    services: [
      // Project
      { name: 'Event Planning', type: 'project_service', siteVisit: true, description: 'Full event planning and coordination' },
      { name: 'Event Decoration', type: 'project_service', siteVisit: true, description: 'Venue decoration for events' },
      { name: 'Tent & Chair Hire', type: 'project_service', siteVisit: true, description: 'Event furniture and tent rental' },
      { name: 'Catering Services', type: 'project_service', siteVisit: true, description: 'Food and beverage for events' },
      { name: 'DJ Services', type: 'personal_service', description: 'DJ and sound system for events' },
      { name: 'Event Photography', type: 'personal_service', description: 'Professional event photography' },
      { name: 'Event Videography', type: 'personal_service', description: 'Professional event videography' },
      { name: 'MC Services', type: 'personal_service', description: 'Master of ceremonies for events' },
    ]
  },

  'childcare-home-care': {
    services: [
      // Personal
      { name: 'Babysitting', type: 'personal_service', recurring: true, description: 'Child care at your home' },
      { name: 'Nanny Services', type: 'personal_service', recurring: true, description: 'Full-time or part-time nanny' },
      { name: 'Elderly Care', type: 'personal_service', recurring: true, description: 'Care for elderly family members' },
      { name: 'Home Nursing', type: 'personal_service', recurring: true, description: 'Professional nursing care at home' },
      { name: 'Homework Help', type: 'personal_service', recurring: true, description: 'Tutoring and homework assistance' },
      { name: 'Special Needs Care', type: 'personal_service', recurring: true, description: 'Care for individuals with special needs' },
    ]
  }
};

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

async function seedServiceTypes() {
  console.log('\n📦 PHASE 1: Seeding Service Types...');
  
  for (const serviceType of SERVICE_TYPES) {
    const { data: existing } = await supabase
      .from('service_types')
      .select('id')
      .eq('code', serviceType.code)
      .single();
    
    if (existing) {
      console.log(`  ⏭️  Service type exists: ${serviceType.code}`);
      continue;
    }
    
    const { error } = await supabase
      .from('service_types')
      .insert(serviceType);
    
    if (error) {
      console.error(`  ❌ Failed to insert ${serviceType.code}:`, error.message);
    } else {
      console.log(`  ✅ Created: ${serviceType.code} (${serviceType.booking_flow})`);
    }
  }
}

async function getServiceTypeIds() {
  const { data, error } = await supabase
    .from('service_types')
    .select('id, code');
  
  if (error) throw error;
  
  const map = {};
  data.forEach(st => map[st.code] = st.id);
  return map;
}

async function getCategoryIds() {
  const { data, error } = await supabase
    .from('service_categories')
    .select('id, slug');
  
  if (error) throw error;
  
  const map = {};
  data.forEach(c => map[c.slug] = c.id);
  return map;
}

async function seedServices(categoryIds, serviceTypeIds) {
  console.log('\n📋 PHASE 2: Seeding Services...');
  
  let totalCreated = 0;
  let totalSkipped = 0;
  
  for (const [categorySlug, categoryData] of Object.entries(SERVICES_BY_CATEGORY)) {
    const categoryId = categoryIds[categorySlug];
    
    if (!categoryId) {
      console.log(`  ⚠️  Category not found: ${categorySlug}`);
      continue;
    }
    
    console.log(`\n  📁 ${categorySlug.toUpperCase()}`);
    
    for (const service of categoryData.services) {
      const serviceTypeId = serviceTypeIds[service.type];
      
      if (!serviceTypeId) {
        console.log(`    ⚠️  Service type not found: ${service.type}`);
        continue;
      }
      
      // Generate slug from name
      const slug = `${categorySlug}-${service.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
      
      // Check if exists
      const { data: existing } = await supabase
        .from('services')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (existing) {
        totalSkipped++;
        continue;
      }
      
      // Insert service
      const { data: newService, error } = await supabase
        .from('services')
        .insert({
          category_id: categoryId,
          service_type_id: serviceTypeId,
          slug,
          name: service.name,
          description: service.description,
          short_description: service.description?.substring(0, 100),
          requires_site_visit: service.siteVisit || false,
          is_active: true
        })
        .select('id')
        .single();
      
      if (error) {
        console.log(`    ❌ ${service.name}: ${error.message}`);
        continue;
      }
      
      console.log(`    ✅ ${service.name}`);
      totalCreated++;
      
      // Insert capabilities
      const capabilities = {
        service_id: newService.id,
        supports_emergency: service.emergency || false,
        emergency_response_sla_minutes: service.sla || null,
        is_recurring_capable: service.recurring || false,
        min_booking_notice_hours: service.emergency ? 0 : 24,
        supports_multi_location: service.multiLocation || false,
        travel_fee_applies: service.multiLocation || false,
        requires_site_visit_default: service.siteVisit || false
      };
      
      const { error: capError } = await supabase
        .from('service_capabilities')
        .insert(capabilities);
      
      if (capError) {
        console.log(`      ⚠️  Capabilities: ${capError.message}`);
      }
    }
  }
  
  console.log(`\n📊 Summary: ${totalCreated} created, ${totalSkipped} skipped (already exist)`);
}

async function verifySeeding() {
  console.log('\n🔍 PHASE 3: Verification...');
  
  const { data: types } = await supabase.from('service_types').select('code, booking_flow');
  const { data: services } = await supabase.from('services').select('id, category_id');
  const { data: capabilities } = await supabase.from('service_capabilities').select('service_id');
  const { data: categories } = await supabase.from('service_categories').select('id, name');
  
  console.log(`\n  Service Types: ${types?.length || 0}`);
  types?.forEach(t => console.log(`    - ${t.code} (${t.booking_flow})`));
  
  console.log(`\n  Total Services: ${services?.length || 0}`);
  console.log(`  Service Capabilities: ${capabilities?.length || 0}`);
  
  // Count by category
  console.log('\n  Services per Category:');
  const countByCategory = {};
  services?.forEach(s => {
    countByCategory[s.category_id] = (countByCategory[s.category_id] || 0) + 1;
  });
  
  categories?.forEach(c => {
    const count = countByCategory[c.id] || 0;
    console.log(`    ${c.name}: ${count}`);
  });
}

// ============================================================================
// CLEANUP: Remove old/orphan services before seeding
// ============================================================================

async function cleanupOldServices() {
  console.log('\n🧹 Phase 0: Cleanup old/orphan services...');
  
  // Delete any services that don't match our canonical list
  // This catches placeholder services like "Basic Plumbing" etc.
  const { data: existingServices, error: fetchError } = await supabase
    .from('services')
    .select('id, name');
  
  if (fetchError) {
    console.log('  ⚠️ Could not fetch existing services:', fetchError.message);
    return;
  }
  
  // Build a set of all canonical service names from our definitions
  const canonicalNames = new Set();
  for (const [categorySlug, categoryData] of Object.entries(SERVICES_BY_CATEGORY)) {
    for (const service of categoryData.services) {
      canonicalNames.add(service.name);
    }
  }
  
  // Find orphan services (exist in DB but not in our canonical list)
  const orphans = existingServices.filter(s => !canonicalNames.has(s.name));
  
  if (orphans.length === 0) {
    console.log('  ✓ No orphan services found');
    return;
  }
  
  console.log(`  🗑️ Found ${orphans.length} orphan services to delete:`);
  orphans.forEach(s => console.log(`     - ${s.name}`));
  
  const orphanIds = orphans.map(s => s.id);
  const { error: deleteError } = await supabase
    .from('services')
    .delete()
    .in('id', orphanIds);
  
  if (deleteError) {
    console.log('  ⚠️ Error deleting orphans:', deleteError.message);
  } else {
    console.log(`  ✓ Deleted ${orphans.length} orphan services`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        CANONICAL SERVICE SEEDING (chat.md compliant)         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  try {
    // Phase 0: Cleanup orphan services
    await cleanupOldServices();
    
    // Phase 1: Service Types
    await seedServiceTypes();
    
    // Get IDs
    const serviceTypeIds = await getServiceTypeIds();
    const categoryIds = await getCategoryIds();
    
    console.log('\n📍 Category IDs loaded:', Object.keys(categoryIds).length);
    console.log('📍 Service Type IDs loaded:', Object.keys(serviceTypeIds).length);
    
    // Phase 2: Services
    await seedServices(categoryIds, serviceTypeIds);
    
    // Phase 3: Verify
    await verifySeeding();
    
    console.log('\n✅ SEEDING COMPLETE');
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

main();
