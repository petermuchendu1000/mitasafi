-- ===========================================
-- MITASAFI: PROPERTY MANAGEMENT SCHEMA
-- ===========================================
-- This migration adds comprehensive property management:
-- - Buildings (multi-unit properties)
-- - Enhanced Units
-- - Tenants (landlord-managed)
-- - Leases
-- - Payments (enhanced)
-- - Maintenance Requests
-- ===========================================

-- ===========================================
-- 1. CREATE BUILDINGS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Identification
  name TEXT NOT NULL,
  building_type TEXT NOT NULL CHECK (building_type IN (
    'apartment', 'flat_block', 'townhouse_complex', 'gated_community', 
    'student_hostel', 'mixed_use', 'other'
  )),
  year_built INTEGER,
  total_floors INTEGER,
  total_units INTEGER DEFAULT 0,
  plot_number TEXT,
  management_type TEXT DEFAULT 'self' CHECK (management_type IN ('self', 'caretaker', 'property_manager')),
  
  -- Location
  address TEXT NOT NULL,
  area TEXT NOT NULL,
  city TEXT DEFAULT 'Nairobi',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  landmarks TEXT,
  access_instructions TEXT,
  
  -- Amenities (stored as JSONB for flexibility)
  security_features JSONB DEFAULT '{}',
  -- Example: {"perimeter_wall": true, "electric_fence": true, "security_guards": "24_hour", "cctv": "full", "access_control": "card", "intercom": true}
  
  water_power JSONB DEFAULT '{}',
  -- Example: {"water_source": "both", "water_storage": "tank", "water_reliability": "24_7", "backup_generator": "full", "generator_fuel": "shared", "solar": "water_heating"}
  
  parking JSONB DEFAULT '{}',
  -- Example: {"type": "covered", "allocation": "per_unit", "total_spaces": 30, "visitor_spaces": 5, "motorcycle": true, "ev_charging": false}
  
  common_facilities JSONB DEFAULT '{}',
  -- Example: {"lift": true, "swimming_pool": true, "gym": true, "playground": true, "garden": true, "rooftop": false, "bbq": true, "laundry": false, "clubhouse": false}
  
  services JSONB DEFAULT '{}',
  -- Example: {"garbage": "private", "internet_ready": true, "available_isps": ["safaricom", "zuku"], "gas": "cylinder", "caretaker_onsite": true}
  
  -- Policies
  policies JSONB DEFAULT '{}',
  -- Example: {"pets": "small_only", "smoking": "balcony_only", "business_use": "approval_needed", "airbnb": false, "quiet_hours": "10pm-6am"}
  
  -- Financial
  service_charge DECIMAL(10, 2),
  service_charge_includes TEXT[],
  collection_via_mitasafi BOOLEAN DEFAULT true,
  
  -- Bank Details (encrypted/secure in production)
  bank_details JSONB DEFAULT '{}',
  -- Example: {"bank_name": "Equity", "account_name": "John Doe", "account_number": "xxx", "mpesa_paybill": "xxx", "mpesa_account": "xxx"}
  
  -- Media
  photos TEXT[] DEFAULT '{}',
  cover_photo TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for buildings
CREATE INDEX IF NOT EXISTS idx_buildings_landlord ON public.buildings(landlord_id);
CREATE INDEX IF NOT EXISTS idx_buildings_area ON public.buildings(area);
CREATE INDEX IF NOT EXISTS idx_buildings_city ON public.buildings(city);
CREATE INDEX IF NOT EXISTS idx_buildings_status ON public.buildings(status);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON public.buildings(building_type);

-- Enable RLS
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for buildings
CREATE POLICY "Landlords can view own buildings" ON public.buildings
  FOR SELECT USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can insert own buildings" ON public.buildings
  FOR INSERT WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update own buildings" ON public.buildings
  FOR UPDATE USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete own buildings" ON public.buildings
  FOR DELETE USING (auth.uid() = landlord_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_buildings_updated_at ON public.buildings;
CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ===========================================
-- 2. CREATE ENHANCED UNITS TABLE
-- ===========================================
-- Drop existing units table if it exists and recreate with enhanced schema
-- Note: In production, use ALTER TABLE to preserve data

DROP TABLE IF EXISTS public.units CASCADE;

CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Identification
  unit_number TEXT NOT NULL,
  floor_level TEXT,
  wing_block TEXT,
  unit_type TEXT NOT NULL CHECK (unit_type IN (
    'bedsitter', 'studio', '1br', '2br', '3br', '4br', '5br_plus',
    'penthouse', 'duplex', 'loft', 'house', 'townhouse', 'villa', 'maisonette', 'bungalow'
  )),
  position TEXT, -- corner, middle, end
  facing TEXT, -- road, garden, pool, city
  
  -- Physical Details
  bedrooms INTEGER NOT NULL DEFAULT 0,
  bathrooms DECIMAL(3, 1) DEFAULT 1, -- allows 0.5 for half bath
  size_sqm DECIMAL(10, 2),
  has_dsq BOOLEAN DEFAULT false,
  dsq_details JSONB DEFAULT '{}',
  
  -- Layout
  living_rooms INTEGER DEFAULT 1,
  dining_area TEXT CHECK (dining_area IN ('separate', 'open', 'none')),
  kitchen_type TEXT CHECK (kitchen_type IN ('open', 'separate', 'kitchenette')),
  balconies INTEGER DEFAULT 0,
  store_room BOOLEAN DEFAULT false,
  
  -- Condition
  overall_condition TEXT DEFAULT 'good' CHECK (overall_condition IN ('excellent', 'good', 'fair', 'needs_work')),
  last_renovated INTEGER, -- year
  flooring TEXT,
  ceiling_type TEXT,
  natural_light TEXT CHECK (natural_light IN ('poor', 'average', 'good', 'excellent')),
  ventilation TEXT CHECK (ventilation IN ('poor', 'average', 'good', 'excellent')),
  
  -- Unit-specific amenities
  kitchen_features JSONB DEFAULT '{}',
  -- Example: {"cabinets": "full", "countertop": "granite", "sink": "double", "gas_point": true, "exhaust": true}
  
  bathroom_features JSONB DEFAULT '{}',
  -- Example: {"hot_water": "electric", "heater_type": "instant", "bathtub": false, "shower": "rain", "toilet": "western"}
  
  climate_control JSONB DEFAULT '{}',
  -- Example: {"ac": "split", "ac_units": 2, "ceiling_fans": true, "ceiling_fans_count": 3}
  
  storage_features JSONB DEFAULT '{}',
  -- Example: {"built_in_wardrobes": true, "wardrobe_count": 3, "walk_in_closet": true, "shoe_rack": true}
  
  security_features JSONB DEFAULT '{}',
  -- Example: {"door_type": "security", "window_grills": true, "alarm": false, "video_intercom": true}
  
  -- Furnishing
  furnishing TEXT DEFAULT 'unfurnished' CHECK (furnishing IN ('unfurnished', 'partial', 'fully_furnished')),
  furnished_items JSONB DEFAULT '{}',
  -- Example: {"living_room": true, "bedroom": true, "dining": false, "appliances": ["fridge", "cooker"], "electronics": ["tv"]}
  
  -- Pricing
  monthly_rent DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  rent_negotiable BOOLEAN DEFAULT false,
  deposit_months INTEGER DEFAULT 1,
  deposit_amount DECIMAL(10, 2),
  service_charge DECIMAL(10, 2),
  water_charge JSONB DEFAULT '{}', -- {"type": "metered|flat|included", "amount": 500}
  electricity_info JSONB DEFAULT '{}', -- {"type": "prepaid|postpaid", "meter_number": "xxx"}
  parking_fee DECIMAL(10, 2),
  pet_deposit DECIMAL(10, 2),
  other_fees JSONB DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance', 'reserved')),
  listing_status TEXT DEFAULT 'unlisted' CHECK (listing_status IN ('unlisted', 'listed', 'reserved')),
  available_from DATE,
  
  -- Lease Terms
  minimum_lease_months INTEGER DEFAULT 12,
  maximum_lease_months INTEGER,
  notice_period_months INTEGER DEFAULT 1,
  
  -- Media
  photos TEXT[] DEFAULT '{}',
  cover_photo TEXT,
  floor_plan TEXT,
  video_tour TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_deposit CHECK (deposit_amount IS NULL OR deposit_amount >= 0),
  CONSTRAINT valid_rent CHECK (monthly_rent >= 0)
);

-- Indexes for units
CREATE INDEX IF NOT EXISTS idx_units_building ON public.units(building_id);
CREATE INDEX IF NOT EXISTS idx_units_landlord ON public.units(landlord_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON public.units(status);
CREATE INDEX IF NOT EXISTS idx_units_listing_status ON public.units(listing_status);
CREATE INDEX IF NOT EXISTS idx_units_type ON public.units(unit_type);
CREATE INDEX IF NOT EXISTS idx_units_rent ON public.units(monthly_rent);
CREATE INDEX IF NOT EXISTS idx_units_bedrooms ON public.units(bedrooms);

-- Enable RLS
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- RLS Policies for units
CREATE POLICY "Landlords can view own units" ON public.units
  FOR SELECT USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can insert own units" ON public.units
  FOR INSERT WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update own units" ON public.units
  FOR UPDATE USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete own units" ON public.units
  FOR DELETE USING (auth.uid() = landlord_id);

-- Public can view listed units
CREATE POLICY "Public can view listed units" ON public.units
  FOR SELECT USING (listing_status = 'listed');

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_units_updated_at ON public.units;
CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ===========================================
-- 3. CREATE TENANTS TABLE
-- ===========================================
-- Tenants are people renting - can be added by landlord without registration

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Optional: linked user account
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Landlord who added
  
  -- Profile
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_secondary TEXT,
  email TEXT,
  
  -- Identification
  id_type TEXT CHECK (id_type IN ('national_id', 'passport', 'alien_id')),
  id_number TEXT,
  id_document_url TEXT,
  
  -- Employment
  occupation TEXT,
  employer TEXT,
  employer_phone TEXT,
  
  -- Verification
  verification_level TEXT DEFAULT 'basic' CHECK (verification_level IN ('basic', 'phone_verified', 'id_verified', 'employment_verified', 'reference_checked', 'credit_checked')),
  verified_at TIMESTAMPTZ,
  
  -- Emergency Contact
  emergency_contact JSONB DEFAULT '{}',
  -- Example: {"name": "Jane Doe", "relationship": "spouse", "phone": "+254...", "phone_alt": null}
  
  -- Occupancy Info (default for new leases)
  default_occupants JSONB DEFAULT '{}',
  -- Example: {"adults": 2, "children": 1, "pets": [{"type": "dog", "breed": "poodle"}], "vehicles": [{"type": "car", "plate": "KXX 123X"}]}
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  blacklist_reason TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for tenants
CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON public.tenants(created_by);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON public.tenants(phone);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants
CREATE POLICY "Landlords can view own tenants" ON public.tenants
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Landlords can insert own tenants" ON public.tenants
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Landlords can update own tenants" ON public.tenants
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Landlords can delete own tenants" ON public.tenants
  FOR DELETE USING (auth.uid() = created_by);

-- Tenants can view own record if linked
CREATE POLICY "Users can view own tenant record" ON public.tenants
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ===========================================
-- 4. CREATE LEASES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Term
  start_date DATE NOT NULL,
  end_date DATE,
  lease_type TEXT DEFAULT 'fixed' CHECK (lease_type IN ('fixed', 'month_to_month', 'renewable')),
  
  -- Financial Terms
  monthly_rent DECIMAL(10, 2) NOT NULL,
  rent_due_day INTEGER DEFAULT 5 CHECK (rent_due_day >= 1 AND rent_due_day <= 28),
  deposit_amount DECIMAL(10, 2),
  deposit_status TEXT DEFAULT 'held' CHECK (deposit_status IN ('pending', 'held', 'partially_refunded', 'refunded')),
  deposit_refunded DECIMAL(10, 2) DEFAULT 0,
  deposit_deductions JSONB DEFAULT '[]',
  -- Example: [{"reason": "broken window", "amount": 5000, "date": "2025-12-01"}]
  
  -- Payment Setup
  payment_method TEXT DEFAULT 'mpesa' CHECK (payment_method IN ('mpesa', 'bank', 'cash', 'cheque', 'mixed')),
  payment_account JSONB DEFAULT '{}',
  -- Example: {"mpesa_paybill": "xxx", "account_number": "A101"}
  
  -- Late Fees
  late_fee_type TEXT CHECK (late_fee_type IN ('none', 'fixed', 'percentage', 'daily')),
  late_fee_amount DECIMAL(10, 2),
  late_fee_percentage DECIMAL(5, 2),
  grace_period_days INTEGER DEFAULT 5,
  
  -- Inclusions
  inclusions JSONB DEFAULT '{}',
  -- Example: {"water": "included", "electricity": "tenant", "service_charge": "separate", "parking": "included", "internet": "tenant", "generator": "contribution"}
  
  -- Lease Terms
  notice_period_months INTEGER DEFAULT 1,
  renewal_terms TEXT,
  special_conditions TEXT,
  
  -- Occupancy
  occupants JSONB DEFAULT '{}',
  -- Example: {"adults": 2, "children": 1, "pets": [], "vehicles": []}
  
  -- Documents
  lease_document_url TEXT,
  move_in_checklist JSONB DEFAULT '{}',
  move_out_checklist JSONB DEFAULT '{}',
  other_documents TEXT[] DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'active', 'expired', 'terminated', 'renewed')),
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  terminated_by TEXT CHECK (terminated_by IN ('landlord', 'tenant', 'mutual', 'breach')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for leases
CREATE INDEX IF NOT EXISTS idx_leases_unit ON public.leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON public.leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_landlord ON public.leases(landlord_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON public.leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_dates ON public.leases(start_date, end_date);

-- Enable RLS
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leases
CREATE POLICY "Landlords can view own leases" ON public.leases
  FOR SELECT USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can insert own leases" ON public.leases
  FOR INSERT WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update own leases" ON public.leases
  FOR UPDATE USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete own leases" ON public.leases
  FOR DELETE USING (auth.uid() = landlord_id);

-- Tenants can view leases where they're the tenant (via tenant.user_id)
CREATE POLICY "Tenants can view own leases" ON public.leases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tenants 
      WHERE tenants.id = leases.tenant_id 
      AND tenants.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_leases_updated_at ON public.leases;
CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ===========================================
-- 5. CREATE ENHANCED PAYMENTS TABLE
-- ===========================================

DROP TABLE IF EXISTS public.payments CASCADE;

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  
  -- Payment Details
  amount DECIMAL(10, 2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN (
    'rent', 'deposit', 'service_charge', 'water', 'electricity', 
    'late_fee', 'deposit_refund', 'repair_deduction', 'other'
  )),
  
  -- Period Covered (for rent payments)
  period_month INTEGER, -- 1-12
  period_year INTEGER,
  period_start DATE,
  period_end DATE,
  
  -- Payment Info
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mpesa', 'bank', 'cash', 'cheque', 'other')),
  reference_number TEXT,
  
  -- M-Pesa specific
  mpesa_receipt TEXT,
  mpesa_phone TEXT,
  mpesa_name TEXT,
  auto_matched BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'reversed', 'disputed')),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES public.profiles(id),
  
  -- Collection
  received_by TEXT, -- For cash: who received
  receipt_issued BOOLEAN DEFAULT false,
  receipt_number TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_lease ON public.payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_type ON public.payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_period ON public.payments(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payments_mpesa_receipt ON public.payments(mpesa_receipt);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Get landlord_id from lease for RLS
CREATE OR REPLACE FUNCTION public.get_lease_landlord(p_lease_id UUID)
RETURNS UUID AS $$
  SELECT landlord_id FROM public.leases WHERE id = p_lease_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies for payments
CREATE POLICY "Landlords can view payments for own leases" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leases 
      WHERE leases.id = payments.lease_id 
      AND leases.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can insert payments for own leases" ON public.payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leases 
      WHERE leases.id = payments.lease_id 
      AND leases.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can update payments for own leases" ON public.payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.leases 
      WHERE leases.id = payments.lease_id 
      AND leases.landlord_id = auth.uid()
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ===========================================
-- 6. CREATE MAINTENANCE REQUESTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Request Details
  category TEXT NOT NULL CHECK (category IN (
    'plumbing', 'electrical', 'hvac', 'appliances', 'structural',
    'locks_security', 'painting', 'pest_control', 'general', 'other'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('emergency', 'high', 'normal', 'low')),
  
  -- Media
  photos TEXT[] DEFAULT '{}',
  
  -- Status Tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'assigned', 'in_progress', 'completed', 'closed', 'cancelled')),
  acknowledged_at TIMESTAMPTZ,
  
  -- Assignment
  assigned_to TEXT, -- Name/company
  assigned_phone TEXT,
  assigned_at TIMESTAMPTZ,
  
  -- Resolution
  diagnosis TEXT,
  work_performed TEXT,
  parts_used TEXT[],
  
  -- Cost
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  cost_paid_by TEXT CHECK (cost_paid_by IN ('landlord', 'tenant', 'building', 'shared', 'warranty')),
  
  -- Completion
  completed_at TIMESTAMPTZ,
  completion_photos TEXT[] DEFAULT '{}',
  
  -- Feedback
  tenant_rating INTEGER CHECK (tenant_rating >= 1 AND tenant_rating <= 5),
  tenant_feedback TEXT,
  
  -- Scheduling
  preferred_time TEXT,
  scheduled_date DATE,
  scheduled_time_slot TEXT,
  access_instructions TEXT,
  
  -- Dates
  reported_at TIMESTAMPTZ DEFAULT now(),
  due_date DATE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for maintenance_requests
CREATE INDEX IF NOT EXISTS idx_maintenance_unit ON public.maintenance_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant ON public.maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_landlord ON public.maintenance_requests(landlord_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_urgency ON public.maintenance_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_maintenance_category ON public.maintenance_requests(category);

-- Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_requests
CREATE POLICY "Landlords can view own maintenance requests" ON public.maintenance_requests
  FOR SELECT USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can insert maintenance requests" ON public.maintenance_requests
  FOR INSERT WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update own maintenance requests" ON public.maintenance_requests
  FOR UPDATE USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete own maintenance requests" ON public.maintenance_requests
  FOR DELETE USING (auth.uid() = landlord_id);

-- Tenants can view and create requests for their units
CREATE POLICY "Tenants can view own maintenance requests" ON public.maintenance_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tenants 
      WHERE tenants.id = maintenance_requests.tenant_id 
      AND tenants.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_maintenance_updated_at ON public.maintenance_requests;
CREATE TRIGGER update_maintenance_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ===========================================
-- 7. HELPER FUNCTIONS
-- ===========================================

-- Function to get building stats
CREATE OR REPLACE FUNCTION public.get_building_stats(p_building_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_units', COUNT(*),
    'vacant_units', COUNT(*) FILTER (WHERE status = 'vacant'),
    'occupied_units', COUNT(*) FILTER (WHERE status = 'occupied'),
    'maintenance_units', COUNT(*) FILTER (WHERE status = 'maintenance'),
    'total_rent', SUM(monthly_rent) FILTER (WHERE status = 'occupied'),
    'average_rent', AVG(monthly_rent)
  ) INTO result
  FROM public.units
  WHERE building_id = p_building_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get landlord portfolio stats
CREATE OR REPLACE FUNCTION public.get_landlord_portfolio_stats(p_landlord_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_buildings', (SELECT COUNT(*) FROM public.buildings WHERE landlord_id = p_landlord_id),
    'total_units', (SELECT COUNT(*) FROM public.units WHERE landlord_id = p_landlord_id),
    'vacant_units', (SELECT COUNT(*) FROM public.units WHERE landlord_id = p_landlord_id AND status = 'vacant'),
    'occupied_units', (SELECT COUNT(*) FROM public.units WHERE landlord_id = p_landlord_id AND status = 'occupied'),
    'active_tenants', (SELECT COUNT(*) FROM public.tenants WHERE created_by = p_landlord_id AND status = 'active'),
    'active_leases', (SELECT COUNT(*) FROM public.leases WHERE landlord_id = p_landlord_id AND status = 'active'),
    'expected_monthly_rent', (
      SELECT COALESCE(SUM(monthly_rent), 0) 
      FROM public.leases 
      WHERE landlord_id = p_landlord_id AND status = 'active'
    ),
    'open_maintenance', (
      SELECT COUNT(*) 
      FROM public.maintenance_requests 
      WHERE landlord_id = p_landlord_id AND status NOT IN ('completed', 'closed', 'cancelled')
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unit payment history
CREATE OR REPLACE FUNCTION public.get_unit_payment_history(p_unit_id UUID, p_months INTEGER DEFAULT 12)
RETURNS TABLE (
  month_year TEXT,
  rent_due DECIMAL,
  rent_paid DECIMAL,
  payment_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE) - (p_months - 1 || ' months')::INTERVAL,
      date_trunc('month', CURRENT_DATE),
      '1 month'::INTERVAL
    )::DATE as month_start
  ),
  lease_data AS (
    SELECT l.id as lease_id, l.monthly_rent, l.start_date, l.end_date
    FROM public.leases l
    WHERE l.unit_id = p_unit_id AND l.status IN ('active', 'expired')
  )
  SELECT 
    to_char(m.month_start, 'Mon YYYY'),
    COALESCE(ld.monthly_rent, 0),
    COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'rent'), 0),
    CASE 
      WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'rent'), 0) >= COALESCE(ld.monthly_rent, 0) THEN 'paid'
      WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'rent'), 0) > 0 THEN 'partial'
      WHEN m.month_start < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END
  FROM months m
  LEFT JOIN lease_data ld ON m.month_start >= ld.start_date AND (ld.end_date IS NULL OR m.month_start <= ld.end_date)
  LEFT JOIN public.payments p ON p.lease_id = ld.lease_id 
    AND p.period_year = EXTRACT(YEAR FROM m.month_start)
    AND p.period_month = EXTRACT(MONTH FROM m.month_start)
  GROUP BY m.month_start, ld.monthly_rent
  ORDER BY m.month_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================
-- 8. AUTO-UPDATE TRIGGERS
-- ===========================================

-- Update unit status when lease changes
CREATE OR REPLACE FUNCTION public.update_unit_on_lease_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When lease becomes active, mark unit as occupied
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    UPDATE public.units SET status = 'occupied' WHERE id = NEW.unit_id;
  END IF;
  
  -- When lease ends/terminates, mark unit as vacant
  IF NEW.status IN ('expired', 'terminated') AND OLD.status = 'active' THEN
    UPDATE public.units SET status = 'vacant' WHERE id = NEW.unit_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lease_status_change ON public.leases;
CREATE TRIGGER lease_status_change
  AFTER INSERT OR UPDATE OF status ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_unit_on_lease_change();

-- Update building unit count
CREATE OR REPLACE FUNCTION public.update_building_unit_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.building_id IS NOT NULL THEN
    UPDATE public.buildings 
    SET total_units = (SELECT COUNT(*) FROM public.units WHERE building_id = NEW.building_id)
    WHERE id = NEW.building_id;
  ELSIF TG_OP = 'DELETE' AND OLD.building_id IS NOT NULL THEN
    UPDATE public.buildings 
    SET total_units = (SELECT COUNT(*) FROM public.units WHERE building_id = OLD.building_id)
    WHERE id = OLD.building_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.building_id IS DISTINCT FROM NEW.building_id THEN
    IF OLD.building_id IS NOT NULL THEN
      UPDATE public.buildings 
      SET total_units = (SELECT COUNT(*) FROM public.units WHERE building_id = OLD.building_id)
      WHERE id = OLD.building_id;
    END IF;
    IF NEW.building_id IS NOT NULL THEN
      UPDATE public.buildings 
      SET total_units = (SELECT COUNT(*) FROM public.units WHERE building_id = NEW.building_id)
      WHERE id = NEW.building_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS unit_count_change ON public.units;
CREATE TRIGGER unit_count_change
  AFTER INSERT OR DELETE OR UPDATE OF building_id ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_building_unit_count();


-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MITASAFI PROPERTY MANAGEMENT SCHEMA CREATED!';
    RAISE NOTICE 'Tables: buildings, units, tenants, leases, payments, maintenance_requests';
    RAISE NOTICE 'Functions: get_building_stats, get_landlord_portfolio_stats, get_unit_payment_history';
    RAISE NOTICE 'Triggers: lease_status_change, unit_count_change';
    RAISE NOTICE 'RLS policies applied to all tables';
    RAISE NOTICE '========================================';
END $$;
