/**
 * Share Button — Client Component
 * 
 * Uses Web Share API with clipboard fallback.
 * Used in the provider detail page nav bar.
 */

"use client";

import { useCallback } from "react";
import { Share2 } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
}

export function ShareButton({ title, text, url }: ShareButtonProps) {
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        // Optionally show a toast here
      } catch {
        // Clipboard failed silently
      }
    }
  }, [title, text, url]);

  return (
    <button
      onClick={handleShare}
      className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5"
    >
      <Share2 className="w-4 h-4" />
      <span className="hidden sm:inline">Share</span>
    </button>
  );
}
