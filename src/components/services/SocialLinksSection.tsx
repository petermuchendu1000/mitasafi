/**
 * Social Links Section (Client Component)
 *
 * Renders a provider's social media links with:
 * 1. Brand icons and colors (react-icons)
 * 2. Click tracking via navigator.sendBeacon() (Option 4)
 * 3. Fallback redirect URL if JS fails (Option 3)
 * 4. No noreferrer — destination sites see MitaSafi as referrer (Option 1)
 *
 * Used on the public provider profile page sidebar.
 */

"use client";

import { useCallback } from "react";
import { SOCIAL_HOVER_COLOR_MAP, SOCIAL_ICON_MAP } from "@/components/ui/SocialIcons";
import { ArrowUpRight } from "lucide-react";
import type { SocialPlatformKey } from "@/types/provider-profile";

interface SocialLinksSectionProps {
  providerId: string;
  socialEntries: [string, string][];  // [platform, url][]
  labelMap: Record<string, string>;
}

/**
 * Generate a short random ID for deduplication.
 * Uses crypto.randomUUID when available, falls back to timestamp+random.
 */
function generateSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function SocialLinksSection({
  providerId,
  socialEntries,
  labelMap,
}: SocialLinksSectionProps) {
  /**
   * Fire a tracking beacon on click.
   * sendBeacon is fire-and-forget — it won't delay navigation.
   */
  const trackClick = useCallback(
    (platform: string, url: string) => {
      try {
        const sessionId = generateSessionId();
        const payload = JSON.stringify({
          provider_id: providerId,
          platform,
          url,
          session_id: sessionId,
        });

        // Primary: sendBeacon (reliable even if page unloads)
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/social-click", blob);
        } else {
          // Fallback: fetch with keepalive
          fetch("/api/social-click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {
            // Swallow — tracking is non-critical
          });
        }
      } catch {
        // Never block the user's click
      }
    },
    [providerId]
  );

  /**
   * Build a redirect URL for the GET fallback.
   * If JS is disabled, the href itself goes through the redirect endpoint.
   * If JS is enabled, onClick fires the beacon and we use the direct URL.
   */
  const buildRedirectUrl = (platform: string, url: string): string => {
    const params = new URLSearchParams({
      provider_id: providerId,
      platform,
      url,
    });
    return `/api/social-click?${params.toString()}`;
  };

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    platform: string,
    directUrl: string
  ) => {
    // Fire the beacon
    trackClick(platform, directUrl);

    // Override the href to go directly to the destination URL
    // (the href is the redirect fallback for no-JS)
    e.preventDefault();
    window.open(directUrl, "_blank", "noopener");
  };

  if (socialEntries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <h3 className="text-sm font-semibold tracking-[-0.01em] text-slate-900 mb-4">Find online</h3>
      <div className="space-y-1.5">
        {socialEntries.map(([key, url]) => {
          const Icon = SOCIAL_ICON_MAP[key as SocialPlatformKey];
          const hoverColorClass = SOCIAL_HOVER_COLOR_MAP[key as SocialPlatformKey];
          return (
            <a
              key={key}
              href={buildRedirectUrl(key, url)}
              onClick={(e) => handleClick(e, key, url)}
              target="_blank"
              rel="noopener"
              aria-label={`Visit ${labelMap[key] || key}`}
              className="group/social flex items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-sm hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-slate-600 group-hover/social:text-slate-900 group-focus-visible/social:text-slate-900 transition-colors">
                <span className="w-7 h-7 rounded-lg border border-slate-200 bg-white grid place-items-center">
                  {Icon && <Icon className={`w-4 h-4 text-slate-400 transition-colors ${hoverColorClass}`} />}
                </span>
                {labelMap[key] || key}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover/social:text-teal-600 group-focus-visible/social:text-teal-600 transition-colors" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
