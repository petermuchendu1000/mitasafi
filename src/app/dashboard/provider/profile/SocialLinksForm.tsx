/**
 * Social Links Form
 *
 * Allows providers to add their social media handles.
 * Shows URL prefixes so users only need to type the handle/username part.
 * Displayed as the last step in the profile setup wizard.
 */

"use client";

import { useState, useTransition } from "react";
import { ChevronLeft } from "lucide-react";
import { updateSocialLinks } from "./actions";
import { SOCIAL_PLATFORMS, type SocialLinks, type SocialPlatformKey } from "@/types/provider-profile";
import { SOCIAL_ICON_MAP, SOCIAL_COLOR_MAP } from "@/components/ui/SocialIcons";

interface SocialLinksFormProps {
  initialData: SocialLinks;
  onComplete: () => void;
  onBack: () => void;
}

/**
 * Extract just the handle/username from a full URL for a given platform.
 * e.g. "https://instagram.com/myhandle" → "myhandle"
 */
function extractHandle(fullUrl: string | undefined, prefix: string, isWebsite: boolean): string {
  if (!fullUrl) return "";
  const trimmed = fullUrl.trim();
  if (!trimmed) return "";

  // For website, strip protocol and return the rest
  if (isWebsite) {
    return trimmed.replace(/^https?:\/\//, "");
  }

  // Strip protocol first
  let clean = trimmed.replace(/^https?:\/\//, "");
  // Strip www.
  clean = clean.replace(/^www\./, "");
  // Strip the prefix (e.g. "instagram.com/")
  const barePrefix = prefix.replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (clean.toLowerCase().startsWith(barePrefix.toLowerCase())) {
    clean = clean.slice(barePrefix.length);
  }
  // Strip leading/trailing slashes
  clean = clean.replace(/^\/+|\/+$/g, "");
  // Strip leading @
  clean = clean.replace(/^@/, "");

  return clean;
}

export function SocialLinksForm({
  initialData,
  onComplete,
  onBack,
}: SocialLinksFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Initialize handles by extracting from full URLs
  const [handles, setHandles] = useState<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    for (const platform of SOCIAL_PLATFORMS) {
      result[platform.key] = extractHandle(
        initialData[platform.key as keyof SocialLinks],
        platform.prefix,
        platform.fullUrl
      );
    }
    return result;
  });

  const handleChange = (key: string, value: string) => {
    setHandles((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Build full URLs from handles
    const fullLinks: SocialLinks = {};
    for (const platform of SOCIAL_PLATFORMS) {
      const handle = handles[platform.key]?.trim();
      if (!handle) continue;

      if (platform.fullUrl) {
        // Website: prepend https:// if missing
        const url = handle.startsWith("http://") || handle.startsWith("https://")
          ? handle
          : `https://${handle}`;
        fullLinks[platform.key as keyof SocialLinks] = url;
      } else {
        // Social platforms: build full URL from prefix + handle
        fullLinks[platform.key as keyof SocialLinks] = `https://${platform.prefix}${handle}`;
      }
    }

    startTransition(async () => {
      const result = await updateSocialLinks(fullLinks);

      if (result.success) {
        onComplete();
      } else {
        setError(result.error || "Failed to save");
      }
    });
  };

  const filledCount = Object.values(handles).filter((v) => v?.trim()).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Social Media & Website
        </h2>
        <p className="text-gray-500 text-sm">
          Help clients find and follow you online. All fields are optional.
        </p>
      </div>

      <div className="space-y-4">
        {SOCIAL_PLATFORMS.map((platform) => {
          const Icon = SOCIAL_ICON_MAP[platform.key as SocialPlatformKey];
          const colorClass = SOCIAL_COLOR_MAP[platform.key as SocialPlatformKey];
          return (
            <div key={platform.key}>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                {Icon && <Icon className={`w-4 h-4 ${colorClass}`} />}
                {platform.label}
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500 select-none whitespace-nowrap">
                  {platform.prefix}
                </span>
                <input
                  type="text"
                  value={handles[platform.key] || ""}
                  onChange={(e) => handleChange(platform.key, e.target.value)}
                  placeholder={platform.placeholder}
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          );
        })}
      </div>

      {filledCount > 0 && (
        <p className="text-xs text-gray-400">
          {filledCount} link{filledCount !== 1 ? "s" : ""} added
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving..." : filledCount > 0 ? "Continue" : "Skip"}
        </button>
      </div>
    </form>
  );
}
