"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Player = {
  id: string;
  name: string;
  role: string;
  avatar_url?: string | null;
};

export default function PlayersPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.push("/login");

      const { data, error } = await supabase
        .from("profiles")
        .select("id,name,role,avatar_url")
        .order("name", { ascending: true });

      if (error) return alert(error.message);
      setPlayers((data ?? []) as any);
    })();
  }, [router]);

  return (
    <main style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => router.push("/")}>← Home</button>
      <h1>Players</h1>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
        {players.map((p) => (
          <li key={p.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={p.name}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    objectFit: "cover",
                    border: "1px solid #ddd",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    border: "1px dashed #bbb",
                  }}
                />
              )}

              <div>
                <div style={{ fontWeight: 800 }}>{p.name}</div>
                <div style={{ opacity: 0.7 }}>{p.role}</div>
              </div>
            </div>
          </li>
        ))}
        {players.length === 0 && <li style={{ opacity: 0.7 }}>No players found.</li>}
      </ul>
    </main>
  );
}
