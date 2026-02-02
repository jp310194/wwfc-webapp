"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/utils/supabase/client";

type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type StatRow = {
  player_id: string;
  appearances: number | null;
  goals: number | null;
  assists: number | null;
  clean_sheets: number | null;
  motm: number | null;
};

type PlayerRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  appearances: number;
  goals: number;
  assists: number;
  clean_sheets: number;
  motm: number;
  transfer_value: number;
};

const VALUES = {
  appearances: 100_000,
  goals: 250_000,
  assists: 150_000,
  clean_sheets: 200_000,
  motm: 300_000,
} as const;

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function n(v: number | null | undefined) {
  return Number.isFinite(v as number) ? (v as number) : 0;
}

function calcTransferValue(s: {
  appearances: number;
  goals: number;
  assists: number;
  clean_sheets: number;
  motm: number;
}) {
  return (
    s.appearances * VALUES.appearances +
    s.goals * VALUES.goals +
    s.assists * VALUES.assists +
    s.clean_sheets * VALUES.clean_sheets +
    s.motm * VALUES.motm
  );
}

export default function TransferValuePage() {
  const supabase = supabaseBrowser;
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // 1) Fetch all profiles
      const profilesRes = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .order("name", { ascending: true });

      if (cancelled) return;

      if (profilesRes.error) {
        setError(`profiles: ${profilesRes.error.message}`);
        setLoading(false);
        return;
      }

      const profiles = (profilesRes.data ?? []) as Profile[];

      // 2) Fetch all stats
      const statsRes = await supabase
        .from("player_stats")
        .select("player_id, appearances, goals, assists, clean_sheets, motm");

      if (cancelled) return;

      if (statsRes.error) {
        setError(`player_stats: ${statsRes.error.message}`);
        setLoading(false);
        return;
      }

      const stats = (statsRes.data ?? []) as StatRow[];

      // 3) Build a lookup map: player_id -> stats
      const statsByPlayerId = new Map<string, StatRow>();
      for (const s of stats) statsByPlayerId.set(s.player_id, s);

      // 4) Merge and compute transfer value
      const merged: PlayerRow[] = profiles.map((p) => {
        const s = statsByPlayerId.get(p.id);

        const mergedStats = {
          appearances: n(s?.appearances),
          goals: n(s?.goals),
          assists: n(s?.assists),
          clean_sheets: n(s?.clean_sheets),
          motm: n(s?.motm),
        };

        return {
          id: p.id,
          name: p.name ?? "Unnamed",
          avatar_url: p.avatar_url ?? null,
          ...mergedStats,
          transfer_value: calcTransferValue(mergedStats),
        };
      });

      merged.sort((a, b) => b.transfer_value - a.transfer_value);

      setRows(merged);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <main style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Transfer Value</h1>
        <Link href="/" style={{ textDecoration: "underline" }}>
          Back to Home
        </Link>
      </div>

      <p style={{ opacity: 0.8, marginTop: 8 }}>
        Value rules: {gbp.format(VALUES.appearances)} per appearance · {gbp.format(VALUES.goals)} per goal ·{" "}
        {gbp.format(VALUES.assists)} per assist · {gbp.format(VALUES.clean_sheets)} per clean sheet ·{" "}
        {gbp.format(VALUES.motm)} per MOTM
      </p>

      {loading && <p style={{ marginTop: 16 }}>Loading…</p>}

      {error && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #f3b", borderRadius: 10 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Error</p>
          <p style={{ margin: "6px 0 0", color: "crimson" }}>{error}</p>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p style={{ marginTop: 16 }}>
          No players found in <code>profiles</code>.
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              padding: "12px 14px",
              background: "#f7f7f7",
              fontWeight: 800,
            }}
          >
            <div>Player</div>
            <div>Transfer Value</div>
          </div>

          {rows.map((p) => (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                padding: "12px 14px",
                borderTop: "1px solid #eee",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.avatar_url}
                    alt={p.name}
                    style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "#ddd",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                    }}
                  >
                    {p.name?.[0]?.toUpperCase() ?? "P"}
                  </div>
                )}

                <div>
                  <div style={{ fontWeight: 800 }}>{p.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Apps {p.appearances} · G {p.goals} · A {p.assists} · CS {p.clean_sheets} · MOTM {p.motm}
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 900 }}>{gbp.format(p.transfer_value)}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
