import { ImageResponse } from "next/og";

export const runtime = "edge";

function safe(value: string, max = 120) {
  const clean = (value || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const handle = safe(searchParams.get("handle") || "@grok", 36);
  const name = safe(searchParams.get("name") || handle, 52);
  const bio = safe(searchParams.get("bio") || "", 130);
  const special = searchParams.get("special") === "elon";
  const slug = handle.replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "");
  const avatar = new URL(`/avatars/${slug || "default"}.webp`, req.url).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          position: "relative",
          overflow: "hidden",
          color: "#f5f7fb",
          background: special
            ? "radial-gradient(circle at 75% 30%, #3d4050 0%, #0a0b0e 42%, #030405 75%)"
            : "radial-gradient(circle at 75% 25%, #312a78 0%, #111628 37%, #050608 72%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.14,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, width: 710 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 20, fontWeight: 800, letterSpacing: 5 }}>
            <div
              style={{
                width: 42,
                height: 42,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,.35)",
                borderRadius: 40,
                color: special ? "#ffffff" : "#73fbd3",
              }}
            >
              G
            </div>
            GROK ME
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: special ? "#ffffff" : "#73fbd3", fontSize: 16, fontWeight: 800, letterSpacing: 5 }}>
              {special ? "ELON MODE ACTIVATED" : "YOUR GROK MATCH"}
            </div>
            <div style={{ marginTop: 14, fontSize: 66, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>
              {name}
            </div>
            <div style={{ marginTop: 10, color: "#a9afbb", fontSize: 28 }}>{handle}</div>
            {bio && (
              <div style={{ marginTop: 24, color: "#d9dde5", fontSize: 25, lineHeight: 1.35 }}>{bio}</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              width: 360,
              height: 360,
              border: `1px solid ${special ? "rgba(255,255,255,.28)" : "rgba(115,251,211,.28)"}`,
              borderRadius: 999,
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar}
            width={286}
            height={286}
            style={{
              borderRadius: 58,
              objectFit: "cover",
              border: `2px solid ${special ? "rgba(255,255,255,.85)" : "rgba(115,251,211,.72)"}`,
              boxShadow: "0 30px 90px rgba(0,0,0,.55)",
            }}
          />
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
