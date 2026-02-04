"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function LeagueTablePage() {
  useEffect(() => {
    window.location.href =
      "https://mitoofootball.com/LeagueTab.cfm?TblName=Matches&DivisionID=103&LeagueCode=MDX2025";
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <Link href="/" style={{ display: "inline-block", marginBottom: 10 }}>
        ← Home
      </Link>

      <h1>League Table</h1>
      <p>Opening live league table…</p>

      <p style={{ marginTop: 12 }}>
        If nothing happens,{" "}
        <a
          href="https://mitoofootball.com/LeagueTab.cfm?TblName=Matches&DivisionID=103&LeagueCode=MDX2025"
          target="_blank"
          rel="noreferrer"
        >
          tap here to open it
        </a>
        .
      </p>
    </main>
  );
}
