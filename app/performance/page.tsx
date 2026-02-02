"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client";

type StatRow = {
  player_id: string;
  appearances: number;
  goals: number;
  assists: number;
  clean_sheets: number;
  motm: number;
};

type Row = {
  id: string;
  name: string;
  // store as string for inputs so blanks are allowed
  appearances: string;
  goals: string;
  assists: string;
  clean_sheets: string;
  motm: string;
};

const FIELDS = ["appearances", "goals", "assists", "clean_sheets", "motm"] as const;

function asIntOrNull(v: string): number | null {
  const s = (v ?? "").trim();
  if (s === "") return null; // IMPORTANT: blank means "no change"
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.trunc(n));
}

export default function PerformancePage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setStatus("");

    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: me, error: meErr } = await supabaseBrowser
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (meErr) {
      setLoading(false);
      setStatus("Could not load role: " + meErr.message);
      return;
    }

    setIsAdmin(me?.role === "admin");

    // 1) Players
    const { data: players, error: playersErr } = await supabaseBrowser
      .from("profiles")
      .select("id, name");

    if (playersErr) {
      setLoading(false);
      setStatus("Load players failed: " + playersErr.message);
      return;
    }

    // 2) Stats (separate fetch, then merge)
    const { data: stats, error: statsErr } = await supabaseBrowser
      .from("player_stats")
      .select("player_id, appearances, goals, assists, clean_sheets, motm");

    if (statsErr) {
      setLoading(false);
      setStatus("Load stats failed: " + statsErr.message);
      return;
    }

    const statsById = new Map<string, StatRow>();
    (stats ?? []).forEach((s: any) => {
      statsById.set(s.player_id, {
        player_id: s.player_id,
        appearances: s.appearances ?? 0,
        goals: s.goals ?? 0,
        assists: s.assists ?? 0,
        clean_sheets: s.clean_sheets ?? 0,
        motm: s.motm ?? 0,
      });
    });

    const mapped: Row[] = (players ?? []).map((p: any) => {
      const s = statsById.get(p.id);
      return {
        id: p.id,
        name: p.name,
        // show existing values as strings so they stay visible after reload
        appearances: String(s?.appearances ?? 0),
        goals: String(s?.goals ?? 0),
        assists: String(s?.assists ?? 0),
        clean_sheets: String(s?.clean_sheets ?? 0),
        motm: String(s?.motm ?? 0),
      };
    });

    mapped.sort((a, b) => Number(b.appearances) - Number(a.appearances));

    setRows(mapped);
    setLoading(false);
  }

  async function getExistingStats(playerId: string): Promise<StatRow> {
    const { data, error } = await supabaseBrowser
      .from("player_stats")
      .select("player_id, appearances, goals, assists, clean_sheets, motm")
      .eq("player_id", playerId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return {
      player_id: playerId,
      appearances: data?.appearances ?? 0,
      goals: data?.goals ?? 0,
      assists: data?.assists ?? 0,
      clean_sheets: data?.clean_sheets ?? 0,
      motm: data?.motm ?? 0,
    };
  }

  async function save(r: Row) {
    if (!isAdmin) {
      setStatus("Not allowed: you are not admin.");
      return;
    }

    setSavingRowId(r.id);
    setStatus("");

    try {
      // Merge: blank inputs do NOT overwrite existing values
      const existing = await getExistingStats(r.id);

      const payload = {
        player_id: r.id,
        appearances: asIntOrNull(r.appearances) ?? existing.appearances,
        goals: asIntOrNull(r.goals) ?? existing.goals,
        assists: asIntOrNull(r.assists) ?? existing.assists,
        clean_sheets: asIntOrNull(r.clean_sheets) ?? existing.clean_sheets,
        motm: asIntOrNull(r.motm) ?? existing.motm,
      };

      const { error } = await supabaseBrowser
        .from("player_stats")
        .upsert(payload, { onConflict: "player_id" });

      if (error) throw new Error(error.message);

      // Update local row to reflect exactly what's now saved
      setRows((prev) =>
        prev.map((x) =>
          x.id === r.id
            ? {
                ...x,
                appearances: String(payload.appearances),
                goals: String(payload.goals),
                assists: String(payload.assists),
                clean_sheets: String(payload.clean_sheets),
                motm: String(payload.motm),
              }
            : x
        )
      );

      setStatus("Saved ✅");
    } catch (e: any) {
      setStatus("Save failed: " + e.message);
    } finally {
      setSavingRowId(null);
    }
  }

  async function saveAll() {
    if (!isAdmin) {
      setStatus("Not allowed: you are not admin.");
      return;
    }

    setSavingAll(true);
    setStatus("");

    try {
      // Load all existing stats once
      const { data: stats, error: statsErr } = await supabaseBrowser
        .from("player_stats")
        .select("player_id, appearances, goals, assists, clean_sheets, motm");

      if (statsErr) throw new Error(statsErr.message);

      const existingById = new Map<string, StatRow>();
      (stats ?? []).forEach((s: any) => {
        existingById.set(s.player_id, {
          player_id: s.player_id,
          appearances: s.appearances ?? 0,
          goals: s.goals ?? 0,
          assists: s.assists ?? 0,
          clean_sheets: s.clean_sheets ?? 0,
          motm: s.motm ?? 0,
        });
      });

      const payload = rows.map((r) => {
        const ex = existingById.get(r.id) ?? {
          player_id: r.id,
          appearances: 0,
          goals: 0,
          assists: 0,
          clean_sheets: 0,
          motm: 0,
        };

        return {
          player_id: r.id,
          appearances: asIntOrNull(r.appearances) ?? ex.appearances,
          goals: asIntOrNull(r.goals) ?? ex.goals,
          assists: asIntOrNull(r.assists) ?? ex.assists,
          clean_sheets: asIntOrNull(r.clean_sheets) ?? ex.clean_sheets,
          motm: asIntOrNull(r.motm) ?? ex.motm,
        };
      });

      const { error } = await supabaseBrowser
        .from("player_stats")
        .upsert(payload, { onConflict: "player_id" });

      if (error) throw new Error(error.message);

      // Normalize local view to what we saved
      setRows((prev) =>
        prev.map((r) => {
          const p = payload.find((x) => x.player_id === r.id);
          if (!p) return r;
          return {
            ...r,
            appearances: String(p.appearances),
            goals: String(p.goals),
            assists: String(p.assists),
            clean_sheets: String(p.clean_sheets),
            motm: String(p.motm),
          };
        })
      );

      setStatus("Saved all ✅");
    } catch (e: any) {
      setStatus("Save all failed: " + e.message);
    } finally {
      setSavingAll(false);
    }
  }

  const rankSortedRows = useMemo(() => {
    return [...rows].sort((a, b) => Number(b.appearances) - Number(a.appearances));
  }, [rows]);

  return (
    <main className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700"
        >
          ← Return Home
        </button>

        <button
          onClick={load}
          className="px-4 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-60"
          disabled={loading || savingAll || !!savingRowId}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>

        {isAdmin && (
          <button
            onClick={saveAll}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            disabled={savingAll || loading || !!savingRowId}
          >
            {savingAll ? "Saving All..." : "Save All"}
          </button>
        )}

        {status && <span className="text-sm text-gray-600 ml-2">{status}</span>}
      </div>

      <h1 className="text-2xl font-semibold">Performance</h1>

      <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Rank</th>
              <th className="p-3 text-left">Player</th>
              <th className="p-3 text-left">Apps</th>
              <th className="p-3 text-left">Goals</th>
              <th className="p-3 text-left">Assists</th>
              <th className="p-3 text-left">CS</th>
              <th className="p-3 text-left">MOTM</th>
              {isAdmin && <th className="p-3 text-left">Save</th>}
            </tr>
          </thead>

          <tbody>
            {rankSortedRows.map((r, i) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{i + 1}</td>
                <td className="p-3 font-medium">{r.name}</td>

                {FIELDS.map((k) => (
                  <td key={k} className="p-3">
                    {isAdmin ? (
                      <input
                        type="number"
                        className="w-20 border rounded px-2 py-1"
                        value={(r as any)[k] ?? "0"}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id ? { ...x, [k]: e.target.value } : x
                            )
                          )
                        }
                        disabled={savingAll || savingRowId === r.id}
                        min={0}
                      />
                    ) : (
                      (r as any)[k]
                    )}
                  </td>
                ))}

                {isAdmin && (
                  <td className="p-3">
                    <button
                      className="px-3 py-1 border rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                      onClick={() => save(r)}
                      disabled={savingRowId === r.id || savingAll || loading}
                    >
                      {savingRowId === r.id ? "Saving..." : "Save"}
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {!rankSortedRows.length && (
              <tr>
                <td className="p-4 text-gray-600" colSpan={isAdmin ? 8 : 7}>
                  {loading ? "Loading..." : "No players found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isAdmin && (
        <p className="mt-3 text-xs text-gray-500">
          Only admins can edit performance stats.
        </p>
      )}
    </main>
  );
}
