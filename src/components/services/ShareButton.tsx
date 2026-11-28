/**
 * Share Button — Client Component
 * 
 * Uses Web Share API with clipboard fallback.
 * Used in the provider detail page nav bar.
 */

"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  className?: string;
  itemLabel?: "profile" | "service";
}

export function ShareButton({ title, text, url, className, itemLabel = "profile" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);

  async function handleShare() {
    setCopied(false);
    setShowLink(false);
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setShowLink(true);
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={handleShare} className={cn("flex min-h-11 items-center gap-1.5 text-sm", className)}>
        <Share2 size={17} aria-hidden="true" />
        <span>{copied ? "Link copied" : "Share"}</span>
      </button>
      <span role="status" className="sr-only">{copied ? (itemLabel === "profile" ? "Profile link copied" : "Service link copied") : ""}</span>
      {showLink && (
        <label className="absolute right-0 top-full z-10 grid max-w-[85vw] w-64 gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm">
          Copy {itemLabel} link
          <input type="url" readOnly value={url} onFocus={(event) => event.target.select()} className="min-h-11 min-w-0 rounded-md border border-gray-300 px-2 text-base" />
        </label>
      )}
    </div>
  );
}
