"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function MotmListPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.push("/login");

      const { data, error } = await supabase
        .from("events")
        .select("id,title,location,start_time,kit_colour")
        .eq("type", "fixture")
        .lt("start_time", new Date().toISOString())
        .order("start_time", { ascending: false });

      if (error) return alert(error.message);
      setMatches(data ?? []);
    })();
  }, [router]);

  return (
    <main style={{ padding: 20, maxWidth: 820, margin: "0 auto" }}>
      <button onClick={() => router.push("/")}>← Home</button>
      <h1>Man of the Match</h1>
      <p style={{ opacity: 0.75 }}>Vote on past fixtures.</p>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
        {matches.map((m) => (
          <li key={m.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 900 }}>{m.title}</div>
            <div style={{ opacity: 0.8 }}>{new Date(m.start_time).toLocaleString()}</div>
            {m.location && <div>Location: {m.location}</div>}
            {m.kit_colour && <div>Kit: {m.kit_colour}</div>}
            <button style={{ marginTop: 10 }} onClick={() => router.push(`/motm/${m.id}`)}>
              Vote / View results
            </button>
          </li>
        ))}
        {matches.length === 0 && <li style={{ opacity: 0.7 }}>No past fixtures yet.</li>}
      </ul>
    </main>
  );
}
