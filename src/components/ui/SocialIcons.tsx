/**
 * Social Media Icon Map
 *
 * Maps social platform keys to their brand icons from react-icons.
 * Used by SocialLinksForm (dashboard) and the public provider page.
 */

import {
  FaFacebook,
  FaInstagram,
  FaTiktok,
  FaXTwitter,
  FaLinkedinIn,
  FaYoutube,
  FaGlobe,
} from "react-icons/fa6";
import type { IconType } from "react-icons";
import type { SocialPlatformKey } from "@/types/provider-profile";

export const SOCIAL_ICON_MAP: Record<SocialPlatformKey, IconType> = {
  website: FaGlobe,
  facebook: FaFacebook,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  twitter: FaXTwitter,
  linkedin: FaLinkedinIn,
  youtube: FaYoutube,
};

/** Brand colors for each social platform */
export const SOCIAL_COLOR_MAP: Record<SocialPlatformKey, string> = {
  website: "text-gray-600",
  facebook: "text-[#1877F2]",
  instagram: "text-[#E4405F]",
  tiktok: "text-gray-900",
  twitter: "text-gray-900",
  linkedin: "text-[#0A66C2]",
  youtube: "text-[#FF0000]",
};

/** Hover/focus brand colors for interactive link lists */
export const SOCIAL_HOVER_COLOR_MAP: Record<SocialPlatformKey, string> = {
  website: "group-hover/social:text-gray-700 group-focus-visible/social:text-gray-700",
  facebook: "group-hover/social:text-[#1877F2] group-focus-visible/social:text-[#1877F2]",
  instagram: "group-hover/social:text-[#E4405F] group-focus-visible/social:text-[#E4405F]",
  tiktok: "group-hover/social:text-gray-900 group-focus-visible/social:text-gray-900",
  twitter: "group-hover/social:text-gray-900 group-focus-visible/social:text-gray-900",
  linkedin: "group-hover/social:text-[#0A66C2] group-focus-visible/social:text-[#0A66C2]",
  youtube: "group-hover/social:text-[#FF0000] group-focus-visible/social:text-[#FF0000]",
};
