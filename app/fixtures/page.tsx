"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function FixturesPage() {
  const router = useRouter();
  const [fixtures, setFixtures] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.push("/login");

      const { data: evs } = await supabase
        .from("events")
        .select("*")
        .eq("type", "fixture")
        .order("start_time", { ascending: true });

      setFixtures(evs ?? []);
    })();
  }, [router]);

  return (
    <main style={{ padding: 20 }}>
      <button onClick={() => router.push("/")}>← Home</button>
      <h1>Fixtures</h1>

      {fixtures.map((f) => (
        <div key={f.id} style={{ border: "1px solid #eee", padding: 12, marginBottom: 10 }}>
          <b>{f.title}</b>
          <div>{new Date(f.start_time).toLocaleString()}</div>
          <div>{f.location}</div>
          <div>Kit: {f.kit_colour}</div>
          <button onClick={() => router.push(`/event/${f.id}`)}>Open / Vote</button>
        </div>
      ))}
    </main>
  );
}
