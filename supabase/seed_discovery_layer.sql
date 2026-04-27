-- =============================================================================
-- MITASAFI: Discovery Layer Seed Data
-- =============================================================================
-- Seeds: service_types, service_categories, service_subcategories, services
-- Idempotent: Uses ON CONFLICT (unique_column) DO NOTHING on every INSERT.
-- Run with:  psql "$DATABASE_URL" -f supabase/seed_discovery_layer.sql
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SERVICE TYPES
-- ─────────────────────────────────────────────────────────────────────────────
-- Maps to booking_flow_type enum: emergency, standard, delivery, project, personal
-- Each service must reference exactly one service_type.

INSERT INTO service_types (code, name, booking_flow, description, risk_level, trust_level, requires_quote) VALUES
  -- Emergency flow types
  ('emergency_repair',    'Emergency Repair',         'emergency', 'Immediate response required — active damage or safety risk',                5, 3, false),
  ('urgent_callout',      'Urgent Callout',           'emergency', 'Same-day response for urgent but non-critical issues',                     3, 3, false),
  -- Standard flow types
  ('standard_service',    'Standard Service',         'standard',  'Scheduled service with predictable scope and fixed pricing',               1, 2, false),
  ('standard_repair',     'Standard Repair',          'standard',  'Scheduled repair or maintenance with known scope',                         2, 2, false),
  ('recurring_service',   'Recurring Service',        'standard',  'Regularly scheduled service (weekly, biweekly, monthly)',                   1, 2, false),
  ('installation',        'Installation',             'standard',  'Equipment or system installation requiring technical skill',               3, 3, true),
  -- Delivery flow types
  ('pickup_delivery',     'Pickup & Delivery',        'delivery',  'Pickup from one location and deliver to another',                          1, 1, false),
  ('supply_delivery',     'Supply & Delivery',        'delivery',  'Supply goods/materials and deliver to customer',                           1, 1, false),
  -- Project flow types
  ('project_work',        'Project Work',             'project',   'Large scope work requiring site visit, quote, and phased execution',       3, 4, true),
  ('consultation',        'Consultation',             'project',   'Professional assessment, design, or advisory session',                     1, 3, false),
  -- Personal flow types
  ('personal_service',    'Personal Service',         'personal',  'Human-to-human service in home or personal setting (trust-critical)',       2, 5, false),
  ('personal_specialist', 'Personal Specialist',      'personal',  'Skilled personal service requiring certification or special training',      2, 5, false)
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SERVICE CATEGORIES (25 granular categories)
-- ─────────────────────────────────────────────────────────────────────────────
-- These map to the frontend constants `SERVICE_CATEGORIES[].dbCategoryIds[]`.
-- The 8 major UI categories group these into: Moving, Cleaning, Repairs,
-- Interior, Utilities, Lifestyle, Security, Pet Care.
--
-- display_order groups them by UI category (repairs 1-7, cleaning 8-10, etc.)

INSERT INTO service_categories (slug, name, description, icon, is_primary, display_order, is_active, meta_title, meta_description) VALUES
  -- ── Repairs & Maintenance (UI: "repairs") ──────────────────────────────────
  ('plumbing',         'Plumbing',              'Professional plumbing services — pipe repair, drain cleaning, water heater installation, and leak detection',
    'Wrench',       true,  1, true, 'Plumbing Services in Nairobi | MitaSafi',         'Find trusted plumbers in Nairobi for pipe repair, drain cleaning, water heater installation, and emergency plumbing services.'),
  ('electrical',       'Electrical',            'Licensed electrical services — wiring, socket repair, lighting, generator, and solar installation',
    'Plug',         true,  2, true, 'Electrical Services in Nairobi | MitaSafi',       'Hire licensed electricians in Nairobi for wiring, repairs, solar installation, and electrical inspections.'),
  ('hvac',             'HVAC & Air Conditioning', 'Heating, ventilation, and air conditioning installation, repair, and servicing',
    'Thermometer',  true,  3, true, 'HVAC & AC Services in Nairobi | MitaSafi',        'Professional AC installation, repair, and servicing in Nairobi. Keep your home cool and comfortable.'),
  ('locksmith',        'Locksmith',             'Emergency and scheduled locksmith services — lock changes, key duplication, and access solutions',
    'KeyRound',     true,  4, true, 'Locksmith Services in Nairobi | MitaSafi',        'Reliable locksmith services in Nairobi for emergency lockouts, lock changes, and security upgrades.'),
  ('appliance-repair', 'Appliance Repair',      'Repair and maintenance for household appliances — fridges, washing machines, ovens, and more',
    'Wrench',       true,  5, true, 'Appliance Repair in Nairobi | MitaSafi',          'Get household appliances repaired by certified technicians in Nairobi.'),
  ('roofing',          'Roofing',               'Roof installation, repair, waterproofing, and gutter services',
    'Construction', true,  6, true, 'Roofing Services in Nairobi | MitaSafi',          'Professional roofing services in Nairobi — installation, repair, and waterproofing.'),
  ('glass',            'Glass & Glazing',       'Glass repair, replacement, window fitting, and mirror installation',
    'Wrench',       false, 7, true, 'Glass & Glazing Services in Nairobi | MitaSafi',  'Glass repair and replacement services in Nairobi for windows, doors, and mirrors.'),
  -- ── Cleaning (UI: "cleaning") ──────────────────────────────────────────────
  ('cleaning',         'Cleaning',              'Professional residential and commercial cleaning services',
    'Sparkles',     true,  8, true, 'Cleaning Services in Nairobi | MitaSafi',         'Book professional cleaning services in Nairobi — house cleaning, deep cleaning, and post-construction cleanup.'),
  ('pest-control',     'Pest Control',          'Fumigation, termite treatment, rodent control, and pest prevention',
    'Bug',          true,  9, true, 'Pest Control in Nairobi | MitaSafi',              'Effective pest control services in Nairobi — fumigation, termite treatment, bed bug removal.'),
  ('laundry',          'Laundry & Dry Cleaning', 'Wash, fold, dry cleaning, ironing, and fabric care services',
    'Shirt',        true, 10, true, 'Laundry Services in Nairobi | MitaSafi',           'Convenient laundry and dry cleaning services in Nairobi with pickup and delivery.'),
  -- ── Moving & Packing (UI: "moving") ────────────────────────────────────────
  ('moving',           'Moving & Relocation',   'Residential and commercial moving, packing, and storage services',
    'Truck',        true, 11, true, 'Moving Services in Nairobi | MitaSafi',            'Trusted movers in Nairobi for residential, office, and long-distance relocations.'),
  -- ── Interior & Design (UI: "interior") ─────────────────────────────────────
  ('interior-design',  'Interior Design',       'Space planning, interior styling, and home / office design consultation',
    'PaintBucket',  true, 12, true, 'Interior Design in Nairobi | MitaSafi',            'Transform your space with professional interior designers in Nairobi.'),
  ('painting',         'Painting',              'Interior and exterior painting, wallpaper installation, and decorative finishes',
    'Paintbrush',   true, 13, true, 'Painting Services in Nairobi | MitaSafi',          'Professional painters in Nairobi for interior, exterior, and decorative painting.'),
  ('flooring',         'Flooring',              'Floor installation, repair, and refinishing — tiles, hardwood, vinyl, and carpet',
    'Layers',       true, 14, true, 'Flooring Services in Nairobi | MitaSafi',          'Expert flooring installation and repair in Nairobi — tiles, hardwood, laminate, vinyl.'),
  ('carpentry',        'Carpentry',             'Custom furniture, cabinetry, door and window repair, and woodworking',
    'Hammer',       true, 15, true, 'Carpentry Services in Nairobi | MitaSafi',         'Skilled carpenters in Nairobi for custom furniture, cabinets, and wood repairs.'),
  ('renovation',       'Renovation',            'Full home and office renovation — kitchen, bathroom, and space remodelling',
    'Construction', true, 16, true, 'Renovation Services in Nairobi | MitaSafi',        'Complete home and office renovation services in Nairobi.'),
  -- ── Utilities & Tech (UI: "utilities") ─────────────────────────────────────
  ('tech-support',     'Tech Support',          'Computer repair, network setup, smart home, and phone repair',
    'Monitor',      true, 17, true, 'Tech Support in Nairobi | MitaSafi',               'Get IT support and tech services in Nairobi — computer repair, networking, smart home setup.'),
  ('water-services',   'Water Services',        'Water delivery, purification, borehole drilling, and tank cleaning',
    'GlassWater',   true, 18, true, 'Water Services in Nairobi | MitaSafi',             'Reliable water delivery, purification, and tank cleaning in Nairobi.'),
  ('waste-management', 'Waste Management',      'Garbage collection, recycling, junk removal, and septic services',
    'Trash2',       true, 19, true, 'Waste Management in Nairobi | MitaSafi',           'Professional waste collection, recycling, and junk removal in Nairobi.'),
  -- ── Lifestyle Services (UI: "lifestyle") ───────────────────────────────────
  ('catering',         'Catering',              'Event catering, private chef, meal prep, and corporate catering',
    'UtensilsCrossed', true, 20, true, 'Catering Services in Nairobi | MitaSafi',       'Professional catering services in Nairobi for events, parties, and corporate functions.'),
  ('events',           'Events',                'Event planning, DJ/entertainment, photography, decoration, and equipment hire',
    'PartyPopper',  true, 21, true, 'Event Planning in Nairobi | MitaSafi',             'Event planning and entertainment services in Nairobi — DJs, photographers, decorations.'),
  ('childcare',        'Childcare',             'Babysitting, nanny services, tutoring, and after-school care',
    'Baby',         false, 22, true, 'Childcare Services in Nairobi | MitaSafi',        'Trusted childcare and nanny services in Nairobi — babysitting, tutoring, after-school care.'),
  ('landscaping',      'Landscaping',           'Garden design, lawn care, tree service, irrigation, and outdoor spaces',
    'TreePine',     true, 23, true, 'Landscaping Services in Nairobi | MitaSafi',       'Professional landscaping and garden services in Nairobi.'),
  -- ── Security (UI: "security") ──────────────────────────────────────────────
  ('security',         'Security',              'Security guards, CCTV installation, alarm systems, access control, and event security',
    'Shield',       true, 24, true, 'Security Services in Nairobi | MitaSafi',          'Professional security services in Nairobi — guards, CCTV, alarms, and access control.'),
  -- ── Pet Care (UI: "pets") ──────────────────────────────────────────────────
  ('pet-care',         'Pet Care',              'Pet grooming, veterinary visits, pet sitting, dog walking, and pet transport',
    'PawPrint',     true, 25, true, 'Pet Care in Nairobi | MitaSafi',                   'Love your pets? Find trusted pet care services in Nairobi — grooming, vet visits, sitting.')
ON CONFLICT (slug) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SERVICE SUBCATEGORIES
-- ─────────────────────────────────────────────────────────────────────────────
-- Each subcategory belongs to one parent category.
-- Grouped by parent category for readability.

-- ── Plumbing ─────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'plumbing'), 'pipe-repair',        'Pipe Repair & Replacement',   'Burst pipe repair, pipe relining, and new pipe installation',      true),
  ((SELECT id FROM service_categories WHERE slug = 'plumbing'), 'drain-cleaning',     'Drain Cleaning',              'Blocked drain clearing, hydro-jetting, and drain camera inspection', true),
  ((SELECT id FROM service_categories WHERE slug = 'plumbing'), 'water-heater',       'Water Heater Services',       'Water heater installation, repair, and maintenance',               true),
  ((SELECT id FROM service_categories WHERE slug = 'plumbing'), 'toilet-repair',      'Toilet & Bathroom Fixtures',  'Toilet repair, cistern replacement, and bathroom fitting',         true),
  ((SELECT id FROM service_categories WHERE slug = 'plumbing'), 'leak-detection',     'Leak Detection',              'Professional leak detection and waterproofing',                    true),
  ((SELECT id FROM service_categories WHERE slug = 'plumbing'), 'water-tank',         'Water Tank & Pump',           'Water tank installation, cleaning, and pump repair',               true)
ON CONFLICT (slug) DO NOTHING;

-- ── Electrical ───────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'electrical'), 'wiring',             'Wiring & Rewiring',           'House wiring, rewiring, and electrical panel upgrades',            true),
  ((SELECT id FROM service_categories WHERE slug = 'electrical'), 'socket-repair',      'Socket & Switch Repair',      'Faulty socket replacement, switch installation, and outlet repair', true),
  ((SELECT id FROM service_categories WHERE slug = 'electrical'), 'lighting',           'Lighting Installation',       'Indoor and outdoor lighting design and installation',              true),
  ((SELECT id FROM service_categories WHERE slug = 'electrical'), 'generator-services', 'Generator Services',          'Generator installation, repair, servicing, and changeover wiring', true),
  ((SELECT id FROM service_categories WHERE slug = 'electrical'), 'solar-installation', 'Solar Installation',          'Solar panel installation, inverter setup, and battery systems',    true),
  ((SELECT id FROM service_categories WHERE slug = 'electrical'), 'electrical-inspection', 'Electrical Inspection',    'Safety inspections, compliance certificates, and fault diagnosis', true)
ON CONFLICT (slug) DO NOTHING;

-- ── HVAC ─────────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'hvac'), 'ac-installation',  'AC Installation',     'Split, window, and central AC installation',                      true),
  ((SELECT id FROM service_categories WHERE slug = 'hvac'), 'ac-repair',        'AC Repair',           'AC diagnostics, compressor repair, and refrigerant recharge',     true),
  ((SELECT id FROM service_categories WHERE slug = 'hvac'), 'ac-servicing',     'AC Servicing',        'Scheduled AC maintenance, filter cleaning, and system tune-up',   true),
  ((SELECT id FROM service_categories WHERE slug = 'hvac'), 'ventilation',      'Ventilation Systems', 'Ducting, exhaust fan installation, and air quality improvement',  true)
ON CONFLICT (slug) DO NOTHING;

-- ── Locksmith ────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'locksmith'), 'lock-change',       'Lock Change & Upgrade',  'Deadbolt, cylinder, and smart lock installation',      true),
  ((SELECT id FROM service_categories WHERE slug = 'locksmith'), 'key-duplication',   'Key Duplication',        'Standard and transponder key copying',                 true),
  ((SELECT id FROM service_categories WHERE slug = 'locksmith'), 'emergency-lockout', 'Emergency Lockout',      'Emergency door and car lockout assistance — 24/7',    true),
  ((SELECT id FROM service_categories WHERE slug = 'locksmith'), 'safe-services',     'Safe & Vault Services',  'Safe opening, installation, and combination changes',  true)
ON CONFLICT (slug) DO NOTHING;

-- ── Appliance Repair ─────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'appliance-repair'), 'fridge-repair',    'Fridge & Freezer Repair', 'Refrigerator diagnostics, compressor repair, and thermostat replacement', true),
  ((SELECT id FROM service_categories WHERE slug = 'appliance-repair'), 'washing-machine',  'Washing Machine Repair',  'Front-load and top-load washer repair and maintenance',                   true),
  ((SELECT id FROM service_categories WHERE slug = 'appliance-repair'), 'oven-cooker',      'Oven & Cooker Repair',    'Gas and electric oven repair, burner replacement, and thermocouple fix', true),
  ((SELECT id FROM service_categories WHERE slug = 'appliance-repair'), 'microwave-repair', 'Microwave Repair',        'Microwave diagnostics and component replacement',                        true),
  ((SELECT id FROM service_categories WHERE slug = 'appliance-repair'), 'dishwasher-repair','Dishwasher Repair',       'Dishwasher fault diagnosis, pump and spray arm repair',                  true)
ON CONFLICT (slug) DO NOTHING;

-- ── Roofing ──────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'roofing'), 'roof-repair',      'Roof Repair',        'Leak repair, ridge cap replacement, and shingle fixing',             true),
  ((SELECT id FROM service_categories WHERE slug = 'roofing'), 'roof-installation','Roof Installation',  'New roof installation — iron sheets, tiles, and shingles',          true),
  ((SELECT id FROM service_categories WHERE slug = 'roofing'), 'waterproofing',    'Waterproofing',      'Roof and wall waterproofing treatment',                              true),
  ((SELECT id FROM service_categories WHERE slug = 'roofing'), 'gutter-services',  'Gutter Services',    'Gutter installation, cleaning, and repair',                          true)
ON CONFLICT (slug) DO NOTHING;

-- ── Glass & Glazing ──────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'glass'), 'window-glass',   'Window Glass Repair',     'Broken window glass replacement and sealing',            true),
  ((SELECT id FROM service_categories WHERE slug = 'glass'), 'mirror-install', 'Mirror Installation',     'Custom mirror cutting, fitting, and wall mounting',      true),
  ((SELECT id FROM service_categories WHERE slug = 'glass'), 'glass-partition','Glass Partitions',        'Office and home glass partition design and installation', true)
ON CONFLICT (slug) DO NOTHING;

-- ── Cleaning ─────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'cleaning'), 'house-cleaning',        'House Cleaning',            'General house cleaning — dusting, mopping, sweeping, and tidying',            true),
  ((SELECT id FROM service_categories WHERE slug = 'cleaning'), 'deep-cleaning',         'Deep Cleaning',             'Intensive top-to-bottom deep clean of the entire home',                       true),
  ((SELECT id FROM service_categories WHERE slug = 'cleaning'), 'office-cleaning',       'Office Cleaning',           'Commercial office and workspace cleaning',                                    true),
  ((SELECT id FROM service_categories WHERE slug = 'cleaning'), 'carpet-cleaning',       'Carpet & Upholstery Cleaning', 'Professional carpet, rug, and upholstery steam cleaning',                  true),
  ((SELECT id FROM service_categories WHERE slug = 'cleaning'), 'window-cleaning',       'Window Cleaning',           'Interior and exterior window cleaning including high-rise',                   true),
  ((SELECT id FROM service_categories WHERE slug = 'cleaning'), 'move-in-move-out',      'Move-in / Move-out Clean',  'Thorough cleaning when moving in or vacating a property',                    true),
  ((SELECT id FROM service_categories WHERE slug = 'cleaning'), 'post-construction',     'Post-Construction Cleanup', 'Debris removal, dust cleaning, and polish after construction or renovation', true)
ON CONFLICT (slug) DO NOTHING;

-- ── Pest Control ─────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'pest-control'), 'fumigation',       'Fumigation',         'Whole-house fumigation for cockroaches, ants, and general pests', true),
  ((SELECT id FROM service_categories WHERE slug = 'pest-control'), 'termite-treatment', 'Termite Treatment',  'Termite inspection, soil treatment, and wood protection',         true),
  ((SELECT id FROM service_categories WHERE slug = 'pest-control'), 'rodent-control',   'Rodent Control',     'Mouse and rat removal, proofing, and prevention',                 true),
  ((SELECT id FROM service_categories WHERE slug = 'pest-control'), 'bed-bug-treatment','Bed Bug Treatment',  'Bed bug extermination using heat treatment or chemical spray',    true),
  ((SELECT id FROM service_categories WHERE slug = 'pest-control'), 'mosquito-control', 'Mosquito Control',   'Mosquito fogging, larviciding, and net installation',             true)
ON CONFLICT (slug) DO NOTHING;

-- ── Laundry ──────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'laundry'), 'wash-fold',         'Wash & Fold',        'Washing, drying, and folding by the kilogram',            true),
  ((SELECT id FROM service_categories WHERE slug = 'laundry'), 'dry-cleaning',      'Dry Cleaning',       'Professional dry cleaning for suits, dresses, and delicates', true),
  ((SELECT id FROM service_categories WHERE slug = 'laundry'), 'ironing-pressing',  'Ironing & Pressing', 'Garment ironing and steam pressing',                      true),
  ((SELECT id FROM service_categories WHERE slug = 'laundry'), 'curtain-cleaning',  'Curtain & Drape Cleaning', 'Curtain removal, cleaning, and re-hanging',          true)
ON CONFLICT (slug) DO NOTHING;

-- ── Moving ───────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'moving'), 'house-moving',      'House Moving',          'Full residential relocation — packing, transport, and unloading',   true),
  ((SELECT id FROM service_categories WHERE slug = 'moving'), 'office-moving',     'Office Moving',         'Commercial and office relocation with minimal downtime',             true),
  ((SELECT id FROM service_categories WHERE slug = 'moving'), 'furniture-delivery','Furniture Delivery',    'Single or multi-item furniture transport within Nairobi',            true),
  ((SELECT id FROM service_categories WHERE slug = 'moving'), 'packing-services',  'Packing Services',      'Professional packing with quality materials for safe transport',     true),
  ((SELECT id FROM service_categories WHERE slug = 'moving'), 'storage-services',  'Storage',               'Short-term and long-term secure storage solutions',                  true)
ON CONFLICT (slug) DO NOTHING;

-- ── Interior Design ──────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'interior-design'), 'space-planning',   'Space Planning',        'Room layout optimization and furniture arrangement',     true),
  ((SELECT id FROM service_categories WHERE slug = 'interior-design'), 'kitchen-design',   'Kitchen Design',        'Kitchen renovation design, cabinetry, and countertops',  true),
  ((SELECT id FROM service_categories WHERE slug = 'interior-design'), 'bathroom-design',  'Bathroom Design',       'Bathroom layout, fixtures, and finish specification',    true),
  ((SELECT id FROM service_categories WHERE slug = 'interior-design'), 'office-design',    'Office Design',         'Workspace design for productivity, branding, and comfort', true),
  ((SELECT id FROM service_categories WHERE slug = 'interior-design'), 'color-consultation','Color Consultation',   'Paint color selection and palette development',           true)
ON CONFLICT (slug) DO NOTHING;

-- ── Painting ─────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'painting'), 'interior-painting',  'Interior Painting',   'Wall, ceiling, and trim painting for homes and offices',     true),
  ((SELECT id FROM service_categories WHERE slug = 'painting'), 'exterior-painting',  'Exterior Painting',   'Outdoor wall, gate, and fence painting',                      true),
  ((SELECT id FROM service_categories WHERE slug = 'painting'), 'decorative-painting','Decorative Painting', 'Accent walls, faux finishes, murals, and decorative effects', true),
  ((SELECT id FROM service_categories WHERE slug = 'painting'), 'wallpaper',          'Wallpaper Installation', 'Wallpaper removal, wall prep, and professional hanging',   true)
ON CONFLICT (slug) DO NOTHING;

-- ── Flooring ─────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'flooring'), 'tile-installation',   'Tile Installation',    'Ceramic, porcelain, and natural stone tile laying',           true),
  ((SELECT id FROM service_categories WHERE slug = 'flooring'), 'hardwood-flooring',   'Hardwood Flooring',    'Hardwood installation, sanding, and refinishing',             true),
  ((SELECT id FROM service_categories WHERE slug = 'flooring'), 'vinyl-laminate',      'Vinyl & Laminate',     'Vinyl plank and laminate flooring installation',              true),
  ((SELECT id FROM service_categories WHERE slug = 'flooring'), 'floor-repair',        'Floor Repair',         'Cracked tile replacement, leveling, and terrazzo restoration', true)
ON CONFLICT (slug) DO NOTHING;

-- ── Carpentry ────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'carpentry'), 'custom-furniture',   'Custom Furniture',       'Bespoke furniture design and construction',              true),
  ((SELECT id FROM service_categories WHERE slug = 'carpentry'), 'cabinet-making',     'Cabinet Making',         'Kitchen, wardrobe, and storage cabinets',                 true),
  ((SELECT id FROM service_categories WHERE slug = 'carpentry'), 'door-window-repair', 'Door & Window Repair',   'Wooden door, window frame, and hinge repair',             true),
  ((SELECT id FROM service_categories WHERE slug = 'carpentry'), 'shelving-storage',   'Shelving & Storage',     'Wall shelves, bookcases, and built-in storage solutions', true)
ON CONFLICT (slug) DO NOTHING;

-- ── Renovation ───────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'renovation'), 'kitchen-renovation',  'Kitchen Renovation',    'Complete kitchen remodel — layout, cabinets, countertops, plumbing', true),
  ((SELECT id FROM service_categories WHERE slug = 'renovation'), 'bathroom-renovation', 'Bathroom Renovation',   'Full bathroom remodel — tiling, fixtures, plumbing, waterproofing', true),
  ((SELECT id FROM service_categories WHERE slug = 'renovation'), 'full-renovation',     'Full Home Renovation',  'Multi-room or whole-home renovation and remodelling',               true),
  ((SELECT id FROM service_categories WHERE slug = 'renovation'), 'office-renovation',   'Office Renovation',     'Commercial workspace renovation and fit-out',                       true)
ON CONFLICT (slug) DO NOTHING;

-- ── Tech Support ─────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'tech-support'), 'computer-repair',  'Computer Repair',     'Laptop and desktop diagnostics, repair, and upgrades',      true),
  ((SELECT id FROM service_categories WHERE slug = 'tech-support'), 'network-setup',    'Network & WiFi Setup', 'Router configuration, network cabling, and WiFi optimization', true),
  ((SELECT id FROM service_categories WHERE slug = 'tech-support'), 'smart-home',       'Smart Home Setup',    'Smart locks, cameras, speakers, and home automation',        true),
  ((SELECT id FROM service_categories WHERE slug = 'tech-support'), 'phone-repair',     'Phone & Tablet Repair', 'Screen replacement, battery swap, and software fixes',     true)
ON CONFLICT (slug) DO NOTHING;

-- ── Water Services ───────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'water-services'), 'water-delivery',     'Water Delivery',       'Clean water delivery by bowser or container',                 true),
  ((SELECT id FROM service_categories WHERE slug = 'water-services'), 'water-purification', 'Water Purification',   'Water filter and purifier installation and maintenance',       true),
  ((SELECT id FROM service_categories WHERE slug = 'water-services'), 'borehole-drilling',  'Borehole Drilling',    'Borehole drilling, casing, and pump installation',            true),
  ((SELECT id FROM service_categories WHERE slug = 'water-services'), 'tank-cleaning',      'Water Tank Cleaning',  'Water tank cleaning, disinfection, and maintenance',          true)
ON CONFLICT (slug) DO NOTHING;

-- ── Waste Management ─────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'waste-management'), 'garbage-collection','Garbage Collection',  'Scheduled residential and commercial waste pickup',              true),
  ((SELECT id FROM service_categories WHERE slug = 'waste-management'), 'recycling',        'Recycling Services',  'Sorted waste collection and recycling coordination',             true),
  ((SELECT id FROM service_categories WHERE slug = 'waste-management'), 'junk-removal',     'Junk Removal',        'Bulky item and construction debris removal',                     true),
  ((SELECT id FROM service_categories WHERE slug = 'waste-management'), 'septic-services',  'Septic & Exhauster',  'Septic tank emptying, cleaning, and maintenance',                true)
ON CONFLICT (slug) DO NOTHING;

-- ── Catering ─────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'catering'), 'event-catering',     'Event Catering',      'Food and beverage service for events, weddings, and parties', true),
  ((SELECT id FROM service_categories WHERE slug = 'catering'), 'private-chef',       'Private Chef',        'Personal chef services for dinner parties and special occasions', true),
  ((SELECT id FROM service_categories WHERE slug = 'catering'), 'meal-prep',          'Meal Prep',           'Weekly meal preparation and delivery',                         true),
  ((SELECT id FROM service_categories WHERE slug = 'catering'), 'corporate-catering', 'Corporate Catering',  'Office lunches, meeting catering, and corporate events',       true)
ON CONFLICT (slug) DO NOTHING;

-- ── Events ───────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'events'), 'event-planning',   'Event Planning',        'Full-service event coordination and logistics',                       true),
  ((SELECT id FROM service_categories WHERE slug = 'events'), 'dj-entertainment', 'DJ & Entertainment',    'DJs, MCs, live bands, and performers for events',                    true),
  ((SELECT id FROM service_categories WHERE slug = 'events'), 'photography',      'Photography & Video',   'Event photography, videography, and photo booths',                    true),
  ((SELECT id FROM service_categories WHERE slug = 'events'), 'decoration',       'Decoration',            'Event and venue decoration — flowers, balloons, lighting, and draping', true),
  ((SELECT id FROM service_categories WHERE slug = 'events'), 'equipment-hire',   'Equipment Hire',        'Tents, chairs, tables, sound systems, and lighting for events',       true)
ON CONFLICT (slug) DO NOTHING;

-- ── Childcare ────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'childcare'), 'babysitting',      'Babysitting',          'On-demand babysitting for a few hours or a full day',         true),
  ((SELECT id FROM service_categories WHERE slug = 'childcare'), 'nanny-services',   'Nanny Services',       'Full-time, part-time, or live-in nanny placement',            true),
  ((SELECT id FROM service_categories WHERE slug = 'childcare'), 'tutoring',         'Tutoring',             'Academic tutoring for primary and secondary school students',  true),
  ((SELECT id FROM service_categories WHERE slug = 'childcare'), 'after-school-care','After-School Care',    'Supervised activities and homework help after school hours',   true)
ON CONFLICT (slug) DO NOTHING;

-- ── Landscaping ──────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'landscaping'), 'garden-design',    'Garden Design',         'Landscape architecture and garden layout design',              true),
  ((SELECT id FROM service_categories WHERE slug = 'landscaping'), 'lawn-care',        'Lawn Care',             'Lawn mowing, fertilizing, aerating, and weed control',         true),
  ((SELECT id FROM service_categories WHERE slug = 'landscaping'), 'tree-services',    'Tree Services',         'Tree trimming, removal, stump grinding, and pruning',          true),
  ((SELECT id FROM service_categories WHERE slug = 'landscaping'), 'irrigation',       'Irrigation Systems',    'Drip and sprinkler irrigation design, installation, and repair', true),
  ((SELECT id FROM service_categories WHERE slug = 'landscaping'), 'fencing',          'Fencing',               'Wooden, chain-link, and decorative fencing installation',       true)
ON CONFLICT (slug) DO NOTHING;

-- ── Security ─────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'security'), 'security-guards',    'Security Guards',         'Residential, commercial, and estate security guard services',    true),
  ((SELECT id FROM service_categories WHERE slug = 'security'), 'cctv-installation',  'CCTV Installation',       'Camera system design, installation, and remote access setup',    true),
  ((SELECT id FROM service_categories WHERE slug = 'security'), 'alarm-systems',      'Alarm Systems',           'Intrusion detection, panic buttons, and alarm monitoring',        true),
  ((SELECT id FROM service_categories WHERE slug = 'security'), 'access-control',     'Access Control',          'Biometric, card, and keypad access control installation',         true),
  ((SELECT id FROM service_categories WHERE slug = 'security'), 'event-security',     'Event Security',          'Security personnel and crowd management for events',              true),
  ((SELECT id FROM service_categories WHERE slug = 'security'), 'mobile-patrol',      'Mobile Patrol',           'Scheduled and on-call patrol services for estates and businesses', true)
ON CONFLICT (slug) DO NOTHING;

-- ── Pet Care ─────────────────────────────────────────────────────────────────
INSERT INTO service_subcategories (category_id, slug, name, description, is_active) VALUES
  ((SELECT id FROM service_categories WHERE slug = 'pet-care'), 'pet-grooming',    'Pet Grooming',     'Bathing, trimming, nail clipping, and coat care',                    true),
  ((SELECT id FROM service_categories WHERE slug = 'pet-care'), 'pet-sitting',     'Pet Sitting',      'In-home pet sitting while you are away',                              true),
  ((SELECT id FROM service_categories WHERE slug = 'pet-care'), 'dog-walking',     'Dog Walking',      'Scheduled dog walking in your neighbourhood',                         true),
  ((SELECT id FROM service_categories WHERE slug = 'pet-care'), 'vet-house-calls', 'Vet House Calls',  'Veterinary consultation, vaccination, and minor treatment at home',    true),
  ((SELECT id FROM service_categories WHERE slug = 'pet-care'), 'pet-transport',   'Pet Transport',    'Safe pet transportation for vet visits, relocation, or boarding',      true)
ON CONFLICT (slug) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SERVICES (Individual Bookable Services)
-- ─────────────────────────────────────────────────────────────────────────────
-- Each service links to: category_id (NOT NULL), subcategory_id (nullable),
-- and service_type_id (NOT NULL).
-- Slugs must be globally unique; names unique per category.

-- Helper aliases for service_type references used throughout:
--   (SELECT id FROM service_types WHERE code = 'standard_repair')
--   (SELECT id FROM service_types WHERE code = 'emergency_repair')
--   etc.

-- ── Plumbing Services ────────────────────────────────────────────────────────
INSERT INTO services (category_id, subcategory_id, service_type_id, slug, name, short_description, description, is_active, requires_site_visit) VALUES
  -- Pipe Repair
  ((SELECT id FROM service_categories WHERE slug = 'plumbing'),
   (SELECT id FROM service_subcategories WHERE slug = 'pipe-repair'),
   (SELECT id FROM service_types WHERE code = 'emergency_repair'),
   'emergency-pipe-burst-repair', 'Emergency Pipe Burst Repair',
   'Immediate response for burst or leaking pipes',
   'Emergency callout for burst pipes, leaking joints, and flooding situations. Our plumbers arrive within 60 minutes with the tools and materials to stop the leak and make a lasting repair.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'plumbing'),
   (SELECT id FROM service_subcategories WHERE slug = 'pipe-repair'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'pipe-replacement', 'Pipe Replacement',
   'Planned pipe replacement for old or corroded pipes',
   'Scheduled replacement of corroded, galvanized, or damaged pipes. Includes assessment, material sourcing, and professional installation with warranty.',
   true, true),

  -- Drain Cleaning
  ((SELECT id FROM service_categories WHERE slug = 'plumbing'),
   (SELECT id FROM service_subcategories WHERE slug = 'drain-cleaning'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'blocked-drain-clearing', 'Blocked Drain Clearing',
   'Professional drain unblocking and cleaning',
   'Clear stubborn blockages in kitchen, bathroom, and floor drains using professional tools. Includes camera inspection for persistent issues.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'plumbing'),
   (SELECT id FROM service_subcategories WHERE slug = 'drain-cleaning'),
   (SELECT id FROM service_types WHERE code = 'emergency_repair'),
   'emergency-drain-unblock', 'Emergency Drain Unblock',
   'Urgent drain unblocking for sewage backup',
   'Emergency response for sewage backflows and completely blocked drains causing flooding or health hazards.',
   true, true),

  -- Water Heater
  ((SELECT id FROM service_categories WHERE slug = 'plumbing'),
   (SELECT id FROM service_subcategories WHERE slug = 'water-heater'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'water-heater-installation', 'Water Heater Installation',
   'Professional water heater installation',
   'Installation of instant, storage, or solar water heaters. Includes plumbing connections, electrical wiring (for electric units), and safety testing.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'plumbing'),
   (SELECT id FROM service_subcategories WHERE slug = 'water-heater'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'water-heater-repair', 'Water Heater Repair',
   'Diagnose and fix faulty water heaters',
   'Repair of leaking tanks, faulty thermostats, broken elements, and pressure relief valve issues.',
   true, true),

  -- Toilet & Bathroom Fixtures
  ((SELECT id FROM service_categories WHERE slug = 'plumbing'),
   (SELECT id FROM service_subcategories WHERE slug = 'toilet-repair'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'toilet-repair-service', 'Toilet Repair',
   'Fix running, leaking, or clogged toilets',
   'Professional repair for running toilets, broken flush mechanisms, cistern leaks, and bowl sealing issues.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'plumbing'),
   (SELECT id FROM service_subcategories WHERE slug = 'toilet-repair'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'bathroom-fixture-installation', 'Bathroom Fixture Installation',
   'Install taps, showers, basins, and bathroom accessories',
   'Professional installation of bathroom sinks, taps, shower heads, towel rails, and other bathroom fixtures.',
   true, true),

  -- Leak Detection
  ((SELECT id FROM service_categories WHERE slug = 'plumbing'),
   (SELECT id FROM service_subcategories WHERE slug = 'leak-detection'),
   (SELECT id FROM service_types WHERE code = 'consultation'),
   'leak-detection-inspection', 'Leak Detection & Inspection',
   'Locate hidden leaks using professional equipment',
   'Non-invasive leak detection using thermal imaging and acoustic equipment. Detailed report with repair recommendations.',
   true, true),

  -- Water Tank & Pump
  ((SELECT id FROM service_categories WHERE slug = 'plumbing'),
   (SELECT id FROM service_subcategories WHERE slug = 'water-tank'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'water-tank-installation', 'Water Tank Installation',
   'Water storage tank supply and installation',
   'Installation of overhead, underground, and ground-level water tanks. Includes plumbing connections and overflow systems.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'plumbing'),
   (SELECT id FROM service_subcategories WHERE slug = 'water-tank'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'water-tank-cleaning', 'Water Tank Cleaning',
   'Professional tank cleaning and disinfection',
   'Draining, scrubbing, disinfecting, and refilling your water tank. Recommended every 6 months.',
   true, true),

-- ── Electrical Services ──────────────────────────────────────────────────────
  -- Wiring
  ((SELECT id FROM service_categories WHERE slug = 'electrical'),
   (SELECT id FROM service_subcategories WHERE slug = 'wiring'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'house-wiring', 'House Wiring & Rewiring',
   'Complete house wiring or rewiring for new builds and renovations',
   'Full electrical wiring for new constructions and rewiring for older buildings. Includes panel installation, circuit design, and testing.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'electrical'),
   (SELECT id FROM service_subcategories WHERE slug = 'wiring'),
   (SELECT id FROM service_types WHERE code = 'emergency_repair'),
   'emergency-electrical-fault', 'Emergency Electrical Fault Repair',
   'Urgent repair for electrical faults, sparking, or power loss',
   'Emergency response for tripping circuits, sparking outlets, burning smell, or total power loss. Safety-first approach with certified electricians.',
   true, true),

  -- Socket & Switch Repair
  ((SELECT id FROM service_categories WHERE slug = 'electrical'),
   (SELECT id FROM service_subcategories WHERE slug = 'socket-repair'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'socket-switch-repair', 'Socket & Switch Repair',
   'Fix or replace faulty sockets and light switches',
   'Replacement of damaged, burned, or loose electrical sockets and switches. Includes safety testing after repair.',
   true, false),

  -- Lighting
  ((SELECT id FROM service_categories WHERE slug = 'electrical'),
   (SELECT id FROM service_subcategories WHERE slug = 'lighting'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'lighting-installation', 'Lighting Installation',
   'Indoor and outdoor lighting design and installation',
   'Professional installation of chandeliers, recessed lighting, outdoor security lights, and decorative fixtures.',
   true, false),

  -- Generator
  ((SELECT id FROM service_categories WHERE slug = 'electrical'),
   (SELECT id FROM service_subcategories WHERE slug = 'generator-services'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'generator-installation', 'Generator Installation',
   'Standby generator installation with automatic changeover',
   'Installation of diesel and petrol generators with ATS (automatic transfer switch) wiring. Includes fuel line and exhaust setup.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'electrical'),
   (SELECT id FROM service_subcategories WHERE slug = 'generator-services'),
   (SELECT id FROM service_types WHERE code = 'recurring_service'),
   'generator-servicing', 'Generator Servicing',
   'Scheduled generator maintenance and tune-up',
   'Oil change, filter replacement, battery check, load test, and coolant top-up. Recommended every 250 hours or quarterly.',
   true, true),

  -- Solar
  ((SELECT id FROM service_categories WHERE slug = 'electrical'),
   (SELECT id FROM service_subcategories WHERE slug = 'solar-installation'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'solar-panel-installation', 'Solar Panel Installation',
   'Residential and commercial solar power systems',
   'Design and installation of solar panels, inverters, charge controllers, and battery storage systems. Includes ROI assessment.',
   true, true),

  -- Inspection
  ((SELECT id FROM service_categories WHERE slug = 'electrical'),
   (SELECT id FROM service_subcategories WHERE slug = 'electrical-inspection'),
   (SELECT id FROM service_types WHERE code = 'consultation'),
   'electrical-safety-inspection', 'Electrical Safety Inspection',
   'Comprehensive electrical safety audit and compliance check',
   'Full inspection of wiring, panels, earthing, and fixtures. Issues compliance certificate for insurance or property sale.',
   true, true),

-- ── HVAC Services ────────────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'hvac'),
   (SELECT id FROM service_subcategories WHERE slug = 'ac-installation'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'ac-unit-installation', 'AC Unit Installation',
   'Split, cassette, or window AC installation',
   'Professional installation of air conditioning units. Includes mounting, piping, drainage, and electrical connections.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'hvac'),
   (SELECT id FROM service_subcategories WHERE slug = 'ac-repair'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'ac-repair-service', 'AC Repair',
   'Diagnose and repair faulty air conditioners',
   'Compressor repair, refrigerant recharge, fan motor replacement, and circuit board diagnostics for all AC types.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'hvac'),
   (SELECT id FROM service_subcategories WHERE slug = 'ac-servicing'),
   (SELECT id FROM service_types WHERE code = 'recurring_service'),
   'ac-maintenance-service', 'AC Servicing & Maintenance',
   'Scheduled AC cleaning and performance tune-up',
   'Filter cleaning, coil washing, gas pressure check, and drainage flush. Recommended quarterly for optimal efficiency.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'hvac'),
   (SELECT id FROM service_subcategories WHERE slug = 'ventilation'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'ventilation-installation', 'Ventilation System Installation',
   'Kitchen hood, bathroom exhaust, and duct installation',
   'Design and installation of ventilation systems for kitchens, bathrooms, and commercial spaces.',
   true, true),

-- ── Locksmith Services ───────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'locksmith'),
   (SELECT id FROM service_subcategories WHERE slug = 'emergency-lockout'),
   (SELECT id FROM service_types WHERE code = 'emergency_repair'),
   'emergency-lockout-service', 'Emergency Lockout',
   '24/7 emergency door and gate opening',
   'Locked out? Our locksmiths arrive within 30 minutes to open doors, gates, and safes without damage. Available 24/7.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'locksmith'),
   (SELECT id FROM service_subcategories WHERE slug = 'lock-change'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'lock-change-upgrade', 'Lock Change & Upgrade',
   'Replace old locks with modern high-security locks',
   'Upgrade to deadbolts, anti-snap cylinders, or smart locks. Includes old lock removal and new lock fitting.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'locksmith'),
   (SELECT id FROM service_subcategories WHERE slug = 'key-duplication'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'key-cutting-duplication', 'Key Cutting & Duplication',
   'Standard and security key copying',
   'On-the-spot key cutting for standard, dimple, and tubular keys. Transponder key programming also available.',
   true, false),

-- ── Appliance Repair Services ────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'appliance-repair'),
   (SELECT id FROM service_subcategories WHERE slug = 'fridge-repair'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'fridge-freezer-repair', 'Fridge & Freezer Repair',
   'Fix not-cooling, noisy, or leaking fridges',
   'Compressor diagnostics, thermostat replacement, gas recharge, and door seal repair for all fridge and freezer brands.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'appliance-repair'),
   (SELECT id FROM service_subcategories WHERE slug = 'washing-machine'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'washing-machine-repair', 'Washing Machine Repair',
   'Fix spinning, draining, and leaking issues',
   'Repair of drum bearings, pumps, motors, door locks, and electronic control boards for all washer types.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'appliance-repair'),
   (SELECT id FROM service_subcategories WHERE slug = 'oven-cooker'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'oven-cooker-repair', 'Oven & Cooker Repair',
   'Fix faulty ovens, gas cookers, and hobs',
   'Thermocouple replacement, igniter repair, element replacement, and gas safety checks for ovens and cookers.',
   true, true),

-- ── Roofing Services ─────────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'roofing'),
   (SELECT id FROM service_subcategories WHERE slug = 'roof-repair'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'roof-leak-repair', 'Roof Leak Repair',
   'Locate and fix roof leaks',
   'Leak detection, damaged sheet replacement, ridge cap sealing, and flashing repair for all roof types.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'roofing'),
   (SELECT id FROM service_subcategories WHERE slug = 'roof-installation'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'new-roof-installation', 'New Roof Installation',
   'Complete roof installation for new builds',
   'Full roof installation including timber framework, iron sheet or tile laying, gutters, and fascia. Free site survey.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'roofing'),
   (SELECT id FROM service_subcategories WHERE slug = 'waterproofing'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'roof-waterproofing', 'Roof & Deck Waterproofing',
   'Waterproof treatment for flat roofs, decks, and walls',
   'Application of waterproof membranes and coatings to prevent leaks. Suitable for flat roofs, balconies, and basement walls.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'roofing'),
   (SELECT id FROM service_subcategories WHERE slug = 'gutter-services'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'gutter-cleaning-repair', 'Gutter Cleaning & Repair',
   'Clean clogged gutters and fix damaged sections',
   'Remove leaves and debris, flush downpipes, and repair or replace damaged gutter sections.',
   true, false),

-- ── Glass & Glazing Services ─────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'glass'),
   (SELECT id FROM service_subcategories WHERE slug = 'window-glass'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'window-glass-replacement', 'Window Glass Replacement',
   'Broken window glass removal and replacement',
   'Same-day broken window repair. Accurate measurement, glass cutting, and professional fitting with putty or silicone seal.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'glass'),
   (SELECT id FROM service_subcategories WHERE slug = 'mirror-install'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'mirror-installation-service', 'Mirror Installation',
   'Custom mirror fitting for bathrooms, wardrobes, and walls',
   'Precise measurement, cutting, and secure mounting of mirrors. Includes anti-shatter backing for safety.',
   true, false),

-- ── Cleaning Services ────────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'cleaning'),
   (SELECT id FROM service_subcategories WHERE slug = 'house-cleaning'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'standard-house-cleaning', 'Standard House Cleaning',
   'Regular home cleaning — kitchen, bathrooms, bedrooms, and living areas',
   'Thorough cleaning of all rooms including dusting, mopping, vacuuming, bathroom sanitization, and kitchen cleanup.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'cleaning'),
   (SELECT id FROM service_subcategories WHERE slug = 'house-cleaning'),
   (SELECT id FROM service_types WHERE code = 'recurring_service'),
   'weekly-house-cleaning', 'Weekly / Biweekly Cleaning',
   'Recurring scheduled house cleaning',
   'Regular cleaning visits on your preferred schedule. Same cleaner each time for consistency. Flexible rescheduling.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'cleaning'),
   (SELECT id FROM service_subcategories WHERE slug = 'deep-cleaning'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'deep-cleaning-service', 'Deep Cleaning',
   'Intensive deep clean for the entire home',
   'Top-to-bottom deep clean: behind appliances, inside cabinets, grout scrubbing, light fixtures, skirting boards, and more.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'cleaning'),
   (SELECT id FROM service_subcategories WHERE slug = 'office-cleaning'),
   (SELECT id FROM service_types WHERE code = 'recurring_service'),
   'office-cleaning-service', 'Office Cleaning',
   'Professional office and workspace cleaning',
   'Daily, weekly, or one-time commercial cleaning. Desks, floors, restrooms, kitchen area, and window cleaning.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'cleaning'),
   (SELECT id FROM service_subcategories WHERE slug = 'carpet-cleaning'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'carpet-upholstery-cleaning', 'Carpet & Upholstery Cleaning',
   'Professional steam cleaning for carpets, rugs, and sofas',
   'Hot water extraction and steam cleaning for carpets, area rugs, and upholstered furniture. Removes stains, allergens, and odours.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'cleaning'),
   (SELECT id FROM service_subcategories WHERE slug = 'window-cleaning'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'window-cleaning-service', 'Window Cleaning',
   'Streak-free interior and exterior window cleaning',
   'Professional window cleaning for homes and offices. Includes frames, sills, and screens. High-rise equipment available.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'cleaning'),
   (SELECT id FROM service_subcategories WHERE slug = 'move-in-move-out'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'move-in-out-cleaning', 'Move-in / Move-out Cleaning',
   'Thorough clean when moving in or vacating',
   'Complete cleaning of an empty property — walls, windows, floors, kitchen, bathrooms, cabinets, and wardrobes.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'cleaning'),
   (SELECT id FROM service_subcategories WHERE slug = 'post-construction'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'post-construction-cleanup', 'Post-Construction Cleanup',
   'Heavy-duty cleaning after building or renovation work',
   'Debris removal, dust elimination, paint splatter cleaning, floor polishing, and final touch-up after construction.',
   true, true),

-- ── Pest Control Services ────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'pest-control'),
   (SELECT id FROM service_subcategories WHERE slug = 'fumigation'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'general-fumigation', 'General Fumigation',
   'Whole-house pest control for cockroaches, ants, and more',
   'Comprehensive fumigation targeting cockroaches, ants, spiders, and other common household pests. Safe for families and pets.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'pest-control'),
   (SELECT id FROM service_subcategories WHERE slug = 'termite-treatment'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'termite-treatment-service', 'Termite Treatment',
   'Soil and wood treatment to eliminate termites',
   'Pre- and post-construction termite treatment. Soil injection, wood preservation, and bait systems.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'pest-control'),
   (SELECT id FROM service_subcategories WHERE slug = 'bed-bug-treatment'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'bed-bug-elimination', 'Bed Bug Treatment',
   'Heat and chemical treatment for bed bug infestations',
   'Thorough bed bug extermination using heat treatment, steam, and targeted chemical spray. Includes follow-up visit.',
   true, false),

-- ── Laundry Services ─────────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'laundry'),
   (SELECT id FROM service_subcategories WHERE slug = 'wash-fold'),
   (SELECT id FROM service_types WHERE code = 'pickup_delivery'),
   'wash-fold-service', 'Wash & Fold',
   'Laundry pickup, wash, fold, and delivery',
   'Drop off or request pickup. Clothes washed, dried, folded, and delivered back. Priced per kilogram.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'laundry'),
   (SELECT id FROM service_subcategories WHERE slug = 'dry-cleaning'),
   (SELECT id FROM service_types WHERE code = 'pickup_delivery'),
   'dry-cleaning-service', 'Dry Cleaning',
   'Professional dry cleaning for suits, dresses, and delicate fabrics',
   'Expert dry cleaning for delicate garments, suits, wedding dresses, and leather. Pickup and delivery included.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'laundry'),
   (SELECT id FROM service_subcategories WHERE slug = 'ironing-pressing'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'ironing-service', 'Ironing & Pressing',
   'Professional garment ironing and steam pressing',
   'Per-item ironing and pressing service. Perfect creases and wrinkle-free results.',
   true, false),

-- ── Moving Services ──────────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'moving'),
   (SELECT id FROM service_subcategories WHERE slug = 'house-moving'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'residential-moving', 'Residential Moving',
   'Full house moving — packing, loading, transport, and unloading',
   'Complete home relocation service. We pack, protect, transport, and unload your belongings. Insurance available.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'moving'),
   (SELECT id FROM service_subcategories WHERE slug = 'office-moving'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'office-relocation', 'Office Relocation',
   'Commercial office moving with minimal business disruption',
   'Weekend and after-hours office moves. IT equipment handling, furniture disassembly, and workspace setup at new location.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'moving'),
   (SELECT id FROM service_subcategories WHERE slug = 'furniture-delivery'),
   (SELECT id FROM service_types WHERE code = 'pickup_delivery'),
   'furniture-delivery-service', 'Furniture Delivery',
   'Single or multiple item furniture transport',
   'Safe transport of furniture items within Nairobi. Includes protective wrapping, loading, and delivery to your floor.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'moving'),
   (SELECT id FROM service_subcategories WHERE slug = 'packing-services'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'professional-packing', 'Professional Packing',
   'Expert packing with quality materials for safe transport',
   'Professional packing using bubble wrap, boxes, tape, and labelling. Available standalone or as part of a move.',
   true, false),

-- ── Interior Design Services ─────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'interior-design'),
   (SELECT id FROM service_subcategories WHERE slug = 'space-planning'),
   (SELECT id FROM service_types WHERE code = 'consultation'),
   'space-planning-consultation', 'Space Planning Consultation',
   'Professional space layout and furniture arrangement advice',
   'On-site assessment and design proposal for optimal room layout. Includes 3D visualization and furniture recommendations.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'interior-design'),
   (SELECT id FROM service_subcategories WHERE slug = 'kitchen-design'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'kitchen-design-project', 'Kitchen Design & Remodel',
   'Complete kitchen design from layout to finishes',
   'Full kitchen design service: layout, cabinetry specs, countertop selection, lighting plan, and contractor coordination.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'interior-design'),
   (SELECT id FROM service_subcategories WHERE slug = 'color-consultation'),
   (SELECT id FROM service_types WHERE code = 'consultation'),
   'color-consultation-service', 'Color Consultation',
   'Expert paint and palette selection for your space',
   'In-home color consultation. Receive a custom palette with exact paint codes, accent recommendations, and coordination tips.',
   true, true),

-- ── Painting Services ────────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'painting'),
   (SELECT id FROM service_subcategories WHERE slug = 'interior-painting'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'interior-painting-service', 'Interior Painting',
   'Wall, ceiling, and trim painting for any room',
   'Professional interior painting with surface prep, primer, and two coats of quality paint. Clean lines and neat finish guaranteed.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'painting'),
   (SELECT id FROM service_subcategories WHERE slug = 'exterior-painting'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'exterior-painting-service', 'Exterior Painting',
   'Weather-resistant exterior wall and trim painting',
   'Exterior painting with surface cleaning, crack filling, primer, and weather-resistant paint application.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'painting'),
   (SELECT id FROM service_subcategories WHERE slug = 'wallpaper'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'wallpaper-installation', 'Wallpaper Installation',
   'Professional wallpaper hanging and removal',
   'Wall preparation, old wallpaper removal, and precise installation of new wallpaper with clean seams.',
   true, false),

-- ── Flooring Services ────────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'flooring'),
   (SELECT id FROM service_subcategories WHERE slug = 'tile-installation'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'tile-floor-installation', 'Tile Floor Installation',
   'Ceramic, porcelain, and natural stone tile laying',
   'Floor tile installation with surface prep, waterproofing, adhesive application, grouting, and sealing.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'flooring'),
   (SELECT id FROM service_subcategories WHERE slug = 'vinyl-laminate'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'vinyl-laminate-installation', 'Vinyl & Laminate Flooring',
   'Quick-install vinyl plank and laminate floor fitting',
   'Installation of click-lock vinyl planks or laminate flooring. Includes underlay, trim, and transitions.',
   true, false),

-- ── Carpentry Services ───────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'carpentry'),
   (SELECT id FROM service_subcategories WHERE slug = 'custom-furniture'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'custom-furniture-build', 'Custom Furniture Build',
   'Bespoke furniture designed and built to your specifications',
   'Custom-made tables, beds, desks, and other furniture. Design consultation, material selection, and workshop construction.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'carpentry'),
   (SELECT id FROM service_subcategories WHERE slug = 'cabinet-making'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'kitchen-wardrobe-cabinets', 'Kitchen & Wardrobe Cabinets',
   'Custom cabinetry for kitchens, bedrooms, and storage',
   'Design, build, and install fitted kitchen cabinets, bedroom wardrobes, and storage units. High-quality materials and hardware.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'carpentry'),
   (SELECT id FROM service_subcategories WHERE slug = 'door-window-repair'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'door-window-repair-service', 'Door & Window Repair',
   'Fix sticking doors, broken hinges, and damaged frames',
   'Repair of swollen doors, broken hinges, rotten frames, and misaligned windows. Includes sanding and repainting.',
   true, false),

-- ── Renovation Services ──────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'renovation'),
   (SELECT id FROM service_subcategories WHERE slug = 'kitchen-renovation'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'kitchen-renovation-project', 'Kitchen Renovation',
   'Complete kitchen remodel from design to handover',
   'Full kitchen renovation: demolition, plumbing, electrical, tiling, cabinetry, countertops, and finishing.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'renovation'),
   (SELECT id FROM service_subcategories WHERE slug = 'bathroom-renovation'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'bathroom-renovation-project', 'Bathroom Renovation',
   'Full bathroom remodel with modern fixtures',
   'Complete bathroom renovation: waterproofing, tiling, plumbing, fixtures, lighting, and ventilation.',
   true, true),

-- ── Tech Support Services ────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'tech-support'),
   (SELECT id FROM service_subcategories WHERE slug = 'computer-repair'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'computer-laptop-repair', 'Computer & Laptop Repair',
   'Hardware and software diagnostics and repair',
   'Screen replacement, keyboard repair, virus removal, OS reinstallation, data recovery, and hardware upgrades.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'tech-support'),
   (SELECT id FROM service_subcategories WHERE slug = 'network-setup'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'wifi-network-setup', 'WiFi & Network Setup',
   'Home and office network design and installation',
   'Router setup, WiFi mesh installation, Ethernet cabling, and network security configuration.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'tech-support'),
   (SELECT id FROM service_subcategories WHERE slug = 'smart-home'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'smart-home-setup', 'Smart Home Setup',
   'Smart lock, camera, speaker, and automation installation',
   'Installation and configuration of smart home devices: locks, cameras, thermostats, speakers, and voice assistants.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'tech-support'),
   (SELECT id FROM service_subcategories WHERE slug = 'phone-repair'),
   (SELECT id FROM service_types WHERE code = 'standard_repair'),
   'phone-tablet-repair', 'Phone & Tablet Repair',
   'Screen, battery, and component repair for mobile devices',
   'Cracked screen replacement, battery swap, charging port repair, and water damage recovery for phones and tablets.',
   true, false),

-- ── Water Services ───────────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'water-services'),
   (SELECT id FROM service_subcategories WHERE slug = 'water-delivery'),
   (SELECT id FROM service_types WHERE code = 'supply_delivery'),
   'clean-water-delivery', 'Clean Water Delivery',
   'Potable water delivery by bowser or container',
   'Reliable clean water delivery for residential estates, construction sites, and events. Available in 1,000 to 10,000 litre loads.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'water-services'),
   (SELECT id FROM service_subcategories WHERE slug = 'water-purification'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'water-purifier-installation', 'Water Purifier Installation',
   'Water filter and purifier setup for clean drinking water',
   'Installation of under-sink, countertop, and whole-house water purification systems. Includes filter replacement schedule.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'water-services'),
   (SELECT id FROM service_subcategories WHERE slug = 'tank-cleaning'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'water-tank-cleaning-service', 'Water Tank Cleaning',
   'Professional water tank scrubbing and disinfection',
   'Draining, scrubbing, chlorine treatment, and refilling of overhead and ground-level water tanks.',
   true, true),

-- ── Waste Management Services ────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'waste-management'),
   (SELECT id FROM service_subcategories WHERE slug = 'garbage-collection'),
   (SELECT id FROM service_types WHERE code = 'recurring_service'),
   'residential-garbage-collection', 'Residential Garbage Collection',
   'Scheduled weekly waste pickup',
   'Regular waste collection from your doorstep. Sorted collection available for recyclables and organic waste.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'waste-management'),
   (SELECT id FROM service_subcategories WHERE slug = 'junk-removal'),
   (SELECT id FROM service_types WHERE code = 'pickup_delivery'),
   'junk-removal-service', 'Junk & Bulk Removal',
   'Remove old furniture, appliances, and construction debris',
   'Pickup and responsible disposal of bulky items, old furniture, mattresses, and construction waste.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'waste-management'),
   (SELECT id FROM service_subcategories WHERE slug = 'septic-services'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'septic-exhauster-service', 'Septic Tank & Exhauster',
   'Septic tank emptying, cleaning, and maintenance',
   'Professional exhauster services for septic tanks and cesspools. Includes disposal at approved treatment facilities.',
   true, true),

-- ── Catering Services ────────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'catering'),
   (SELECT id FROM service_subcategories WHERE slug = 'event-catering'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'event-catering-service', 'Event Catering',
   'Full catering for weddings, parties, and corporate events',
   'Menu planning, food preparation, service staff, and cleanup for events from 20 to 500+ guests.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'catering'),
   (SELECT id FROM service_subcategories WHERE slug = 'private-chef'),
   (SELECT id FROM service_types WHERE code = 'personal_service'),
   'private-chef-service', 'Private Chef',
   'Personal chef for dinner parties and special occasions',
   'Experienced chef comes to your home. Menu consultation, ingredient sourcing, cooking, and kitchen cleanup.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'catering'),
   (SELECT id FROM service_subcategories WHERE slug = 'meal-prep'),
   (SELECT id FROM service_types WHERE code = 'recurring_service'),
   'weekly-meal-prep', 'Weekly Meal Prep',
   'Healthy meals prepared and portioned for the week',
   'Customized weekly meal plans. Cook prepares, portions, and stores meals for the week. Dietary requirements accommodated.',
   true, false),

-- ── Events Services ──────────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'events'),
   (SELECT id FROM service_subcategories WHERE slug = 'event-planning'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'event-planning-service', 'Event Planning',
   'Full event coordination from concept to execution',
   'Venue selection, vendor coordination, timeline management, and day-of coordination for all event types.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'events'),
   (SELECT id FROM service_subcategories WHERE slug = 'dj-entertainment'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'dj-hire', 'DJ Hire',
   'Professional DJ with sound system for events',
   'Experienced DJs with own sound equipment. Genre-flexible playlists, MC services, and lighting effects.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'events'),
   (SELECT id FROM service_subcategories WHERE slug = 'photography'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'event-photography', 'Event Photography',
   'Professional event photography and videography',
   'Experienced photographers for weddings, corporate events, and celebrations. Includes editing and digital delivery.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'events'),
   (SELECT id FROM service_subcategories WHERE slug = 'decoration'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'event-decoration', 'Event Decoration',
   'Venue decoration with flowers, balloons, and draping',
   'Full venue decoration: floral arrangements, balloon arches, table settings, lighting, and fabric draping.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'events'),
   (SELECT id FROM service_subcategories WHERE slug = 'equipment-hire'),
   (SELECT id FROM service_types WHERE code = 'pickup_delivery'),
   'event-equipment-hire', 'Event Equipment Hire',
   'Tents, chairs, tables, and sound equipment rental',
   'Hire event equipment with delivery, setup, and collection. Tents, chairs, tables, stages, and PA systems.',
   true, false),

-- ── Childcare Services ───────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'childcare'),
   (SELECT id FROM service_subcategories WHERE slug = 'babysitting'),
   (SELECT id FROM service_types WHERE code = 'personal_service'),
   'babysitting-service', 'Babysitting',
   'Reliable on-demand babysitter for a few hours or a full day',
   'Vetted and background-checked babysitters for your peace of mind. Available for evening, weekend, or weekday care.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'childcare'),
   (SELECT id FROM service_subcategories WHERE slug = 'nanny-services'),
   (SELECT id FROM service_types WHERE code = 'personal_specialist'),
   'nanny-placement', 'Nanny Placement',
   'Full-time, part-time, or live-in nanny matching',
   'Professionally screened and reference-checked nannies. Trial period included. Full-time, part-time, or live-in options.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'childcare'),
   (SELECT id FROM service_subcategories WHERE slug = 'tutoring'),
   (SELECT id FROM service_types WHERE code = 'personal_service'),
   'home-tutoring', 'Home Tutoring',
   'One-on-one academic tutoring at your home',
   'Qualified tutors for primary and secondary school subjects. Personalized learning plans and progress reports.',
   true, false),

-- ── Landscaping Services ─────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'landscaping'),
   (SELECT id FROM service_subcategories WHERE slug = 'garden-design'),
   (SELECT id FROM service_types WHERE code = 'project_work'),
   'garden-design-service', 'Garden Design',
   'Professional landscape design for residential gardens',
   'Garden layout design, plant selection, hardscaping plan, and irrigation mapping. Includes 3D visualization.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'landscaping'),
   (SELECT id FROM service_subcategories WHERE slug = 'lawn-care'),
   (SELECT id FROM service_types WHERE code = 'recurring_service'),
   'lawn-mowing-care', 'Lawn Mowing & Care',
   'Regular lawn maintenance — mowing, edging, and feeding',
   'Scheduled lawn mowing, edging, fertilizing, and weed control. Weekly, biweekly, or monthly plans.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'landscaping'),
   (SELECT id FROM service_subcategories WHERE slug = 'tree-services'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'tree-trimming-removal', 'Tree Trimming & Removal',
   'Tree pruning, trimming, and safe removal',
   'Professional tree care: crown reduction, branch trimming, emergency removal, and stump grinding.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'landscaping'),
   (SELECT id FROM service_subcategories WHERE slug = 'irrigation'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'irrigation-system-installation', 'Irrigation System Installation',
   'Drip and sprinkler systems for efficient watering',
   'Design and installation of automated irrigation systems. Timer setup, zone mapping, and water-saving optimization.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'landscaping'),
   (SELECT id FROM service_subcategories WHERE slug = 'fencing'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'fencing-installation', 'Fencing Installation',
   'Wood, metal, and chain-link fence installation',
   'Boundary fencing installation and repair. Includes post setting, panel fitting, and gate installation.',
   true, true),

-- ── Security Services ────────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'security'),
   (SELECT id FROM service_subcategories WHERE slug = 'security-guards'),
   (SELECT id FROM service_types WHERE code = 'recurring_service'),
   'security-guard-service', 'Security Guard Service',
   'Trained security guards for residential and commercial properties',
   'Professional security personnel for estate entrances, office buildings, and warehouses. Day, night, or 24/7 deployment.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'security'),
   (SELECT id FROM service_subcategories WHERE slug = 'cctv-installation'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'cctv-camera-installation', 'CCTV Camera Installation',
   'Surveillance camera system design and installation',
   'IP and analog camera installation with DVR/NVR setup, remote viewing app configuration, and cable management.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'security'),
   (SELECT id FROM service_subcategories WHERE slug = 'alarm-systems'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'alarm-system-installation', 'Alarm System Installation',
   'Intruder alarm and panic button installation',
   'Wireless and wired alarm systems with motion sensors, door contacts, panic buttons, and 24/7 monitoring options.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'security'),
   (SELECT id FROM service_subcategories WHERE slug = 'access-control'),
   (SELECT id FROM service_types WHERE code = 'installation'),
   'access-control-installation', 'Access Control Installation',
   'Biometric, keycard, and intercom system installation',
   'Installation of fingerprint readers, card access systems, video intercoms, and electric gate controls.',
   true, true),

  ((SELECT id FROM service_categories WHERE slug = 'security'),
   (SELECT id FROM service_subcategories WHERE slug = 'event-security'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'event-security-service', 'Event Security',
   'Security personnel and crowd management for events',
   'Trained event security for access control, crowd management, VIP protection, and emergency response at events.',
   true, true),

-- ── Pet Care Services ────────────────────────────────────────────────────────
  ((SELECT id FROM service_categories WHERE slug = 'pet-care'),
   (SELECT id FROM service_subcategories WHERE slug = 'pet-grooming'),
   (SELECT id FROM service_types WHERE code = 'standard_service'),
   'pet-grooming-service', 'Pet Grooming',
   'Professional bathing, trimming, and coat care for pets',
   'Full grooming service: bath, blow-dry, haircut, nail trim, ear cleaning, and flea treatment for dogs and cats.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'pet-care'),
   (SELECT id FROM service_subcategories WHERE slug = 'pet-sitting'),
   (SELECT id FROM service_types WHERE code = 'personal_service'),
   'pet-sitting-service', 'Pet Sitting',
   'In-home pet care while you are away',
   'Trusted pet sitter visits your home to feed, walk, and care for your pets. Daily updates with photos.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'pet-care'),
   (SELECT id FROM service_subcategories WHERE slug = 'dog-walking'),
   (SELECT id FROM service_types WHERE code = 'recurring_service'),
   'dog-walking-service', 'Dog Walking',
   'Regular dog walking in your neighbourhood',
   'Scheduled daily walks for your dog. Individual or group walks available. GPS tracking and photo updates.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'pet-care'),
   (SELECT id FROM service_subcategories WHERE slug = 'vet-house-calls'),
   (SELECT id FROM service_types WHERE code = 'personal_specialist'),
   'vet-house-call', 'Veterinary House Call',
   'Vet consultation and treatment at your doorstep',
   'Licensed veterinarians visit your home for checkups, vaccinations, minor treatments, and health consultations.',
   true, false),

  ((SELECT id FROM service_categories WHERE slug = 'pet-care'),
   (SELECT id FROM service_subcategories WHERE slug = 'pet-transport'),
   (SELECT id FROM service_types WHERE code = 'pickup_delivery'),
   'pet-transport-service', 'Pet Transport',
   'Safe and comfortable pet transportation',
   'Air-conditioned pet transport for vet visits, airport transfers, and relocation. Secure carriers provided.',
   true, false)

ON CONFLICT (slug) DO NOTHING;

COMMIT;
