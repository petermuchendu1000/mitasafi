import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const alt = "Service Provider on MitaSafi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic OG image for provider detail pages.
 * Falls back to a branded generic image when the provider has no
 * profile photo or when the provider cannot be fetched.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Attempt to fetch basic provider info for the OG image
  let businessName = "Service Provider";
  let tagline = "Verified professional on MitaSafi";
  let rating: number | null = null;
  let totalReviews: number | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("service_providers")
      .select("business_name, tagline, average_rating, total_reviews")
      .eq("id", id)
      .eq("account_status", "active")
      .maybeSingle();

    if (data) {
      businessName = data.business_name || businessName;
      tagline = data.tagline || tagline;
      rating = data.average_rating;
      totalReviews = data.total_reviews;
    }
  } catch {
    // Silently fall back to generic values
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(145deg, #0D9488 0%, #0F766E 50%, #134E4A 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Subtle pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              "radial-gradient(circle at 30% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 70%, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            padding: "0 80px",
            textAlign: "center",
            position: "relative",
          }}
        >
          {/* Avatar placeholder */}
          <div
            style={{
              width: "96px",
              height: "96px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "3px solid rgba(255,255,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "42px",
              fontWeight: 700,
              color: "white",
            }}
          >
            {businessName.charAt(0).toUpperCase()}
          </div>

          {/* Business name */}
          <h1
            style={{
              fontSize: "44px",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              margin: 0,
              maxWidth: "800px",
            }}
          >
            {businessName}
          </h1>

          {/* Tagline */}
          <p
            style={{
              fontSize: "20px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.4,
              margin: 0,
              maxWidth: "600px",
            }}
          >
            {tagline}
          </p>

          {/* Rating + Brand */}
          <div
            style={{
              display: "flex",
              gap: "32px",
              marginTop: "16px",
              alignItems: "center",
            }}
          >
            {rating != null && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 20px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <span
                  style={{ fontSize: "22px", fontWeight: 700, color: "#F97316" }}
                >
                  ★ {rating.toFixed(1)}
                </span>
                {totalReviews != null && (
                  <span
                    style={{
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: "#F97316",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "white",
                }}
              >
                M
              </div>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                MitaSafi
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
