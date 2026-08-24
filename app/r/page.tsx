import type { Metadata } from "next";

type Props = {
  searchParams: {
    handle?: string;
    name?: string;
    bio?: string;
    special?: string;
    v?: string;
  };
};

export const dynamic = "force-dynamic";

function siteBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://grok-me.vercel.app")
  );
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const handle = (searchParams.handle || "@grok").trim();
  const name = (searchParams.name || handle).trim();
  const bio = (searchParams.bio || "Your match from the Grok universe.").trim();

  const pageUrl = new URL("/r", siteBase());
  const ogUrl = new URL("/og", siteBase());

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) pageUrl.searchParams.set(key, value);
  }
  ogUrl.searchParams.set("handle", handle);
  ogUrl.searchParams.set("name", name);
  ogUrl.searchParams.set("bio", bio);
  if (searchParams.special) ogUrl.searchParams.set("special", searchParams.special);
  if (searchParams.v) ogUrl.searchParams.set("v", searchParams.v);

  const title = searchParams.special === "elon" ? "ELON MODE ACTIVATED" : `Grok matched me with ${name}`;

  return {
    title,
    description: bio,
    openGraph: {
      type: "website",
      url: pageUrl.toString(),
      title,
      description: bio,
      images: [{ url: ogUrl.toString(), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: bio,
      images: [ogUrl.toString()],
    },
    robots: { index: true, follow: true },
  };
}

export default function ResultPage({ searchParams }: Props) {
  const handle = (searchParams.handle || "@grok").trim();
  const name = (searchParams.name || handle).trim();
  const bio = (searchParams.bio || "Your match from the Grok universe.").trim();

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
        <p style={{ color: "#73fbd3", letterSpacing: ".2em", fontWeight: 800 }}>GROK ME</p>
        <h1 style={{ fontSize: 56, margin: "12px 0" }}>{name}</h1>
        <p style={{ color: "#969daa" }}>{handle}</p>
        <p style={{ maxWidth: 620, fontSize: 20 }}>{bio}</p>
      </div>
    </main>
  );
}
