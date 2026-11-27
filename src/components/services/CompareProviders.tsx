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
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Scale, Star, X } from "lucide-react";
import { HomeIcon } from "@/components/landing/HomeIcons";
import { cn } from "@/lib/utils";
import { formatServicePrice, TIER_CONFIG, getCategoryById, type PriceType } from "@/lib/constants";
import { canInstantBook, getResponseTimeLabel, type ServiceProviderCardData } from "@/types/service-providers";
import { createArrayStore } from "@/lib/browser-storage/local-store";
import { useLocalStore } from "@/lib/browser-storage/useLocalStore";
import styles from "./compare.module.css";

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
 * called on it in the shortlist). An entry missing either is dropped.
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
  const compare = useRef<HTMLButtonElement>(null);

  if (providers.length === 0) return null;

  return (
    <>
      {/* Floating Bar */}
      <div
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-40",
          styles.tray,
          "px-2 py-2 flex items-center justify-between gap-2 sm:px-4",
          "animate-in slide-in-from-bottom-4 duration-300",
          className,
        )}
      >
        {/* Provider Avatars */}
        <div className="flex items-center gap-2">
          {providers.map((provider) => (
            <div key={provider.id} className="relative group">
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100">
                {provider.logo_url ? (
                  <Image
                    src={provider.logo_url}
                    alt=""
                    width={44}
                    height={44}
                    unoptimized
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
                    styles.initial,
                    "w-full h-full flex items-center justify-center font-semibold",
                    provider.logo_url && "hidden",
                  )}
                >
                  {provider.business_name.charAt(0)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeProvider(provider.id)}
                aria-label={`Remove ${provider.business_name} from comparison`}
                className="absolute inset-0 grid h-11 w-11 place-items-center bg-black/60 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 rounded-lg"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}

        </div>

        {/* Compare Count */}
        <div className="text-xs whitespace-nowrap text-gray-600" role="status">
          <span className="font-semibold text-gray-900">
            {providers.length}
          </span>{" "}
          of 3
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            ref={compare}
            onClick={() => setShowModal(true)}
            disabled={providers.length < 2}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 px-2.5 rounded-lg font-medium text-sm transition-colors",
              providers.length >= 2
                ? "bg-[#103f34] text-white hover:bg-[#15604e]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
            )}
          >
            <Scale className="hidden w-4 h-4 sm:block" aria-hidden="true" />
            Compare
          </button>

          <button
            type="button"
            onClick={clearAll}
            className="grid min-h-11 min-w-11 place-items-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Clear all"
            aria-label="Clear comparison"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Comparison Modal */}
      {showModal && (
        <CompareModal
          providers={providers}
          onClose={() => {
            setShowModal(false);
            requestAnimationFrame(() => compare.current?.focus());
          }}
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
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const panel = dialog.current;
    panel?.showModal();
    return () => panel?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
    >
      <header className={styles.header}>
        <h2 id={titleId}>Compare your picks</h2>
        <button type="button" aria-label="Close comparison" onClick={onClose} className={styles.dismiss}>
          <X size={21} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.content}>
        <ul className={styles.picks} data-count={providers.length} aria-label="Selected providers" role="list">
          {providers.map((provider) => <ProviderPick key={provider.id} provider={provider} />)}
        </ul>

        <details className={styles.more}>
          <summary>More details <ChevronDown size={17} aria-hidden="true" /></summary>
          <ul className={styles.picks} data-count={providers.length} aria-label="Provider details" role="list">
            {providers.map((provider) => <li key={provider.id}><ProviderDetails provider={provider} /></li>)}
          </ul>
        </details>
      </div>
    </dialog>
  );
}

function ProviderPick({ provider }: { provider: ServiceProviderCardData }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const photo = provider.service_image_urls?.[0] || provider.cover_photo_url;
  const areas = provider.service_areas ?? [];
  const pricing = formatServicePrice(provider.min_price, (provider.price_type ?? "fixed") as PriceType);
  const hasPrice = pricing !== "Get Quote";
  const hasRating = typeof provider.rating_average === "number" && provider.rating_average > 0;

  return (
    <li className={styles.pick}>
      {photo && photo !== failedPhoto && (
        <div className={styles.photo}>
          <Image src={photo} alt="" fill sizes="(max-width: 590px) 160px, 250px" unoptimized
            onError={() => setFailedPhoto(photo)} />
        </div>
      )}

      <div className={styles.pickBody}>
        <h3>{provider.business_name}</h3>
        {provider.is_verified && <p className={styles.verified}><HomeIcon name="shield" size={15} /> ID verified</p>}

        <div className={styles.essentials}>
          <p className={styles.price}>{hasPrice && <span>From </span>}{hasPrice ? pricing : "Ask for a quote"}</p>
          <p className={styles.rating}>
            {hasRating ? (
              <>
                <Star size={15} aria-hidden="true" />
                <strong>{provider.rating_average?.toFixed(1)}<span className="sr-only"> out of 5 stars</span></strong>
                {Boolean(provider.rating_count) && <span>({provider.rating_count} {provider.rating_count === 1 ? "review" : "reviews"})</span>}
              </>
            ) : "No reviews yet"}
          </p>
          <p className={styles.area}>
            <HomeIcon name="pin" size={17} />
            <span>{areas.length ? areas.slice(0, 2).join(", ") : "Ask about your area"}{areas.length > 2 ? " +" + (areas.length - 2) : ""}</span>
          </p>
        </div>
      </div>

      <Link href={"/services/provider/" + encodeURIComponent(provider.id)} className={styles.profile}
        aria-label={"View profile for " + provider.business_name}>
        View profile <HomeIcon name="arrow" size={16} />
      </Link>
    </li>
  );
}

function ProviderDetails({ provider }: { provider: ServiceProviderCardData }) {
  const categories = (provider.categories ?? []).map((category) => getCategoryById(category)?.name ?? category);
  const services = provider.service_names?.length ? provider.service_names : categories;
  const areas = provider.service_areas ?? [];
  const membership = provider.tier ? TIER_CONFIG[provider.tier]?.badge : null;

  return (
    <div className={styles.detail}>
      <h3>{provider.business_name}</h3>
      <dl>
        {Boolean(services.length) && <div><dt>Services</dt><dd>{services.join(", ")}</dd></div>}
        {areas.length > 2 && <div><dt>All service areas</dt><dd>{areas.join(", ")}</dd></div>}
        <div><dt>Booking</dt><dd>{canInstantBook(provider) ? "Instant booking" : "Contact to arrange"}</dd></div>
        <div><dt>Response time</dt><dd>{getResponseTimeLabel(provider.response_time_minutes)}</dd></div>
        {provider.total_jobs_completed != null && <div><dt>Jobs completed</dt><dd>{provider.total_jobs_completed.toLocaleString("en-KE")}</dd></div>}
        {membership && <div><dt>MitaSafi plan</dt><dd>{membership}</dd></div>}
      </dl>
    </div>
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
      type="button"
      onClick={handleClick}
      disabled={isFull}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? "Remove from comparison" : "Compare"} ${provider.business_name}`}
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
      <Scale className="w-4 h-4" aria-hidden="true" />
      {isSelected ? "Selected" : "Compare"}
    </button>
  );
}
