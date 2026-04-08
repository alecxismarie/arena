import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const cloudflareBeaconToken =
  process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim() || "";

export const metadata: Metadata = {
  title: "Signals",
  description:
    "Signals is an operations intelligence platform for event performance, inventory performance, and asset utilization.",
  icons: {
    icon: "/favi-signals.png",
    shortcut: "/favi-signals.png",
    apple: "/favi-signals.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        {cloudflareBeaconToken ? (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cloudflareBeaconToken })}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
