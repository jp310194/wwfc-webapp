"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/utils/supabase/client";

export default function PerformancePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;

    const { data: me } = await supabaseBrowser
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setIsAdmin(me?.role === "admin");

    const { data } = await supabaseBrowser
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

    const mapped =
      data?.map((p: any) => ({
        id: p.id,
        name: p.name,
        ...p.player_stats?.[0],
      })) ?? [];

    mapped.sort((a, b) => (b.appearances ?? 0) - (a.appearances ?? 0));

    setRows(mapped);
  }

  async function save(r: any) {
    await fetch("/api/performance/update", {
      method: "POST",
      body: JSON.stringify({
        player_id: r.id,
        appearances: Number(r.appearances),
        goals: Number(r.goals),
        assists: Number(r.assists),
        clean_sheets: Number(r.clean_sheets),
        motm: Number(r.motm),
      }),
    });

    load();
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Performance</h1>

      <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3">Rank</th>
              <th className="p-3">Player</th>
              <th className="p-3">Apps</th>
              <th className="p-3">Goals</th>
              <th className="p-3">Assists</th>
              <th className="p-3">CS</th>
              <th className="p-3">MOTM</th>
              {isAdmin && <th className="p-3">Save</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{i + 1}</td>
                <td className="p-3 font-medium">{r.name}</td>

                {["appearances","goals","assists","clean_sheets","motm"].map((k) => (
                  <td key={k} className="p-3">
                    {isAdmin ? (
                      <input
                        type="number"
                        className="w-16 border rounded px-1"
                        value={r[k] ?? 0}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id ? { ...x, [k]: e.target.value } : x
                            )
                          )
                        }
                      />
                    ) : (
                      r[k] ?? 0
                    )}
                  </td>
                ))}

                {isAdmin && (
                  <td className="p-3">
                    <button
                      className="px-3 py-1 border rounded"
                      onClick={() => save(r)}
                    >
                      Save
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
