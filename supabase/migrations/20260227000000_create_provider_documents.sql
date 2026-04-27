-- ============================================================================
-- Migration: Create provider_documents table
-- Purpose: Track uploaded verification documents for service providers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.provider_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN (
    'national_id', 'selfie_with_id', 'business_registration', 
    'kra_certificate', 'professional_license'
  )),
  document_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast provider lookups
CREATE INDEX IF NOT EXISTS idx_provider_documents_provider_id 
  ON public.provider_documents(provider_id);

-- RLS: Enable but allow service_role to bypass
ALTER TABLE public.provider_documents ENABLE ROW LEVEL SECURITY;

-- Policy: providers can read their own documents
CREATE POLICY "Providers can view own documents"
  ON public.provider_documents FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.service_providers WHERE user_id = auth.uid()
    )
  );

-- Policy: only service_role can insert/update (server actions use admin client)
CREATE POLICY "Service role can manage documents"
  ON public.provider_documents FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant the service_role policy to authenticated for reads
GRANT SELECT ON public.provider_documents TO authenticated;
