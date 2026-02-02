"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type EventRow = {
  id: string;
  title: string;
  start_time: string;
  location: string | null;
  kit_colour: string | null;
  type: string;
};

type VoteCountMap = Record<string, { yes: number; no: number }>;

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [voteCounts, setVoteCounts] = useState<VoteCountMap>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");

  // Admin create form state (Training)
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startTimeLocal, setStartTimeLocal] = useState(""); // datetime-local
  const [meetTimeLocal, setMeetTimeLocal] = useState(""); // datetime-local (optional)
  const [kitColour, setKitColour] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return router.push("/login");

      // Check admin
      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      setIsAdmin(me?.role === "admin");

      await loadEventsAndCounts();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadEventsAndCounts() {
    setStatus("");

    const { data: evs, error } = await supabase
      .from("events")
      .select("*")
      .eq("type", "training")
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true });

    if (error) {
      setStatus("Load failed: " + error.message);
      setEvents([]);
      setVoteCounts({});
      return;
    }

    const eventsList = (evs ?? []) as EventRow[];
    setEvents(eventsList);

    // ✅ Count votes for all events on this page
    const ids = eventsList.map((e) => e.id);
    if (ids.length === 0) {
      setVoteCounts({});
      return;
    }

    const { data: votes, error: votesErr } = await supabase
      .from("event_votes")
      .select("event_id, vote")
      .in("event_id", ids);

    if (votesErr) {
      setStatus("Could not load vote counts: " + votesErr.message);
      setVoteCounts({});
      return;
    }

    const counts: VoteCountMap = {};
    (votes ?? []).forEach((v: any) => {
      if (!counts[v.event_id]) counts[v.event_id] = { yes: 0, no: 0 };
      if (v.vote === "yes") counts[v.event_id].yes += 1;
      if (v.vote === "no") counts[v.event_id].no += 1;
    });

    setVoteCounts(counts);
  }

  async function createTrainingEvent() {
    setStatus("");

    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return router.push("/login");
    if (!isAdmin) return setStatus("Not allowed: admin only.");

    if (!title.trim()) return setStatus("Please add a title.");
    if (!startTimeLocal) return setStatus("Please pick a start time.");

    const startISO = new Date(startTimeLocal).toISOString();
    const meetISO = meetTimeLocal ? new Date(meetTimeLocal).toISOString() : null;

    const payload: any = {
      type: "training",
      title: title.trim(),
      location: location.trim() || null,
      start_time: startISO,
      meet_time: meetISO,
      kit_colour: kitColour.trim() || null,
      created_by: session.user.id,
    };

    const { error } = await supabase.from("events").insert(payload);

    if (error) {
      setStatus("Create failed: " + error.message);
      return;
    }

    setTitle("");
    setLocation("");
    setStartTimeLocal("");
    setMeetTimeLocal("");
    setKitColour("");
    setStatus("Training added ✅");

    await loadEventsAndCounts();
  }

  return (
    <main style={{ padding: 20 }}>
      <button onClick={() => router.push("/")}>← Home</button>
      <h1>Training</h1>

      {status && (
        <div style={{ marginTop: 10, marginBottom: 10, color: "#444" }}>
          {status}
        </div>
      )}

      {/* Admin: Create Training */}
      {isAdmin && (
        <div
          style={{
            border: "1px solid #ddd",
            padding: 12,
            borderRadius: 8,
            marginTop: 12,
            marginBottom: 16,
            background: "#fafafa",
          }}
        >
          <b>Add Training (Admin)</b>

          <div style={{ display: "grid", gap: 8, marginTop: 10, maxWidth: 420 }}>
            <label>
              Title
              <input
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Training Wednesday"
              />
            </label>

            <label>
              Location
              <input
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Wormwood Scrubs, Pitch 2"
              />
            </label>

            <label>
              Meet time (optional)
              <input
                type="datetime-local"
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                value={meetTimeLocal}
                onChange={(e) => setMeetTimeLocal(e.target.value)}
              />
            </label>

            <label>
              Start time
              <input
                type="datetime-local"
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                value={startTimeLocal}
                onChange={(e) => setStartTimeLocal(e.target.value)}
              />
            </label>

            <label>
              Kit colour (optional)
              <input
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                value={kitColour}
                onChange={(e) => setKitColour(e.target.value)}
                placeholder="Black / White / Blue"
              />
            </label>

            <button
              onClick={createTrainingEvent}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #111",
                background: "#111",
                color: "white",
                cursor: "pointer",
              }}
            >
              Add Training
            </button>
          </div>
        </div>
      )}

      {/* List Training */}
      {loading ? (
        <div>Loading…</div>
      ) : events.length === 0 ? (
        <div style={{ marginTop: 12, color: "#666" }}>No upcoming training yet.</div>
      ) : (
        events.map((e) => {
          const c = voteCounts[e.id] ?? { yes: 0, no: 0 };
          return (
            <div
              key={e.id}
              style={{ border: "1px solid #eee", padding: 12, marginBottom: 10 }}
            >
              <b>{e.title}</b>
              <div>{new Date(e.start_time).toLocaleString()}</div>
              <div>{e.location}</div>
              <div>Kit: {e.kit_colour}</div>

              {/* ✅ Availability counts */}
              <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
                <span>🟢 Yes: <b>{c.yes}</b></span>
                <span>🔴 No: <b>{c.no}</b></span>
              </div>

              <button style={{ marginTop: 8 }} onClick={() => router.push(`/event/${e.id}`)}>
                Open / Vote
              </button>
            </div>
          );
        })
      )}
    </main>
  );
}
