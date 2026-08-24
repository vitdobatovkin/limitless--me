import type { Metadata } from "next";

type Props = {
  searchParams: {
    handle?: string;
    name?: string;
    bio?: string;
    special?: string;
    score?: string;
    v?: string;
  };
};

export const dynamic = "force-dynamic";

function siteBase() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://limitless-me.vercel.app";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const handle = (searchParams.handle || "@grok").trim();
  const name = (searchParams.name || handle).trim();
  const bio = (searchParams.bio || "").trim();
  const description = bio || "Who are you in the Grok universe?";

  const pageUrl = new URL("/r", siteBase());
  const ogUrl = new URL("/og", siteBase());

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) pageUrl.searchParams.set(key, value);
  }
  ogUrl.searchParams.set("handle", handle);
  ogUrl.searchParams.set("name", name);
  ogUrl.searchParams.set("bio", bio);
  if (searchParams.special) ogUrl.searchParams.set("special", searchParams.special);
  if (searchParams.score) ogUrl.searchParams.set("score", searchParams.score);
  if (searchParams.v) ogUrl.searchParams.set("v", searchParams.v);

  const title = searchParams.special === "elon" ? "ELON MODE ACTIVATED" : `GROK ME matched me with ${name}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: pageUrl.toString(),
      title,
      description,
      images: [{ url: ogUrl.toString(), width: 1200, height: 630, type: "image/png", alt: `${name} — GROK ME` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: ogUrl.toString(), width: 1200, height: 630, alt: `${name} — GROK ME` }],
    },
    robots: { index: true, follow: true },
  };
}

export default function ResultPage({ searchParams }: Props) {
  const handle = (searchParams.handle || "@grok").trim();
  const name = (searchParams.name || handle).trim();
  const bio = (searchParams.bio || "").trim();
  const score = Number(searchParams.score);
  const safeScore = Number.isFinite(score) ? Math.min(99, Math.max(87, Math.round(score))) : null;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 32,
        color: "#f5f7fb",
        background: "radial-gradient(circle at 50% 0%, #25205b, #050608 58%)",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <script
        dangerouslySetInnerHTML={{
          __html: `if (!navigator.userAgent.includes("Twitterbot")) { window.location.replace("/"); }`,
        }}
      />
      <div>
        <p style={{ color: "#73fbd3", letterSpacing: ".2em", fontWeight: 800 }}>
          {safeScore ? `YOUR GROK MATCH · ${safeScore}%` : "GROK ME"}
        </p>
        <h1 style={{ fontSize: 56, margin: "12px 0" }}>{name}</h1>
        <p style={{ color: "#969daa" }}>{handle}</p>
        {bio && <p style={{ maxWidth: 620, fontSize: 20 }}>{bio}</p>}
      </div>
    </main>
  );
}
