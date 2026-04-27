import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MitaSafi — Trusted Home Services Across Nairobi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic OG image for the /services landing page.
 * Replaces the missing static /og/services.jpg with a branded
 * server-rendered image built at the edge.
 */
export default async function Image() {
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
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-40px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(249, 115, 22, 0.15)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-50px",
            width: "250px",
            height: "250px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            padding: "0 80px",
            textAlign: "center",
            position: "relative",
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "#F97316",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px",
                fontWeight: 800,
                color: "white",
              }}
            >
              M
            </div>
            <span
              style={{
                fontSize: "40px",
                fontWeight: 700,
                color: "white",
                letterSpacing: "-0.02em",
              }}
            >
              MitaSafi
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Home Services in Nairobi
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: "22px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1.4,
              margin: 0,
              maxWidth: "650px",
            }}
          >
            Find verified plumbers, electricians, cleaners & 700+ service
            providers. Compare quotes, read reviews, book instantly.
          </p>

          {/* Service pills */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "16px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              "Cleaning",
              "Plumbing",
              "Electrical",
              "Moving",
              "Security",
              "Interior",
            ].map((svc) => (
              <div
                key={svc}
                style={{
                  padding: "8px 20px",
                  borderRadius: "20px",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                {svc}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
