
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wiseman West FC",
  description: "WWFC squad, fixtures, events,and voting",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0b0b0b",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wiseman West FC",
  description: "WWFC squad, fixtures, events and voting",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#ffffff" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 18px",
            borderBottom: "1px solid #e5e5e5",
            background: "#ffffff",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <img
            src="/crest.jpg"
            alt="WWFC Crest"
            style={{
              height: "44px",
              width: "44px",
              objectFit: "contain",
            }}
          />

          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: "16px" }}>
              Wiseman West FC
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>
              Squad • Fixtures • Events
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}

