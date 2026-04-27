/**
 * Full Provider Seed Script
 * 
 * Creates 20 service providers with complete data including:
 * - Provider profiles
 * - Services they offer (via provider_services)
 * - Sample reviews
 * 
 * Run with: node scripts/seed-providers-full.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Make sure .env.local exists with these variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// CONSTANTS
// =============================================================================

const NAIROBI_AREAS = [
  "Westlands", "Kilimani", "Lavington", "Kileleshwa", "South B", "South C",
  "Langata", "Karen", "Ruaka", "Ruiru", "Parklands", "Upper Hill",
  "Embakasi", "Kasarani", "Ngong Road", "Thika Road"
];

// Kenyan names for realistic data
const KENYAN_NAMES = [
  { first: "John", last: "Kamau" },
  { first: "Mary", last: "Wanjiku" },
  { first: "Peter", last: "Ochieng" },
  { first: "Grace", last: "Muthoni" },
  { first: "David", last: "Kiprop" },
  { first: "Faith", last: "Akinyi" },
  { first: "James", last: "Mwangi" },
  { first: "Lucy", last: "Njeri" },
  { first: "Michael", last: "Otieno" },
  { first: "Sarah", last: "Chebet" },
  { first: "Joseph", last: "Kariuki" },
  { first: "Elizabeth", last: "Adhiambo" },
  { first: "Samuel", last: "Mutua" },
  { first: "Joyce", last: "Wambui" },
  { first: "Daniel", last: "Korir" },
  { first: "Anne", last: "Nyambura" },
  { first: "Patrick", last: "Ouma" },
  { first: "Catherine", last: "Cherop" },
  { first: "Robert", last: "Njuguna" },
  { first: "Margaret", last: "Achieng" },
];

// =============================================================================
// 20 PROVIDERS DATA
// =============================================================================

const PROVIDERS = [
  // ===== MOVING (3 providers) =====
  {
    business_name: "Swift Movers Kenya",
    tagline: "Your belongings, our priority",
    description: "Professional moving company with over 10 years of experience. We handle residential and commercial moves with care and precision.",
    business_email: "info@swiftmovers.co.ke",
    business_phone: "+254712345678",
    whatsapp: "+254712345678",
    website: "https://swiftmovers.co.ke",
    logo_url: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&h=400&fit=crop",
    service_areas: ["Westlands", "Kilimani", "Lavington", "Kileleshwa", "Parklands", "Upper Hill"],
    is_verified: true, is_available: true, instant_booking: true, tier: "premium",
    rating_average: 4.8, rating_count: 156, total_jobs_completed: 423, response_time_minutes: 45,
    services: [
      { subcategory: "moving-local-moving", price: 15000, price_type: "fixed" },
      { subcategory: "moving-office-relocation", price: 35000, price_type: "fixed" },
      { subcategory: "moving-packing-services", price: 5000, price_type: "fixed" },
      { subcategory: "moving-furniture-assembly", price: 2500, price_type: "per_item" },
    ],
  },
  {
    business_name: "Nairobi Express Movers",
    tagline: "Fast, reliable, affordable",
    description: "Budget-friendly moving services across Nairobi. We provide packing materials and secure transportation.",
    business_email: "hello@nairobimovers.com",
    business_phone: "+254722456789",
    whatsapp: "+254722456789",
    logo_url: "https://images.unsplash.com/photo-1586864387789-628af9feed72?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1586864387789-628af9feed72?w=800&h=400&fit=crop",
    service_areas: ["South B", "South C", "Langata", "Karen", "Embakasi"],
    is_verified: true, is_available: true, instant_booking: false, tier: "free",
    rating_average: 4.5, rating_count: 89, total_jobs_completed: 201, response_time_minutes: 120,
    services: [
      { subcategory: "moving-local-moving", price: 8000, price_type: "fixed" },
      { subcategory: "moving-packing-services", price: 3000, price_type: "fixed" },
    ],
  },
  {
    business_name: "Corporate Relocations Ltd",
    tagline: "Seamless business transitions",
    description: "Specialized in corporate and office relocations with IT equipment handling specialists.",
    business_email: "moves@corporaterelocations.co.ke",
    business_phone: "+254733567890",
    whatsapp: "+254733567890",
    website: "https://corporaterelocations.co.ke",
    logo_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop",
    service_areas: NAIROBI_AREAS,
    is_verified: true, is_available: true, instant_booking: false, tier: "enterprise",
    rating_average: 4.9, rating_count: 67, total_jobs_completed: 156, response_time_minutes: 60,
    services: [
      { subcategory: "moving-office-relocation", price: 50000, price_type: "fixed" },
      { subcategory: "moving-furniture-assembly", price: 5000, price_type: "per_item" },
    ],
  },

  // ===== CLEANING (4 providers) =====
  {
    business_name: "Sparkle Clean Pro",
    tagline: "We make it shine",
    description: "Professional cleaning services with eco-friendly products and HEPA-filtered equipment.",
    business_email: "book@sparkle.co.ke",
    business_phone: "+254744678901",
    whatsapp: "+254744678901",
    website: "https://sparkleclean.co.ke",
    logo_url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=400&fit=crop",
    service_areas: ["Westlands", "Kilimani", "Lavington", "Kileleshwa", "Upper Hill", "Parklands"],
    is_verified: true, is_available: true, instant_booking: true, tier: "enterprise",
    rating_average: 4.9, rating_count: 287, total_jobs_completed: 892, response_time_minutes: 30,
    services: [
      { subcategory: "cleaning-regular-cleaning", price: 2500, price_type: "fixed" },
      { subcategory: "cleaning-deep-cleaning", price: 6000, price_type: "fixed" },
      { subcategory: "cleaning-office-cleaning", price: 8000, price_type: "fixed" },
      { subcategory: "cleaning-carpet-cleaning", price: 3000, price_type: "per_sqm" },
    ],
  },
  {
    business_name: "CleanSpace Solutions",
    tagline: "Your clean space partner",
    description: "Specialized in deep cleaning, post-construction cleaning, and move-in/move-out services.",
    business_email: "contact@cleanspace.co.ke",
    business_phone: "+254755789012",
    whatsapp: "+254755789012",
    logo_url: "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800&h=400&fit=crop",
    service_areas: ["Ruaka", "Ruiru", "Westlands", "Parklands", "Kasarani", "Thika Road"],
    is_verified: true, is_available: true, instant_booking: true, tier: "premium",
    rating_average: 4.7, rating_count: 134, total_jobs_completed: 345, response_time_minutes: 60,
    services: [
      { subcategory: "cleaning-deep-cleaning", price: 8000, price_type: "fixed" },
      { subcategory: "cleaning-post-construction", price: 15000, price_type: "fixed" },
      { subcategory: "cleaning-move-in-move-out", price: 5000, price_type: "fixed" },
    ],
  },
  {
    business_name: "Fresh Start Cleaners",
    tagline: "A fresh start for your space",
    description: "Affordable home cleaning with flexible scheduling including weekends.",
    business_email: "freshstart@cleaners.co.ke",
    business_phone: "+254766890123",
    whatsapp: "+254766890123",
    logo_url: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&h=400&fit=crop",
    service_areas: ["South B", "South C", "Langata", "Ngong Road"],
    is_verified: true, is_available: true, instant_booking: true, tier: "free",
    rating_average: 4.4, rating_count: 76, total_jobs_completed: 189, response_time_minutes: 90,
    services: [
      { subcategory: "cleaning-regular-cleaning", price: 1500, price_type: "fixed" },
      { subcategory: "cleaning-window-cleaning", price: 1000, price_type: "fixed" },
    ],
  },
  {
    business_name: "ProShine Commercial",
    tagline: "Professional shine for business",
    description: "Commercial cleaning specialists serving offices and retail spaces.",
    business_email: "business@proshine.co.ke",
    business_phone: "+254777901234",
    whatsapp: "+254777901234",
    website: "https://proshine.co.ke",
    logo_url: "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=800&h=400&fit=crop",
    service_areas: ["Westlands", "Upper Hill", "Parklands", "Kilimani"],
    is_verified: true, is_available: true, instant_booking: false, tier: "enterprise",
    rating_average: 4.8, rating_count: 56, total_jobs_completed: 234, response_time_minutes: 120,
    services: [
      { subcategory: "cleaning-office-cleaning", price: 15000, price_type: "fixed" },
      { subcategory: "cleaning-carpet-cleaning", price: 4000, price_type: "per_sqm" },
    ],
  },

  // ===== PLUMBING & ELECTRICAL (4 providers) =====
  {
    business_name: "FixIt Masters",
    tagline: "No job too big or small",
    description: "Your one-stop shop for all home repairs. Licensed technicians available 24/7.",
    business_email: "support@fixitmasters.co.ke",
    business_phone: "+254788012345",
    whatsapp: "+254788012345",
    website: "https://fixitmasters.co.ke",
    logo_url: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&h=400&fit=crop",
    service_areas: NAIROBI_AREAS,
    is_verified: true, is_available: true, instant_booking: true, tier: "premium",
    rating_average: 4.6, rating_count: 198, total_jobs_completed: 567, response_time_minutes: 45,
    services: [
      { subcategory: "plumbing-pipe-repair", price: 2000, price_type: "hourly" },
      { subcategory: "electrical-wiring", price: 2500, price_type: "hourly" },
      { subcategory: "plumbing-drain-cleaning", price: 1500, price_type: "fixed" },
    ],
  },
  {
    business_name: "QuickFix Plumbers",
    tagline: "Water problems solved fast",
    description: "Expert plumbing services including pipe repairs and water heater installation.",
    business_email: "quickfix@plumbers.co.ke",
    business_phone: "+254799123456",
    whatsapp: "+254799123456",
    logo_url: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&h=400&fit=crop",
    service_areas: ["Kilimani", "Lavington", "Kileleshwa", "South B", "South C", "Langata"],
    is_verified: true, is_available: true, instant_booking: true, tier: "free",
    rating_average: 4.4, rating_count: 112, total_jobs_completed: 289, response_time_minutes: 60,
    services: [
      { subcategory: "plumbing-pipe-repair", price: 1500, price_type: "hourly" },
      { subcategory: "plumbing-water-heater", price: 3000, price_type: "fixed" },
      { subcategory: "plumbing-emergency-plumbing", price: 2500, price_type: "fixed" },
    ],
  },
  {
    business_name: "ElectroPro Kenya",
    tagline: "Safe and reliable electrical work",
    description: "Licensed electricians for residential and commercial electrical needs.",
    business_email: "info@electropro.co.ke",
    business_phone: "+254700234567",
    whatsapp: "+254700234567",
    website: "https://electropro.co.ke",
    logo_url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=400&fit=crop",
    service_areas: ["Westlands", "Parklands", "Kilimani", "Upper Hill", "Karen"],
    is_verified: true, is_available: true, instant_booking: false, tier: "premium",
    rating_average: 4.7, rating_count: 89, total_jobs_completed: 234, response_time_minutes: 90,
    services: [
      { subcategory: "electrical-wiring", price: 3000, price_type: "hourly" },
      { subcategory: "electrical-lighting", price: 2000, price_type: "fixed" },
      { subcategory: "electrical-panel-upgrade", price: 15000, price_type: "fixed" },
    ],
  },
  {
    business_name: "CoolTech HVAC",
    tagline: "Keep your cool",
    description: "Air conditioning specialists offering installation, repair, and maintenance.",
    business_email: "cool@cooltech.co.ke",
    business_phone: "+254711345678",
    whatsapp: "+254711345678",
    logo_url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=400&fit=crop",
    service_areas: NAIROBI_AREAS,
    is_verified: true, is_available: true, instant_booking: false, tier: "premium",
    rating_average: 4.8, rating_count: 67, total_jobs_completed: 178, response_time_minutes: 120,
    services: [
      { subcategory: "hvac-ac-installation", price: 8000, price_type: "fixed" },
      { subcategory: "hvac-ac-repair", price: 5000, price_type: "fixed" },
      { subcategory: "hvac-ac-maintenance", price: 3000, price_type: "fixed" },
    ],
  },

  // ===== PAINTING & INTERIOR (3 providers) =====
  {
    business_name: "Interior Dreams Kenya",
    tagline: "Transform your space",
    description: "Full-service interior design and renovation company with 3D visualization.",
    business_email: "design@interiordreams.co.ke",
    business_phone: "+254722456789",
    whatsapp: "+254722456789",
    website: "https://interiordreams.co.ke",
    logo_url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=400&fit=crop",
    service_areas: ["Karen", "Lavington", "Kilimani", "Westlands", "Upper Hill"],
    is_verified: true, is_available: true, instant_booking: false, tier: "enterprise",
    rating_average: 4.9, rating_count: 45, total_jobs_completed: 89, response_time_minutes: 180,
    services: [
      { subcategory: "painting-interior-painting", price: 8000, price_type: "per_sqm" },
      { subcategory: "carpentry-custom-furniture", price: 15000, price_type: "fixed" },
      { subcategory: "flooring-tile-installation", price: 12000, price_type: "per_sqm" },
    ],
  },
  {
    business_name: "PaintPro Kenya",
    tagline: "Color your world",
    description: "Professional painting services with expert color consultation.",
    business_email: "paint@paintpro.co.ke",
    business_phone: "+254733567890",
    whatsapp: "+254733567890",
    logo_url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&h=400&fit=crop",
    service_areas: ["Westlands", "Kilimani", "Lavington", "Kileleshwa", "Parklands"],
    is_verified: true, is_available: true, instant_booking: true, tier: "premium",
    rating_average: 4.7, rating_count: 134, total_jobs_completed: 312, response_time_minutes: 60,
    services: [
      { subcategory: "painting-interior-painting", price: 350, price_type: "per_sqm" },
      { subcategory: "painting-exterior-painting", price: 400, price_type: "per_sqm" },
      { subcategory: "painting-wallpaper", price: 500, price_type: "per_sqm" },
    ],
  },
  {
    business_name: "FloorMaster Ltd",
    tagline: "From the ground up",
    description: "Flooring specialists with 5-year workmanship guarantee.",
    business_email: "floors@floormaster.co.ke",
    business_phone: "+254744678901",
    whatsapp: "+254744678901",
    logo_url: "https://images.unsplash.com/photo-1615971677499-5467cbab01c0?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1615971677499-5467cbab01c0?w=800&h=400&fit=crop",
    service_areas: NAIROBI_AREAS,
    is_verified: true, is_available: true, instant_booking: false, tier: "premium",
    rating_average: 4.6, rating_count: 78, total_jobs_completed: 156, response_time_minutes: 120,
    services: [
      { subcategory: "flooring-wood-flooring", price: 2500, price_type: "per_sqm" },
      { subcategory: "flooring-tile-installation", price: 1800, price_type: "per_sqm" },
      { subcategory: "flooring-vinyl-flooring", price: 1200, price_type: "per_sqm" },
    ],
  },

  // ===== SECURITY (2 providers) =====
  {
    business_name: "Guardian Security Kenya",
    tagline: "Your safety is our mission",
    description: "Comprehensive security solutions including CCTV and access control.",
    business_email: "secure@guardian.co.ke",
    business_phone: "+254755789012",
    whatsapp: "+254755789012",
    website: "https://guardiansecurity.co.ke",
    logo_url: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&h=400&fit=crop",
    service_areas: NAIROBI_AREAS,
    is_verified: true, is_available: true, instant_booking: false, tier: "enterprise",
    rating_average: 4.8, rating_count: 89, total_jobs_completed: 234, response_time_minutes: 120,
    services: [
      { subcategory: "security-security-guards", price: 35000, price_type: "fixed" },
      { subcategory: "security-cctv-installation", price: 25000, price_type: "fixed" },
      { subcategory: "security-access-control", price: 40000, price_type: "fixed" },
    ],
  },
  {
    business_name: "SecureHome Tech",
    tagline: "Smart security for modern homes",
    description: "Smart home security systems with remote monitoring.",
    business_email: "hello@securehome.co.ke",
    business_phone: "+254766890123",
    whatsapp: "+254766890123",
    logo_url: "https://images.unsplash.com/photo-1558002038-1055907df827?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&h=400&fit=crop",
    service_areas: ["Westlands", "Kilimani", "Lavington", "Karen", "Kileleshwa"],
    is_verified: true, is_available: true, instant_booking: true, tier: "premium",
    rating_average: 4.6, rating_count: 56, total_jobs_completed: 123, response_time_minutes: 90,
    services: [
      { subcategory: "security-cctv-installation", price: 15000, price_type: "fixed" },
      { subcategory: "security-alarm-systems", price: 12000, price_type: "fixed" },
    ],
  },

  // ===== PET CARE (2 providers) =====
  {
    business_name: "Happy Paws Kenya",
    tagline: "Because pets are family",
    description: "Premium pet care services including grooming and walking.",
    business_email: "woof@happypaws.co.ke",
    business_phone: "+254777901234",
    whatsapp: "+254777901234",
    website: "https://happypaws.co.ke",
    logo_url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=400&fit=crop",
    service_areas: ["Karen", "Lavington", "Kilimani", "Westlands", "Langata"],
    is_verified: true, is_available: true, instant_booking: true, tier: "premium",
    rating_average: 4.9, rating_count: 203, total_jobs_completed: 567, response_time_minutes: 30,
    services: [
      { subcategory: "pet-care-pet-grooming", price: 2500, price_type: "fixed" },
      { subcategory: "pet-care-dog-walking", price: 800, price_type: "hourly" },
      { subcategory: "pet-care-pet-sitting", price: 2000, price_type: "fixed" },
    ],
  },
  {
    business_name: "Paws & Claws Mobile Vet",
    tagline: "Vet care at your doorstep",
    description: "Mobile veterinary services bringing healthcare to your home.",
    business_email: "vet@pawsclaws.co.ke",
    business_phone: "+254788012345",
    whatsapp: "+254788012345",
    logo_url: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=800&h=400&fit=crop",
    service_areas: NAIROBI_AREAS,
    is_verified: true, is_available: true, instant_booking: false, tier: "enterprise",
    rating_average: 4.8, rating_count: 78, total_jobs_completed: 189, response_time_minutes: 60,
    services: [
      { subcategory: "pet-care-veterinary", price: 3500, price_type: "fixed" },
      { subcategory: "pet-care-pet-grooming", price: 3000, price_type: "fixed" },
    ],
  },

  // ===== UTILITIES & TECH (2 providers) =====
  {
    business_name: "SolarTech Kenya",
    tagline: "Power your future",
    description: "Leading solar energy solutions with EPRA licensing.",
    business_email: "solar@solartech.co.ke",
    business_phone: "+254799123456",
    whatsapp: "+254799123456",
    website: "https://solartech.co.ke",
    logo_url: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=400&fit=crop",
    service_areas: NAIROBI_AREAS,
    is_verified: true, is_available: true, instant_booking: false, tier: "enterprise",
    rating_average: 4.7, rating_count: 45, total_jobs_completed: 89, response_time_minutes: 240,
    services: [
      { subcategory: "electrical-solar", price: 150000, price_type: "fixed" },
      { subcategory: "electrical-generator", price: 15000, price_type: "fixed" },
    ],
  },
  {
    business_name: "TechFix Solutions",
    tagline: "Your tech problems solved",
    description: "Computer repairs, network setup, and smart home installation.",
    business_email: "help@techfix.co.ke",
    business_phone: "+254700234567",
    whatsapp: "+254700234567",
    logo_url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop",
    cover_photo_url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=400&fit=crop",
    service_areas: ["Westlands", "Kilimani", "Lavington", "Kileleshwa", "Karen", "Parklands"],
    is_verified: true, is_available: true, instant_booking: true, tier: "premium",
    rating_average: 4.8, rating_count: 92, total_jobs_completed: 345, response_time_minutes: 60,
    services: [
      { subcategory: "tech-support-computer-repair", price: 2000, price_type: "fixed" },
      { subcategory: "tech-support-network-setup", price: 5000, price_type: "fixed" },
      { subcategory: "tech-support-smart-home", price: 8000, price_type: "fixed" },
    ],
  },
];

// Sample reviews for providers
const SAMPLE_REVIEWS = [
  { rating: 5, review: "Excellent service! Very professional team. Would highly recommend." },
  { rating: 5, review: "On time, clean work, fair price. What more could you ask for?" },
  { rating: 4, review: "Good job overall. Minor delays but communicated well." },
  { rating: 5, review: "These guys are the best! Third time using them and never disappointed." },
  { rating: 4, review: "Professional service. A bit pricey but worth it for the quality." },
  { rating: 5, review: "Amazing work. They went above and beyond what was expected." },
  { rating: 5, review: "Fast response and excellent communication throughout the job." },
  { rating: 4, review: "Very satisfied with the results. Will use again." },
  { rating: 5, review: "Trustworthy and reliable. Left my home better than they found it." },
  { rating: 4, review: "Good service, reasonable prices. Recommended!" },
];

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function clearExistingData() {
  console.log("🗑️  Clearing existing provider data...\n");
  
  // Delete in order due to foreign keys
  await supabase.from("provider_reviews").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("provider_services").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("service_providers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  
  console.log("✅ Existing data cleared\n");
}

async function createTestUsers(count) {
  console.log(`👤 Creating ${count} test user profiles...\n`);
  
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const name = KENYAN_NAMES[i % KENYAN_NAMES.length];
    const email = `provider${i + 1}@test.mitasafi.com`;
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();
    
    if (existingProfile) {
      users.push(existingProfile.id);
      console.log(`  ⏭️  Existing profile: ${name.first} ${name.last}`);
      continue;
    }
    
    // Try to create auth user (might already exist)
    let userId = null;
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: "TestPass123!",
      email_confirm: true,
      user_metadata: {
        first_name: name.first,
        last_name: name.last,
      }
    });
    
    if (authError) {
      // User might already exist in auth, try to get them
      if (authError.message.includes("already been registered")) {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const existingAuth = authUsers?.users?.find(u => u.email === email);
        if (existingAuth) {
          userId = existingAuth.id;
        }
      }
      
      if (!userId) {
        console.error(`  ❌ Failed: ${email}:`, authError.message);
        continue;
      }
    } else {
      userId = authUser.user.id;
    }
    
    // Create/update the profile entry
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        email: email,
        full_name: `${name.first} ${name.last}`,
        phone: `+2547${String(Math.floor(10000000 + Math.random() * 90000000))}`,
        primary_role: "service_provider",
      }, { onConflict: "id" });
    
    if (profileError) {
      console.error(`  ❌ Profile failed for ${email}:`, profileError.message);
      continue;
    }
    
    users.push(userId);
    console.log(`  ✅ Created: ${name.first} ${name.last} (${email})`);
  }
  
  console.log(`\n✅ ${users.length} user profiles ready\n`);
  return users;
}

async function seedServices() {
  console.log("📦 Checking/creating services...\n");
  
  // Get all subcategories
  const { data: subcategories, error } = await supabase
    .from("service_subcategories")
    .select("id, name, category_id");
  
  if (error) {
    console.error("Failed to fetch subcategories:", error.message);
    return new Map();
  }
  
  const serviceMap = new Map();
  
  for (const subcat of subcategories) {
    // Check if a service already exists for this subcategory
    const { data: existingService } = await supabase
      .from("services")
      .select("id")
      .eq("subcategory_id", subcat.id)
      .limit(1)
      .single();
    
    if (existingService) {
      serviceMap.set(subcat.id, existingService.id);
      continue;
    }
    
    // Create a default service for this subcategory
    const { data: newService, error: insertError } = await supabase
      .from("services")
      .insert({
        subcategory_id: subcat.id,
        name: subcat.name,
        description: `Professional ${subcat.name.toLowerCase()} services`,
        is_active: true,
        is_popular: true,
      })
      .select("id")
      .single();
    
    if (insertError) {
      console.error(`Failed to create service for ${subcat.id}:`, insertError.message);
      continue;
    }
    
    serviceMap.set(subcat.id, newService.id);
    console.log(`  Created service: ${subcat.name}`);
  }
  
  console.log(`\n✅ ${serviceMap.size} services ready\n`);
  return serviceMap;
}

async function seedProviders(userIds, serviceMap) {
  console.log("🏢 Creating service providers...\n");
  
  let created = 0;
  let failed = 0;
  
  for (let i = 0; i < PROVIDERS.length; i++) {
    const providerData = PROVIDERS[i];
    const userId = userIds[i % userIds.length];
    
    // Check if provider already exists for this user
    const { data: existing } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", userId)
      .single();
    
    if (existing) {
      console.log(`  ⏭️  Skipped (exists): ${providerData.business_name}`);
      continue;
    }
    
    // Extract services before inserting
    const { services, ...providerRecord } = providerData;
    
    // Create provider
    const { data: provider, error: providerError } = await supabase
      .from("service_providers")
      .insert({
        user_id: userId,
        ...providerRecord,
        business_type: "company",
        status: "active",
      })
      .select("id")
      .single();
    
    if (providerError) {
      console.error(`  ❌ Failed: ${providerData.business_name}:`, providerError.message);
      failed++;
      continue;
    }
    
    // Link services
    for (const svc of services) {
      const serviceId = serviceMap.get(svc.subcategory);
      if (!serviceId) {
        console.warn(`    ⚠️  Service not found for subcategory: ${svc.subcategory}`);
        continue;
      }
      
      await supabase.from("provider_services").insert({
        provider_id: provider.id,
        service_id: serviceId,
        custom_price: svc.price,
        price_type: svc.price_type,
        is_active: true,
        is_featured: services.indexOf(svc) === 0, // First service is featured
      });
    }
    
    // Add sample reviews (3-5 per provider)
    const reviewCount = 3 + Math.floor(Math.random() * 3);
    for (let r = 0; r < reviewCount; r++) {
      const review = SAMPLE_REVIEWS[Math.floor(Math.random() * SAMPLE_REVIEWS.length)];
      const reviewerIdx = (i + r + 1) % userIds.length;
      
      await supabase.from("provider_reviews").insert({
        provider_id: provider.id,
        reviewer_id: userIds[reviewerIdx],
        rating: review.rating,
        review: review.review,
        is_verified: true,
      });
    }
    
    console.log(`  ✅ Created: ${providerData.business_name} (${services.length} services, ${reviewCount} reviews)`);
    created++;
  }
  
  console.log(`\n🏁 Provider seeding complete!`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ❌ Failed: ${failed}\n`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║     MITASAFI SERVICE PROVIDERS SEED SCRIPT         ║");
  console.log("╚════════════════════════════════════════════════════╝\n");
  
  try {
    // Step 1: Clear existing data
    await clearExistingData();
    
    // Step 2: Create test users
    const userIds = await createTestUsers(PROVIDERS.length);
    
    if (userIds.length === 0) {
      console.error("❌ No users created. Cannot continue.");
      process.exit(1);
    }
    
    // Step 3: Ensure services exist
    const serviceMap = await seedServices();
    
    if (serviceMap.size === 0) {
      console.error("❌ No services found. Cannot continue.");
      process.exit(1);
    }
    
    // Step 4: Seed providers
    await seedProviders(userIds, serviceMap);
    
    console.log("╔════════════════════════════════════════════════════╗");
    console.log("║              SEEDING COMPLETE! 🎉                  ║");
    console.log("╚════════════════════════════════════════════════════╝\n");
    
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();
