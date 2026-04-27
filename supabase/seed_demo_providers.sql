-- =============================================================================
-- MITASAFI: Demo Provider Seed Data
-- =============================================================================
-- Seeds: service_providers, provider_services, provider_service_areas,
--        provider_availability_intervals
-- Idempotent: Uses ON CONFLICT DO NOTHING on unique constraints.
-- Run with:  psql "$DATABASE_URL" -f supabase/seed_demo_providers.sql
--
-- IMPORTANT:
--   • Run AFTER seed_discovery_layer.sql (depends on categories & services)
--   • search_vector is a GENERATED column — DO NOT INSERT it
--   • min_price is trigger-maintained from provider_services.custom_pricing
--   • phone must match: ^\+?[0-9]{10,15}$
--   • response_time must be one of: immediate, 1_hour, 2_hours, 4_hours,
--     same_day, next_day
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SERVICE PROVIDERS (20 demo providers)
-- ─────────────────────────────────────────────────────────────────────────────
-- Using deterministic UUIDs for cross-referencing in subsequent inserts.
-- Provider UUID pattern: 10000000-0000-4000-a000-00000000000X
-- User UUID pattern:     20000000-0000-4000-b000-00000000000X

INSERT INTO service_providers (
  id, user_id, business_name, business_type, phone, email, whatsapp,
  primary_location, service_radius_km, bio, tagline, headline,
  years_in_business, years_experience, team_size, languages,
  is_active, is_verified, verification_badge, account_status,
  total_jobs_completed, average_rating, total_reviews,
  response_time, response_time_minutes, acceptance_rate,
  instant_booking, emergency_available, emergency_surcharge_type, emergency_surcharge_amount,
  social_links, portfolio_images
) VALUES

-- ─── 1. CleanPro Nairobi — Cleaning (Enterprise) ────────────────────────────
(
  '10000000-0000-4000-a000-000000000001',
  '20000000-0000-4000-b000-000000000001',
  'CleanPro Nairobi', 'company', '+254712345001', 'info@cleanpro.co.ke', '+254712345001',
  'Westlands, Nairobi', 15,
  'CleanPro is Nairobi''s premier residential and commercial cleaning company. With over 8 years of experience and a team of 25+ trained professionals, we deliver spotless results every time. We use eco-friendly products and employ a rigorous quality-check process. All our cleaners are background-checked and insured.',
  'Spotless cleaning, every time', 'Professional Cleaning Services',
  8, '8+', 25, ARRAY['English', 'Swahili'],
  true, true, 'enterprise', 'active',
  847, 4.92, 312,
  '1_hour', 45, 98.5,
  true, false, NULL, NULL,
  '{"instagram": "https://instagram.com/cleanpro_nbi", "facebook": "https://facebook.com/CleanProNairobi", "whatsapp": "+254712345001"}'::jsonb,
  ARRAY['/images/demo/portfolio/cleaning-1.jpg', '/images/demo/portfolio/cleaning-2.jpg', '/images/demo/portfolio/cleaning-3.jpg']
),

-- ─── 2. Quick Movers Kenya — Moving (Premium) ───────────────────────────────
(
  '10000000-0000-4000-a000-000000000002',
  '20000000-0000-4000-b000-000000000002',
  'Quick Movers Kenya', 'company', '+254712345002', 'bookings@quickmovers.co.ke', '+254712345002',
  'Kilimani, Nairobi', 50,
  'Quick Movers is a trusted moving company in Nairobi. We handle residential and office relocations with care and efficiency. Our fleet of 10 trucks and team of 30 movers ensures your belongings arrive safely. We provide packing materials, furniture wrapping, and insurance coverage.',
  'Move smart. Move quick.', 'Residential & Office Moving',
  6, '6+', 30, ARRAY['English', 'Swahili'],
  true, true, 'premium', 'active',
  523, 4.78, 187,
  '2_hours', 90, 95.0,
  false, false, NULL, NULL,
  '{"instagram": "https://instagram.com/quickmoverskenya", "tiktok": "https://tiktok.com/@quickmoverskenya"}'::jsonb,
  ARRAY['/images/demo/portfolio/moving-1.jpg', '/images/demo/portfolio/moving-2.jpg']
),

-- ─── 3. Fundi Electricals — Electrical (Free tier) ──────────────────────────
(
  '10000000-0000-4000-a000-000000000003',
  '20000000-0000-4000-b000-000000000003',
  'Fundi Electricals', 'individual', '+254712345003', 'james@fundielectricals.co.ke', '+254712345003',
  'South B, Nairobi', 20,
  'Certified electrician with 12 years of experience in residential and commercial electrical work. Specializing in wiring, solar installations, and generator services. Licensed by the Energy and Petroleum Regulatory Authority (EPRA). Quality work at honest prices.',
  'Trusted sparks, fair prices', 'Licensed Electrician',
  12, '12+', 3, ARRAY['English', 'Swahili', 'Luo'],
  true, true, NULL, 'active',
  214, 4.65, 76,
  'same_day', 180, 88.0,
  false, true, 'fixed', 1500.00,
  '{}'::jsonb,
  ARRAY['/images/demo/portfolio/electrical-1.jpg', '/images/demo/portfolio/electrical-2.jpg']
),

-- ─── 4. SafeHome Security — Security (Premium) ──────────────────────────────
(
  '10000000-0000-4000-a000-000000000004',
  '20000000-0000-4000-b000-000000000004',
  'SafeHome Security Solutions', 'company', '+254712345004', 'sales@safehomesecurity.co.ke', '+254712345004',
  'Karen, Nairobi', 30,
  'SafeHome Security provides comprehensive security solutions for residential estates, commercial properties, and events. Our services include CCTV installation, alarm systems, access control, and trained security personnel. We are licensed by the Private Security Regulatory Authority (PSRA).',
  'Your safety, our mission', 'CCTV, Alarms & Security Guards',
  10, '10+', 45, ARRAY['English', 'Swahili'],
  true, true, 'premium', 'active',
  389, 4.85, 142,
  '1_hour', 60, 97.0,
  true, true, 'percent', 25.00,
  '{"website": "https://safehomesecurity.co.ke", "facebook": "https://facebook.com/SafeHomeSecurity"}'::jsonb,
  ARRAY['/images/demo/portfolio/security-1.jpg', '/images/demo/portfolio/security-2.jpg', '/images/demo/portfolio/security-3.jpg']
),

-- ─── 5. PipeMaster Plumbing — Plumbing (Enterprise) ─────────────────────────
(
  '10000000-0000-4000-a000-000000000005',
  '20000000-0000-4000-b000-000000000005',
  'PipeMaster Plumbing', 'company', '+254712345005', 'service@pipemaster.co.ke', '+254712345005',
  'Westlands, Nairobi', 25,
  'PipeMaster is Nairobi''s most trusted plumbing service. We handle everything from emergency burst pipes to complete bathroom renovations. Our licensed plumbers arrive within 30 minutes for emergencies. 24/7 availability, upfront pricing, and a 12-month warranty on all work.',
  '30-minute emergency response', 'Emergency & Residential Plumbing',
  15, '15+', 18, ARRAY['English', 'Swahili'],
  true, true, 'enterprise', 'active',
  1024, 4.95, 408,
  'immediate', 25, 99.0,
  true, true, 'fixed', 2000.00,
  '{"instagram": "https://instagram.com/pipemaster_nbi", "youtube": "https://youtube.com/@PipeMasterPlumbing"}'::jsonb,
  ARRAY['/images/demo/portfolio/plumbing-1.jpg', '/images/demo/portfolio/plumbing-2.jpg', '/images/demo/portfolio/plumbing-3.jpg', '/images/demo/portfolio/plumbing-4.jpg']
),

-- ─── 6. Green Thumb Landscaping — Landscaping (Free tier) ────────────────────
(
  '10000000-0000-4000-a000-000000000006',
  '20000000-0000-4000-b000-000000000006',
  'Green Thumb Gardens', 'individual', '+254712345006', 'peter@greenthumbgardens.co.ke', '+254712345006',
  'Karen, Nairobi', 20,
  'Passionate about creating beautiful outdoor spaces. I specialize in garden design, lawn care, and landscaping for residential properties in Karen, Langata, and surrounding areas. Using sustainable practices and native plants wherever possible.',
  'Beautiful gardens, naturally', 'Garden Design & Landscaping',
  4, '4+', 5, ARRAY['English', 'Swahili'],
  true, false, NULL, 'active',
  87, 4.40, 32,
  'same_day', 240, 82.0,
  false, false, NULL, NULL,
  '{"instagram": "https://instagram.com/greenthumb_ke"}'::jsonb,
  ARRAY['/images/demo/portfolio/landscaping-1.jpg', '/images/demo/portfolio/landscaping-2.jpg']
),

-- ─── 7. Interior Dreams — Interior Design (Premium) ─────────────────────────
(
  '10000000-0000-4000-a000-000000000007',
  '20000000-0000-4000-b000-000000000007',
  'Interior Dreams Studio', 'company', '+254712345007', 'hello@interiordreams.co.ke', '+254712345007',
  'Kilimani, Nairobi', 30,
  'Interior Dreams is an award-winning interior design studio in Nairobi. We transform homes and offices into beautiful, functional spaces. Our team of 8 designers brings fresh perspectives and global trends to every project, while honouring Kenyan craftsmanship.',
  'Design that inspires', 'Award-Winning Interior Design',
  7, '7+', 8, ARRAY['English', 'Swahili', 'French'],
  true, true, 'premium', 'active',
  156, 4.88, 63,
  '4_hours', 180, 92.0,
  false, false, NULL, NULL,
  '{"instagram": "https://instagram.com/interiordreamske", "website": "https://interiordreams.co.ke", "pinterest": "https://pinterest.com/interiordreamske"}'::jsonb,
  ARRAY['/images/demo/portfolio/interior-1.jpg', '/images/demo/portfolio/interior-2.jpg', '/images/demo/portfolio/interior-3.jpg', '/images/demo/portfolio/interior-4.jpg']
),

-- ─── 8. BugAway Pest Control — Pest Control (Free tier) ─────────────────────
(
  '10000000-0000-4000-a000-000000000008',
  '20000000-0000-4000-b000-000000000008',
  'BugAway Pest Control', 'individual', '+254712345008', 'bugaway@email.com', '+254712345008',
  'South C, Nairobi', 15,
  'Effective and affordable pest control services in Nairobi. We handle fumigation, termite treatment, rodent control, and bed bug elimination. Using KEPHIS-approved products that are safe for families and pets.',
  'Pests gone for good', 'Fumigation & Pest Treatment',
  3, '3+', 4, ARRAY['English', 'Swahili'],
  true, false, NULL, 'active',
  54, 4.20, 18,
  'same_day', 300, 85.0,
  true, false, NULL, NULL,
  '{}'::jsonb,
  ARRAY['/images/demo/portfolio/pest-control-1.jpg']
),

-- ─── 9. CoolBreeze HVAC — HVAC (Premium) ────────────────────────────────────
(
  '10000000-0000-4000-a000-000000000009',
  '20000000-0000-4000-b000-000000000009',
  'CoolBreeze HVAC', 'company', '+254712345009', 'info@coolbreeze.co.ke', '+254712345009',
  'Westlands, Nairobi', 25,
  'CoolBreeze is Nairobi''s leading air conditioning and ventilation specialist. We install, repair, and service all major AC brands — Samsung, LG, Daikin, Carrier, and more. Our technicians are factory-trained with HVAC/R certification.',
  'Stay cool, live comfortable', 'AC Installation, Repair & Servicing',
  9, '9+', 12, ARRAY['English', 'Swahili'],
  true, true, 'premium', 'active',
  312, 4.72, 98,
  '2_hours', 120, 94.0,
  true, true, 'fixed', 3000.00,
  '{"facebook": "https://facebook.com/CoolBreezeNairobi"}'::jsonb,
  ARRAY['/images/demo/portfolio/hvac-1.jpg', '/images/demo/portfolio/hvac-2.jpg']
),

-- ─── 10. Brush & Roll Painters — Painting (Free tier) ───────────────────────
(
  '10000000-0000-4000-a000-000000000010',
  '20000000-0000-4000-b000-000000000010',
  'Brush & Roll Painters', 'individual', '+254712345010', 'painting@brushandroll.co.ke', '+254712345010',
  'Langata, Nairobi', 20,
  'Professional painters with an eye for detail. We specialize in interior and exterior painting, wallpaper installation, and decorative finishes. Using Crown, Sadolin, and Dulux paints. Free color consultation included with every project.',
  'Colour your world', 'Interior & Exterior Painting',
  5, '5+', 6, ARRAY['English', 'Swahili'],
  true, false, NULL, 'active',
  143, 4.55, 51,
  'same_day', 240, 90.0,
  false, false, NULL, NULL,
  '{}'::jsonb,
  ARRAY['/images/demo/portfolio/painting-1.jpg', '/images/demo/portfolio/painting-2.jpg']
),

-- ─── 11. Mama Njeri Catering — Catering (Premium) ───────────────────────────
(
  '10000000-0000-4000-a000-000000000011',
  '20000000-0000-4000-b000-000000000011',
  'Mama Njeri Catering', 'company', '+254712345011', 'orders@mamanjericatering.co.ke', '+254712345011',
  'Kileleshwa, Nairobi', 30,
  'Award-winning Kenyan catering for events, corporate functions, and private dining. Chef Njeri brings 20 years of culinary experience, blending traditional Kenyan flavours with contemporary presentation. We handle events from 10 to 500 guests.',
  'Flavours that bring people together', 'Event & Corporate Catering',
  11, '20+', 15, ARRAY['English', 'Swahili'],
  true, true, 'premium', 'active',
  267, 4.90, 105,
  '4_hours', 180, 93.0,
  false, false, NULL, NULL,
  '{"instagram": "https://instagram.com/mamanjerike", "facebook": "https://facebook.com/MamaNjeriCatering"}'::jsonb,
  ARRAY['/images/demo/portfolio/catering-1.jpg', '/images/demo/portfolio/catering-2.jpg', '/images/demo/portfolio/catering-3.jpg']
),

-- ─── 12. Tech Rescue — Tech Support (Free tier) ─────────────────────────────
(
  '10000000-0000-4000-a000-000000000012',
  '20000000-0000-4000-b000-000000000012',
  'Tech Rescue Nairobi', 'individual', '+254712345012', 'help@techrescue.co.ke', '+254712345012',
  'Parklands, Nairobi', 15,
  'Fast and reliable IT support for homes and small businesses. Computer repair, network setup, smart home configuration, and phone repairs. Microsoft and CompTIA certified. We come to you — no need to haul your equipment anywhere.',
  'Tech problems? Rescued!', 'Computer, Network & Smart Home',
  6, '6+', 3, ARRAY['English', 'Swahili', 'Hindi'],
  true, false, NULL, 'active',
  178, 4.60, 62,
  '2_hours', 90, 87.0,
  true, false, NULL, NULL,
  '{"twitter": "https://twitter.com/techrescuenbi"}'::jsonb,
  ARRAY['/images/demo/portfolio/tech-1.jpg']
),

-- ─── 13. FreshDrop Laundry — Laundry (Enterprise) ───────────────────────────
(
  '10000000-0000-4000-a000-000000000013',
  '20000000-0000-4000-b000-000000000013',
  'FreshDrop Laundry', 'company', '+254712345013', 'orders@freshdrop.co.ke', '+254712345013',
  'Lavington, Nairobi', 20,
  'FreshDrop is Nairobi''s favourite laundry and dry-cleaning service. Pickup from your door, professional cleaning, and delivery back — all within 24 hours. We use premium detergents, state-of-the-art machines, and handle delicates with extra care.',
  'Clean clothes, delivered', 'Laundry, Dry Cleaning & Ironing',
  5, '5+', 20, ARRAY['English', 'Swahili'],
  true, true, 'enterprise', 'active',
  612, 4.82, 234,
  '1_hour', 30, 97.5,
  true, false, NULL, NULL,
  '{"instagram": "https://instagram.com/freshdrop_ke", "whatsapp": "+254712345013"}'::jsonb,
  ARRAY['/images/demo/portfolio/laundry-1.jpg', '/images/demo/portfolio/laundry-2.jpg']
),

-- ─── 14. WaterWise Solutions — Water Services (Free tier) ────────────────────
(
  '10000000-0000-4000-a000-000000000014',
  '20000000-0000-4000-b000-000000000014',
  'WaterWise Solutions', 'company', '+254712345014', 'info@waterwise.co.ke', '+254712345014',
  'Ruaka, Nairobi', 40,
  'Reliable water delivery, tank cleaning, and purification services. We serve residential estates, construction sites, and agricultural farms across Nairobi and Kiambu County. Clean water is a right — we make it accessible.',
  'Clean water, always', 'Water Delivery & Tank Services',
  7, '7+', 10, ARRAY['English', 'Swahili'],
  true, false, NULL, 'active',
  198, 4.45, 67,
  '2_hours', 120, 88.0,
  false, false, NULL, NULL,
  '{}'::jsonb,
  ARRAY['/images/demo/portfolio/water-1.jpg']
),

-- ─── 15. Rooftop Masters — Roofing (Premium) ────────────────────────────────
(
  '10000000-0000-4000-a000-000000000015',
  '20000000-0000-4000-b000-000000000015',
  'Rooftop Masters', 'company', '+254712345015', 'quotes@rooftopmasters.co.ke', '+254712345015',
  'Upper Hill, Nairobi', 35,
  'Professional roofing contractor with 13 years of experience. We install new roofs, repair leaks, waterproof flat surfaces, and install gutters. We work with iron sheets, clay tiles, shingles, and flat roof membranes. Free site surveys and quotations.',
  'Above and beyond, literally', 'Roofing, Waterproofing & Gutters',
  13, '13+', 14, ARRAY['English', 'Swahili'],
  true, true, 'premium', 'active',
  245, 4.70, 89,
  'same_day', 240, 91.0,
  false, false, NULL, NULL,
  '{"facebook": "https://facebook.com/RooftopMasters"}'::jsonb,
  ARRAY['/images/demo/portfolio/roofing-1.jpg', '/images/demo/portfolio/roofing-2.jpg']
),

-- ─── 16. Happy Paws Pet Care — Pet Care (Free tier) ──────────────────────────
(
  '10000000-0000-4000-a000-000000000016',
  '20000000-0000-4000-b000-000000000016',
  'Happy Paws Pet Care', 'individual', '+254712345016', 'woof@happypaws.co.ke', '+254712345016',
  'Lavington, Nairobi', 15,
  'Passionate animal lover providing pet grooming, sitting, and dog walking in the Lavington-Kilimani area. Certified pet first-aid provider. Your fur babies deserve the best — I treat every pet like my own.',
  'Because they deserve the best', 'Pet Grooming, Sitting & Walking',
  3, '3+', 2, ARRAY['English', 'Swahili'],
  true, false, NULL, 'active',
  92, 4.75, 38,
  '4_hours', 180, 90.0,
  true, false, NULL, NULL,
  '{"instagram": "https://instagram.com/happypawsnbi"}'::jsonb,
  ARRAY['/images/demo/portfolio/pets-1.jpg', '/images/demo/portfolio/pets-2.jpg']
),

-- ─── 17. LockStar Locksmiths — Locksmith (Enterprise) ───────────────────────
(
  '10000000-0000-4000-a000-000000000017',
  '20000000-0000-4000-b000-000000000017',
  'LockStar Locksmiths', 'company', '+254712345017', 'emergency@lockstar.co.ke', '+254712345017',
  'Westlands, Nairobi', 30,
  'Nairobi''s fastest-responding locksmith service. We open locked doors in under 20 minutes with zero damage. Services include lock changes, smart lock installation, key duplication, and safe opening. Available 24 hours, 7 days a week.',
  '20-minute lockout rescue', '24/7 Emergency Locksmith',
  9, '9+', 8, ARRAY['English', 'Swahili'],
  true, true, 'enterprise', 'active',
  756, 4.88, 278,
  'immediate', 18, 99.5,
  true, true, 'fixed', 1000.00,
  '{"whatsapp": "+254712345017"}'::jsonb,
  ARRAY['/images/demo/portfolio/locksmith-1.jpg']
),

-- ─── 18. Celebrations Events — Events (Premium) ─────────────────────────────
(
  '10000000-0000-4000-a000-000000000018',
  '20000000-0000-4000-b000-000000000018',
  'Celebrations Events', 'company', '+254712345018', 'book@celebrationskenya.co.ke', '+254712345018',
  'Kilimani, Nairobi', 40,
  'Full-service event planning company. We handle weddings, corporate events, birthdays, and social gatherings. Our services include venue setup, entertainment booking, decoration, catering coordination, and photography. Over 200 successful events delivered.',
  'Making moments unforgettable', 'Event Planning & Coordination',
  8, '8+', 12, ARRAY['English', 'Swahili'],
  true, true, 'premium', 'active',
  203, 4.80, 78,
  '4_hours', 240, 90.0,
  false, false, NULL, NULL,
  '{"instagram": "https://instagram.com/celebrations_ke", "website": "https://celebrationskenya.co.ke"}'::jsonb,
  ARRAY['/images/demo/portfolio/events-1.jpg', '/images/demo/portfolio/events-2.jpg', '/images/demo/portfolio/events-3.jpg']
),

-- ─── 19. EcoWaste Solutions — Waste Management (Free tier) ───────────────────
(
  '10000000-0000-4000-a000-000000000019',
  '20000000-0000-4000-b000-000000000019',
  'EcoWaste Solutions', 'company', '+254712345019', 'collect@ecowaste.co.ke', '+254712345019',
  'Ruiru, Nairobi', 40,
  'Responsible waste management for households and businesses. We provide scheduled garbage collection, recycling sorting, junk removal, and exhauster services. Committed to reducing landfill waste through recycling and composting partnerships.',
  'Waste less, live more', 'Garbage Collection & Recycling',
  5, '5+', 15, ARRAY['English', 'Swahili'],
  true, false, NULL, 'active',
  167, 4.30, 45,
  'same_day', 300, 86.0,
  false, false, NULL, NULL,
  '{}'::jsonb,
  ARRAY['/images/demo/portfolio/waste-1.jpg']
),

-- ─── 20. NannyConnect — Childcare (Premium) ──────────────────────────────────
(
  '10000000-0000-4000-a000-000000000020',
  '20000000-0000-4000-b000-000000000020',
  'NannyConnect Kenya', 'company', '+254712345020', 'care@nannyconnect.co.ke', '+254712345020',
  'Kileleshwa, Nairobi', 20,
  'Kenya''s trusted childcare agency. We provide thoroughly vetted, background-checked nannies, babysitters, and tutors. All candidates undergo a 6-point screening: ID verification, reference checks, criminal background check, health screening, skills assessment, and a probation period.',
  'Trusted hands for your children', 'Nannies, Babysitters & Tutors',
  6, '6+', 8, ARRAY['English', 'Swahili'],
  true, true, 'premium', 'active',
  234, 4.85, 95,
  '4_hours', 240, 94.0,
  false, false, NULL, NULL,
  '{"instagram": "https://instagram.com/nannyconnectke", "facebook": "https://facebook.com/NannyConnectKenya"}'::jsonb,
  ARRAY['/images/demo/portfolio/childcare-1.jpg', '/images/demo/portfolio/childcare-2.jpg']
),

-- ─── 21. ApplianceFix Nairobi — Appliance Repair (Free tier) ────────────────
(
  '10000000-0000-4000-a000-000000000021',
  '20000000-0000-4000-b000-000000000021',
  'ApplianceFix Nairobi', 'individual', '+254712345021', 'repairs@appliancefix.co.ke', '+254712345021',
  'South B, Nairobi', 20,
  'Expert appliance technician specializing in fridges, washing machines, ovens, and dishwashers. Factory-trained on Samsung, LG, Bosch, and Hotpoint brands. Over 300 home appliances repaired. Same-day diagnostic, parts sourced within 48 hours.',
  'Fix it right the first time', 'Fridge, Washer & Oven Repair',
  7, '7+', 2, ARRAY['English', 'Swahili'],
  true, false, NULL, 'active',
  132, 4.50, 46,
  'same_day', 240, 88.0,
  true, false, NULL, NULL,
  '{}'::jsonb,
  ARRAY['/images/demo/portfolio/appliance-1.jpg', '/images/demo/portfolio/appliance-2.jpg']
),

-- ─── 22. ClearView Glass — Glass & Glazing (Free tier) ──────────────────────
(
  '10000000-0000-4000-a000-000000000022',
  '20000000-0000-4000-b000-000000000022',
  'ClearView Glass Works', 'company', '+254712345022', 'info@clearviewglass.co.ke', '+254712345022',
  'Upper Hill, Nairobi', 25,
  'Professional glass and glazing services for homes and offices. We handle window replacement, mirror installation, frameless shower screens, and glass balustrades. All work comes with a 2-year warranty. We use safety-rated tempered glass for all installations.',
  'Crystal clear results', 'Window Glass, Mirrors & Shower Screens',
  6, '6+', 6, ARRAY['English', 'Swahili'],
  true, false, NULL, 'active',
  98, 4.55, 34,
  'same_day', 300, 85.0,
  false, false, NULL, NULL,
  '{"facebook": "https://facebook.com/ClearViewGlassNbi"}'::jsonb,
  ARRAY['/images/demo/portfolio/glass-1.jpg', '/images/demo/portfolio/glass-2.jpg']
),

-- ─── 23. FloorCraft — Flooring (Premium) ────────────────────────────────────
(
  '10000000-0000-4000-a000-000000000023',
  '20000000-0000-4000-b000-000000000023',
  'FloorCraft Kenya', 'company', '+254712345023', 'quote@floorcraft.co.ke', '+254712345023',
  'Kilimani, Nairobi', 30,
  'Premium flooring specialists. We install tiles, hardwood, vinyl, and laminate flooring with precision and care. Our team handles everything from subfloor preparation to final polish. Serving residential and commercial clients across Nairobi.',
  'Walk on excellence', 'Tile, Hardwood & Vinyl Flooring',
  8, '8+', 10, ARRAY['English', 'Swahili'],
  true, true, 'premium', 'active',
  178, 4.70, 65,
  '4_hours', 180, 92.0,
  false, false, NULL, NULL,
  '{"instagram": "https://instagram.com/floorcraftke"}'::jsonb,
  ARRAY['/images/demo/portfolio/flooring-1.jpg', '/images/demo/portfolio/flooring-2.jpg', '/images/demo/portfolio/flooring-3.jpg']
),

-- ─── 24. Mti Carpentry — Carpentry (Free tier) ──────────────────────────────
(
  '10000000-0000-4000-a000-000000000024',
  '20000000-0000-4000-b000-000000000024',
  'Mti Carpentry Works', 'individual', '+254712345024', 'orders@mticarpentry.co.ke', '+254712345024',
  'Langata, Nairobi', 20,
  'Master carpenter with 15 years of experience. Specializing in custom furniture, fitted kitchens, wardrobes, and door/window repairs. Using quality hardwoods and modern joinery techniques. I build things that last — every joint is a masterpiece.',
  'Crafted with care', 'Custom Furniture, Kitchens & Wardrobes',
  15, '15+', 4, ARRAY['English', 'Swahili'],
  true, false, NULL, 'active',
  112, 4.60, 42,
  'same_day', 240, 86.0,
  false, false, NULL, NULL,
  '{}'::jsonb,
  ARRAY['/images/demo/portfolio/carpentry-1.jpg', '/images/demo/portfolio/carpentry-2.jpg']
),

-- ─── 25. RenovateKE — Renovation (Enterprise) ───────────────────────────────
(
  '10000000-0000-4000-a000-000000000025',
  '20000000-0000-4000-b000-000000000025',
  'RenovateKE', 'company', '+254712345025', 'projects@renovateke.co.ke', '+254712345025',
  'Westlands, Nairobi', 30,
  'Full-service renovation contractor. We handle kitchen renovations, bathroom remodels, and complete home makeovers. Our in-house team includes plumbers, electricians, tilers, and painters — one contractor, one project manager, zero headaches. Licensed by NCA.',
  'Transform your space', 'Kitchen & Bathroom Renovations',
  10, '10+', 20, ARRAY['English', 'Swahili'],
  true, true, 'enterprise', 'active',
  87, 4.82, 31,
  '4_hours', 180, 95.0,
  false, false, NULL, NULL,
  '{"instagram": "https://instagram.com/renovateke", "website": "https://renovateke.co.ke"}'::jsonb,
  ARRAY['/images/demo/portfolio/renovation-1.jpg', '/images/demo/portfolio/renovation-2.jpg', '/images/demo/portfolio/renovation-3.jpg']
)

ON CONFLICT (user_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PROVIDER SERVICES (link providers to services with pricing)
-- ─────────────────────────────────────────────────────────────────────────────
-- custom_pricing jsonb: { "type": "fixed|hourly|per_unit|starting_from|quote_only",
--                         "amount": number, "unit": "optional unit label" }
-- The min_price trigger on service_providers fires automatically.

INSERT INTO provider_services (provider_id, service_id, experience_years, custom_pricing, is_active) VALUES

  -- CleanPro Nairobi (cleaning)
  ('10000000-0000-4000-a000-000000000001', (SELECT id FROM services WHERE slug = 'standard-house-cleaning'),   8, '{"type": "fixed", "amount": 3500}'::jsonb,         true),
  ('10000000-0000-4000-a000-000000000001', (SELECT id FROM services WHERE slug = 'weekly-house-cleaning'),     8, '{"type": "fixed", "amount": 3000}'::jsonb,         true),
  ('10000000-0000-4000-a000-000000000001', (SELECT id FROM services WHERE slug = 'deep-cleaning-service'),     8, '{"type": "starting_from", "amount": 6000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000001', (SELECT id FROM services WHERE slug = 'office-cleaning-service'),   8, '{"type": "starting_from", "amount": 8000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000001', (SELECT id FROM services WHERE slug = 'carpet-upholstery-cleaning'),8, '{"type": "per_unit", "amount": 250, "unit": "per sqm"}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000001', (SELECT id FROM services WHERE slug = 'move-in-out-cleaning'),      8, '{"type": "starting_from", "amount": 5000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000001', (SELECT id FROM services WHERE slug = 'post-construction-cleanup'), 8, '{"type": "quote_only", "amount": null}'::jsonb,    true),

  -- Quick Movers Kenya (moving)
  ('10000000-0000-4000-a000-000000000002', (SELECT id FROM services WHERE slug = 'residential-moving'),        6, '{"type": "starting_from", "amount": 15000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000002', (SELECT id FROM services WHERE slug = 'office-relocation'),         6, '{"type": "quote_only", "amount": null}'::jsonb,     true),
  ('10000000-0000-4000-a000-000000000002', (SELECT id FROM services WHERE slug = 'furniture-delivery-service'),6, '{"type": "starting_from", "amount": 3000}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000002', (SELECT id FROM services WHERE slug = 'professional-packing'),      6, '{"type": "fixed", "amount": 5000}'::jsonb,          true),

  -- Fundi Electricals (electrical)
  ('10000000-0000-4000-a000-000000000003', (SELECT id FROM services WHERE slug = 'house-wiring'),              12, '{"type": "quote_only", "amount": null}'::jsonb,     true),
  ('10000000-0000-4000-a000-000000000003', (SELECT id FROM services WHERE slug = 'emergency-electrical-fault'),12, '{"type": "fixed", "amount": 3500}'::jsonb,          true),
  ('10000000-0000-4000-a000-000000000003', (SELECT id FROM services WHERE slug = 'socket-switch-repair'),      12, '{"type": "fixed", "amount": 1500}'::jsonb,          true),
  ('10000000-0000-4000-a000-000000000003', (SELECT id FROM services WHERE slug = 'lighting-installation'),     12, '{"type": "starting_from", "amount": 2000}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000003', (SELECT id FROM services WHERE slug = 'generator-installation'),    10, '{"type": "quote_only", "amount": null}'::jsonb,     true),
  ('10000000-0000-4000-a000-000000000003', (SELECT id FROM services WHERE slug = 'solar-panel-installation'),  5,  '{"type": "quote_only", "amount": null}'::jsonb,     true),

  -- SafeHome Security (security)
  ('10000000-0000-4000-a000-000000000004', (SELECT id FROM services WHERE slug = 'cctv-camera-installation'),  10, '{"type": "starting_from", "amount": 25000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000004', (SELECT id FROM services WHERE slug = 'alarm-system-installation'), 10, '{"type": "starting_from", "amount": 15000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000004', (SELECT id FROM services WHERE slug = 'access-control-installation'),10,'{"type": "starting_from", "amount": 20000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000004', (SELECT id FROM services WHERE slug = 'security-guard-service'),    10, '{"type": "fixed", "amount": 35000, "unit": "per month"}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000004', (SELECT id FROM services WHERE slug = 'event-security-service'),    10, '{"type": "starting_from", "amount": 8000}'::jsonb,  true),

  -- PipeMaster Plumbing (plumbing)
  ('10000000-0000-4000-a000-000000000005', (SELECT id FROM services WHERE slug = 'emergency-pipe-burst-repair'), 15, '{"type": "fixed", "amount": 5000}'::jsonb,         true),
  ('10000000-0000-4000-a000-000000000005', (SELECT id FROM services WHERE slug = 'pipe-replacement'),            15, '{"type": "starting_from", "amount": 3000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000005', (SELECT id FROM services WHERE slug = 'blocked-drain-clearing'),      15, '{"type": "fixed", "amount": 2500}'::jsonb,         true),
  ('10000000-0000-4000-a000-000000000005', (SELECT id FROM services WHERE slug = 'emergency-drain-unblock'),     15, '{"type": "fixed", "amount": 4000}'::jsonb,         true),
  ('10000000-0000-4000-a000-000000000005', (SELECT id FROM services WHERE slug = 'water-heater-installation'),   15, '{"type": "starting_from", "amount": 8000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000005', (SELECT id FROM services WHERE slug = 'water-heater-repair'),         15, '{"type": "fixed", "amount": 3000}'::jsonb,         true),
  ('10000000-0000-4000-a000-000000000005', (SELECT id FROM services WHERE slug = 'toilet-repair-service'),       15, '{"type": "fixed", "amount": 2000}'::jsonb,         true),
  ('10000000-0000-4000-a000-000000000005', (SELECT id FROM services WHERE slug = 'bathroom-fixture-installation'),15,'{"type": "starting_from", "amount": 4000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000005', (SELECT id FROM services WHERE slug = 'leak-detection-inspection'),   15, '{"type": "fixed", "amount": 5000}'::jsonb,         true),
  ('10000000-0000-4000-a000-000000000005', (SELECT id FROM services WHERE slug = 'water-tank-installation'),     15, '{"type": "starting_from", "amount": 12000}'::jsonb,true),

  -- Green Thumb Gardens (landscaping)
  ('10000000-0000-4000-a000-000000000006', (SELECT id FROM services WHERE slug = 'garden-design-service'),       4, '{"type": "starting_from", "amount": 15000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000006', (SELECT id FROM services WHERE slug = 'lawn-mowing-care'),            4, '{"type": "fixed", "amount": 2500}'::jsonb,          true),
  ('10000000-0000-4000-a000-000000000006', (SELECT id FROM services WHERE slug = 'tree-trimming-removal'),       4, '{"type": "starting_from", "amount": 3000}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000006', (SELECT id FROM services WHERE slug = 'fencing-installation'),        3, '{"type": "quote_only", "amount": null}'::jsonb,     true),

  -- Interior Dreams (interior design + painting)
  ('10000000-0000-4000-a000-000000000007', (SELECT id FROM services WHERE slug = 'space-planning-consultation'), 7, '{"type": "fixed", "amount": 12000}'::jsonb,         true),
  ('10000000-0000-4000-a000-000000000007', (SELECT id FROM services WHERE slug = 'kitchen-design-project'),      7, '{"type": "starting_from", "amount": 50000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000007', (SELECT id FROM services WHERE slug = 'color-consultation-service'),  7, '{"type": "fixed", "amount": 5000}'::jsonb,          true),
  ('10000000-0000-4000-a000-000000000007', (SELECT id FROM services WHERE slug = 'interior-painting-service'),   5, '{"type": "starting_from", "amount": 8000}'::jsonb,  true),

  -- BugAway Pest Control (pest control)
  ('10000000-0000-4000-a000-000000000008', (SELECT id FROM services WHERE slug = 'general-fumigation'),          3, '{"type": "starting_from", "amount": 3000}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000008', (SELECT id FROM services WHERE slug = 'termite-treatment-service'),   3, '{"type": "starting_from", "amount": 5000}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000008', (SELECT id FROM services WHERE slug = 'bed-bug-elimination'),         3, '{"type": "fixed", "amount": 4000}'::jsonb,          true),

  -- CoolBreeze HVAC
  ('10000000-0000-4000-a000-000000000009', (SELECT id FROM services WHERE slug = 'ac-unit-installation'),        9, '{"type": "starting_from", "amount": 8000}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000009', (SELECT id FROM services WHERE slug = 'ac-repair-service'),           9, '{"type": "fixed", "amount": 4500}'::jsonb,          true),
  ('10000000-0000-4000-a000-000000000009', (SELECT id FROM services WHERE slug = 'ac-maintenance-service'),      9, '{"type": "fixed", "amount": 3000}'::jsonb,          true),
  ('10000000-0000-4000-a000-000000000009', (SELECT id FROM services WHERE slug = 'ventilation-installation'),    9, '{"type": "quote_only", "amount": null}'::jsonb,     true),

  -- Brush & Roll Painters (painting)
  ('10000000-0000-4000-a000-000000000010', (SELECT id FROM services WHERE slug = 'interior-painting-service'),   5, '{"type": "starting_from", "amount": 5000}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000010', (SELECT id FROM services WHERE slug = 'exterior-painting-service'),   5, '{"type": "quote_only", "amount": null}'::jsonb,     true),
  ('10000000-0000-4000-a000-000000000010', (SELECT id FROM services WHERE slug = 'wallpaper-installation'),      4, '{"type": "starting_from", "amount": 3000}'::jsonb,  true),

  -- Mama Njeri Catering (catering)
  ('10000000-0000-4000-a000-000000000011', (SELECT id FROM services WHERE slug = 'event-catering-service'),      11, '{"type": "starting_from", "amount": 25000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000011', (SELECT id FROM services WHERE slug = 'private-chef-service'),        11, '{"type": "fixed", "amount": 8000}'::jsonb,          true),
  ('10000000-0000-4000-a000-000000000011', (SELECT id FROM services WHERE slug = 'weekly-meal-prep'),            11, '{"type": "fixed", "amount": 6000, "unit": "per week"}'::jsonb, true),

  -- Tech Rescue (tech support)
  ('10000000-0000-4000-a000-000000000012', (SELECT id FROM services WHERE slug = 'computer-laptop-repair'),      6, '{"type": "starting_from", "amount": 2000}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000012', (SELECT id FROM services WHERE slug = 'wifi-network-setup'),          6, '{"type": "fixed", "amount": 3500}'::jsonb,          true),
  ('10000000-0000-4000-a000-000000000012', (SELECT id FROM services WHERE slug = 'smart-home-setup'),            4, '{"type": "starting_from", "amount": 5000}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000012', (SELECT id FROM services WHERE slug = 'phone-tablet-repair'),         6, '{"type": "starting_from", "amount": 1500}'::jsonb,  true),

  -- FreshDrop Laundry (laundry)
  ('10000000-0000-4000-a000-000000000013', (SELECT id FROM services WHERE slug = 'wash-fold-service'),           5, '{"type": "per_unit", "amount": 200, "unit": "per kg"}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000013', (SELECT id FROM services WHERE slug = 'dry-cleaning-service'),        5, '{"type": "starting_from", "amount": 350}'::jsonb,              true),
  ('10000000-0000-4000-a000-000000000013', (SELECT id FROM services WHERE slug = 'ironing-service'),             5, '{"type": "per_unit", "amount": 50, "unit": "per item"}'::jsonb, true),

  -- WaterWise Solutions (water services)
  ('10000000-0000-4000-a000-000000000014', (SELECT id FROM services WHERE slug = 'clean-water-delivery'),        7, '{"type": "per_unit", "amount": 1500, "unit": "per 1000L"}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000014', (SELECT id FROM services WHERE slug = 'water-purifier-installation'), 5, '{"type": "starting_from", "amount": 8000}'::jsonb,               true),
  ('10000000-0000-4000-a000-000000000014', (SELECT id FROM services WHERE slug = 'water-tank-cleaning-service'), 7, '{"type": "starting_from", "amount": 3000}'::jsonb,               true),

  -- Rooftop Masters (roofing)
  ('10000000-0000-4000-a000-000000000015', (SELECT id FROM services WHERE slug = 'roof-leak-repair'),            13, '{"type": "starting_from", "amount": 5000}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000015', (SELECT id FROM services WHERE slug = 'new-roof-installation'),       13, '{"type": "quote_only", "amount": null}'::jsonb,     true),
  ('10000000-0000-4000-a000-000000000015', (SELECT id FROM services WHERE slug = 'roof-waterproofing'),          13, '{"type": "starting_from", "amount": 8000}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000015', (SELECT id FROM services WHERE slug = 'gutter-cleaning-repair'),      13, '{"type": "fixed", "amount": 3500}'::jsonb,          true),

  -- Happy Paws Pet Care (pet care)
  ('10000000-0000-4000-a000-000000000016', (SELECT id FROM services WHERE slug = 'pet-grooming-service'),        3, '{"type": "starting_from", "amount": 2000}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000016', (SELECT id FROM services WHERE slug = 'pet-sitting-service'),         3, '{"type": "fixed", "amount": 1500, "unit": "per day"}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000016', (SELECT id FROM services WHERE slug = 'dog-walking-service'),         3, '{"type": "fixed", "amount": 500, "unit": "per walk"}'::jsonb, true),

  -- LockStar Locksmiths (locksmith)
  ('10000000-0000-4000-a000-000000000017', (SELECT id FROM services WHERE slug = 'emergency-lockout-service'),   9, '{"type": "fixed", "amount": 3000}'::jsonb,          true),
  ('10000000-0000-4000-a000-000000000017', (SELECT id FROM services WHERE slug = 'lock-change-upgrade'),         9, '{"type": "starting_from", "amount": 2500}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000017', (SELECT id FROM services WHERE slug = 'key-cutting-duplication'),     9, '{"type": "fixed", "amount": 500}'::jsonb,           true),

  -- Celebrations Events (events)
  ('10000000-0000-4000-a000-000000000018', (SELECT id FROM services WHERE slug = 'event-planning-service'),      8, '{"type": "starting_from", "amount": 30000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000018', (SELECT id FROM services WHERE slug = 'dj-hire'),                     8, '{"type": "fixed", "amount": 15000}'::jsonb,         true),
  ('10000000-0000-4000-a000-000000000018', (SELECT id FROM services WHERE slug = 'event-photography'),           8, '{"type": "starting_from", "amount": 20000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000018', (SELECT id FROM services WHERE slug = 'event-decoration'),            8, '{"type": "starting_from", "amount": 10000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000018', (SELECT id FROM services WHERE slug = 'event-equipment-hire'),        8, '{"type": "starting_from", "amount": 8000}'::jsonb,  true),

  -- EcoWaste Solutions (waste management)
  ('10000000-0000-4000-a000-000000000019', (SELECT id FROM services WHERE slug = 'residential-garbage-collection'), 5, '{"type": "fixed", "amount": 1500, "unit": "per month"}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000019', (SELECT id FROM services WHERE slug = 'junk-removal-service'),           5, '{"type": "starting_from", "amount": 3000}'::jsonb,              true),
  ('10000000-0000-4000-a000-000000000019', (SELECT id FROM services WHERE slug = 'septic-exhauster-service'),       5, '{"type": "starting_from", "amount": 8000}'::jsonb,              true),

  -- NannyConnect Kenya (childcare)
  ('10000000-0000-4000-a000-000000000020', (SELECT id FROM services WHERE slug = 'babysitting-service'),    6, '{"type": "fixed", "amount": 1500, "unit": "per session"}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000020', (SELECT id FROM services WHERE slug = 'nanny-placement'),        6, '{"type": "fixed", "amount": 5000, "unit": "placement fee"}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000020', (SELECT id FROM services WHERE slug = 'home-tutoring'),          4, '{"type": "fixed", "amount": 1000, "unit": "per hour"}'::jsonb,   true),

  -- ApplianceFix Nairobi (appliance repair)
  ('10000000-0000-4000-a000-000000000021', (SELECT id FROM services WHERE slug = 'fridge-freezer-repair'),       7, '{"type": "fixed", "amount": 3500}'::jsonb,          true),
  ('10000000-0000-4000-a000-000000000021', (SELECT id FROM services WHERE slug = 'washing-machine-repair'),      7, '{"type": "fixed", "amount": 3000}'::jsonb,          true),
  ('10000000-0000-4000-a000-000000000021', (SELECT id FROM services WHERE slug = 'oven-cooker-repair'),          7, '{"type": "fixed", "amount": 2500}'::jsonb,          true),

  -- ClearView Glass Works (glass & glazing)
  ('10000000-0000-4000-a000-000000000022', (SELECT id FROM services WHERE slug = 'window-glass-replacement'),    6, '{"type": "starting_from", "amount": 4000}'::jsonb,  true),
  ('10000000-0000-4000-a000-000000000022', (SELECT id FROM services WHERE slug = 'mirror-installation-service'), 6, '{"type": "starting_from", "amount": 3000}'::jsonb,  true),

  -- FloorCraft Kenya (flooring)
  ('10000000-0000-4000-a000-000000000023', (SELECT id FROM services WHERE slug = 'tile-floor-installation'),     8, '{"type": "per_unit", "amount": 400, "unit": "per sqm"}'::jsonb,   true),
  ('10000000-0000-4000-a000-000000000023', (SELECT id FROM services WHERE slug = 'vinyl-laminate-installation'), 8, '{"type": "per_unit", "amount": 350, "unit": "per sqm"}'::jsonb,   true),

  -- Mti Carpentry Works (carpentry)
  ('10000000-0000-4000-a000-000000000024', (SELECT id FROM services WHERE slug = 'custom-furniture-build'),      15, '{"type": "quote_only", "amount": null}'::jsonb,     true),
  ('10000000-0000-4000-a000-000000000024', (SELECT id FROM services WHERE slug = 'kitchen-wardrobe-cabinets'),   15, '{"type": "starting_from", "amount": 25000}'::jsonb, true),
  ('10000000-0000-4000-a000-000000000024', (SELECT id FROM services WHERE slug = 'door-window-repair-service'),  15, '{"type": "fixed", "amount": 3000}'::jsonb,          true),

  -- RenovateKE (renovation)
  ('10000000-0000-4000-a000-000000000025', (SELECT id FROM services WHERE slug = 'kitchen-renovation-project'),  10, '{"type": "quote_only", "amount": null}'::jsonb,     true),
  ('10000000-0000-4000-a000-000000000025', (SELECT id FROM services WHERE slug = 'bathroom-renovation-project'), 10, '{"type": "quote_only", "amount": null}'::jsonb,     true)

ON CONFLICT (provider_id, service_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PROVIDER SERVICE AREAS
-- ─────────────────────────────────────────────────────────────────────────────
-- area_name values match NAIROBI_AREAS constant.
-- is_primary_area = true for the main area (no travel fee).

INSERT INTO provider_service_areas (provider_id, service_id, area_name, area_type, is_primary_area, travel_fee, currency) VALUES
  -- CleanPro — Westlands primary, covers 5 areas
  ('10000000-0000-4000-a000-000000000001', NULL, 'Westlands',   'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000001', NULL, 'Kilimani',    'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000001', NULL, 'Lavington',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000001', NULL, 'Parklands',   'neighborhood', false, 300,     'KES'),
  ('10000000-0000-4000-a000-000000000001', NULL, 'Kileleshwa',  'neighborhood', false, 0,       'KES'),

  -- Quick Movers — all areas (moving company)
  ('10000000-0000-4000-a000-000000000002', NULL, 'Westlands',   'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000002', NULL, 'Kilimani',    'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000002', NULL, 'Lavington',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000002', NULL, 'Kileleshwa',  'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000002', NULL, 'South B',     'neighborhood', false, 500,     'KES'),
  ('10000000-0000-4000-a000-000000000002', NULL, 'South C',     'neighborhood', false, 500,     'KES'),
  ('10000000-0000-4000-a000-000000000002', NULL, 'Langata',     'neighborhood', false, 500,     'KES'),
  ('10000000-0000-4000-a000-000000000002', NULL, 'Karen',       'neighborhood', false, 800,     'KES'),
  ('10000000-0000-4000-a000-000000000002', NULL, 'Ruaka',       'neighborhood', false, 800,     'KES'),
  ('10000000-0000-4000-a000-000000000002', NULL, 'Ruiru',       'neighborhood', false, 1000,    'KES'),
  ('10000000-0000-4000-a000-000000000002', NULL, 'Parklands',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000002', NULL, 'Upper Hill',  'neighborhood', false, 300,     'KES'),

  -- Fundi Electricals — South B/C + Langata
  ('10000000-0000-4000-a000-000000000003', NULL, 'South B',     'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000003', NULL, 'South C',     'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000003', NULL, 'Langata',     'neighborhood', false, 300,     'KES'),
  ('10000000-0000-4000-a000-000000000003', NULL, 'Upper Hill',  'neighborhood', false, 500,     'KES'),

  -- SafeHome Security — Karen, Lavington, Kilimani
  ('10000000-0000-4000-a000-000000000004', NULL, 'Karen',       'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000004', NULL, 'Lavington',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000004', NULL, 'Kilimani',    'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000004', NULL, 'Langata',     'neighborhood', false, 500,     'KES'),
  ('10000000-0000-4000-a000-000000000004', NULL, 'Kileleshwa',  'neighborhood', false, 500,     'KES'),

  -- PipeMaster Plumbing — Westlands primary, 8 areas
  ('10000000-0000-4000-a000-000000000005', NULL, 'Westlands',   'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000005', NULL, 'Kilimani',    'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000005', NULL, 'Lavington',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000005', NULL, 'Parklands',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000005', NULL, 'Kileleshwa',  'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000005', NULL, 'South B',     'neighborhood', false, 500,     'KES'),
  ('10000000-0000-4000-a000-000000000005', NULL, 'South C',     'neighborhood', false, 500,     'KES'),
  ('10000000-0000-4000-a000-000000000005', NULL, 'Upper Hill',  'neighborhood', false, 300,     'KES'),

  -- Green Thumb — Karen, Ruaka
  ('10000000-0000-4000-a000-000000000006', NULL, 'Karen',       'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000006', NULL, 'Langata',     'neighborhood', false, 300,     'KES'),
  ('10000000-0000-4000-a000-000000000006', NULL, 'Ruaka',       'neighborhood', false, 500,     'KES'),

  -- Interior Dreams — Kilimani, Lavington
  ('10000000-0000-4000-a000-000000000007', NULL, 'Kilimani',    'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000007', NULL, 'Lavington',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000007', NULL, 'Westlands',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000007', NULL, 'Kileleshwa',  'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000007', NULL, 'Karen',       'neighborhood', false, 500,     'KES'),

  -- BugAway — South C, Langata
  ('10000000-0000-4000-a000-000000000008', NULL, 'South C',     'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000008', NULL, 'Langata',     'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000008', NULL, 'South B',     'neighborhood', false, 300,     'KES'),

  -- CoolBreeze HVAC — Westlands, wide coverage
  ('10000000-0000-4000-a000-000000000009', NULL, 'Westlands',   'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000009', NULL, 'Kilimani',    'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000009', NULL, 'Parklands',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000009', NULL, 'Upper Hill',  'neighborhood', false, 300,     'KES'),
  ('10000000-0000-4000-a000-000000000009', NULL, 'Lavington',   'neighborhood', false, 0,       'KES'),

  -- Brush & Roll — Langata
  ('10000000-0000-4000-a000-000000000010', NULL, 'Langata',     'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000010', NULL, 'Karen',       'neighborhood', false, 300,     'KES'),
  ('10000000-0000-4000-a000-000000000010', NULL, 'South C',     'neighborhood', false, 300,     'KES'),
  ('10000000-0000-4000-a000-000000000010', NULL, 'South B',     'neighborhood', false, 500,     'KES'),

  -- Mama Njeri — Kileleshwa, wide coverage
  ('10000000-0000-4000-a000-000000000011', NULL, 'Kileleshwa',  'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000011', NULL, 'Kilimani',    'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000011', NULL, 'Westlands',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000011', NULL, 'Lavington',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000011', NULL, 'Karen',       'neighborhood', false, 500,     'KES'),

  -- Tech Rescue — Parklands
  ('10000000-0000-4000-a000-000000000012', NULL, 'Parklands',   'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000012', NULL, 'Westlands',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000012', NULL, 'Kilimani',    'neighborhood', false, 300,     'KES'),

  -- FreshDrop Laundry — Lavington, wide coverage
  ('10000000-0000-4000-a000-000000000013', NULL, 'Lavington',   'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000013', NULL, 'Kilimani',    'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000013', NULL, 'Kileleshwa',  'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000013', NULL, 'Westlands',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000013', NULL, 'Parklands',   'neighborhood', false, 300,     'KES'),
  ('10000000-0000-4000-a000-000000000013', NULL, 'Karen',       'neighborhood', false, 500,     'KES'),

  -- WaterWise — Ruaka, wide coverage
  ('10000000-0000-4000-a000-000000000014', NULL, 'Ruaka',       'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000014', NULL, 'Ruiru',       'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000014', NULL, 'Westlands',   'neighborhood', false, 500,     'KES'),
  ('10000000-0000-4000-a000-000000000014', NULL, 'Karen',       'neighborhood', false, 800,     'KES'),

  -- Rooftop Masters — Upper Hill
  ('10000000-0000-4000-a000-000000000015', NULL, 'Upper Hill',  'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000015', NULL, 'Kilimani',    'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000015', NULL, 'South B',     'neighborhood', false, 300,     'KES'),
  ('10000000-0000-4000-a000-000000000015', NULL, 'South C',     'neighborhood', false, 300,     'KES'),
  ('10000000-0000-4000-a000-000000000015', NULL, 'Langata',     'neighborhood', false, 500,     'KES'),

  -- Happy Paws — Lavington
  ('10000000-0000-4000-a000-000000000016', NULL, 'Lavington',   'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000016', NULL, 'Kilimani',    'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000016', NULL, 'Kileleshwa',  'neighborhood', false, 0,       'KES'),

  -- LockStar — Westlands, wide emergency coverage
  ('10000000-0000-4000-a000-000000000017', NULL, 'Westlands',   'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000017', NULL, 'Kilimani',    'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000017', NULL, 'Parklands',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000017', NULL, 'Lavington',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000017', NULL, 'Kileleshwa',  'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000017', NULL, 'South B',     'neighborhood', false, 500,     'KES'),
  ('10000000-0000-4000-a000-000000000017', NULL, 'South C',     'neighborhood', false, 500,     'KES'),
  ('10000000-0000-4000-a000-000000000017', NULL, 'Karen',       'neighborhood', false, 800,     'KES'),

  -- Celebrations Events — Kilimani, wide coverage
  ('10000000-0000-4000-a000-000000000018', NULL, 'Kilimani',    'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000018', NULL, 'Westlands',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000018', NULL, 'Karen',       'neighborhood', false, 500,     'KES'),
  ('10000000-0000-4000-a000-000000000018', NULL, 'Lavington',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000018', NULL, 'Kileleshwa',  'neighborhood', false, 0,       'KES'),

  -- EcoWaste — Ruiru, wide coverage
  ('10000000-0000-4000-a000-000000000019', NULL, 'Ruiru',       'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000019', NULL, 'Ruaka',       'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000019', NULL, 'Parklands',   'neighborhood', false, 500,     'KES'),
  ('10000000-0000-4000-a000-000000000019', NULL, 'Westlands',   'neighborhood', false, 500,     'KES'),

  -- NannyConnect — Kileleshwa
  ('10000000-0000-4000-a000-000000000020', NULL, 'Kileleshwa',  'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000020', NULL, 'Kilimani',    'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000020', NULL, 'Lavington',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000020', NULL, 'Westlands',   'neighborhood', false, 300,     'KES'),
  ('10000000-0000-4000-a000-000000000020', NULL, 'Karen',       'neighborhood', false, 500,     'KES'),

  -- ApplianceFix — South B
  ('10000000-0000-4000-a000-000000000021', NULL, 'South B',     'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000021', NULL, 'South C',     'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000021', NULL, 'Langata',     'neighborhood', false, 300,     'KES'),
  ('10000000-0000-4000-a000-000000000021', NULL, 'Upper Hill',  'neighborhood', false, 500,     'KES'),

  -- ClearView Glass — Upper Hill
  ('10000000-0000-4000-a000-000000000022', NULL, 'Upper Hill',  'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000022', NULL, 'Kilimani',    'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000022', NULL, 'Westlands',   'neighborhood', false, 300,     'KES'),
  ('10000000-0000-4000-a000-000000000022', NULL, 'South B',     'neighborhood', false, 300,     'KES'),

  -- FloorCraft — Kilimani, wide coverage
  ('10000000-0000-4000-a000-000000000023', NULL, 'Kilimani',    'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000023', NULL, 'Lavington',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000023', NULL, 'Westlands',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000023', NULL, 'Kileleshwa',  'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000023', NULL, 'Karen',       'neighborhood', false, 500,     'KES'),

  -- Mti Carpentry — Langata
  ('10000000-0000-4000-a000-000000000024', NULL, 'Langata',     'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000024', NULL, 'Karen',       'neighborhood', false, 300,     'KES'),
  ('10000000-0000-4000-a000-000000000024', NULL, 'South C',     'neighborhood', false, 300,     'KES'),

  -- RenovateKE — Westlands, wide coverage
  ('10000000-0000-4000-a000-000000000025', NULL, 'Westlands',   'neighborhood', true,  NULL,    'KES'),
  ('10000000-0000-4000-a000-000000000025', NULL, 'Kilimani',    'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000025', NULL, 'Lavington',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000025', NULL, 'Parklands',   'neighborhood', false, 0,       'KES'),
  ('10000000-0000-4000-a000-000000000025', NULL, 'Karen',       'neighborhood', false, 500,     'KES')

ON CONFLICT (provider_id, service_id, area_name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PROVIDER AVAILABILITY INTERVALS (RRULE-based)
-- ─────────────────────────────────────────────────────────────────────────────
-- Uses the canonical provider_availability_intervals table.
-- recurrence_rule follows iCalendar RRULE: FREQ=WEEKLY;BYDAY=MO,TU,...
-- available_from/to use a reference date (2026-01-05 = Monday) for the time portion.
-- is_exception = false for available times.

-- Standard working hours helper:
--   Mon-Fri 8:00-17:00 → BYDAY=MO,TU,WE,TH,FR
--   Sat 9:00-14:00     → BYDAY=SA
-- Emergency 24/7:
--   All days → separate daily entries or single BYDAY=MO,TU,WE,TH,FR,SA,SU

-- ── CleanPro — Mon-Fri 7am-6pm, Sat 8am-2pm ─────────────────────────────────
INSERT INTO provider_availability_intervals (provider_id, available_from, available_to, recurrence_rule, is_exception, is_active) VALUES
  ('10000000-0000-4000-a000-000000000001', '2026-01-05 07:00:00+03', '2026-01-05 18:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),
  ('10000000-0000-4000-a000-000000000001', '2026-01-10 08:00:00+03', '2026-01-10 14:00:00+03', 'FREQ=WEEKLY;BYDAY=SA', false, true),

-- ── Quick Movers — Mon-Sat 6am-7pm ───────────────────────────────────────────
  ('10000000-0000-4000-a000-000000000002', '2026-01-05 06:00:00+03', '2026-01-05 19:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA', false, true),

-- ── Fundi Electricals — Mon-Fri 8am-5pm, Sat 9am-1pm, Emergency Available ───
  ('10000000-0000-4000-a000-000000000003', '2026-01-05 08:00:00+03', '2026-01-05 17:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),
  ('10000000-0000-4000-a000-000000000003', '2026-01-10 09:00:00+03', '2026-01-10 13:00:00+03', 'FREQ=WEEKLY;BYDAY=SA', false, true),

-- ── SafeHome Security — 24/7 ─────────────────────────────────────────────────
  ('10000000-0000-4000-a000-000000000004', '2026-01-05 00:00:00+03', '2026-01-05 23:59:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU', false, true),

-- ── PipeMaster Plumbing — 24/7 Emergency ─────────────────────────────────────
  ('10000000-0000-4000-a000-000000000005', '2026-01-05 00:00:00+03', '2026-01-05 23:59:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU', false, true),

-- ── Green Thumb — Mon-Fri 7am-5pm, Sat 8am-12pm ──────────────────────────────
  ('10000000-0000-4000-a000-000000000006', '2026-01-05 07:00:00+03', '2026-01-05 17:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),
  ('10000000-0000-4000-a000-000000000006', '2026-01-10 08:00:00+03', '2026-01-10 12:00:00+03', 'FREQ=WEEKLY;BYDAY=SA', false, true),

-- ── Interior Dreams — Mon-Fri 9am-6pm ─────────────────────────────────────────
  ('10000000-0000-4000-a000-000000000007', '2026-01-05 09:00:00+03', '2026-01-05 18:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),

-- ── BugAway — Mon-Sat 8am-5pm ─────────────────────────────────────────────────
  ('10000000-0000-4000-a000-000000000008', '2026-01-05 08:00:00+03', '2026-01-05 17:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA', false, true),

-- ── CoolBreeze HVAC — Mon-Fri 8am-6pm, Sat 9am-3pm, Emergency on call ────────
  ('10000000-0000-4000-a000-000000000009', '2026-01-05 08:00:00+03', '2026-01-05 18:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),
  ('10000000-0000-4000-a000-000000000009', '2026-01-10 09:00:00+03', '2026-01-10 15:00:00+03', 'FREQ=WEEKLY;BYDAY=SA', false, true),

-- ── Brush & Roll — Mon-Fri 7am-5pm, Sat 8am-2pm ──────────────────────────────
  ('10000000-0000-4000-a000-000000000010', '2026-01-05 07:00:00+03', '2026-01-05 17:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),
  ('10000000-0000-4000-a000-000000000010', '2026-01-10 08:00:00+03', '2026-01-10 14:00:00+03', 'FREQ=WEEKLY;BYDAY=SA', false, true),

-- ── Mama Njeri Catering — Mon-Sun (events are any day) ────────────────────────
  ('10000000-0000-4000-a000-000000000011', '2026-01-05 07:00:00+03', '2026-01-05 22:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU', false, true),

-- ── Tech Rescue — Mon-Fri 9am-7pm, Sat 10am-4pm ──────────────────────────────
  ('10000000-0000-4000-a000-000000000012', '2026-01-05 09:00:00+03', '2026-01-05 19:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),
  ('10000000-0000-4000-a000-000000000012', '2026-01-10 10:00:00+03', '2026-01-10 16:00:00+03', 'FREQ=WEEKLY;BYDAY=SA', false, true),

-- ── FreshDrop Laundry — Mon-Sat 7am-8pm, Sun 9am-5pm ─────────────────────────
  ('10000000-0000-4000-a000-000000000013', '2026-01-05 07:00:00+03', '2026-01-05 20:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA', false, true),
  ('10000000-0000-4000-a000-000000000013', '2026-01-11 09:00:00+03', '2026-01-11 17:00:00+03', 'FREQ=WEEKLY;BYDAY=SU', false, true),

-- ── WaterWise — Mon-Sat 6am-6pm ──────────────────────────────────────────────
  ('10000000-0000-4000-a000-000000000014', '2026-01-05 06:00:00+03', '2026-01-05 18:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA', false, true),

-- ── Rooftop Masters — Mon-Fri 7am-5pm, Sat 8am-1pm ───────────────────────────
  ('10000000-0000-4000-a000-000000000015', '2026-01-05 07:00:00+03', '2026-01-05 17:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),
  ('10000000-0000-4000-a000-000000000015', '2026-01-10 08:00:00+03', '2026-01-10 13:00:00+03', 'FREQ=WEEKLY;BYDAY=SA', false, true),

-- ── Happy Paws — Mon-Sun 8am-6pm (pets need care every day) ──────────────────
  ('10000000-0000-4000-a000-000000000016', '2026-01-05 08:00:00+03', '2026-01-05 18:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU', false, true),

-- ── LockStar — 24/7 Emergency ────────────────────────────────────────────────
  ('10000000-0000-4000-a000-000000000017', '2026-01-05 00:00:00+03', '2026-01-05 23:59:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU', false, true),

-- ── Celebrations Events — Mon-Fri 9am-7pm (events on weekends are separate) ──
  ('10000000-0000-4000-a000-000000000018', '2026-01-05 09:00:00+03', '2026-01-05 19:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),
  ('10000000-0000-4000-a000-000000000018', '2026-01-10 08:00:00+03', '2026-01-10 22:00:00+03', 'FREQ=WEEKLY;BYDAY=SA,SU', false, true),

-- ── EcoWaste — Mon-Sat 6am-4pm ───────────────────────────────────────────────
  ('10000000-0000-4000-a000-000000000019', '2026-01-05 06:00:00+03', '2026-01-05 16:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA', false, true),

-- ── NannyConnect — Mon-Fri 8am-6pm, Sat 9am-1pm ──────────────────────────────
  ('10000000-0000-4000-a000-000000000020', '2026-01-05 08:00:00+03', '2026-01-05 18:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),
  ('10000000-0000-4000-a000-000000000020', '2026-01-10 09:00:00+03', '2026-01-10 13:00:00+03', 'FREQ=WEEKLY;BYDAY=SA', false, true),

-- ── ApplianceFix — Mon-Sat 8am-6pm ───────────────────────────────────────────
  ('10000000-0000-4000-a000-000000000021', '2026-01-05 08:00:00+03', '2026-01-05 18:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA', false, true),

-- ── ClearView Glass — Mon-Fri 8am-5pm, Sat 9am-1pm ──────────────────────────
  ('10000000-0000-4000-a000-000000000022', '2026-01-05 08:00:00+03', '2026-01-05 17:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),
  ('10000000-0000-4000-a000-000000000022', '2026-01-10 09:00:00+03', '2026-01-10 13:00:00+03', 'FREQ=WEEKLY;BYDAY=SA', false, true),

-- ── FloorCraft — Mon-Fri 7am-5pm, Sat 8am-2pm ───────────────────────────────
  ('10000000-0000-4000-a000-000000000023', '2026-01-05 07:00:00+03', '2026-01-05 17:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),
  ('10000000-0000-4000-a000-000000000023', '2026-01-10 08:00:00+03', '2026-01-10 14:00:00+03', 'FREQ=WEEKLY;BYDAY=SA', false, true),

-- ── Mti Carpentry — Mon-Fri 7am-5pm, Sat 8am-1pm ────────────────────────────
  ('10000000-0000-4000-a000-000000000024', '2026-01-05 07:00:00+03', '2026-01-05 17:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),
  ('10000000-0000-4000-a000-000000000024', '2026-01-10 08:00:00+03', '2026-01-10 13:00:00+03', 'FREQ=WEEKLY;BYDAY=SA', false, true),

-- ── RenovateKE — Mon-Fri 8am-6pm, Sat 9am-2pm ───────────────────────────────
  ('10000000-0000-4000-a000-000000000025', '2026-01-05 08:00:00+03', '2026-01-05 18:00:00+03', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', false, true),
  ('10000000-0000-4000-a000-000000000025', '2026-01-10 09:00:00+03', '2026-01-10 14:00:00+03', 'FREQ=WEEKLY;BYDAY=SA', false, true)

-- Note: provider_availability_intervals has no unique constraint on
-- (provider_id, recurrence_rule) in the schema, so re-running this will
-- create duplicates. Guard with a check before re-running, or truncate first.
;

COMMIT;
