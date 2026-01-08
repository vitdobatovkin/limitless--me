import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://limitless-me.vercel.app"),
  title: "How limitless are you?",
  description: "Tap1 Limitless me — quick spin, and we'll discover your limitless potential.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
