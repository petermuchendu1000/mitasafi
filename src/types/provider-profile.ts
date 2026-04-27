/**
 * Provider Profile Types
 * 
 * Type definitions for provider profiles, neighborhoods,
 * service areas, working hours, and service photos.
 */

// ============================================================================
// NEIGHBORHOODS
// ============================================================================

export interface Neighborhood {
  id: string;
  name: string;
  slug: string;
  cluster: string | null;
  city: string;
  county: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  display_order: number;
}

export interface NeighborhoodCluster {
  cluster: string;
  neighborhoods: Neighborhood[];
}

// ============================================================================
// PROVIDER PROFILE
// ============================================================================

export interface ProviderProfile {
  id: string;
  user_id: string;
  business_name: string | null;
  headline: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  intro_video_url: string | null;
  years_experience: string | null;
  base_neighborhood_id: string | null;
  base_latitude: number | null;
  base_longitude: number | null;
  service_radius_km: number;
  response_time: string | null;
  emergency_available: boolean;
  emergency_surcharge_type: 'fixed' | 'percent' | null;
  emergency_surcharge_amount: number | null;
  languages: string[];
  profile_completion_percent: number;
  verification_status: string;
  provider_type: 'individual' | 'company' | null;
  social_links: SocialLinks;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderProfileWithRelations extends ProviderProfile {
  base_neighborhood?: Neighborhood | null;
  service_areas?: ProviderServiceArea[];
  working_hours?: ProviderWorkingHours[];
}

// ============================================================================
// SERVICE AREAS
// ============================================================================

export interface ProviderServiceArea {
  id: string;
  provider_id: string;
  neighborhood_id: string;
  is_primary: boolean;
  neighborhood?: Neighborhood;
}

// ============================================================================
// WORKING HOURS
// ============================================================================

export interface ProviderWorkingHours {
  id: string;
  provider_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  is_available: boolean;
  start_time: string | null; // "HH:MM" format
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_NAMES: Record<DayOfWeek, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export const DAY_NAMES_SHORT: Record<DayOfWeek, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

// ============================================================================
// PROVIDER SERVICES (Extended)
// ============================================================================

export interface ProviderServiceExtended {
  id: string;
  provider_id: string;
  service_id: string;
  custom_title: string | null;
  description: string | null;
  custom_price: number | null;
  price_type: 'fixed' | 'hourly' | 'starting_from' | 'quote' | null;
  price_estimate_min: number | null;
  price_estimate_max: number | null;
  typical_duration: string | null;
  whats_included: string[] | null;
  whats_not_included: string[] | null;
  tools_provided: 'all' | 'client_provides' | 'discuss';
  is_active: boolean;
  status: 'draft' | 'active' | 'paused' | 'pending_review';
  created_at: string;
  updated_at: string;
  // Relations
  service?: {
    id: string;
    name: string;
    slug: string;
    base_price: number | null;
    subcategory?: {
      id: string;
      name: string;
      category?: {
        id: string;
        name: string;
      };
    };
  };
  photos?: ProviderServicePhoto[];
}

// ============================================================================
// SERVICE PHOTOS
// ============================================================================

export interface ProviderServicePhoto {
  id: string;
  provider_service_id: string;
  photo_url: string;
  thumbnail_url: string | null;
  photo_type: 'before' | 'after' | 'in_progress' | 'completed' | 'general' | null;
  caption: string | null;
  display_order: number;
  file_size_bytes: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export const PHOTO_TYPE_LABELS: Record<string, string> = {
  before: 'Before',
  after: 'After',
  in_progress: 'Work in Progress',
  completed: 'Completed Work',
  general: 'General',
};

// ============================================================================
// FORM TYPES
// ============================================================================

/** Supported social media platforms for provider profiles */
export const SOCIAL_PLATFORMS = [
  { key: 'website', label: 'Website', prefix: 'https://', placeholder: 'yoursite.com', fullUrl: true },
  { key: 'facebook', label: 'Facebook', prefix: 'facebook.com/', placeholder: 'yourpage', fullUrl: false },
  { key: 'instagram', label: 'Instagram', prefix: 'instagram.com/', placeholder: 'yourhandle', fullUrl: false },
  { key: 'tiktok', label: 'TikTok', prefix: 'tiktok.com/@', placeholder: 'yourhandle', fullUrl: false },
  { key: 'twitter', label: 'X (Twitter)', prefix: 'x.com/', placeholder: 'yourhandle', fullUrl: false },
  { key: 'linkedin', label: 'LinkedIn', prefix: 'linkedin.com/in/', placeholder: 'yourprofile', fullUrl: false },
  { key: 'youtube', label: 'YouTube', prefix: 'youtube.com/@', placeholder: 'yourchannel', fullUrl: false },
] as const;

export type SocialPlatformKey = typeof SOCIAL_PLATFORMS[number]['key'];

export type SocialLinks = Partial<Record<SocialPlatformKey, string>>;

export interface ProfileBasicsFormData {
  headline: string;
  bio: string;
  years_experience: string;
  languages: string[];
  social_links?: SocialLinks;
  profile_photo_url?: string;
}

export interface ServiceAreasFormData {
  base_neighborhood_id: string;
  service_area_ids: string[];
  service_radius_km: number;
}

export interface WorkingHoursFormData {
  schedule: {
    day_of_week: DayOfWeek;
    is_available: boolean;
    start_time: string;
    end_time: string;
    break_start?: string;
    break_end?: string;
  }[];
  emergency_available: boolean;
  emergency_surcharge_type?: 'fixed' | 'percent';
  emergency_surcharge_amount?: number;
  response_time: string;
}

export interface ServiceDetailsFormData {
  service_id: string;
  custom_title?: string;
  description: string;
  price_type: 'fixed' | 'hourly' | 'starting_from' | 'quote';
  custom_price?: number;
  price_estimate_min?: number;
  price_estimate_max?: number;
  typical_duration: string;
  whats_included: string[];
  whats_not_included?: string[];
  tools_provided: 'all' | 'client_provides' | 'discuss';
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const YEARS_EXPERIENCE_OPTIONS = [
  { value: 'less_than_1', label: 'Less than 1 year' },
  { value: '1_2', label: '1-2 years' },
  { value: '3_5', label: '3-5 years' },
  { value: '5_10', label: '5-10 years' },
  { value: '10_plus', label: '10+ years' },
];

export const RESPONSE_TIME_OPTIONS = [
  { value: 'within_1_hour', label: 'Usually responds within 1 hour' },
  { value: 'within_few_hours', label: 'Within a few hours' },
  { value: 'within_24_hours', label: 'Within 24 hours' },
];

export const DURATION_OPTIONS = [
  { value: 'under_1_hour', label: 'Under 1 hour' },
  { value: '1_2_hours', label: '1-2 hours' },
  { value: '2_4_hours', label: '2-4 hours' },
  { value: 'half_day', label: 'Half day (4-6 hours)' },
  { value: 'full_day', label: 'Full day' },
  { value: 'multiple_days', label: 'Multiple days' },
  { value: 'varies', label: 'Varies by project' },
];

export const LANGUAGE_OPTIONS = [
  'English',
  'Swahili',
  'Kikuyu',
  'Luo',
  'Luhya',
  'Kamba',
  'Kalenjin',
  'Meru',
  'French',
  'Arabic',
  'Somali',
];

export const DEFAULT_INCLUDED_ITEMS = [
  'Labor',
  'Basic consumables (tape, sealant, etc.)',
  'Cleanup after work',
  'Problem diagnosis',
  'Testing after repair',
];

export const TOOLS_PROVIDED_OPTIONS = [
  { value: 'all', label: 'I bring all tools and equipment needed' },
  { value: 'client_provides', label: 'Client needs to provide some items' },
  { value: 'discuss', label: "I'll discuss materials needed before starting" },
];

// ============================================================================
// PROFILE COMPLETION CHECKLIST
// ============================================================================

export interface ProfileCompletionItem {
  id: string;
  label: string;
  description: string;
  points: number;
  isComplete: boolean;
  link?: string;
}

export function getProfileCompletionChecklist(profile: ProviderProfileWithRelations): ProfileCompletionItem[] {
  return [
    {
      id: 'photo',
      label: 'Profile photo',
      description: 'Add a professional photo',
      points: 15,
      isComplete: !!profile.profile_photo_url,
      link: '/dashboard/provider/profile/photo',
    },
    {
      id: 'headline',
      label: 'Headline',
      description: 'Create a catchy headline',
      points: 10,
      isComplete: !!profile.headline && profile.headline.length >= 10,
      link: '/dashboard/provider/profile/basics',
    },
    {
      id: 'bio',
      label: 'Bio',
      description: 'Write about yourself (100+ chars)',
      points: 15,
      isComplete: !!profile.bio && profile.bio.length >= 100,
      link: '/dashboard/provider/profile/basics',
    },
    {
      id: 'experience',
      label: 'Years of experience',
      description: 'Add your experience level',
      points: 5,
      isComplete: !!profile.years_experience,
      link: '/dashboard/provider/profile/basics',
    },
    {
      id: 'service_areas',
      label: 'Service areas',
      description: 'Select areas you serve',
      points: 10,
      isComplete: (profile.service_areas?.length || 0) >= 1,
      link: '/dashboard/provider/profile/areas',
    },
    {
      id: 'working_hours',
      label: 'Working hours',
      description: 'Set your availability',
      points: 10,
      isComplete: (profile.working_hours?.filter(h => h.is_available).length || 0) >= 1,
      link: '/dashboard/provider/profile/hours',
    },
    {
      id: 'services',
      label: 'Add a service',
      description: 'List at least one service',
      points: 15,
      isComplete: false, // Will be set dynamically
      link: '/dashboard/provider/services/new',
    },
    {
      id: 'service_description',
      label: 'Service description',
      description: 'Describe your service (50+ chars)',
      points: 10,
      isComplete: false, // Will be set dynamically
    },
    {
      id: 'service_photos',
      label: 'Service photos',
      description: 'Upload at least one photo',
      points: 10,
      isComplete: false, // Will be set dynamically
    },
  ];
}
