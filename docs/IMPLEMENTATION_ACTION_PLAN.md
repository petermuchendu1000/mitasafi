# MITASAFI IMPLEMENTATION ACTION PLAN

**Reference:** MITASAFI_SERVICE_CONSTITUTION.md  
**Date:** January 11, 2026  
**Status:** Ready for execution

---

## PHASE 1: SCHEMA FOUNDATION

### Objective
Create all new database tables without affecting existing functionality.

### Prerequisites
- [ ] Supabase project access
- [ ] Service role key configured
- [ ] Database backup taken

### Actions

#### 1.1 Create `clusters` Table

**File:** `supabase/migrations/001_create_clusters.sql`

```sql
CREATE TABLE clusters (
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

CREATE INDEX idx_clusters_code ON clusters(code);
```

#### 1.2 Create `cluster_categories` Table

**File:** `supabase/migrations/002_create_cluster_categories.sql`

```sql
CREATE TABLE cluster_categories (
  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  is_hub BOOLEAN DEFAULT FALSE,
  allows_individual BOOLEAN DEFAULT TRUE,
  requires_company_verification BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cluster_id, category_id)
);

CREATE INDEX idx_cluster_categories_category ON cluster_categories(category_id);
```

#### 1.3 Create `cluster_adjacency` Table

**File:** `supabase/migrations/003_create_cluster_adjacency.sql`

```sql
CREATE TABLE cluster_adjacency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  primary_category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  secondary_category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cluster_id, primary_category_id, secondary_category_id)
);

CREATE INDEX idx_cluster_adjacency_primary ON cluster_adjacency(primary_category_id);
CREATE INDEX idx_cluster_adjacency_cluster ON cluster_adjacency(cluster_id);
```

#### 1.4 Create `provider_clusters` Table

**File:** `supabase/migrations/004_create_provider_clusters.sql`

```sql
CREATE TABLE provider_clusters (
  provider_id UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES clusters(id),
  primary_category_id UUID NOT NULL REFERENCES service_categories(id),
  secondary_category_id UUID REFERENCES service_categories(id),
  policy_version VARCHAR(20) DEFAULT '1.0.0',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provider_clusters_cluster ON provider_clusters(cluster_id);
```

#### 1.5 Create `provider_category_attempts` Table

**File:** `supabase/migrations/005_create_provider_category_attempts.sql`

```sql
CREATE TABLE provider_category_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  attempted_primary UUID,
  attempted_secondary UUID,
  reason_code VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provider_category_attempts_provider ON provider_category_attempts(provider_id);
CREATE INDEX idx_provider_category_attempts_created ON provider_category_attempts(created_at);
CREATE INDEX idx_provider_category_attempts_reason ON provider_category_attempts(reason_code);
```

#### 1.6 Add `provider_type` Column

**File:** `supabase/migrations/006_add_provider_type.sql`

```sql
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS provider_type VARCHAR(20) DEFAULT 'individual'
CHECK (provider_type IN ('individual', 'company'));

CREATE INDEX idx_providers_type ON providers(provider_type);
```

### Verification Checklist

```sql
-- Run after migrations
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clusters', 'cluster_categories', 'cluster_adjacency', 'provider_clusters', 'provider_category_attempts');

-- Should return 5 rows

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'providers' AND column_name = 'provider_type';

-- Should return 1 row
```

### Rollback

```sql
DROP TABLE IF EXISTS provider_category_attempts;
DROP TABLE IF EXISTS provider_clusters;
DROP TABLE IF EXISTS cluster_adjacency;
DROP TABLE IF EXISTS cluster_categories;
DROP TABLE IF EXISTS clusters;
ALTER TABLE providers DROP COLUMN IF EXISTS provider_type;
```

### Sign-off
- [ ] All 5 tables created
- [ ] provider_type column added
- [ ] Indexes created
- [ ] No foreign key errors
- [ ] Existing app functionality unaffected

---

## PHASE 2: DATA SEEDING

### Objective
Populate cluster structure, create new categories, reassign services.

### Prerequisites
- [ ] Phase 1 complete
- [ ] Current category IDs documented
- [ ] Current events-planning services documented

### Actions

#### 2.1 Update Seed Script

**File:** `scripts/seed-services-complete.mjs`

Add new phases to existing script:

```javascript
// PHASE 0: Cleanup (existing)
// PHASE 1: Seed clusters (NEW)
// PHASE 2: Create new categories (NEW)  
// PHASE 3: Seed existing categories (existing, modified)
// PHASE 4: Reassign services (NEW)
// PHASE 5: Seed cluster_categories mappings (NEW)
// PHASE 6: Seed cluster_adjacency pairs (NEW)
// PHASE 7: Seed services (existing)
```

#### 2.2 Cluster Data

```javascript
const CLUSTERS = [
  {
    code: 'plumbing-fluid',
    name: 'Plumbing & Fluid Systems',
    identity_label_en: 'Plumber',
    identity_label_sw: 'Fundi wa maji',
    max_categories_individual: 2,
    is_single_identity: false,
    adjacency_model: 'within_cluster'
  },
  {
    code: 'electrical-lowvoltage',
    name: 'Electrical & Low-Voltage',
    identity_label_en: 'Electrician',
    identity_label_sw: 'Fundi wa stima',
    max_categories_individual: 2,
    is_single_identity: false,
    adjacency_model: 'within_cluster'
  },
  {
    code: 'cleaning-hygiene',
    name: 'Cleaning & Hygiene',
    identity_label_en: 'Cleaner',
    identity_label_sw: 'Msafishaji',
    max_categories_individual: 2,
    is_single_identity: false,
    adjacency_model: 'hub_spoke'
  },
  {
    code: 'interior-finishing',
    name: 'Interior Finishing & Woodwork',
    identity_label_en: 'Carpenter',
    identity_label_sw: 'Seremala',
    max_categories_individual: 2,
    is_single_identity: false,
    adjacency_model: 'within_cluster'
  },
  {
    code: 'fabrication',
    name: 'Fabrication',
    identity_label_en: 'Welder',
    identity_label_sw: 'Fundi wa kulehemu',
    max_categories_individual: 2,
    is_single_identity: false,
    adjacency_model: 'within_cluster'
  },
  {
    code: 'moving-clearance',
    name: 'Moving & Clearance',
    identity_label_en: 'Mover',
    identity_label_sw: 'Mhamishaji',
    max_categories_individual: 2,
    is_single_identity: false,
    adjacency_model: 'within_cluster'
  },
  {
    code: 'gardening-outdoor',
    name: 'Gardening & Outdoor',
    identity_label_en: 'Gardener',
    identity_label_sw: 'Mtunza bustani',
    max_categories_individual: 2,
    is_single_identity: false,
    adjacency_model: 'within_cluster'
  },
  {
    code: 'it-device',
    name: 'IT & Device Support',
    identity_label_en: 'IT Technician',
    identity_label_sw: 'Fundi wa kompyuta',
    max_categories_individual: 1,
    is_single_identity: false,
    adjacency_model: 'none'
  },
  {
    code: 'personal-care',
    name: 'Personal Care',
    identity_label_en: 'Beautician',
    identity_label_sw: 'Mtaalamu wa urembo',
    max_categories_individual: 1,
    is_single_identity: true,
    adjacency_model: 'none'
  },
  {
    code: 'care-dependent',
    name: 'Care & Dependent Services',
    identity_label_en: 'Caregiver',
    identity_label_sw: 'Mlezi',
    max_categories_individual: 1,
    is_single_identity: true,
    adjacency_model: 'none'
  },
  {
    code: 'transport',
    name: 'Transport',
    identity_label_en: 'Driver',
    identity_label_sw: 'Dereva',
    max_categories_individual: 1,
    is_single_identity: true,
    adjacency_model: 'none'
  },
  {
    code: 'events',
    name: 'Events',
    identity_label_en: 'Event Professional',
    identity_label_sw: 'Mtaalamu wa matukio',
    max_categories_individual: 2,
    is_single_identity: false,
    adjacency_model: 'special'
  },
  {
    code: 'errands',
    name: 'Errands',
    identity_label_en: 'Delivery Assistant',
    identity_label_sw: 'Msaidizi wa uchukuzi',
    max_categories_individual: 1,
    is_single_identity: true,
    adjacency_model: 'none'
  }
];
```

#### 2.3 New Categories

```javascript
const NEW_CATEGORIES = [
  {
    name: 'Garden Waste Removal',
    slug: 'garden-waste-removal',
    description: 'Removal and disposal of garden waste',
    icon: 'leaf'
  },
  {
    name: 'Event Performers',
    slug: 'event-performers',
    description: 'Individual performers for events',
    icon: 'music'
  },
  {
    name: 'Event Coordination',
    slug: 'event-coordination',
    description: 'Event planning and coordination services',
    icon: 'calendar'
  }
];
```

#### 2.4 Category-to-Cluster Mapping

```javascript
const CLUSTER_CATEGORY_MAP = {
  'plumbing-fluid': [
    { slug: 'plumbing', is_hub: false, allows_individual: true },
    { slug: 'water-gas-delivery', is_hub: false, allows_individual: true }
  ],
  'electrical-lowvoltage': [
    { slug: 'electrical', is_hub: false, allows_individual: true },
    { slug: 'internet-networking', is_hub: false, allows_individual: true }
  ],
  'cleaning-hygiene': [
    { slug: 'cleaning', is_hub: true, allows_individual: true },
    { slug: 'laundry', is_hub: false, allows_individual: true },
    { slug: 'pest-control', is_hub: false, allows_individual: true }
  ],
  'interior-finishing': [
    { slug: 'carpentry', is_hub: false, allows_individual: true },
    { slug: 'painting', is_hub: false, allows_individual: true }
  ],
  'fabrication': [
    { slug: 'welding-metal-works', is_hub: false, allows_individual: true },
    { slug: 'glass-aluminium-works', is_hub: false, allows_individual: true }
  ],
  'moving-clearance': [
    { slug: 'moving-relocation', is_hub: false, allows_individual: true },
    { slug: 'garbage-junk-removal', is_hub: false, allows_individual: true }
  ],
  'gardening-outdoor': [
    { slug: 'gardening-landscaping', is_hub: false, allows_individual: true },
    { slug: 'garden-waste-removal', is_hub: false, allows_individual: true }
  ],
  'it-device': [
    { slug: 'it-tech-support', is_hub: false, allows_individual: true }
  ],
  'personal-care': [
    { slug: 'beauty-home-services', is_hub: false, allows_individual: true }
  ],
  'care-dependent': [
    { slug: 'childcare-home-care', is_hub: false, allows_individual: true }
  ],
  'transport': [
    { slug: 'taxi-rides', is_hub: false, allows_individual: true }
  ],
  'events': [
    { slug: 'event-performers', is_hub: false, allows_individual: true },
    { slug: 'event-coordination', is_hub: false, allows_individual: false, requires_company_verification: true }
  ],
  'errands': [
    { slug: 'shopping-assistance', is_hub: false, allows_individual: true }
  ]
};
```

#### 2.5 Adjacency Pairs

```javascript
const ADJACENCY_PAIRS = {
  'plumbing-fluid': [
    ['plumbing', 'water-gas-delivery'],
    ['water-gas-delivery', 'plumbing']
  ],
  'electrical-lowvoltage': [
    ['electrical', 'internet-networking'],
    ['internet-networking', 'electrical']
  ],
  'cleaning-hygiene': [
    // Hub-spoke: only cleaning can be primary
    ['cleaning', 'laundry'],
    ['cleaning', 'pest-control']
  ],
  'interior-finishing': [
    ['carpentry', 'painting'],
    ['painting', 'carpentry']
  ],
  'fabrication': [
    ['welding-metal-works', 'glass-aluminium-works'],
    ['glass-aluminium-works', 'welding-metal-works']
  ],
  'moving-clearance': [
    ['moving-relocation', 'garbage-junk-removal'],
    ['garbage-junk-removal', 'moving-relocation']
  ],
  'gardening-outdoor': [
    ['gardening-landscaping', 'garden-waste-removal'],
    ['garden-waste-removal', 'gardening-landscaping']
  ],
  // Single-category clusters have no adjacency
  'it-device': [],
  'personal-care': [],
  'care-dependent': [],
  'transport': [],
  'errands': [],
  // Events special: performers can pair with each other for individuals
  'events': [
    ['event-performers', 'event-coordination']  // Only for companies
  ]
};
```

#### 2.6 Service Reassignments

```javascript
const SERVICE_MOVES = [
  {
    service_name: 'Garden Waste Removal',
    from_category: 'garbage-junk-removal',
    to_category: 'garden-waste-removal'
  }
];

const EVENTS_SPLIT = {
  'event-performers': [
    'DJ Services',
    'Event Photography',
    'Event Videography',
    'MC Services'
  ],
  'event-coordination': [
    'Event Planning',
    'Event Decoration',
    'Tent & Chair Hire',
    'Catering Services'
  ]
};
```

### Verification Checklist

```sql
-- Verify clusters
SELECT code, name, adjacency_model FROM clusters ORDER BY code;
-- Should return 13 rows

-- Verify cluster_categories
SELECT c.code, sc.slug, cc.is_hub, cc.allows_individual 
FROM cluster_categories cc
JOIN clusters c ON c.id = cc.cluster_id
JOIN service_categories sc ON sc.id = cc.category_id
ORDER BY c.code, cc.display_order;
-- Should return 22 rows

-- Verify adjacency
SELECT c.code, p.slug as primary, s.slug as secondary
FROM cluster_adjacency ca
JOIN clusters c ON c.id = ca.cluster_id
JOIN service_categories p ON p.id = ca.primary_category_id
JOIN service_categories s ON s.id = ca.secondary_category_id
ORDER BY c.code;
-- Should return ~14 rows

-- Verify new categories exist
SELECT slug FROM service_categories 
WHERE slug IN ('garden-waste-removal', 'event-performers', 'event-coordination');
-- Should return 3 rows

-- Verify services moved
SELECT s.name, sc.slug 
FROM services s
JOIN service_categories sc ON sc.id = s.category_id
WHERE s.name = 'Garden Waste Removal';
-- Should show garden-waste-removal category
```

### Sign-off
- [ ] 13 clusters seeded
- [ ] 3 new categories created
- [ ] 22 category-cluster mappings
- [ ] Adjacency pairs seeded
- [ ] Garden Waste service moved
- [ ] Events services split correctly

---

## PHASE 3: API VALIDATION (LOG-ONLY)

### Objective
Implement validation logic that logs but does not block.

### Prerequisites
- [ ] Phase 2 complete
- [ ] TypeScript types updated
- [ ] Test provider accounts available

### Actions

#### 3.1 Create Types

**File:** `src/types/clusters.ts`

```typescript
export type AdjacencyModel = 'within_cluster' | 'hub_spoke' | 'none' | 'special';

export interface Cluster {
  id: string;
  code: string;
  name: string;
  identity_label_en: string;
  identity_label_sw: string;
  max_categories_individual: number;
  is_single_identity: boolean;
  adjacency_model: AdjacencyModel;
}

export interface ClusterCategory {
  cluster_id: string;
  category_id: string;
  is_hub: boolean;
  allows_individual: boolean;
  requires_company_verification: boolean;
  display_order: number;
}

export interface ProviderCluster {
  provider_id: string;
  cluster_id: string;
  primary_category_id: string;
  secondary_category_id: string | null;
  policy_version: string;
}

export type ValidationReasonCode = 
  | 'SINGLE_IDENTITY'
  | 'CROSS_CLUSTER'
  | 'HUB_REQUIRED'
  | 'CAP_EXCEEDED'
  | 'COMPANY_ONLY'
  | 'INVALID_PAIR'
  | 'SERVICE_CATEGORY_MISMATCH';

export interface ValidationResult {
  valid: boolean;
  reason_code?: ValidationReasonCode;
  message_en?: string;
  message_sw?: string;
  details?: Record<string, unknown>;
}
```

#### 3.2 Create Validation Service

**File:** `src/lib/services/cluster-validation.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import type { ValidationResult, ValidationReasonCode } from '@/types/clusters';

const REASON_MESSAGES: Record<ValidationReasonCode, { en: string; sw: string }> = {
  SINGLE_IDENTITY: {
    en: 'This service is offered as standalone only',
    sw: 'Huduma hii hufanywa pekee'
  },
  CROSS_CLUSTER: {
    en: 'These services cannot be combined',
    sw: 'Huduma hizi hazichanganyiki'
  },
  HUB_REQUIRED: {
    en: 'Cleaning must be primary for this combination',
    sw: 'Usafi lazima iwe ya kwanza'
  },
  CAP_EXCEEDED: {
    en: 'Maximum categories reached',
    sw: 'Umefika kikomo'
  },
  COMPANY_ONLY: {
    en: 'This service requires company registration',
    sw: 'Huduma hii inahitaji kampuni'
  },
  INVALID_PAIR: {
    en: 'These categories cannot be combined',
    sw: 'Makundi haya hayachanganyiki'
  },
  SERVICE_CATEGORY_MISMATCH: {
    en: 'Service does not belong to selected category',
    sw: 'Huduma haiko katika kundi lililochaguliwa'
  }
};

export async function validateProviderCategories(
  providerId: string,
  primaryCategoryId: string,
  secondaryCategoryId: string | null
): Promise<ValidationResult> {
  const supabase = await createClient();
  
  // 1. Get provider type
  const { data: provider } = await supabase
    .from('providers')
    .select('provider_type')
    .eq('id', providerId)
    .single();
  
  const providerType = provider?.provider_type || 'individual';
  
  // 2. Get primary category's cluster
  const { data: primaryMapping } = await supabase
    .from('cluster_categories')
    .select(`
      cluster_id,
      is_hub,
      allows_individual,
      requires_company_verification,
      clusters (
        code,
        is_single_identity,
        adjacency_model
      )
    `)
    .eq('category_id', primaryCategoryId)
    .single();
  
  if (!primaryMapping) {
    return reject('CROSS_CLUSTER', { reason: 'Primary category not in any cluster' });
  }
  
  const cluster = primaryMapping.clusters;
  
  // 3. Check individual restrictions
  if (providerType === 'individual') {
    // Check company-only
    if (primaryMapping.requires_company_verification) {
      return reject('COMPANY_ONLY');
    }
    
    // Check allows_individual
    if (!primaryMapping.allows_individual) {
      return reject('COMPANY_ONLY');
    }
  }
  
  // 4. If no secondary, we're done
  if (!secondaryCategoryId) {
    return { valid: true };
  }
  
  // 5. Check single-identity violation
  if (cluster.is_single_identity) {
    return reject('SINGLE_IDENTITY');
  }
  
  // 6. Get secondary category's cluster
  const { data: secondaryMapping } = await supabase
    .from('cluster_categories')
    .select(`
      cluster_id,
      is_hub,
      allows_individual,
      requires_company_verification
    `)
    .eq('category_id', secondaryCategoryId)
    .single();
  
  if (!secondaryMapping) {
    return reject('CROSS_CLUSTER', { reason: 'Secondary category not in any cluster' });
  }
  
  // 7. Check same cluster
  if (secondaryMapping.cluster_id !== primaryMapping.cluster_id) {
    return reject('CROSS_CLUSTER');
  }
  
  // 8. Check secondary restrictions for individuals
  if (providerType === 'individual') {
    if (secondaryMapping.requires_company_verification) {
      return reject('COMPANY_ONLY');
    }
    if (!secondaryMapping.allows_individual) {
      return reject('COMPANY_ONLY');
    }
  }
  
  // 9. Check hub-spoke rule
  if (cluster.adjacency_model === 'hub_spoke') {
    if (!primaryMapping.is_hub) {
      return reject('HUB_REQUIRED');
    }
  }
  
  // 10. Check adjacency pair exists
  const { data: adjacency } = await supabase
    .from('cluster_adjacency')
    .select('id')
    .eq('cluster_id', primaryMapping.cluster_id)
    .eq('primary_category_id', primaryCategoryId)
    .eq('secondary_category_id', secondaryCategoryId)
    .single();
  
  if (!adjacency) {
    return reject('INVALID_PAIR');
  }
  
  return { valid: true };
}

function reject(
  reason_code: ValidationReasonCode, 
  details?: Record<string, unknown>
): ValidationResult {
  const messages = REASON_MESSAGES[reason_code];
  return {
    valid: false,
    reason_code,
    message_en: messages.en,
    message_sw: messages.sw,
    details
  };
}
```

#### 3.3 Create Logging Function

**File:** `src/lib/services/cluster-audit.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import type { ValidationReasonCode } from '@/types/clusters';

export async function logCategoryAttempt(
  providerId: string,
  attemptedPrimary: string,
  attemptedSecondary: string | null,
  reasonCode: ValidationReasonCode,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();
  
  await supabase.from('provider_category_attempts').insert({
    provider_id: providerId,
    attempted_primary: attemptedPrimary,
    attempted_secondary: attemptedSecondary,
    reason_code: reasonCode,
    metadata: metadata || {}
  });
}
```

#### 3.4 Hook into Existing Endpoint

**File:** `src/app/api/provider/services/route.ts` (or equivalent)

```typescript
// Add to existing POST handler
import { validateProviderCategories } from '@/lib/services/cluster-validation';
import { logCategoryAttempt } from '@/lib/services/cluster-audit';

// Inside handler, before saving:
const validation = await validateProviderCategories(
  providerId,
  primaryCategoryId,
  secondaryCategoryId
);

if (!validation.valid) {
  // LOG-ONLY MODE: Log but don't block
  await logCategoryAttempt(
    providerId,
    primaryCategoryId,
    secondaryCategoryId,
    validation.reason_code!,
    { 
      mode: 'log_only',
      ...validation.details 
    }
  );
  
  console.warn(`[CLUSTER_VALIDATION] Would reject: ${validation.reason_code}`, {
    providerId,
    primaryCategoryId,
    secondaryCategoryId
  });
  
  // Continue with save (log-only mode)
}

// Proceed with existing save logic...
```

### Verification Checklist

```sql
-- After testing, check audit log
SELECT reason_code, COUNT(*) 
FROM provider_category_attempts 
GROUP BY reason_code;

-- Check specific rejections
SELECT * FROM provider_category_attempts 
ORDER BY created_at DESC 
LIMIT 20;
```

### Sign-off
- [ ] Types created
- [ ] Validation service implemented
- [ ] Audit logging working
- [ ] All reason codes tested
- [ ] Log-only mode confirmed (no rejections)

---

## PHASE 4: UI UPDATE

### Objective
Update wizard to guide users to valid selections.

### Prerequisites
- [ ] Phase 3 complete
- [ ] Current Step1Category.tsx backed up
- [ ] Design specs for disabled states

### Actions

#### 4.1 Create Cluster Hook

**File:** `src/hooks/use-clusters.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useClusters() {
  return useQuery({
    queryKey: ['clusters'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('clusters')
        .select('*')
        .order('name');
      return data || [];
    }
  });
}

export function useClusterCategories(clusterId: string | null) {
  return useQuery({
    queryKey: ['cluster-categories', clusterId],
    queryFn: async () => {
      if (!clusterId) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from('cluster_categories')
        .select(`
          *,
          service_categories (id, name, slug, icon)
        `)
        .eq('cluster_id', clusterId)
        .order('display_order');
      return data || [];
    },
    enabled: !!clusterId
  });
}

export function useCategoryCluster(categoryId: string | null) {
  return useQuery({
    queryKey: ['category-cluster', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      const supabase = createClient();
      const { data } = await supabase
        .from('cluster_categories')
        .select(`
          *,
          clusters (*)
        `)
        .eq('category_id', categoryId)
        .single();
      return data;
    },
    enabled: !!categoryId
  });
}
```

#### 4.2 Update Step1Category

Key changes to `src/app/dashboard/provider/services/new/Step1Category.tsx`:

1. **Remove MAX_CATEGORIES constant** (now cluster-driven)
2. **Add cluster resolution on selection**
3. **Add disabled state logic**
4. **Add tooltips for disabled categories**

```typescript
// Core logic changes:

const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);

const handlePrimarySelect = async (categoryId: string) => {
  // Resolve cluster
  const clusterData = await getCategoryCluster(categoryId);
  setSelectedCluster(clusterData.clusters);
  setPrimaryCategory(categoryId);
  
  // Check if secondary allowed
  if (clusterData.clusters.is_single_identity) {
    // Skip to services
    goToStep(3);
  } else {
    // Go to secondary selection
    goToStep(2);
  }
};

const isDisabled = (categoryId: string) => {
  if (!selectedCluster) return false;
  
  const categoryCluster = getCategoryCluster(categoryId);
  
  // Different cluster
  if (categoryCluster?.cluster_id !== selectedCluster.id) {
    return { disabled: true, reason: 'Different expertise area' };
  }
  
  // Company-only for individuals
  if (providerType === 'individual' && !categoryCluster.allows_individual) {
    return { disabled: true, reason: 'Requires company registration' };
  }
  
  return { disabled: false };
};
```

#### 4.3 Create Step2Secondary Component

**File:** `src/app/dashboard/provider/services/new/Step2Secondary.tsx`

```typescript
// New component for secondary category selection
// Only shown if cluster allows secondary

interface Step2SecondaryProps {
  primaryCategoryId: string;
  cluster: Cluster;
  onSelect: (categoryId: string | null) => void;
  onSkip: () => void;
}

export function Step2Secondary({ 
  primaryCategoryId, 
  cluster, 
  onSelect, 
  onSkip 
}: Step2SecondaryProps) {
  const { data: clusterCategories } = useClusterCategories(cluster.id);
  
  // Filter out primary, filter by allows_individual if needed
  const availableCategories = clusterCategories?.filter(cc => 
    cc.category_id !== primaryCategoryId &&
    (providerType === 'company' || cc.allows_individual)
  );
  
  // Hub-spoke messaging
  const isHubSpoke = cluster.adjacency_model === 'hub_spoke';
  
  return (
    <div>
      <h2>Add a secondary service area?</h2>
      
      {isHubSpoke && (
        <p className="text-muted">
          You can add one of these related services to your Cleaning specialty.
        </p>
      )}
      
      {availableCategories?.map(cc => (
        <CategoryCard
          key={cc.category_id}
          category={cc.service_categories}
          onClick={() => onSelect(cc.category_id)}
        />
      ))}
      
      <Button variant="ghost" onClick={onSkip}>
        Skip — {getPrimaryCategoryName()} only
      </Button>
    </div>
  );
}
```

#### 4.4 Update Step3Services

Filter services to only show from selected categories:

```typescript
// In Step3Services.tsx
const { data: services } = useQuery({
  queryKey: ['services', primaryCategoryId, secondaryCategoryId],
  queryFn: async () => {
    const categoryIds = [primaryCategoryId, secondaryCategoryId].filter(Boolean);
    
    const { data } = await supabase
      .from('services')
      .select('*')
      .in('category_id', categoryIds)
      .order('created_at');
    
    return data;
  }
});
```

### Verification Checklist

- [ ] Single-identity clusters skip Step 2
- [ ] Hub-spoke shows correct messaging
- [ ] Company-only categories hidden for individuals
- [ ] Disabled tooltips display
- [ ] Services filtered correctly
- [ ] Mobile responsive

### Sign-off
- [ ] All 13 cluster paths tested
- [ ] Validation matches UI prevention
- [ ] No console errors
- [ ] Loading states work
- [ ] Back navigation works

---

## PHASE 5: ENFORCEMENT + CONSTRAINTS

### Objective
Enable rejections and add database constraints.

### Prerequisites
- [ ] Phase 4 complete
- [ ] 7+ days of log-only monitoring
- [ ] No false positives in logs
- [ ] Support documentation ready

### Actions

#### 5.1 Enable API Rejections

**File:** `src/app/api/provider/services/route.ts`

```typescript
// Change from log-only to reject mode:

if (!validation.valid) {
  await logCategoryAttempt(
    providerId,
    primaryCategoryId,
    secondaryCategoryId,
    validation.reason_code!,
    { mode: 'enforced', ...validation.details }
  );
  
  return NextResponse.json({
    success: false,
    error: {
      code: validation.reason_code,
      message_en: validation.message_en,
      message_sw: validation.message_sw,
      details: validation.details
    }
  }, { status: 400 });
}
```

#### 5.2 Add Database Constraint Function

**File:** `supabase/migrations/007_add_cluster_constraints.sql`

```sql
-- Function to validate provider cluster assignment
CREATE OR REPLACE FUNCTION validate_provider_cluster()
RETURNS TRIGGER AS $$
DECLARE
  primary_cluster_id UUID;
  secondary_cluster_id UUID;
  cluster_record RECORD;
  adjacency_exists BOOLEAN;
BEGIN
  -- Get cluster for primary category
  SELECT cluster_id INTO primary_cluster_id
  FROM cluster_categories
  WHERE category_id = NEW.primary_category_id;
  
  -- Verify primary matches assigned cluster
  IF primary_cluster_id != NEW.cluster_id THEN
    RAISE EXCEPTION 'Primary category does not belong to assigned cluster';
  END IF;
  
  -- If secondary exists, validate it
  IF NEW.secondary_category_id IS NOT NULL THEN
    -- Get cluster for secondary
    SELECT cluster_id INTO secondary_cluster_id
    FROM cluster_categories
    WHERE category_id = NEW.secondary_category_id;
    
    -- Must be same cluster
    IF secondary_cluster_id != NEW.cluster_id THEN
      RAISE EXCEPTION 'Secondary category must be in same cluster as primary';
    END IF;
    
    -- Check adjacency exists
    SELECT EXISTS(
      SELECT 1 FROM cluster_adjacency
      WHERE cluster_id = NEW.cluster_id
      AND primary_category_id = NEW.primary_category_id
      AND secondary_category_id = NEW.secondary_category_id
    ) INTO adjacency_exists;
    
    IF NOT adjacency_exists THEN
      RAISE EXCEPTION 'Invalid category combination for this cluster';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER validate_provider_cluster_trigger
BEFORE INSERT OR UPDATE ON provider_clusters
FOR EACH ROW
EXECUTE FUNCTION validate_provider_cluster();
```

#### 5.3 Test Constraints

```sql
-- Test: Should fail (cross-cluster)
INSERT INTO provider_clusters (provider_id, cluster_id, primary_category_id, secondary_category_id)
VALUES (
  'test-provider-id',
  (SELECT id FROM clusters WHERE code = 'plumbing-fluid'),
  (SELECT id FROM service_categories WHERE slug = 'plumbing'),
  (SELECT id FROM service_categories WHERE slug = 'cleaning')  -- Wrong cluster!
);
-- Expected: ERROR

-- Test: Should succeed
INSERT INTO provider_clusters (provider_id, cluster_id, primary_category_id, secondary_category_id)
VALUES (
  'test-provider-id',
  (SELECT id FROM clusters WHERE code = 'plumbing-fluid'),
  (SELECT id FROM service_categories WHERE slug = 'plumbing'),
  (SELECT id FROM service_categories WHERE slug = 'water-gas-delivery')  -- Correct!
);
-- Expected: SUCCESS
```

### Verification Checklist

- [ ] API returns 400 for invalid combinations
- [ ] Error messages are correct (EN/SW)
- [ ] Database trigger works
- [ ] Valid combinations still succeed
- [ ] Audit log captures enforced rejections

### Sign-off
- [ ] All enforcement tests pass
- [ ] No legitimate operations blocked
- [ ] Three-layer enforcement aligned (UI/API/DB)
- [ ] System is locked

---

## EXECUTION TIMELINE

| Phase | Duration | Dependency |
|-------|----------|------------|
| Phase 1 | 1 day | None |
| Phase 2 | 1 day | Phase 1 |
| Phase 3 | 1 day + 7 day monitor | Phase 2 |
| Phase 4 | 2-3 days | Phase 3 |
| Phase 5 | 1 day | Phase 4 |

**Total:** ~13-14 days (including monitoring period)

---

## QUICK REFERENCE: FILE CHANGES

### New Files
- `supabase/migrations/001-006_*.sql` (6 migration files)
- `src/types/clusters.ts`
- `src/lib/services/cluster-validation.ts`
- `src/lib/services/cluster-audit.ts`
- `src/hooks/use-clusters.ts`
- `src/app/dashboard/provider/services/new/Step2Secondary.tsx`

### Modified Files
- `scripts/seed-services-complete.mjs`
- `src/app/api/provider/services/route.ts`
- `src/app/dashboard/provider/services/new/Step1Category.tsx`
- `src/app/dashboard/provider/services/new/Step3Services.tsx`

---

*End of Action Plan*
