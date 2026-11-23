/**
 * Compare Providers Feature
 *
 * Allows users to compare up to 3 service providers side-by-side.
 * Consists of:
 * - CompareBar: Floating bar showing selected providers
 * - CompareModal: Full comparison view in a modal
 * - CompareProvider: React context for state management
 *
 * Uses React Context with localStorage persistence.
 */

"use client";

import {
  useState,
  useCallback,
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  X,
  Scale,
  Star,
  CheckCircle,
  XCircle,
  MapPin,
  Clock,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatServicePrice,
  formatRating,
  TIER_CONFIG,
  getCategoryById,
} from "@/lib/constants";
import type { ServiceProviderCardData } from "@/types/service-providers";
import { createArrayStore } from "@/lib/browser-storage/local-store";
import { useLocalStore } from "@/lib/browser-storage/useLocalStore";

// =============================================================================
// COMPARE CONTEXT
// =============================================================================

interface CompareContextValue {
  providers: readonly ServiceProviderCardData[];
  addProvider: (provider: ServiceProviderCardData) => boolean;
  removeProvider: (providerId: string) => void;
  clearAll: () => void;
  isInCompare: (providerId: string) => boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

const MAX_PROVIDERS = 3;

/**
 * The compare list, owned by one store at module scope.
 *
 * The entries are whole provider objects the browse page handed us, and they come back
 * out of localStorage where the user could have edited them, so the guard checks the
 * two fields every consumer dereferences without a null check: `id` (the React key and
 * the identity used for add/remove) and `business_name` (rendered, and `.charAt(0)` is
 * called on it in two places). An entry missing either is dropped rather than crashing
 * the comparison table.
 */
const compareProvidersStore = createArrayStore<ServiceProviderCardData>(
  "mitasafi-compare-providers",
  (value): value is ServiceProviderCardData =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as ServiceProviderCardData).id === "string" &&
    typeof (value as ServiceProviderCardData).business_name === "string",
);

export function CompareProvidersProvider({
  children,
}: {
  children: ReactNode;
}) {
  // One store subscription replaces: state, a mount effect that loaded localStorage
  // into it (the reported setState), a second effect that wrote state back to
  // localStorage on every change, and the isHydrated flag that existed only to stop
  // that second effect overwriting storage with [] before the first had run.
  //
  // That flag is worth a note, because the hazard it guarded is now structural rather
  // than ordered. It worked by effect declaration order: load ran first and set
  // isHydrated, persist ran second and skipped because it still saw the old value.
  // Reordering the two effects, or adding a third that changed `providers`, would have
  // silently armed a "write [] over the user's list" bug. Reading and writing through
  // one store cannot express that mistake.
  const providers = useLocalStore(compareProvidersStore);

  const addProvider = useCallback(
    (provider: ServiceProviderCardData): boolean => {
      const current = compareProvidersStore.read();
      if (current.length >= MAX_PROVIDERS) return false;
      if (current.some((p) => p.id === provider.id)) return false;
      compareProvidersStore.write([...current, provider]);
      return true;
    },
    [],
  );

  const removeProvider = useCallback((providerId: string) => {
    const current = compareProvidersStore.read();
    if (!current.some((p) => p.id === providerId)) return;
    compareProvidersStore.write(current.filter((p) => p.id !== providerId));
  }, []);

  const clearAll = useCallback(() => {
    compareProvidersStore.clear();
  }, []);

  const isInCompare = useCallback(
    (providerId: string): boolean => {
      return providers.some((p) => p.id === providerId);
    },
    [providers],
  );

  // Memoised. The object literal used to be built inline, so it had a fresh identity
  // on every render of the provider and re-rendered every consumer of the context —
  // which on /services/browse is the bar and every card's compare button. The store
  // snapshot and all four callbacks are stable, so there is nothing left to churn.
  const value = useMemo(
    () => ({ providers, addProvider, removeProvider, clearAll, isInCompare }),
    [providers, addProvider, removeProvider, clearAll, isInCompare],
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompareProviders(): CompareContextValue {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error(
      "useCompareProviders must be used within CompareProvidersProvider",
    );
  }
  return context;
}

// =============================================================================
// COMPARE BAR
// =============================================================================

interface CompareBarProps {
  className?: string;
}

export function CompareBar({ className }: CompareBarProps) {
  const { providers, removeProvider, clearAll } = useCompareProviders();
  const [showModal, setShowModal] = useState(false);

  if (providers.length === 0) return null;

  return (
    <>
      {/* Floating Bar */}
      <div
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-40",
          "bg-white rounded-2xl shadow-xl border border-gray-200",
          "px-4 py-3 flex items-center gap-4",
          "animate-in slide-in-from-bottom-4 duration-300",
          className,
        )}
      >
        {/* Provider Avatars */}
        <div className="flex items-center gap-2">
          {providers.map((provider) => (
            <div key={provider.id} className="relative group">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border-2 border-white shadow">
                {provider.logo_url ? (
                  <img
                    src={provider.logo_url}
                    alt={provider.business_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove(
                        "hidden",
                      );
                    }}
                  />
                ) : null}
                <div
                  className={cn(
                    "w-full h-full flex items-center justify-center bg-brand-100 text-brand-600 font-semibold",
                    provider.logo_url && "hidden",
                  )}
                >
                  {provider.business_name.charAt(0)}
                </div>
              </div>
              <button
                onClick={() => removeProvider(provider.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: 3 - providers.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400"
            >
              <span className="text-xs">+</span>
            </div>
          ))}
        </div>

        {/* Compare Count */}
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">
            {providers.length}
          </span>{" "}
          of 3
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <button
            onClick={() => setShowModal(true)}
            disabled={providers.length < 2}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
              providers.length >= 2
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
            )}
          >
            <Scale className="w-4 h-4" />
            Compare
          </button>

          <button
            onClick={clearAll}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Clear all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Comparison Modal */}
      {showModal && (
        <CompareModal
          providers={providers}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// =============================================================================
// COMPARE MODAL
// =============================================================================

interface CompareModalProps {
  // readonly: these come straight from the store's cached snapshot, which React
  // compares by reference. Mutating them in place would change a value React believes
  // is unchanged, so the type says so rather than leaving it to be remembered.
  providers: readonly ServiceProviderCardData[];
  onClose: () => void;
}

function CompareModal({ providers, onClose }: CompareModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-start justify-center p-4 pt-16">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <Scale className="w-6 h-6 text-brand-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Compare Providers ({providers.length})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-4 bg-gray-50 w-48 sticky left-0" />
                  {providers.map((provider) => (
                    <th
                      key={provider.id}
                      className="p-4 bg-gray-50 min-w-[250px]"
                    >
                      <ProviderHeader provider={provider} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Rating */}
                <CompareRow label="Rating">
                  {providers.map((p) => (
                    <td key={p.id} className="p-4">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-warning-500 fill-warning-500" />
                        <span className="font-semibold">
                          {formatRating(p.rating_average)}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({p.rating_count} reviews)
                        </span>
                      </div>
                    </td>
                  ))}
                </CompareRow>

                {/* Starting Price */}
                <CompareRow label="Starting Price">
                  {providers.map((p) => (
                    <td key={p.id} className="p-4">
                      <span className="font-semibold text-brand-600">
                        {formatServicePrice(p.min_price)}
                      </span>
                    </td>
                  ))}
                </CompareRow>

                {/* Verified */}
                <CompareRow label="Verified">
                  {providers.map((p) => (
                    <td key={p.id} className="p-4">
                      {p.is_verified ? (
                        <span className="inline-flex items-center gap-1.5 text-brand-600">
                          <CheckCircle className="w-5 h-5" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-gray-400">
                          <XCircle className="w-5 h-5" />
                          Not Verified
                        </span>
                      )}
                    </td>
                  ))}
                </CompareRow>

                {/* Jobs Completed */}
                <CompareRow label="Jobs Completed">
                  {providers.map((p) => (
                    <td key={p.id} className="p-4">
                      <span className="font-semibold">
                        {p.total_jobs_completed?.toLocaleString() || 0}
                      </span>
                    </td>
                  ))}
                </CompareRow>

                {/* Response Time */}
                <CompareRow label="Avg Response">
                  {providers.map((p) => (
                    <td key={p.id} className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>
                          {p.response_time_minutes
                            ? p.response_time_minutes < 60
                              ? "< 1 hour"
                              : `~${Math.round(p.response_time_minutes / 60)} hours`
                            : "—"}
                        </span>
                      </div>
                    </td>
                  ))}
                </CompareRow>

                {/* Instant Booking */}
                <CompareRow label="Instant Booking">
                  {providers.map((p) => (
                    <td key={p.id} className="p-4">
                      {p.instant_booking ? (
                        <span className="inline-flex items-center gap-1.5 text-cta-600">
                          <Zap className="w-5 h-5" />
                          Available
                        </span>
                      ) : (
                        <span className="text-gray-400">Quote Only</span>
                      )}
                    </td>
                  ))}
                </CompareRow>

                {/* Service Areas */}
                <CompareRow label="Service Areas">
                  {providers.map((p) => (
                    <td key={p.id} className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {p.service_areas?.slice(0, 4).map((area) => (
                          <span
                            key={area}
                            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {area}
                          </span>
                        ))}
                        {(p.service_areas?.length || 0) > 4 && (
                          <span className="px-2 py-0.5 text-xs text-gray-500">
                            +{(p.service_areas?.length || 0) - 4} more
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </CompareRow>

                {/* Categories */}
                <CompareRow label="Services">
                  {providers.map((p) => (
                    <td key={p.id} className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {p.categories?.slice(0, 3).map((categoryId) => {
                          const catInfo = getCategoryById(categoryId);
                          return (
                            <span
                              key={categoryId}
                              className={cn(
                                "px-2 py-0.5 text-xs rounded",
                                catInfo?.bgColor || "bg-gray-100",
                                catInfo?.textColor || "text-gray-600",
                              )}
                            >
                              {catInfo?.name || categoryId}
                            </span>
                          );
                        })}
                        {(p.categories?.length || 0) > 3 && (
                          <span className="px-2 py-0.5 text-xs text-gray-500">
                            +{(p.categories?.length || 0) - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </CompareRow>

                {/* Tier */}
                <CompareRow label="Membership">
                  {providers.map((p) => {
                    const tier = p.tier || "free";
                    const tierInfo = TIER_CONFIG[tier];
                    return (
                      <td key={p.id} className="p-4">
                        {tierInfo.badge ? (
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium",
                              tierInfo.bgColor,
                              tierInfo.color,
                            )}
                          >
                            {tierInfo.badge}
                          </span>
                        ) : (
                          <span className="text-gray-500">Standard</span>
                        )}
                      </td>
                    );
                  })}
                </CompareRow>
              </tbody>
            </table>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function ProviderHeader({ provider }: { provider: ServiceProviderCardData }) {
  const tier = provider.tier || "free";
  const tierInfo = TIER_CONFIG[tier];

  return (
    <div className="flex flex-col items-center text-center">
      {/* Logo */}
      <div
        className={cn(
          "w-16 h-16 rounded-xl overflow-hidden mb-3 border-2",
          tierInfo.borderColor,
        )}
      >
        {provider.logo_url ? (
          <img
            src={provider.logo_url}
            alt={provider.business_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div
          className={cn(
            "w-full h-full flex items-center justify-center bg-brand-100 text-brand-600 font-bold text-xl",
            provider.logo_url && "hidden",
          )}
        >
          {provider.business_name.charAt(0)}
        </div>
      </div>

      {/* Name */}
      <h3 className="font-semibold text-gray-900 line-clamp-1">
        {provider.business_name}
      </h3>

      {/* View Profile */}
      <a
        href={`/services/provider/${provider.id}`}
        className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
      >
        View Profile →
      </a>
    </div>
  );
}

function CompareRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="p-4 text-sm font-medium text-gray-600 bg-gray-50 sticky left-0">
        {label}
      </td>
      {children}
    </tr>
  );
}

// =============================================================================
// COMPARE BUTTON (for use in ProviderCard)
// =============================================================================

interface CompareButtonProps {
  provider: ServiceProviderCardData;
  className?: string;
  variant?: "icon" | "full";
}

export function CompareButton({
  provider,
  className,
  variant = "icon",
}: CompareButtonProps) {
  const { addProvider, removeProvider, isInCompare, providers } =
    useCompareProviders();
  const isSelected = isInCompare(provider.id);
  const isFull = providers.length >= 3 && !isSelected;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isSelected) {
        removeProvider(provider.id);
      } else if (!isFull) {
        addProvider(provider);
      }
    },
    [isSelected, isFull, provider, addProvider, removeProvider],
  );

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        disabled={isFull}
        className={cn(
          "p-2 rounded-lg transition-colors",
          isSelected
            ? "bg-brand-100 text-brand-600"
            : isFull
              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
              : "bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600",
          className,
        )}
        title={
          isSelected
            ? "Remove from compare"
            : isFull
              ? "Compare list full (max 3)"
              : "Add to compare"
        }
      >
        <Scale className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isFull}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
        isSelected
          ? "bg-brand-100 text-brand-700"
          : isFull
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gray-100 text-gray-700 hover:bg-brand-50 hover:text-brand-600",
        className,
      )}
    >
      <Scale className="w-4 h-4" />
      {isSelected ? "In Compare" : "Compare"}
    </button>
  );
}
