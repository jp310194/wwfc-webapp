"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type VoteRow = { status: "in" | "out" | "maybe"; name: string };
type ProfileRow = { id: string; name: string };

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [notResponded, setNotResponded] = useState<string[]>([]);

  async function loadAll() {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return router.push("/login");
    const uid = sess.session.user.id;

    // Event
    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();
    if (evErr) return alert(evErr.message);
    setEvent(ev);

    // My vote
    const { data: mine, error: mineErr } = await supabase
      .from("votes")
      .select("status")
      .eq("event_id", id)
      .eq("user_id", uid)
      .maybeSingle();
    if (mineErr) return alert(mineErr.message);
    setMyVote((mine as any)?.status ?? null);

    // All votes + voter names
    const { data: allVotes, error: vErr } = await supabase
      .from("votes")
      .select("user_id, status, profiles(name)")
      .eq("event_id", id);
    if (vErr) return alert(vErr.message);

    const mappedVotes: VoteRow[] = (allVotes ?? []).map((r: any) => ({
      status: r.status,
      name: r.profiles?.name ?? "?",
    }));
    setVotes(mappedVotes);

    // All profiles (players list)
    const { data: ppl, error: pErr } = await supabase
      .from("profiles")
      .select("id,name")
      .order("name", { ascending: true });
    if (pErr) return alert(pErr.message);

    const votedIds = new Set((allVotes ?? []).map((r: any) => r.user_id));
    const nr = ((ppl ?? []) as ProfileRow[])
      .filter(p => !votedIds.has(p.id))
      .map(p => p.name);

    setNotResponded(nr);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setVote(status: "in" | "out" | "maybe") {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return router.push("/login");

    const { error } = await supabase
      .from("votes")
      .upsert(
        { event_id: id, user_id: uid, status, updated_at: new Date().toISOString() },
        { onConflict: "event_id,user_id" }
      );

    if (error) return alert(error.message);

    setMyVote(status);
    await loadAll();
  }

  if (!event) return <main style={{ padding: 20 }}>Loading…</main>;

  const ins = votes.filter(v => v.status === "in");
  const maybes = votes.filter(v => v.status === "maybe");
  const outs = votes.filter(v => v.status === "out");

  return (
    <main style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => router.push("/events")}>← Back</button>

      <h1 style={{ marginBottom: 6 }}>{event.title}</h1>
      <div style={{ opacity: 0.75 }}>{event.type?.toUpperCase()}</div>

      <div style={{ marginTop: 12, lineHeight: 1.6 }}>
        <div><b>Date:</b> {new Date(event.start_time).toLocaleString()}</div>
        {event.location && <div><b>Location:</b> {event.location}</div>}
        {event.meet_time && <div><b>Meet:</b> {new Date(event.meet_time).toLocaleString()}</div>}
        {event.type === "fixture" && event.kick_off_time && (
          <div><b>Kick off:</b> {new Date(event.kick_off_time).toLocaleString()}</div>
        )}
        {event.kit_colour && <div><b>Kit:</b> {event.kit_colour}</div>}
      </div>

      <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
        <h2 style={{ marginTop: 0 }}>Vote availability</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setVote("in")}>✅ In</button>
          <button onClick={() => setVote("maybe")}>🤔 Maybe</button>
          <button onClick={() => setVote("out")}>❌ Out</button>
        </div>
        <div style={{ marginTop: 10 }}>
          Your vote: <b>{myVote ?? "not voted"}</b>
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2>Responses</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>✅ In ({ins.length})</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {ins.map((v, i) => <li key={i}>{v.name}</li>)}
              {ins.length === 0 && <li style={{ opacity: 0.6 }}>No votes yet</li>}
            </ul>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>🤔 Maybe ({maybes.length})</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {maybes.map((v, i) => <li key={i}>{v.name}</li>)}
              {maybes.length === 0 && <li style={{ opacity: 0.6 }}>No votes yet</li>}
            </ul>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>❌ Out ({outs.length})</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {outs.map((v, i) => <li key={i}>{v.name}</li>)}
              {outs.length === 0 && <li style={{ opacity: 0.6 }}>No votes yet</li>}
            </ul>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>⏳ Not responded ({notResponded.length})</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {notResponded.map((n, i) => <li key={i}>{n}</li>)}
              {notResponded.length === 0 && <li style={{ opacity: 0.6 }}>Everyone has responded</li>}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
