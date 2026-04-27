import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MitaSafi — Find Trusted Service Providers in Nairobi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "linear-gradient(135deg, #0D9488 0%, #065F5B 60%, #042F2E 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Subtle pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.06,
            backgroundImage:
              "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            padding: "0 80px",
            textAlign: "center",
          }}
        >
          {/* Brand mark */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#F97316",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: 800,
                color: "white",
              }}
            >
              M
            </div>
            <span
              style={{
                fontSize: "36px",
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
              fontSize: "52px",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Find Trusted Service Providers
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: "24px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1.4,
              margin: 0,
              maxWidth: "700px",
            }}
          >
            Moving • Cleaning • Repairs • Interior • Security & more — verified
            pros in Nairobi
          </p>

          {/* Stats bar */}
          <div
            style={{
              display: "flex",
              gap: "40px",
              marginTop: "24px",
              padding: "16px 32px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {[
              { value: "700+", label: "Providers" },
              { value: "4.8★", label: "Avg Rating" },
              { value: "25+", label: "Categories" },
            ].map(({ value, label }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{ fontSize: "28px", fontWeight: 700, color: "#F97316" }}
                >
                  {value}
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.7)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
