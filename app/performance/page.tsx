"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client";

type Row = {
  id: string;
  name: string;
  appearances: any;
  goals: any;
  assists: any;
  clean_sheets: any;
  motm: any;
};

const FIELDS = ["appearances", "goals", "assists", "clean_sheets", "motm"] as const;

export default function PerformancePage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);

    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: me } = await supabaseBrowser
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setIsAdmin(me?.role === "admin");

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
      alert("Load failed: " + error.message);
      setLoading(false);
      return;
    }

    const mapped: Row[] =
      data?.map((p: any) => ({
        id: p.id,
        name: p.name,
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

  function toPayload(r: Row) {
    return {
      player_id: r.id,
      appearances: Number(r.appearances) || 0,
      goals: Number(r.goals) || 0,
      assists: Number(r.assists) || 0,
      clean_sheets: Number(r.clean_sheets) || 0,
      motm: Number(r.motm) || 0,
    };
  }

  async function save(r: Row) {
    if (!isAdmin) return;

    setSavingRowId(r.id);

    const { error } = await supabaseBrowser
      .from("player_stats")
      .upsert(toPayload(r), { onConflict: "player_id" });

    setSavingRowId(null);

    if (error) {
      alert("Save failed: " + error.message);
      return;
    }

    // IMPORTANT: do not call load() here, so you don't wipe other unsaved edits
  }

  async function saveAll() {
    if (!isAdmin) return;

    setSavingAll(true);

    const payload = rows.map(toPayload);

    const { error } = await supabaseBrowser
      .from("player_stats")
      .upsert(payload, { onConflict: "player_id" });

    setSavingAll(false);

    if (error) {
      alert("Save all failed: " + error.message);
      return;
    }

    // Still do not auto-load; keep what you see on screen
  }

  const rankSortedRows = useMemo(() => {
    // Keep rank stable even while editing: sort by numeric appearances
    return [...rows].sort((a, b) => Number(b.appearances) - Number(a.appearances));
  }, [rows]);

  return (
    <main className="p-6">
      {/* Top actions */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700"
        >
          ← Return Home
        </button>

        <button
          onClick={load}
          className="px-4 py-2 rounded border bg-white hover:bg-gray-50"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>

        {isAdmin && (
          <button
            onClick={saveAll}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            disabled={savingAll || loading}
          >
            {savingAll ? "Saving All..." : "Save All"}
          </button>
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
                        type="text"
                        inputMode="numeric"
                        className="w-16 border rounded px-2 py-1"
                        value={(r as any)[k] ?? ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id ? { ...x, [k]: e.target.value } : x
                            )
                          )
                        }
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
