"use client";

import { useRouter } from "next/navigation";

export default function LeagueTablePage() {
  const router = useRouter();

  const LEAGUE_TABLE_URL =
    "https://mitoofootball.com/LeagueTab.cfm?TblName=Matches&DivisionID=103&LeagueCode=MDX2025";

  return (
    <main style={{ padding: 20 }}>
      <button onClick={() => router.push("/")}>← Home</button>
      <h1 style={{ marginTop: 10 }}>League Table</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <a
          href={LEAGUE_TABLE_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #111",
            background: "#111",
            color: "white",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Open live table ↗
        </a>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "white",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          overflow: "hidden",
          height: "75vh",
          background: "white",
        }}
      >
        <iframe
          src={LEAGUE_TABLE_URL}
          title="League Table"
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      </div>

      <div style={{ marginTop: 12, color: "#666" }}>
        If the table appears blank, the source website blocks embedding — use
        “Open live table ↗”.
      </div>
    </main>
  );
}
