import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://grok-me.vercel.app"),
  title: "GROK ME — Find your xAI alter ego",
  description: "Spin the neural feed and discover who you are in the Grok universe.",
  openGraph: {
    title: "GROK ME",
    description: "Who are you in the Grok universe?",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GROK ME",
    description: "Spin the neural feed and discover your xAI alter ego.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ background: "#050608" }}>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
