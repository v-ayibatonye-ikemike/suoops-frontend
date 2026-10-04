import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SuoOps — The commerce operating system for African business";

async function logoDataUri(): Promise<string | null> {
  try {
    const logo = await readFile(new URL("./icon.png", import.meta.url));
    return `data:image/png;base64,${logo.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const logo = await logoDataUri();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background:
            "linear-gradient(135deg, #0B3318 0%, #0f2a1a 55%, #0a1f14 100%)",
          fontFamily: "sans-serif",
          padding: "64px",
        }}
      >
        {/* Logo + wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "36px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "96px",
              height: "96px",
              borderRadius: "24px",
              background: logo ? "rgba(255,255,255,0.08)" : "#14B56A",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="SuoOps" width={64} height={64} />
            ) : (
              <div style={{ fontSize: "52px", fontWeight: 700, color: "#ffffff" }}>
                S
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: "68px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-2px",
            }}
          >
            SuoOps
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            fontSize: "56px",
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            maxWidth: "1000px",
            lineHeight: 1.15,
          }}
        >
          <span>Sell, get paid &amp; run everything&nbsp;</span>
          <span style={{ color: "#BFF74A" }}>— all in one place</span>
        </div>

        {/* Captivating hook: buyer protection */}
        <div
          style={{
            fontSize: "26px",
            color: "#E8F5EC",
            textAlign: "center",
            maxWidth: "860px",
            marginTop: "20px",
            lineHeight: 1.35,
          }}
        >
          Buyer-protected commerce for African business, with storefronts and
          built-in courier delivery.
        </div>

        {/* Pillar badges */}
        <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
          {["🛍️ Storefront", "🚚 Delivery", "🛡️ Buyer Protection"].map(
            (tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  background: "rgba(20, 181, 106, 0.18)",
                  border: "1px solid rgba(20, 181, 106, 0.45)",
                  borderRadius: "999px",
                  padding: "10px 24px",
                  fontSize: "22px",
                  color: "#14B56A",
                }}
              >
                {tag}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
