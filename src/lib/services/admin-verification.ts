"use server";

// =============================================================================
// MITASAFI: ADMIN VERIFICATION ACTIONS (M-D.4)
// =============================================================================
// Server actions for admin review of provider verification documents:
//   - getVerificationQueue: Paginated list of pending verifications
//   - getVerificationDetail: Full detail for a single provider's submission
//   - approveVerification: Approve all documents & activate provider
//   - rejectVerification: Reject with reasons & notify provider
//
// Authorization: Every action verifies admin role via requireAdmin().
// Mutations: Uses createAdminClient() (bypasses RLS).
// =============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUser } from "@/lib/cache/queries";
import { revalidatePath } from "next/cache";
import {
  notifyProviderVerificationApproved,
  notifyProviderVerificationRejected,
} from "@/lib/notifications/triggers";

// =============================================================================
// TYPES
// =============================================================================

export interface AdminActionResult {
  success: boolean;
  error?: string;
}

export interface VerificationQueueItem {
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerPhone: string | null;
  businessType: string | null;
  accountStatus: string | null;
  profilePhotoUrl: string | null;
  documentCount: number;
  pendingCount: number;
  submittedAt: string;
  userId: string;
}

export interface VerificationQueueResult {
  data: VerificationQueueItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface VerificationDocument {
  id: string;
  documentType: string;
  documentUrl: string;
  status: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

export interface VerificationDetail {
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerPhone: string | null;
  businessType: string | null;
  accountStatus: string | null;
  profilePhotoUrl: string | null;
  userId: string;
  createdAt: string;
  verificationLevel: string | null;
  documents: VerificationDocument[];
}

// =============================================================================
// HELPERS
// =============================================================================

/** Verify the current user has admin role. Returns user ID or error. */
async function requireAdmin(): Promise<
  { userId: string; error: null } | { userId: null; error: string }
> {
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    return { userId: null, error: "Authentication required." };
  }

  const admin = createAdminClient();
  const { data: roles, error: rolesError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (rolesError) {
    console.error("[Admin] Role check error:", rolesError);
    return { userId: null, error: "Failed to verify permissions." };
  }

  const hasAdminRole = roles?.some(
    (r: { role: string }) => r.role === "admin"
  );

  if (!hasAdminRole) {
    return { userId: null, error: "Admin access required." };
  }

  return { userId: user.id, error: null };
}

// =============================================================================
// GET VERIFICATION QUEUE
// =============================================================================

/**
 * Fetch pending verification submissions for admin queue.
 *
 * Groups documents by provider. Shows providers with at least one pending
 * document, sorted by earliest submission (oldest first = FIFO queue).
 *
 * @param page 1-based page number
 * @param pageSize Items per page
 * @param filter 'pending' | 'rejected' | 'all' (default: 'pending')
 */
export async function getVerificationQueue(
  page = 1,
  pageSize = 20,
  filter: "pending" | "rejected" | "all" = "pending"
): Promise<VerificationQueueResult> {
  const emptyResult: VerificationQueueResult = {
    data: [],
    pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false },
  };

  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      console.error("[Admin] getVerificationQueue auth:", authError);
      return emptyResult;
    }

    const admin = createAdminClient();

    // Build status filter for the account_status on service_providers
    let statusFilter: string[];
    if (filter === "pending") {
      statusFilter = ["pending_verification"];
    } else if (filter === "rejected") {
      statusFilter = ["rejected"];
    } else {
      statusFilter = ["pending_verification", "rejected"];
    }

    // Count total providers matching filter
    const { count: totalCount, error: countError } = await admin
      .from("service_providers")
      .select("id", { count: "exact", head: true })
      .in("account_status", statusFilter);

    if (countError) {
      console.error("[Admin] Queue count error:", countError);
      return emptyResult;
    }

    const total = totalCount ?? 0;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    // Fetch providers with pending/rejected verification
    const { data: providers, error: provError } = await admin
      .from("service_providers")
      .select(`
        id,
        user_id,
        business_name,
        business_type,
        phone,
        account_status,
        profile_photo_url,
        created_at,
        profiles!service_providers_user_id_fkey (
          full_name,
          email,
          phone
        )
      `)
      .in("account_status", statusFilter)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (provError) {
      console.error("[Admin] Queue fetch error:", provError);
      return emptyResult;
    }

    if (!providers?.length) {
      return { ...emptyResult, pagination: { page, pageSize, total, totalPages, hasMore: false } };
    }

    // Fetch document counts for these providers
    const providerIds = providers.map((p) => p.id);
    const { data: docs, error: docsError } = await admin
      .from("provider_documents")
      .select("provider_id, status")
      .in("provider_id", providerIds);

    if (docsError) {
      console.error("[Admin] Docs count error:", docsError);
    }

    // Build count maps
    const docCounts = new Map<string, { total: number; pending: number }>();
    for (const doc of docs ?? []) {
      const entry = docCounts.get(doc.provider_id) ?? { total: 0, pending: 0 };
      entry.total++;
      if (doc.status === "pending") entry.pending++;
      docCounts.set(doc.provider_id, entry);
    }

    // Map to queue items
    const data: VerificationQueueItem[] = providers.map((p) => {
      // profiles is returned as object (single join) or array
      const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      const counts = docCounts.get(p.id) ?? { total: 0, pending: 0 };

      return {
        providerId: p.id,
        providerName: (profile as { full_name?: string })?.full_name
          || p.business_name
          || "Unknown",
        providerEmail: (profile as { email?: string })?.email || "",
        providerPhone: p.phone || (profile as { phone?: string })?.phone || null,
        businessType: p.business_type,
        accountStatus: p.account_status,
        profilePhotoUrl: p.profile_photo_url,
        documentCount: counts.total,
        pendingCount: counts.pending,
        submittedAt: p.created_at ?? new Date().toISOString(),
        userId: p.user_id,
      };
    });

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  } catch (err) {
    console.error("[Admin] getVerificationQueue unexpected:", err);
    return emptyResult;
  }
}

// =============================================================================
// GET VERIFICATION DETAIL
// =============================================================================

/**
 * Fetch full detail for a single provider's verification submission.
 * Includes all documents with their statuses.
 *
 * @param providerId The service_providers.id to review
 */
export async function getVerificationDetail(
  providerId: string
): Promise<{ data: VerificationDetail | null; error: string | null }> {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      return { data: null, error: authError };
    }

    const admin = createAdminClient();

    // Fetch provider with profile
    const { data: provider, error: provError } = await admin
      .from("service_providers")
      .select(`
        id,
        user_id,
        business_name,
        business_type,
        phone,
        account_status,
        profile_photo_url,
        created_at,
        profiles!service_providers_user_id_fkey (
          full_name,
          email,
          phone,
          verification_level
        )
      `)
      .eq("id", providerId)
      .single();

    if (provError || !provider) {
      return { data: null, error: "Provider not found." };
    }

    // Fetch all documents for this provider
    const { data: docs, error: docsError } = await admin
      .from("provider_documents")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: true });

    if (docsError) {
      console.error("[Admin] Detail docs error:", docsError);
    }

    const profile = Array.isArray(provider.profiles)
      ? provider.profiles[0]
      : provider.profiles;

    const detail: VerificationDetail = {
      providerId: provider.id,
      providerName: (profile as { full_name?: string })?.full_name
        || provider.business_name
        || "Unknown",
      providerEmail: (profile as { email?: string })?.email || "",
      providerPhone: provider.phone || (profile as { phone?: string })?.phone || null,
      businessType: provider.business_type,
      accountStatus: provider.account_status,
      profilePhotoUrl: provider.profile_photo_url,
      userId: provider.user_id,
      createdAt: provider.created_at ?? new Date().toISOString(),
      verificationLevel: (profile as { verification_level?: string })?.verification_level || null,
      documents: (docs ?? []).map((d) => ({
        id: d.id,
        documentType: d.document_type,
        documentUrl: d.document_url,
        status: d.status,
        rejectionReason: d.rejection_reason,
        reviewedAt: (d as Record<string, unknown>).reviewed_at as string | null ?? null,
        reviewedBy: (d as Record<string, unknown>).reviewed_by as string | null ?? null,
        createdAt: d.created_at,
      })),
    };

    return { data: detail, error: null };
  } catch (err) {
    console.error("[Admin] getVerificationDetail unexpected:", err);
    return { data: null, error: "Failed to load verification detail." };
  }
}

// =============================================================================
// APPROVE VERIFICATION
// =============================================================================

/**
 * Approve a provider's verification.
 *
 * 1. Mark all pending documents as 'approved' with reviewer metadata.
 * 2. Set service_providers: is_verified=true, is_active=true, account_status='active'.
 * 3. Set profiles: verification_level='full', is_verified=true.
 * 4. Send approval notification to provider.
 *
 * @param providerId The service_providers.id to approve
 */
export async function approveVerification(
  providerId: string
): Promise<AdminActionResult> {
  try {
    const { userId: adminUserId, error: authError } = await requireAdmin();
    if (authError || !adminUserId) {
      return { success: false, error: authError || "Auth failed." };
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    // 1. Approve all pending documents
    // Cast needed: reviewed_at/reviewed_by added by migration, not yet in generated types.
    const { error: docError } = await admin
      .from("provider_documents")
      .update({
        status: "approved",
        reviewed_at: now,
        reviewed_by: adminUserId,
        updated_at: now,
      } as never)
      .eq("provider_id", providerId)
      .eq("status", "pending");

    if (docError) {
      console.error("[Admin] Approve docs error:", docError);
      return { success: false, error: "Failed to approve documents." };
    }

    // 2. Fetch provider to get user_id
    const { data: provider, error: fetchError } = await admin
      .from("service_providers")
      .select("user_id, business_name")
      .eq("id", providerId)
      .single();

    if (fetchError || !provider) {
      return { success: false, error: "Provider not found." };
    }

    // 3. Activate provider
    const { error: provError } = await admin
      .from("service_providers")
      .update({
        is_verified: true,
        is_active: true,
        account_status: "active",
        updated_at: now,
      })
      .eq("id", providerId);

    if (provError) {
      console.error("[Admin] Approve provider error:", provError);
      return { success: false, error: "Failed to activate provider." };
    }

    // 4. Update profile
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        verification_level: "full",
        is_verified: true,
        updated_at: now,
      })
      .eq("id", provider.user_id);

    if (profileError) {
      console.error("[Admin] Approve profile error:", profileError);
      // Non-fatal — provider is already activated
    }

    // 5. Fetch provider name for notification
    const { data: profileData } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", provider.user_id)
      .single();

    const providerName =
      (profileData as { full_name?: string })?.full_name
      || provider.business_name
      || "Provider";

    // 6. Send approval notification (fire-and-forget)
    notifyProviderVerificationApproved({
      providerUserId: provider.user_id,
      providerId,
      providerName,
    }).catch((err) =>
      console.error("[Admin] Approval notification failed:", err)
    );

    // 7. Revalidate admin pages
    revalidatePath("/admin/verifications");
    revalidatePath(`/admin/verifications/${providerId}`);
    revalidatePath("/dashboard/verify-provider");

    return { success: true };
  } catch (err) {
    console.error("[Admin] approveVerification unexpected:", err);
    return { success: false, error: "Unexpected error during approval." };
  }
}

// =============================================================================
// REJECT VERIFICATION
// =============================================================================

/**
 * Reject a provider's verification.
 *
 * @param providerId The service_providers.id to reject
 * @param reasons Map of document_id → rejection_reason.
 *   At least one reason is required. A general reason can be provided
 *   via a special key "general".
 */
export async function rejectVerification(
  providerId: string,
  reasons: Record<string, string>
): Promise<AdminActionResult> {
  try {
    const { userId: adminUserId, error: authError } = await requireAdmin();
    if (authError || !adminUserId) {
      return { success: false, error: authError || "Auth failed." };
    }

    if (!reasons || Object.keys(reasons).length === 0) {
      return { success: false, error: "At least one rejection reason is required." };
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    // 1. Reject individual documents with specific reasons
    const docIds = Object.keys(reasons).filter((k) => k !== "general");
    for (const docId of docIds) {
      const { error } = await admin
        .from("provider_documents")
        .update({
          status: "rejected",
          rejection_reason: reasons[docId],
          reviewed_at: now,
          reviewed_by: adminUserId,
          updated_at: now,
        } as never)
        .eq("id", docId)
        .eq("provider_id", providerId);

      if (error) {
        console.error(`[Admin] Reject doc ${docId} error:`, error);
      }
    }

    // If a general reason was provided but no specific docs were targeted,
    // reject all pending documents with that reason.
    if (reasons.general && docIds.length === 0) {
      const { error } = await admin
        .from("provider_documents")
        .update({
          status: "rejected",
          rejection_reason: reasons.general,
          reviewed_at: now,
          reviewed_by: adminUserId,
          updated_at: now,
        } as never)
        .eq("provider_id", providerId)
        .eq("status", "pending");

      if (error) {
        console.error("[Admin] Reject all docs error:", error);
      }
    }

    // 2. Update provider account status to 'rejected'
    const { error: provError } = await admin
      .from("service_providers")
      .update({
        is_verified: false,
        is_active: false,
        account_status: "rejected",
        updated_at: now,
      })
      .eq("id", providerId);

    if (provError) {
      console.error("[Admin] Reject provider error:", provError);
      return { success: false, error: "Failed to update provider status." };
    }

    // 3. Get provider details for notification
    const { data: provider } = await admin
      .from("service_providers")
      .select("user_id, business_name")
      .eq("id", providerId)
      .single();

    if (provider) {
      const { data: profileData } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", provider.user_id)
        .single();

      // Reset profile verification level back to 'id' (docs submitted but rejected)
      await admin
        .from("profiles")
        .update({
          verification_level: "id",
          is_verified: false,
          updated_at: now,
        })
        .eq("id", provider.user_id);

      const providerName =
        (profileData as { full_name?: string })?.full_name
        || provider.business_name
        || "Provider";

      // Compile human-readable rejection summary
      const reasonSummary = reasons.general
        || Object.values(reasons).join("; ");

      // 4. Send rejection notification (fire-and-forget)
      notifyProviderVerificationRejected({
        providerUserId: provider.user_id,
        providerId,
        providerName,
        reason: reasonSummary,
      }).catch((err) =>
        console.error("[Admin] Rejection notification failed:", err)
      );
    }

    // 5. Revalidate
    revalidatePath("/admin/verifications");
    revalidatePath(`/admin/verifications/${providerId}`);
    revalidatePath("/dashboard/verify-provider");

    return { success: true };
  } catch (err) {
    console.error("[Admin] rejectVerification unexpected:", err);
    return { success: false, error: "Unexpected error during rejection." };
  }
}
