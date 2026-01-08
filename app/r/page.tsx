// app/r/page.tsx
import type { Metadata } from "next";

type Props = {
  searchParams: {
    handle?: string;
    bio?: string;
    v?: string;
  };
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const handle = (searchParams.handle || "@someone").trim();
  const bio = (searchParams.bio || "How limitless are you?").trim();
  const v = (searchParams.v || "").trim();

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://limitless-me.vercel.app");

  // URL именно этой страницы (важно для X)
  const pageUrl = new URL("/r", base);
  pageUrl.searchParams.set("handle", handle);
  pageUrl.searchParams.set("bio", bio);
  if (v) pageUrl.searchParams.set("v", v);

  // OG image
  const ogUrl = new URL("/og", base);
  ogUrl.searchParams.set("handle", handle);
  ogUrl.searchParams.set("bio", bio);
  if (v) ogUrl.searchParams.set("v", v);

  const title = `I'm limitless as ${handle}`;

  return {
    title,
    description: bio,
    openGraph: {
      type: "website",
      url: pageUrl.toString(),
      title,
      description: bio,
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
        },
      ],
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

export default function Page({ searchParams }: Props) {
  const handle = (searchParams.handle || "@someone").trim();
  const bio = (searchParams.bio || "How limitless are you?").trim();

  return (
    <html>
      <head>
        {/* ✅ Клиентский редирект — X его игнорирует, браузер выполняет */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (!navigator.userAgent.includes("Twitterbot")) {
                window.location.replace("/");
              }
            `,
          }}
        />
      </head>
      <body style={{ fontFamily: "system-ui", padding: 32 }}>
        {/* Минимальный HTML, нужен только для бота */}
        <h1>I'm limitless as {handle}</h1>
        <p>{bio}</p>
        <p>How limitless are you?</p>
      </body>
    </html>
  );
}
