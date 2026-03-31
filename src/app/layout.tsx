import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signals",
  description: "Signals is an event performance intelligence platform for live event operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
