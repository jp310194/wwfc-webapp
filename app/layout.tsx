import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wiseman West FC",
  description: "WWFC squad, fixtures, events and voting",
  manifest: "/manifest.json",
  icons: {
    apple: "/apple-touch-icon.png",
  },
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
      <body style={{ margin: 0, background: "#ffffff", color: "#111827" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <img
            src="/crest.jpg"
            alt="WWFC Crest"
            style={{ width: 44, height: 44, objectFit: "contain" }}
          />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Wiseman West FC</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Squad • Fixtures • Events
            </div>
          </div>
        </header>

        <main style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
