"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client";

type Row = {
  id: string;
  name: string;
  appearances: string | number;
  goals: string | number;
  assists: string | number;
  clean_sheets: string | number;
  motm: string | number;
};

const FIELDS = ["appearances", "goals", "assists", "clean_sheets", "motm"] as const;

function toInt(v: any) {
  // Keep empty as 0, but never allow NaN
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
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
      setStatus("Could not load your profile role.");
      return;
    }

    const admin = me?.role === "admin";
    setIsAdmin(admin);

    const { data, error } = await supabaseBrowser
      .from("profiles")
      .select(
        `
        id,
        name,
        player_stats (
          appearances,
          goals,
          assists,
          clean_sheets,
          motm
        )
      `
      );

    if (error) {
      setLoading(false);
      setStatus("Load failed: " + error.message);
      return;
    }

    const mapped: Row[] =
      data?.map((p: any) => ({
        id: p.id,
        name: p.name,
        // IMPORTANT: always store as numbers initially so they display (no blanks)
        appearances: p.player_stats?.[0]?.appearances ?? 0,
        goals: p.player_stats?.[0]?.goals ?? 0,
        assists: p.player_stats?.[0]?.assists ?? 0,
        clean_sheets: p.player_stats?.[0]?.clean_sheets ?? 0,
        motm: p.player_stats?.[0]?.motm ?? 0,
      })) ?? [];

    mapped.sort((a, b) => Number(b.appearances) - Number(a.appearances));
    setRows(mapped);
    setLoading(false);
  }

  function payloadFromRow(r: Row) {
    return {
      player_id: r.id,
      appearances: toInt(r.appearances),
      goals: toInt(r.goals),
      assists: toInt(r.assists),
      clean_sheets: toInt(r.clean_sheets),
      motm: toInt(r.motm),
    };
  }

  async function reReadSavedRow(playerId: string) {
    // Re-fetch just the saved row to confirm persistence
    const { data, error } = await supabaseBrowser
      .from("player_stats")
      .select("player_id, appearances, goals, assists, clean_sheets, motm")
      .eq("player_id", playerId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async function save(r: Row) {
    if (!isAdmin) return;

    setSavingRowId(r.id);
    setStatus("");

    const payload = payloadFromRow(r);

    const { error } = await supabaseBrowser
      .from("player_stats")
      .upsert(payload, { onConflict: "player_id" });

    if (error) {
      setSavingRowId(null);
      setStatus("Save failed: " + error.message);
      return;
    }

    // Update local screen immediately with normalised numbers
    setRows((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? {
              ...x,
              appearances: payload.appearances,
              goals: payload.goals,
              assists: payload.assists,
              clean_sheets: payload.clean_sheets,
              motm: payload.motm,
            }
          : x
      )
    );

    // Confirm it actually persisted in DB
    try {
      await reReadSavedRow(r.id);
      setStatus("Saved ✅");
    } catch (e: any) {
      setStatus(
        "Saved locally, but DB re-check failed (likely permissions/RLS): " + e.message
      );
    } finally {
      setSavingRowId(null);
    }
  }

  async function saveAll() {
    if (!isAdmin) return;

    setSavingAll(true);
    setStatus("");

    const payload = rows.map(payloadFromRow);

    const { error } = await supabaseBrowser
      .from("player_stats")
      .upsert(payload, { onConflict: "player_id" });

    if (error) {
      setSavingAll(false);
      setStatus("Save all failed: " + error.message);
      return;
    }

    // Normalise local display
    setRows((prev) =>
      prev.map((x) => {
        const p = payload.find((q) => q.player_id === x.id);
        if (!p) return x;
        return {
          ...x,
          appearances: p.appearances,
          goals: p.goals,
          assists: p.assists,
          clean_sheets: p.clean_sheets,
          motm: p.motm,
        };
      })
    );

    setSavingAll(false);
    setStatus("Saved all ✅");
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

        {status && (
          <span className="text-sm text-gray-600 ml-2">
            {status}
          </span>
        )}
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
                        value={String((r as any)[k] ?? 0)}
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
                      String((r as any)[k] ?? 0)
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
