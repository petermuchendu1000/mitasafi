/**
 * Service Search Autocomplete Component
 *
 * Fiverr-style intelligent search with:
 * - Real-time autocomplete suggestions
 * - Service/category/provider matching
 * - Recent searches (localStorage)
 * - Popular searches
 * - Keyboard navigation
 * - Debounced API calls for performance
 *
 * Design: Search-first UX pattern
 */

"use client";

import { useState, useEffect, useRef, useCallback, useMemo, useId, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/lib/analytics/use-analytics";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { createArrayStore } from "@/lib/browser-storage/local-store";
import { useLocalStore } from "@/lib/browser-storage/useLocalStore";

// =============================================================================
// TYPES
// =============================================================================

interface SearchSuggestion {
  id: string;
  type: "service" | "category" | "subcategory" | "provider" | "popular";
  text: string;
  subtext?: string;
  categoryId?: string;
  url?: string;
}

interface ServiceSearchAutocompleteProps {
  className?: string;
  variant?: "hero" | "navbar" | "filter" | "browse";
  placeholder?: string;
  autoFocus?: boolean;
  onSearch?: (query: string) => void;
  showPopularOnFocus?: boolean;
}

/**
 * Recent searches, owned by one store at module scope.
 *
 * Module scope is not a style choice: useLocalStore hands these three functions to
 * useSyncExternalStore, which resubscribes whenever their identity changes, so the
 * store has to outlive a render. Creating it inside the component would resubscribe on
 * every commit.
 *
 * Any mounted search boxes share this store, so edits in one are reflected in the others.
 */
const recentServiceSearchesStore = createArrayStore<string>(
  "mitasafi_recent_service_searches",
  (value): value is string => typeof value === "string",
);
const MAX_RECENT_SEARCHES = 5;

/** Stable identity for "no suggestions"; see the derivation in the component. */
const EMPTY_SUGGESTIONS: SearchSuggestion[] = [];

// Popular searches (can be fetched from API in production)
const POPULAR_SEARCHES: SearchSuggestion[] = [
  {
    id: "pop-1",
    type: "popular",
    text: "House Cleaning",
    subtext: "Most searched",
  },
  { id: "pop-2", type: "popular", text: "Office Moving", subtext: "Trending" },
  {
    id: "pop-3",
    type: "popular",
    text: "Plumber",
    subtext: "Emergency available",
  },
  {
    id: "pop-4",
    type: "popular",
    text: "Interior Painting",
    subtext: "Popular",
  },
  { id: "pop-5", type: "popular", text: "AC Repair", subtext: "24/7 service" },
];

// Animated placeholder texts for hero variant — guided discovery
const HERO_PLACEHOLDER_TEXTS = [
  "Try \u2018house cleaning\u2019 in Westlands\u2026",
  "Find a plumber near you\u2026",
  "Search \u2018office moving\u2019 services\u2026",
  "Look for \u2018AC repair\u2019 nearby\u2026",
  "Try \u2018laundry service\u2019 in Kilimani\u2026",
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Record a search, most recent first, case-insensitively de-duplicated.
 *
 * The three hand-rolled helpers this replaces each did their own SSR guard, their own
 * try/catch and their own JSON handling; the store does all three once. The write also
 * notifies now, which is what lets a second search box on the same page see it.
 */
function saveRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const recent = recentServiceSearchesStore.read();
  const filtered = recent.filter(
    (s) => s.toLowerCase() !== trimmed.toLowerCase(),
  );
  recentServiceSearchesStore.write(
    [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES),
  );
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// SUGGESTION ITEM COMPONENT
// =============================================================================

const SuggestionItem = memo(function SuggestionItem({
  suggestion,
  isActive,
  onClick,
}: {
  suggestion: SearchSuggestion;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
        isActive ? "bg-brand-50" : "hover:bg-gray-50",
      )}
    >
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium truncate",
            isActive ? "text-brand-700" : "text-gray-900",
          )}
        >
          {suggestion.text}
        </p>
        {suggestion.subtext && (
          <p className="text-sm text-gray-500 truncate">{suggestion.subtext}</p>
        )}
      </div>
    </button>
  );
});

// =============================================================================
// RECENT SEARCH ITEM COMPONENT
// =============================================================================

const RecentSearchItem = memo(function RecentSearchItem({
  query,
  isActive,
  onClick,
  onRemove,
}: {
  query: string;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors group",
        isActive ? "bg-brand-50" : "hover:bg-gray-50",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex-1 flex items-center gap-3 text-left min-w-0"
      >
        <span
          className={cn(
            "font-medium truncate",
            isActive ? "text-brand-700" : "text-gray-700",
          )}
        >
          {query}
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
        aria-label="Remove from recent searches"
      >
        <span className="text-sm leading-none" aria-hidden="true">
          &times;
        </span>
      </button>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ServiceSearchAutocomplete({
  className,
  variant = "hero",
  placeholder = "Search for services (e.g., movers, cleaners, plumbers...)",
  autoFocus = false,
  onSearch,
  showPopularOnFocus = true,
}: ServiceSearchAutocompleteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const suggestionsId = useId();
  const { track, logSearch } = useAnalytics();

  // State
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // What the last completed fetch returned. Read through `suggestions` below, never
  // directly: with no query there is nothing to suggest, and that is derivable.
  const [fetchedSuggestions, setFetchedSuggestions] = useState<
    SearchSuggestion[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Recent searches come from localStorage, which is an external store, so they are
  // read through one instead of being copied into state by a mount effect. That effect
  // was `setRecentSearches(getRecentSearches())`, and it cost a render on every mount
  // of every search box on the page.
  const recentSearches = useLocalStore(recentServiceSearchesStore);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced query for API calls
  const debouncedQuery = useDebounce(query, 200);

  // Cycle hero placeholder text for guided discovery
  useEffect(() => {
    if (variant !== "hero" || query) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % HERO_PLACEHOLDER_TEXTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [variant, query]);

  // Generate suggestions from categories (instant, no API)
  const categorySuggestions = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const q = debouncedQuery.toLowerCase();
    const results: SearchSuggestion[] = [];

    // Match categories
    SERVICE_CATEGORIES.forEach((cat) => {
      if (
        cat.name.toLowerCase().includes(q) ||
        cat.shortName.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q)
      ) {
        results.push({
          id: `cat-${cat.id}`,
          type: "category",
          text: cat.name,
          subtext: cat.description,
          categoryId: cat.id,
        });
      }
    });

    return results.slice(0, 3);
  }, [debouncedQuery]);

  // With no query there is nothing to suggest. Derived, so there is no render in which
  // the box is empty and the previous query's suggestions are still in state.
  //
  // The effect below opened with `setSuggestions([])` on an empty query: a render, a
  // state write, then another render, to reach a constant. EMPTY_SUGGESTIONS is shared
  // rather than a fresh [] so that `suggestions` keeps a stable identity across those
  // renders — handleKeyDown takes it as a dependency.
  const suggestions = debouncedQuery.trim()
    ? fetchedSuggestions
    : EMPTY_SUGGESTIONS;

  // Fetch service suggestions from API
  useEffect(() => {
    if (!debouncedQuery.trim()) return;

    let cancelled = false;

    async function fetchSuggestions() {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/services/search/suggestions?q=${encodeURIComponent(debouncedQuery)}&limit=5`,
        );

        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();

        if (!cancelled) {
          // Combine category suggestions with API results
          const apiSuggestions: SearchSuggestion[] = (
            data.suggestions || []
          ).map(
            (s: {
              id: string;
              type: string;
              name: string;
              categoryName?: string;
            }) => ({
              id: s.id,
              type: s.type as SearchSuggestion["type"],
              text: s.name,
              subtext: s.categoryName,
            }),
          );

          // Merge and deduplicate
          const combined = [...categorySuggestions, ...apiSuggestions];
          const unique = combined.filter(
            (item, index, self) =>
              index ===
              self.findIndex(
                (t) => t.text.toLowerCase() === item.text.toLowerCase(),
              ),
          );

          setFetchedSuggestions(unique.slice(0, 8));
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        if (!cancelled) {
          // Fallback to category suggestions only
          setFetchedSuggestions(categorySuggestions);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchSuggestions();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, categorySuggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle search execution
  const executeSearch = useCallback(
    (searchQuery: string, categoryId?: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed && !categoryId && !(variant === "browse" && searchParams.get("q"))) return;

      // Save to recent searches. The store write notifies, so the second line that
      // used to re-read storage into state is gone.
      if (trimmed) {
        saveRecentSearch(trimmed);
      }

      // Analytics: log the search query
      if (trimmed) {
        logSearch(trimmed, suggestions.length, categoryId);
        track("search", {
          query: trimmed,
          category: categoryId,
          results_count: suggestions.length,
        });
      }

      // Build search URL
      const params = new URLSearchParams(variant === "browse" ? searchParams.toString() : "");
      params.delete("page");
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      if (categoryId) {
        if (params.get("category") !== categoryId) {
          params.delete("subcategory");
          params.delete("services");
        }
        params.set("category", categoryId);
      }

      // Navigate
      router.push(params.size ? `/services/browse?${params}` : "/services/browse");

      // Callback
      onSearch?.(trimmed);

      // Close dropdown
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [router, onSearch, logSearch, track, suggestions.length, searchParams, variant],
  );

  // Handle form submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      executeSearch(query);
    },
    [query, executeSearch],
  );

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (suggestion: SearchSuggestion) => {
      if (suggestion.type === "provider") {
        // Navigate directly to provider detail page
        setIsOpen(false);
        setActiveIndex(-1);
        router.push(`/services/provider/${suggestion.id}`);
      } else if (suggestion.type === "category") {
        executeSearch("", suggestion.categoryId);
      } else {
        executeSearch(suggestion.text, suggestion.categoryId);
      }
    },
    [executeSearch, router],
  );

  // Handle recent search click
  const handleRecentClick = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      executeSearch(searchQuery);
    },
    [executeSearch],
  );

  // Handle recent search removal
  const handleRemoveRecent = useCallback(
    (searchQuery: string) => {
      recentServiceSearchesStore.write(
        recentSearches.filter(
          (s) => s.toLowerCase() !== searchQuery.toLowerCase(),
        ),
      );
    },
    [recentSearches],
  );

  // Handle clear all recent
  const handleClearAllRecent = useCallback(() => {
    recentServiceSearchesStore.clear();
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems =
        suggestions.length +
        (query
          ? 0
          : recentSearches.length +
            (showPopularOnFocus ? POPULAR_SEARCHES.length : 0));

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0) {
            if (query && activeIndex < suggestions.length) {
              handleSuggestionClick(suggestions[activeIndex]);
            } else if (!query && activeIndex < recentSearches.length) {
              handleRecentClick(recentSearches[activeIndex]);
            } else if (!query && showPopularOnFocus) {
              const popularIndex = activeIndex - recentSearches.length;
              if (popularIndex < POPULAR_SEARCHES.length) {
                handleSuggestionClick(POPULAR_SEARCHES[popularIndex]);
              }
            }
          } else {
            executeSearch(query);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setActiveIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [
      suggestions,
      recentSearches,
      query,
      activeIndex,
      showPopularOnFocus,
      handleSuggestionClick,
      handleRecentClick,
      executeSearch,
    ],
  );

  // Determine what to show in dropdown
  const showDropdown =
    isOpen && (query.trim() || recentSearches.length > 0 || showPopularOnFocus);

  const showSuggestions = query.trim() && suggestions.length > 0;
  const showRecent = !query.trim() && recentSearches.length > 0;
  const showPopular = !query.trim() && showPopularOnFocus;

  // Variant styles
  const variantStyles = {
    hero: {
      container: "w-full",
      input: "pl-14 pr-32 py-4 text-base rounded-2xl shadow-lg",
      button: "px-6 py-2.5 rounded-xl",
      dropdown: "mt-2 rounded-2xl shadow-2xl",
    },
    navbar: {
      container: "w-full max-w-md",
      input: "pl-10 pr-4 py-2.5 text-sm rounded-xl",
      button: "hidden",
      dropdown: "mt-1 rounded-xl shadow-lg",
    },
    filter: {
      container: "w-full",
      input: "pl-10 pr-4 py-2.5 text-sm rounded-lg",
      button: "hidden",
      dropdown: "mt-1 rounded-lg shadow-lg",
    },
    browse: {
      container: "w-full",
      input: "pl-10 pr-[7.3rem] min-h-14 text-base rounded-[10px]",
      button: "min-h-11 px-3 rounded-lg",
      dropdown: "mt-2 rounded-[10px]",
    },
  };

  const styles = variantStyles[variant];
  const showSubmit = variant === "hero" || variant === "browse";

  return (
    <div
      ref={containerRef}
      className={cn("relative", styles.container, className)}
    >
      <form onSubmit={handleSubmit} role="search" aria-label={variant === "browse" ? "Search home services" : undefined}>
        <div className="relative">
          {/* Search Icon */}
          <Search
            aria-hidden="true"
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-gray-400",
              variant === "hero" ? "left-5 w-5 h-5" : "left-3 w-4 h-4",
            )}
          />

          {/* Input */}
          <input
            ref={inputRef}
            type={variant === "browse" ? "search" : "text"}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              variant === "hero" && !query
                ? HERO_PLACEHOLDER_TEXTS[placeholderIndex]
                : placeholder
            }
            autoFocus={autoFocus}
            className={cn(
              "w-full bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
              "transition-all",
              styles.input,
            )}
            aria-label="Search services"
            aria-controls={showDropdown ? suggestionsId : undefined}
            enterKeyHint="search"
            autoComplete="off"
          />

          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFetchedSuggestions(EMPTY_SUGGESTIONS);
                inputRef.current?.focus();
              }}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors",
                variant === "browse" ? "right-[4.9rem] min-h-11 min-w-11 grid place-items-center" : variant === "hero" ? "right-28" : "right-3",
              )}
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Loading Indicator */}
          {isLoading && query && variant !== "browse" && (
            <Loader2
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500 animate-spin",
                variant === "hero" ? "right-36" : "right-10",
              )}
            />
          )}

          {/* Search Button (hero variant only) */}
          {showSubmit && (
            <button
              type="submit"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2",
                variant === "browse" ? "bg-[#103f34] hover:bg-[#15604e] text-white font-semibold text-sm transition-colors"
                  : "bg-brand-700 hover:bg-brand-800 text-white font-medium transition-colors shadow-md",
                styles.button,
              )}
            >
              Search
            </button>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div
          id={suggestionsId}
          data-part="suggestions"
          className={cn(
            "absolute left-0 right-0 bg-white border border-gray-200 overflow-hidden z-50",
            styles.dropdown,
          )}
          role="group"
          aria-label="Search suggestions"
        >
          {/* Suggestions (when typing) */}
          {showSuggestions && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <SuggestionItem
                  key={suggestion.id}
                  suggestion={suggestion}
                  isActive={activeIndex === index}
                  onClick={() => handleSuggestionClick(suggestion)}
                />
              ))}
            </div>
          )}

          {/* No results message */}
          {query.trim() && !isLoading && suggestions.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">
                No services found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {/* Recent Searches (when not typing) */}
          {showRecent && (
            <div>
              <div className="px-4 py-2 flex items-center justify-between bg-gray-50">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={handleClearAllRecent}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  Clear all
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <RecentSearchItem
                  key={`recent-${search}`}
                  query={search}
                  isActive={activeIndex === index}
                  onClick={() => handleRecentClick(search)}
                  onRemove={() => handleRemoveRecent(search)}
                />
              ))}
            </div>
          )}

          {/* Popular Searches (when not typing) */}
          {showPopular && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                Popular Searches
              </div>
              {POPULAR_SEARCHES.map((suggestion, index) => (
                <SuggestionItem
                  key={suggestion.id}
                  suggestion={variant === "browse" ? { ...suggestion, subtext: undefined } : suggestion}
                  isActive={activeIndex === recentSearches.length + index}
                  onClick={() => handleSuggestionClick(suggestion)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
