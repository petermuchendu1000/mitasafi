-- ===========================================
-- MITASAFI: CREATE BASE SCHEMA WITH MULTI-ROLE
-- ===========================================
-- This creates the core tables for MitaSafi
-- ===========================================

-- ===========================================
-- 1. CREATE PROFILES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,
  full_name TEXT,
  avatar_url TEXT,
  primary_role TEXT CHECK (primary_role IN ('tenant', 'landlord', 'service_provider')),
  is_verified BOOLEAN DEFAULT false,
  verification_level TEXT DEFAULT 'none' CHECK (verification_level IN ('none', 'phone', 'id', 'full')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_primary_role ON public.profiles(primary_role);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ===========================================
-- 2. CREATE USER_ROLES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('tenant', 'landlord', 'service_provider')),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Add indexes for user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(user_id, is_active);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own roles" ON public.user_roles
  FOR UPDATE USING (auth.uid() = user_id);

-- ===========================================
-- 3. CREATE HELPER FUNCTIONS
-- ===========================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for user_roles
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get all roles for a user
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id UUID)
RETURNS TEXT[] AS $$
  SELECT COALESCE(ARRAY_AGG(role), ARRAY[]::TEXT[])
  FROM public.user_roles 
  WHERE user_id = p_user_id AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.user_has_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id 
    AND role = p_role 
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MITASAFI SCHEMA CREATED!';
    RAISE NOTICE 'Tables: profiles, user_roles';
    RAISE NOTICE 'Multi-role support enabled';
    RAISE NOTICE 'RLS policies applied';
    RAISE NOTICE '========================================';
END $$;
