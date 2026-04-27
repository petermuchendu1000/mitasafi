/**
 * Services Grid
 *
 * Professional service card layout inspired by marketplace cards (Fiverr / Thumbtack).
 * Design principles:
 * - Image → Title + Rating → Structured meta row → Price + Preview CTA
 * - Resting shadow for "elevated card" feel
 * - Icon+label meta pairs (location, member since) replace free-form description
 * - Strong typography contrast: title bold, meta light, price heavy
 *
 * Supports toggle active, delete with confirmation.
 * Uses optimistic updates for instant feedback.
 */

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui";
import {
  Plus,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Shield,
  AlertCircle,
  ImageIcon,
  Eye,
  EyeOff,
  Pencil,
  Star,
  MapPin,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import {
  toggleServiceActive,
  deleteProviderService,
  type ProviderServiceWithDetails,
  type ProviderCardMeta,
} from "./actions";
import { formatRating } from "@/lib/constants";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function memberSinceShort(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-KE", { month: "short", year: "numeric" });
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ServicesGridProps {
  initialServices: ProviderServiceWithDetails[];
  isVerified?: boolean;
  providerMeta?: ProviderCardMeta | null;
}

export function ServicesGrid({
  initialServices,
  isVerified = false,
  providerMeta,
}: ServicesGridProps) {
  const { error: showError } = useToast();
  const [services, setServices] = useState(initialServices);
  const [isPending, startTransition] = useTransition();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const memberSince = memberSinceShort(providerMeta?.member_since ?? null);

  // Group services by category for organization
  const servicesByCategory = services.reduce((acc, service) => {
    const categoryName = service.service?.subcategory?.category?.name || "Other";
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(service);
    return acc;
  }, {} as Record<string, ProviderServiceWithDetails[]>);

  const handleToggleActive = (serviceId: string, currentlyActive: boolean) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId ? { ...s, is_active: !currentlyActive } : s
      )
    );
    setActiveMenu(null);

    startTransition(async () => {
      const result = await toggleServiceActive(serviceId);
      if (!result.success) {
        setServices((prev) =>
          prev.map((s) =>
            s.id === serviceId ? { ...s, is_active: currentlyActive } : s
          )
        );
        showError(result.error || "Failed to update service");
      }
    });
  };

  const handleDelete = (serviceId: string) => {
    const serviceToDelete = services.find((s) => s.id === serviceId);
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    setDeleteConfirm(null);
    setActiveMenu(null);

    startTransition(async () => {
      const result = await deleteProviderService(serviceId);
      if (!result.success) {
        if (serviceToDelete) {
          setServices((prev) => [...prev, serviceToDelete]);
        }
        showError(result.error || "Failed to delete service");
      }
    });
  };

  const formatPrice = (customPricing: Record<string, unknown> | null) => {
    if (!customPricing) return { label: "Not set", sub: "" };
    const priceType = customPricing.type as string | undefined;
    const amount = customPricing.amount as number | undefined;
    if (priceType === "quote") return { label: "Quote", sub: "Request pricing" };
    if (!amount) return { label: "Not set", sub: "" };
    const formatted = `KES ${amount.toLocaleString()}`;
    if (priceType === "starting_from") return { label: formatted, sub: "Start from" };
    if (priceType === "hourly") return { label: `${formatted}/hr`, sub: "" };
    return { label: formatted, sub: "" };
  };

  const getStatusConfig = (service: ProviderServiceWithDetails) => {
    if (!isVerified) {
      return { label: "Draft", color: "bg-amber-100/90 text-amber-700", dot: "bg-amber-500" };
    }
    if (!service.is_active) {
      return { label: "Paused", color: "bg-gray-100/90 text-gray-500", dot: "bg-gray-400" };
    }
    return { label: "Active", color: "bg-emerald-50/90 text-emerald-700", dot: "bg-emerald-500" };
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Services</h1>
          <p className="text-sm text-gray-500 mt-1">
            {services.length} service{services.length !== 1 ? "s" : ""} listed
          </p>
        </div>
        <Link
          href="/dashboard/provider/services/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Services
        </Link>
      </div>

      {/* Verification Banner */}
      {!isVerified && services.length > 0 && (
        <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900">
                Your services are in draft mode
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Complete verification to make them visible to clients searching on MitaSafi.
              </p>
              <Link
                href="/dashboard/verify-provider"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Complete Verification
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Services by Category */}
      {Object.entries(servicesByCategory).map(([categoryName, categoryServices]) => (
        <div key={categoryName} className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {categoryName}
            </h2>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">{categoryServices.length}</span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categoryServices.map((service) => {
              const price = formatPrice(service.custom_pricing);
              const status = getStatusConfig(service);
              const imageUrls = service.image_urls || [];
              const thumbUrl = imageUrls[0] || null;

              return (
                <div
                  key={service.id}
                  className={cn(
                    "group relative bg-white rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-lg",
                    "border border-gray-200/80",
                    !service.is_active && "opacity-75 hover:opacity-100"
                  )}
                >
                  {/* ── Image ── */}
                  <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                    {thumbUrl ? (
                      <Image
                        src={thumbUrl}
                        alt={service.service?.name || "Service photo"}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                        <ImageIcon className="w-10 h-10 mb-1" />
                        <span className="text-xs text-gray-400">No photo</span>
                      </div>
                    )}

                    {/* Status badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full backdrop-blur-sm shadow-sm",
                        status.color
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                        {status.label}
                      </span>
                    </div>

                    {/* Image count */}
                    {imageUrls.length > 1 && (
                      <div className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 bg-black/60 text-white text-xs rounded-md backdrop-blur-sm">
                        <ImageIcon className="w-3 h-3" />
                        {imageUrls.length}
                      </div>
                    )}

                    {/* Paused overlay */}
                    {isVerified && !service.is_active && (
                      <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-full shadow-sm">
                          <EyeOff className="w-4 h-4 text-gray-500" />
                          <span className="text-xs font-medium text-gray-600">Hidden from clients</span>
                        </div>
                      </div>
                    )}

                    {/* Actions menu trigger */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <button
                        onClick={() => setActiveMenu(activeMenu === service.id ? null : service.id)}
                        className="p-1.5 bg-white/80 backdrop-blur-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-white shadow-sm transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenu === service.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                          <div className="absolute right-0 top-9 z-20 w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5">
                            <Link
                              href={`/dashboard/provider/services/${service.id}/edit`}
                              className="w-full px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                              onClick={() => setActiveMenu(null)}
                            >
                              <Pencil className="w-4 h-4 text-gray-400" />
                              Edit Service
                            </Link>
                            <button
                              onClick={() => handleToggleActive(service.id, service.is_active)}
                              className="w-full px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                            >
                              {service.is_active ? (
                                <><Pause className="w-4 h-4 text-gray-400" /> Pause Service</>
                              ) : (
                                <><Play className="w-4 h-4 text-teal-500" /> Resume Service</>
                              )}
                            </button>
                            <div className="h-px bg-gray-100 mx-3 my-1" />
                            <button
                              onClick={() => { setDeleteConfirm(service.id); setActiveMenu(null); }}
                              className="w-full px-3.5 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" /> Delete Service
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Card Body ── */}
                  <div className="p-4 space-y-3">
                    {/* Row 1: Title + Rating */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[15px] leading-snug">
                          <Link
                            href={`/dashboard/provider/services/${service.id}`}
                            className="text-gray-900 hover:text-teal-700 transition-colors"
                          >
                            {service.service?.name}
                          </Link>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {service.service?.subcategory?.category?.name}
                          {service.service?.subcategory?.name && <> · {service.service.subcategory.name}</>}
                        </p>
                      </div>
                      {providerMeta?.rating_average != null && providerMeta.rating_average > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0 pl-2">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-bold text-gray-800">
                            {formatRating(providerMeta.rating_average)}
                          </span>
                          {providerMeta.rating_count != null && providerMeta.rating_count > 0 && (
                            <span className="text-xs text-gray-400">
                              ({providerMeta.rating_count})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Row 2: Meta signals (icon + label pairs) */}
                    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-gray-500">
                      {memberSince && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          Joined {memberSince}
                        </span>
                      )}
                      {providerMeta?.primary_location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {providerMeta.primary_location}
                        </span>
                      )}
                      {isVerified && service.is_active && (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <Eye className="w-3.5 h-3.5" />
                          Visible
                        </span>
                      )}
                    </div>

                    {/* Row 3: Price + Edit/Preview CTAs */}
                    <div className="pt-3 border-t border-gray-100 flex items-end justify-between">
                      <div>
                        {price.sub && (
                          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium leading-none mb-0.5">
                            {price.sub}
                          </p>
                        )}
                        <p className="text-base font-bold text-teal-700">
                          {price.label}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/provider/services/${service.id}/edit`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </Link>
                        <Link
                          href={`/dashboard/provider/services/${service.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                        >
                          Preview
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Service?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently remove the service from your profile. Uploaded photos will also be deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isPending}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
