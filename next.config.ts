import type { NextConfig } from "next";

/**
 * Host of the configured Supabase project, for the image allowlist.
 *
 * This used to be the literal string "syoolvgoaqnckgmngvse.supabase.co" — a
 * project that no longer exists. Next refuses to optimise a remote image whose
 * host is not listed here, so pinning the host in source meant that moving
 * Supabase projects broke every image with a 500 and nothing pointed at the
 * cause. Deriving it from NEXT_PUBLIC_SUPABASE_URL, which the app already
 * requires, keeps the allowlist in step with the database by construction.
 *
 * Falls back to a wildcard-free empty list rather than guessing: an unset
 * variable should fail loudly at image load, not silently allow every host.
 */
const supabaseHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // Emit .next/standalone: a self-contained server with only the node_modules
  // it actually imports. The container copies that instead of the whole
  // dependency tree, which is what keeps the runtime image small.
  output: "standalone",

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    qualities: [75, 90],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
