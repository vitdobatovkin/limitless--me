import { ImageResponse } from "next/og";

export const runtime = "edge";

function safe(s: string, max = 120) {
  const t = (s || "").toString().replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function handleToSlug(handle: string) {
  const h = (handle || "").trim();
  const noAt = h.replace(/^@/, "");
  return noAt ? noAt : "default";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const handleRaw = searchParams.get("handle") || "@someone";
    const bioRaw = searchParams.get("bio") || "How limitless are you?";

    const handle = safe(handleRaw, 36);
    const bio = safe(bioRaw, 120);

    const slug = handleToSlug(handleRaw);

    // Абсолютный URL до локального файла в public/avatars
    let img = new URL(`/avatars/${slug}.png`, req.url).toString();

    // Если файла нет — fallback
    const head = await fetch(img, { method: "HEAD" });
    if (!head.ok) {
      img = new URL("/avatars/default.png", req.url).toString();
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            fontFamily: "system-ui",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "rgba(10,10,10,.55)",
              marginBottom: 18,
            }}
          >
            CONGRATULATIONS
          </div>

          <img
            src={img}
            width={200}
            height={200}
            style={{
              borderRadius: 44,
              border: "1px solid rgba(10,10,10,.10)",
              marginBottom: 22,
            }}
          />

          <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: -1, color: "#0A0B0D" }}>
            {handle}
          </div>

          <div style={{ marginTop: 10, fontSize: 28, color: "rgba(10,10,10,.55)", textAlign: "center" }}>
            {bio}
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e) {
    return new Response("OG error", { status: 500 });
  }
}
