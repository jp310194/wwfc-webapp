"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<"fixture" | "training">("fixture");
  const [title, setTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [kickOffTime, setKickOffTime] = useState("");
  const [kitColour, setKitColour] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.push("/login");

      const uid = sess.session.user.id;
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", uid).single();

      if (prof?.role !== "admin") {
        alert("Admins only. Set role=admin in Supabase -> profiles.");
        return router.push("/");
      }

      setLoading(false);
    })();
  }, [router]);

  async function createEvent() {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return router.push("/login");

    if (!title || !startTime) return alert("Title and start time are required");

    const { error } = await supabase.from("events").insert({
      type,
      title,
      opponent: opponent || null,
      location: location || null,
      start_time: new Date(startTime).toISOString(),
      meet_time: meetTime ? new Date(meetTime).toISOString() : null,
      kick_off_time: type === "fixture" && kickOffTime ? new Date(kickOffTime).toISOString() : null,
      kit_colour: kitColour || null,
      notes: notes || null,
      created_by: uid,
    });

    if (error) return alert(error.message);

    alert("Event created!");
    router.push("/events");
  }

  if (loading) return <main style={{ padding: 20 }}>Loading…</main>;

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto" }}>
      <button onClick={() => router.push("/")}>← Home</button>
      <h1>Admin: Create Event</h1>

      <div style={{ display: "grid", gap: 10 }}>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as any)} style={{ width: "100%", padding: 10 }}>
            <option value="fixture">Match (Fixture)</option>
            <option value="training">Training</option>
          </select>
        </label>

        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <label>
          Opponent (fixture only)
          <input value={opponent} onChange={(e) => setOpponent(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <label>
          Location
          <input value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <label>
          Event date/time (main)
          <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <label>
          Meet time
          <input type="datetime-local" value={meetTime} onChange={(e) => setMeetTime(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        {type === "fixture" && (
          <label>
            Kick off time
            <input type="datetime-local" value={kickOffTime} onChange={(e) => setKickOffTime(e.target.value)} style={{ width: "100%", padding: 10 }} />
          </label>
        )}

        <label>
          Kit colour
          <input value={kitColour} onChange={(e) => setKitColour(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%", padding: 10, minHeight: 90 }} />
        </label>

        <button onClick={createEvent} style={{ padding: 12 }}>Create event</button>
      </div>
    </main>
  );
}
