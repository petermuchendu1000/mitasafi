-- Migration: Add missing profile fields to service_providers
-- Description: Adds headline, years_experience, languages columns needed for profile setup
-- Idempotent: Yes

-- Add headline column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'headline'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN headline text;
    COMMENT ON COLUMN service_providers.headline IS 'Short tagline for provider profile (e.g., "Expert Plumber - 10 Years Experience")';
  END IF;
END $$;

-- Add years_experience column (text for flexibility like "10+" or "5-7")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'years_experience'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN years_experience text;
    COMMENT ON COLUMN service_providers.years_experience IS 'Years of experience as text for flexibility';
  END IF;
END $$;

-- Add languages column (array of languages spoken)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'languages'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN languages text[];
    COMMENT ON COLUMN service_providers.languages IS 'Array of languages spoken by the provider';
  END IF;
END $$;

-- Add tagline column (alternative to headline for marketing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'tagline'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN tagline text;
    COMMENT ON COLUMN service_providers.tagline IS 'Marketing tagline for provider';
  END IF;
END $$;
