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
  const requestedScore = Number(searchParams.get("score"));
  const score = Number.isFinite(requestedScore)
    ? Math.min(99, Math.max(87, Math.round(requestedScore)))
    : 94;
  const slug = handle.replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "");
  const avatar = new URL(`/avatars/${slug || "default"}.webp`, req.url).toString();
  const botLogo = new URL("/avatars/bot.webp", req.url).toString();

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
            ? "radial-gradient(circle at 82% 48%, #252933 0%, #0b0c10 32%, #05060a 62%)"
            : "radial-gradient(circle at 82% 48%, #25214b 0%, #0e1020 30%, #05060a 61%)",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.055,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "54px 0 48px 68px", width: 700 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 17, fontWeight: 700, letterSpacing: 3.6, color: "#dfe2e8" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={botLogo}
              width={34}
              height={34}
              style={{
                border: "1px solid rgba(255,255,255,.2)",
                borderRadius: 40,
                objectFit: "cover",
                opacity: 0.9,
              }}
            />
            GROK ME
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
            <div style={{ color: "#747b88", fontSize: 15, fontWeight: 600, letterSpacing: 2.5, marginBottom: 24 }}>
              THE GROK BOT SOCIAL EXPERIMENT
            </div>
            <div style={{ display: "flex", alignItems: "center", color: special ? "#ffffff" : "#73fbd3", fontSize: 17, fontWeight: 800, letterSpacing: 3 }}>
              {special ? `ELON MODE ACTIVATED · ${score}%` : `YOUR GROK MATCH · ${score}%`}
            </div>
            <div style={{ marginTop: 19, fontSize: 70, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.02 }}>
              {name}
            </div>
            <div style={{ marginTop: 13, color: "#858b97", fontSize: 26, fontWeight: 400 }}>{handle}</div>
            {bio && (
              <div style={{ marginTop: 24, color: "#d9dde5", fontSize: 25, lineHeight: 1.35 }}>{bio}</div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#5b616d", fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>
            <span>Built by</span>
            <span style={{ color: "#858c98" }}>@0x_fokki</span>
            <span style={{ color: "#343943" }}>·</span>
            <span>Built with Grok Bot</span>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", position: "relative", paddingRight: 46 }}>
          <div
            style={{
              display: "flex",
              padding: 1,
              borderRadius: 57,
              background: special
                ? "linear-gradient(145deg, rgba(255,255,255,.82), rgba(89,94,108,.5))"
                : "linear-gradient(145deg, rgba(115,251,211,.9), rgba(120,112,255,.72))",
              boxShadow: "0 24px 70px rgba(0,0,0,.42)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              width={430}
              height={430}
              style={{
                display: "flex",
                borderRadius: 56,
                objectFit: "cover",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
