-- Migration: Create & Seed Nairobi Neighborhoods
-- Description: Creates the neighborhoods table, sets up RLS policies,
--              and populates with Nairobi areas grouped by cluster
-- Idempotent: Yes (IF NOT EXISTS / ON CONFLICT DO NOTHING)

-- =============================================================================
-- CREATE TABLE: neighborhoods
-- =============================================================================

CREATE TABLE IF NOT EXISTS neighborhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cluster TEXT,
  city TEXT,
  county TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_neighborhoods_slug ON neighborhoods(slug);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_cluster ON neighborhoods(cluster);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_active ON neighborhoods(is_active) WHERE is_active = true;

-- =============================================================================
-- ENSURE RLS POLICY: Allow authenticated users to read neighborhoods
-- =============================================================================

-- Enable RLS
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read neighborhoods (public reference data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'neighborhoods' 
    AND policyname = 'neighborhoods_public_read'
  ) THEN
    CREATE POLICY neighborhoods_public_read ON neighborhoods
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Also allow anon to read (for client-side queries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'neighborhoods' 
    AND policyname = 'neighborhoods_anon_read'
  ) THEN
    CREATE POLICY neighborhoods_anon_read ON neighborhoods
      FOR SELECT TO anon
      USING (true);
  END IF;
END $$;

-- =============================================================================
-- SEED NEIGHBORHOODS DATA
-- =============================================================================
-- Nairobi neighborhoods grouped by cluster (geographic area)
-- Using ON CONFLICT (slug) DO NOTHING for idempotency

INSERT INTO neighborhoods (name, slug, cluster, city, county, is_active, display_order)
VALUES
  -- CBD & Surroundings
  ('Nairobi CBD', 'nairobi-cbd', 'CBD & Surroundings', 'Nairobi', 'Nairobi', true, 1),
  ('Upperhill', 'upperhill', 'CBD & Surroundings', 'Nairobi', 'Nairobi', true, 2),
  ('Kilimani', 'kilimani', 'CBD & Surroundings', 'Nairobi', 'Nairobi', true, 3),
  ('Hurlingham', 'hurlingham', 'CBD & Surroundings', 'Nairobi', 'Nairobi', true, 4),
  ('Milimani', 'milimani', 'CBD & Surroundings', 'Nairobi', 'Nairobi', true, 5),

  -- Westlands & Surroundings
  ('Westlands', 'westlands', 'Westlands & Surroundings', 'Nairobi', 'Nairobi', true, 10),
  ('Parklands', 'parklands', 'Westlands & Surroundings', 'Nairobi', 'Nairobi', true, 11),
  ('Highridge', 'highridge', 'Westlands & Surroundings', 'Nairobi', 'Nairobi', true, 12),
  ('Spring Valley', 'spring-valley', 'Westlands & Surroundings', 'Nairobi', 'Nairobi', true, 13),
  ('Brookside', 'brookside', 'Westlands & Surroundings', 'Nairobi', 'Nairobi', true, 14),
  ('Loresho', 'loresho', 'Westlands & Surroundings', 'Nairobi', 'Nairobi', true, 15),
  ('Mountain View', 'mountain-view', 'Westlands & Surroundings', 'Nairobi', 'Nairobi', true, 16),

  -- Karen & Langata
  ('Karen', 'karen', 'Karen & Langata', 'Nairobi', 'Nairobi', true, 20),
  ('Langata', 'langata', 'Karen & Langata', 'Nairobi', 'Nairobi', true, 21),
  ('Hardy', 'hardy', 'Karen & Langata', 'Nairobi', 'Nairobi', true, 22),
  ('Bomas', 'bomas', 'Karen & Langata', 'Nairobi', 'Nairobi', true, 23),
  ('Rongai', 'rongai', 'Karen & Langata', 'Nairobi', 'Nairobi', true, 24),
  ('Ngong', 'ngong', 'Karen & Langata', 'Nairobi', 'Nairobi', true, 25),

  -- Lavington & Kileleshwa
  ('Lavington', 'lavington', 'Lavington & Kileleshwa', 'Nairobi', 'Nairobi', true, 30),
  ('Kileleshwa', 'kileleshwa', 'Lavington & Kileleshwa', 'Nairobi', 'Nairobi', true, 31),
  ('Gitanga', 'gitanga', 'Lavington & Kileleshwa', 'Nairobi', 'Nairobi', true, 32),
  ('Riara', 'riara', 'Lavington & Kileleshwa', 'Nairobi', 'Nairobi', true, 33),
  ('Kawangware', 'kawangware', 'Lavington & Kileleshwa', 'Nairobi', 'Nairobi', true, 34),

  -- South B & South C
  ('South B', 'south-b', 'South B & South C', 'Nairobi', 'Nairobi', true, 40),
  ('South C', 'south-c', 'South B & South C', 'Nairobi', 'Nairobi', true, 41),
  ('Nairobi West', 'nairobi-west', 'South B & South C', 'Nairobi', 'Nairobi', true, 42),
  ('Madaraka', 'madaraka', 'South B & South C', 'Nairobi', 'Nairobi', true, 43),

  -- Eastlands
  ('Buruburu', 'buruburu', 'Eastlands', 'Nairobi', 'Nairobi', true, 50),
  ('Umoja', 'umoja', 'Eastlands', 'Nairobi', 'Nairobi', true, 51),
  ('Donholm', 'donholm', 'Eastlands', 'Nairobi', 'Nairobi', true, 52),
  ('Komarock', 'komarock', 'Eastlands', 'Nairobi', 'Nairobi', true, 53),
  ('Kayole', 'kayole', 'Eastlands', 'Nairobi', 'Nairobi', true, 54),
  ('Tena', 'tena', 'Eastlands', 'Nairobi', 'Nairobi', true, 55),
  ('Embakasi', 'embakasi', 'Eastlands', 'Nairobi', 'Nairobi', true, 56),
  ('Pipeline', 'pipeline', 'Eastlands', 'Nairobi', 'Nairobi', true, 57),

  -- Kiambu Road Corridor
  ('Runda', 'runda', 'Kiambu Road Corridor', 'Nairobi', 'Nairobi', true, 60),
  ('Muthaiga', 'muthaiga', 'Kiambu Road Corridor', 'Nairobi', 'Nairobi', true, 61),
  ('Ridgeways', 'ridgeways', 'Kiambu Road Corridor', 'Nairobi', 'Nairobi', true, 62),
  ('Gigiri', 'gigiri', 'Kiambu Road Corridor', 'Nairobi', 'Nairobi', true, 63),
  ('Village Market', 'village-market', 'Kiambu Road Corridor', 'Nairobi', 'Nairobi', true, 64),
  ('Two Rivers', 'two-rivers', 'Kiambu Road Corridor', 'Nairobi', 'Nairobi', true, 65),

  -- Thika Road Corridor
  ('Garden Estate', 'garden-estate', 'Thika Road Corridor', 'Nairobi', 'Nairobi', true, 70),
  ('Roysambu', 'roysambu', 'Thika Road Corridor', 'Nairobi', 'Nairobi', true, 71),
  ('Kasarani', 'kasarani', 'Thika Road Corridor', 'Nairobi', 'Nairobi', true, 72),
  ('Kahawa', 'kahawa', 'Thika Road Corridor', 'Nairobi', 'Nairobi', true, 73),
  ('Zimmerman', 'zimmerman', 'Thika Road Corridor', 'Nairobi', 'Nairobi', true, 74),
  ('Githurai', 'githurai', 'Thika Road Corridor', 'Nairobi', 'Nairobi', true, 75),
  ('Ruiru', 'ruiru', 'Thika Road Corridor', 'Nairobi', 'Nairobi', true, 76),

  -- Ngong Road Corridor
  ('Ngong Road', 'ngong-road', 'Ngong Road Corridor', 'Nairobi', 'Nairobi', true, 80),
  ('Dagoretti', 'dagoretti', 'Ngong Road Corridor', 'Nairobi', 'Nairobi', true, 81),
  ('Riruta', 'riruta', 'Ngong Road Corridor', 'Nairobi', 'Nairobi', true, 82),
  ('Satellite', 'satellite', 'Ngong Road Corridor', 'Nairobi', 'Nairobi', true, 83),
  ('Kibera', 'kibera', 'Ngong Road Corridor', 'Nairobi', 'Nairobi', true, 84),

  -- Mombasa Road Corridor
  ('Industrial Area', 'industrial-area', 'Mombasa Road Corridor', 'Nairobi', 'Nairobi', true, 90),
  ('Syokimau', 'syokimau', 'Mombasa Road Corridor', 'Nairobi', 'Nairobi', true, 91),
  ('Mlolongo', 'mlolongo', 'Mombasa Road Corridor', 'Nairobi', 'Nairobi', true, 92),
  ('Athi River', 'athi-river', 'Mombasa Road Corridor', 'Nairobi', 'Nairobi', true, 93),
  ('Kitengela', 'kitengela', 'Mombasa Road Corridor', 'Nairobi', 'Nairobi', true, 94),
  ('Imara Daima', 'imara-daima', 'Mombasa Road Corridor', 'Nairobi', 'Nairobi', true, 95)

ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- ALSO ENSURE RLS on notifications table for reads
-- =============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'notifications_own_read'
  ) THEN
    CREATE POLICY notifications_own_read ON notifications
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Users can update their own notifications (mark as read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'notifications_own_update'
  ) THEN
    CREATE POLICY notifications_own_update ON notifications
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- ENSURE RLS on service_providers for authenticated access
-- =============================================================================

ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

-- Owners can read their own provider record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_providers' 
    AND policyname = 'providers_own_read'
  ) THEN
    CREATE POLICY providers_own_read ON service_providers
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Owners can update their own provider record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_providers' 
    AND policyname = 'providers_own_update'
  ) THEN
    CREATE POLICY providers_own_update ON service_providers
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Owners can insert their own provider record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_providers' 
    AND policyname = 'providers_own_insert'
  ) THEN
    CREATE POLICY providers_own_insert ON service_providers
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Public can view active providers (for discovery)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_providers' 
    AND policyname = 'providers_public_read_active'
  ) THEN
    CREATE POLICY providers_public_read_active ON service_providers
      FOR SELECT TO anon
      USING (is_active = true);
  END IF;
END $$;
