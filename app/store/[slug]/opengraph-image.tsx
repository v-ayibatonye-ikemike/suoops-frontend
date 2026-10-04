import { ImageResponse } from "next/og";

import { getConfig } from "@/lib/config";

export const alt = "Shop safely on SuoOps — buyer protection included";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type StoreOg = {
  business_name: string | null;
  logo_url: string | null;
  location: { city: string | null; state: string | null } | null;
};

async function fetchStore(slug: string): Promise<StoreOg | null> {
  try {
    const { apiBaseUrl } = getConfig();
    const res = await fetch(
      `${apiBaseUrl}/public/store/${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as StoreOg;
  } catch {
    return null;
  }
}

export default async function StoreOgImage({
  params,
}: {
  params: { slug: string };
}) {
  const store = await fetchStore(params.slug);
  const name = store?.business_name || "SuoOps Shop";
  const initial = name[0]?.toUpperCase() ?? "S";
  const loc = [store?.location?.city, store?.location?.state]
    .filter(Boolean)
    .join(", ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0B3318 0%, #0f2a1a 55%, #0a1f14 100%)",
          fontFamily: "sans-serif",
          padding: "64px",
        }}
      >
        {/* Shop identity */}
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "132px",
              height: "132px",
              borderRadius: "28px",
              background: "#ffffff",
              overflow: "hidden",
            }}
          >
            {store?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logo_url}
                alt={name}
                width={132}
                height={132}
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  fontSize: "64px",
                  fontWeight: 700,
                  color: "#0B3318",
                }}
              >
                {initial}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                fontSize: "58px",
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.1,
                maxWidth: "820px",
              }}
            >
              {name}
            </div>
            {loc ? (
              <div style={{ fontSize: "26px", color: "#9fd9b6" }}>📍 {loc}</div>
            ) : null}
          </div>
        </div>

        {/* Buyer-protection hook */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              fontSize: "44px",
              fontWeight: 700,
              color: "#BFF74A",
            }}
          >
            🛡️ Buy safely — protected by SuoOps
          </div>
          <div style={{ fontSize: "28px", color: "#E8F5EC", maxWidth: "980px" }}>
            Payment protection through delivery on eligible orders.
          </div>
        </div>

        {/* Footer wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "26px",
            color: "#ffffff",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://suoops.com/icon.png" alt="SuoOps" width={40} height={40} />
          <span style={{ fontWeight: 700 }}>SuoOps</span>
          <span style={{ color: "#9fd9b6" }}>· the marketplace you can trust</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
