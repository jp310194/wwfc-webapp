"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.push("/login");

      const { data: evs } = await supabase
        .from("events")
        .select("*")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      setEvents(evs ?? []);
    })();
  }, [router]);

  return (
    <main style={{ padding: 20 }}>
      <button onClick={() => router.push("/")}>← Home</button>
      <h1>Upcoming Events</h1>

      {events.map((e) => (
        <div key={e.id} style={{ border: "1px solid #eee", padding: 12, marginBottom: 10 }}>
          <b>{e.title}</b>
          <div>{new Date(e.start_time).toLocaleString()}</div>
          <div>{e.location}</div>
          <div>Kit: {e.kit_colour}</div>
          <button onClick={() => router.push(`/event/${e.id}`)}>Open / Vote</button>
        </div>
      ))}
    </main>
  );
}
