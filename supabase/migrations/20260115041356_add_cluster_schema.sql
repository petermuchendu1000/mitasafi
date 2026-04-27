-- PHASE 1: CLUSTER SCHEMA FOUNDATION
-- This migration creates all new tables for the cluster-based service architecture

-- 1.1 Create clusters table
CREATE TABLE IF NOT EXISTS clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  identity_label_en VARCHAR(100),
  identity_label_sw VARCHAR(100),
  max_categories_individual INTEGER DEFAULT 2,
  is_single_identity BOOLEAN DEFAULT FALSE,
  adjacency_model VARCHAR(20) DEFAULT 'within_cluster',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_adjacency_model CHECK (
    adjacency_model IN ('within_cluster', 'hub_spoke', 'none', 'special')
  )
);

CREATE INDEX IF NOT EXISTS idx_clusters_code ON clusters(code);

-- 1.2 Create cluster_categories table
CREATE TABLE IF NOT EXISTS cluster_categories (
  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  is_hub BOOLEAN DEFAULT FALSE,
  allows_individual BOOLEAN DEFAULT TRUE,
  requires_company_verification BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cluster_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_cluster_categories_category ON cluster_categories(category_id);

-- 1.3 Create cluster_adjacency table
CREATE TABLE IF NOT EXISTS cluster_adjacency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  primary_category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  secondary_category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cluster_id, primary_category_id, secondary_category_id)
);

CREATE INDEX IF NOT EXISTS idx_cluster_adjacency_primary ON cluster_adjacency(primary_category_id);
CREATE INDEX IF NOT EXISTS idx_cluster_adjacency_cluster ON cluster_adjacency(cluster_id);

-- 1.4 Create provider_clusters table
CREATE TABLE IF NOT EXISTS provider_clusters (
  provider_id UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES clusters(id),
  primary_category_id UUID NOT NULL REFERENCES service_categories(id),
  secondary_category_id UUID REFERENCES service_categories(id),
  policy_version VARCHAR(20) DEFAULT '1.0.0',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_clusters_cluster ON provider_clusters(cluster_id);

-- 1.5 Create provider_category_attempts table
CREATE TABLE IF NOT EXISTS provider_category_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  attempted_primary UUID,
  attempted_secondary UUID,
  reason_code VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_category_attempts_provider ON provider_category_attempts(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_category_attempts_created ON provider_category_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_provider_category_attempts_reason ON provider_category_attempts(reason_code);

-- 1.6 Add provider_type column to providers table
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS provider_type VARCHAR(20) DEFAULT 'individual'
CHECK (provider_type IN ('individual', 'company'));

CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(provider_type);
