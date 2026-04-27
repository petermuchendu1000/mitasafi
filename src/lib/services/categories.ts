// =============================================================================
// MITASAFI: SERVICE CATEGORIES LIB
// =============================================================================
// Server-side functions for fetching service categories and subcategories.
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  ServiceCategory,
  ServiceSubcategory,
  ServiceCategoryWithSubs,
} from "@/types/service-providers";

// =============================================================================
// GET ALL CATEGORIES
// =============================================================================

export async function getCategories(): Promise<ServiceCategory[]> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("service_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    
    if (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getCategories:", error);
    return [];
  }
}

// =============================================================================
// GET CATEGORIES WITH SUBCATEGORIES
// =============================================================================

export async function getCategoriesWithSubs(): Promise<ServiceCategoryWithSubs[]> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("service_categories")
      .select(`
        *,
        subcategories:service_subcategories (
          *
        )
      `)
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    
    if (error) {
      console.error("Error fetching categories with subs:", error);
      return [];
    }
    
    // Sort subcategories by display_order
    // Cast data to any to handle Supabase's nested type inference
    return ((data as any[]) || []).map((cat) => ({
      ...cat,
      subcategories: ((cat.subcategories as any[]) || [])
        .filter((sub) => sub.is_active)
        .sort((a, b) => 
          (a.display_order || 0) - (b.display_order || 0)
        ),
    })) as ServiceCategoryWithSubs[];
  } catch (error) {
    console.error("Error in getCategoriesWithSubs:", error);
    return [];
  }
}

// =============================================================================
// GET SINGLE CATEGORY
// =============================================================================

export async function getCategoryById(
  categoryId: string
): Promise<ServiceCategoryWithSubs | null> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("service_categories")
      .select(`
        *,
        subcategories:service_subcategories (
          *
        )
      `)
      .eq("id", categoryId)
      .eq("is_active", true)
      .single();
    
    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching category:", error);
      return null;
    }
    
    // Cast to any to handle Supabase's nested type inference
    const catData = data as any;
    return {
      ...catData,
      subcategories: ((catData.subcategories as any[]) || [])
        .filter((sub) => sub.is_active)
        .sort((a, b) => 
          (a.display_order || 0) - (b.display_order || 0)
        ),
    } as ServiceCategoryWithSubs;
  } catch (error) {
    console.error("Error in getCategoryById:", error);
    return null;
  }
}

// =============================================================================
// GET SUBCATEGORIES BY CATEGORY
// =============================================================================

export async function getSubcategoriesByCategory(
  categoryId: string
): Promise<ServiceSubcategory[]> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("service_subcategories")
      .select("*")
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    
    if (error) {
      console.error("Error fetching subcategories:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getSubcategoriesByCategory:", error);
    return [];
  }
}

// =============================================================================
// GET SUBCATEGORY BY ID
// =============================================================================

export async function getSubcategoryById(
  subcategoryId: string
): Promise<ServiceSubcategory | null> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("service_subcategories")
      .select(`
        *,
        category:service_categories (*)
      `)
      .eq("id", subcategoryId)
      .eq("is_active", true)
      .single();
    
    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching subcategory:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getSubcategoryById:", error);
    return null;
  }
}

// =============================================================================
// GET CATEGORY STATS
// =============================================================================

export interface CategoryStats {
  categoryId: string;
  providerCount: number;
  avgRating: number;
  avgPriceMin: number;
  avgPriceMax: number;
}

export async function getCategoryStats(categoryId: string): Promise<CategoryStats | null> {
  const supabase = await createClient();
  
  try {
    // Get provider count and avg rating for this category
    const { data: providers, error } = await supabase
      .from("service_providers")
      .select(`
        rating_average,
        provider_services!inner (
          service:services!inner (
            subcategory:service_subcategories!inner (
              category_id
            )
          )
        )
      `)
      .eq("status", "active")
      .eq("provider_services.service.subcategory.category_id", categoryId);
    
    if (error) {
      console.error("Error fetching category stats:", error);
      return null;
    }
    
    // Cast to any[] to handle Supabase's complex type inference
    const providerData = (providers as any[]) || [];
    
    if (providerData.length === 0) {
      return {
        categoryId,
        providerCount: 0,
        avgRating: 0,
        avgPriceMin: 0,
        avgPriceMax: 0,
      };
    }
    
    // Calculate stats
    const ratings = providerData
      .map((p) => p.rating_average)
      .filter((r): r is number => r !== null);
    
    const avgRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;
    
    // Get price range from subcategories
    const { data: subcats } = await supabase
      .from("service_subcategories")
      .select("avg_price_min, avg_price_max")
      .eq("category_id", categoryId)
      .eq("is_active", true);
    
    // Cast for Supabase type inference
    const subcatData = (subcats as any[]) || [];
    const prices = subcatData.filter((s) => s.avg_price_min || s.avg_price_max);
    const avgPriceMin = prices.length > 0
      ? prices.reduce((a: number, b: any) => a + (b.avg_price_min || 0), 0) / prices.length
      : 0;
    const avgPriceMax = prices.length > 0
      ? prices.reduce((a: number, b: any) => a + (b.avg_price_max || 0), 0) / prices.length
      : 0;
    
    return {
      categoryId,
      providerCount: providerData.length,
      avgRating: Math.round(avgRating * 10) / 10,
      avgPriceMin: Math.round(avgPriceMin),
      avgPriceMax: Math.round(avgPriceMax),
    };
  } catch (error) {
    console.error("Error in getCategoryStats:", error);
    return null;
  }
}
