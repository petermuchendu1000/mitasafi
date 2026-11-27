/**
 * Listing Landlord Card Component
 * 
 * Displays landlord information with:
 * - Avatar and name
 * - Verification badge
 * - Response time (future)
 * - Properties count (future)
 * 
 * Theme: 70% Teal, 30% Orange
 */

"use client";

import Image from "next/image";
import { User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LandlordInfo } from "@/lib/listings/types";

interface ListingLandlordProps {
  landlord: LandlordInfo | undefined;
  className?: string;
}

export function ListingLandlord({ landlord, className }: ListingLandlordProps) {
  // Mask name for privacy (show first name + last initial)
  const displayName = landlord?.full_name 
    ? maskName(landlord.full_name)
    : "Property Owner";

  return (
    <div className={cn(
      "bg-white rounded-[10px] border border-gray-200 p-4",
      className
    )}>
      <p className="text-sm font-medium text-gray-600 mb-3">Listed by</p>
      
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
          {landlord?.avatar_url ? (
            <Image
              src={landlord.avatar_url}
              alt=""
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-400" />
            </div>
          )}
          
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{displayName}</p>
          {landlord?.is_verified && (
            <p className="text-xs text-brand-700 flex items-center gap-1">
              <Shield className="w-3 h-3" aria-hidden="true" />
              Verified landlord
            </p>
          )}
        </div>
      </div>

    </div>
  );
}

// Helper to mask full name for privacy
function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "Property Owner";
  if (parts.length === 1) return parts[0];
  
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  
  return `${firstName} ${lastInitial}.`;
}

export default ListingLandlord;
