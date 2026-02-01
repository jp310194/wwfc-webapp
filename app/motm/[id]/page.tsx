"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type Profile = { id: string; name: string };
type VoteRow = { nominee_id: string; nominee_name: string; voter_name: string };

export default function MotmVotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [myNomineeId, setMyNomineeId] = useState<string | null>(null);
  const [votes, setVotes] = useState<VoteRow[]>([]);

  const tally = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const v of votes) {
      const cur = counts.get(v.nominee_id);
      if (cur) cur.count += 1;
      else counts.set(v.nominee_id, { name: v.nominee_name, count: 1 });
    }
    return Array.from(counts.entries())
      .map(([nominee_id, x]) => ({ nominee_id, ...x }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [votes]);

  async function loadAll() {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return router.push("/login");
    const uid = sess.session.user.id;

    // Ensure this is a past fixture
    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (evErr) return alert(evErr.message);
    if (ev.type !== "fixture") return alert("MOTM is only for fixtures.");
    if (new Date(ev.start_time).getTime() > Date.now()) return alert("MOTM voting is for past matches only.");

    setEvent(ev);

    // All players to vote for
    const { data: ppl, error: pErr } = await supabase
      .from("profiles")
      .select("id,name")
      .order("name", { ascending: true });

    if (pErr) return alert(pErr.message);
    setPlayers((ppl ?? []) as any);

    // My current vote
    const { data: mine, error: mineErr } = await supabase
      .from("motm_votes")
      .select("nominee_id")
      .eq("event_id", id)
      .eq("user_id", uid)
      .maybeSingle();

    if (mineErr) return alert(mineErr.message);
    setMyNomineeId((mine as any)?.nominee_id ?? null);

    // All votes with names (we read profiles via separate lookups)
    const { data: rawVotes, error: vErr } = await supabase
      .from("motm_votes")
      .select("nominee_id, profiles!motm_votes_user_id_fkey(name), nominee:profiles!motm_votes_nominee_id_fkey(name)")
      .eq("event_id", id);

    if (vErr) return alert(vErr.message);

    const mapped: VoteRow[] = (rawVotes ?? []).map((r: any) => ({
      nominee_id: r.nominee_id,
      nominee_name: r.nominee?.name ?? "?",
      voter_name: r.profiles?.name ?? "?",
    }));

    setVotes(mapped);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function voteFor(nomineeId: string) {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return router.push("/login");

    const { error } = await supabase
      .from("motm_votes")
      .upsert(
        { event_id: id, user_id: uid, nominee_id: nomineeId },
        { onConflict: "event_id,user_id" }
      );

    if (error) return alert(error.message);

    setMyNomineeId(nomineeId);
    await loadAll();
  }

  if (!event) return <main style={{ padding: 20 }}>Loading…</main>;

  return (
    <main style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => router.push("/motm")}>← Back to MOTM list</button>

      <h1 style={{ marginBottom: 6 }}>MOTM: {event.title}</h1>
      <div style={{ opacity: 0.75 }}>{new Date(event.start_time).toLocaleString()}</div>

      <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
        <h2 style={{ marginTop: 0 }}>Cast your vote</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => voteFor(p.id)}
              style={{
                padding: 12,
                borderRadius: 10,
                border: "1px solid #eee",
                fontWeight: myNomineeId === p.id ? 900 : 600,
              }}
            >
              {p.name} {myNomineeId === p.id ? "⭐" : ""}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          Your vote: <b>{myNomineeId ? players.find(p => p.id === myNomineeId)?.name : "not voted"}</b>
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2>Results</h2>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
          {tally.map((t) => (
            <li key={t.nominee_id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
              <b>{t.name}</b> — {t.count} vote{t.count === 1 ? "" : "s"}
            </li>
          ))}
          {tally.length === 0 && <li style={{ opacity: 0.7 }}>No votes yet.</li>}
        </ul>

        <details style={{ marginTop: 14 }}>
          <summary>Show who voted for who</summary>
          <ul>
            {votes.map((v, i) => (
              <li key={i}>{v.voter_name} → {v.nominee_name}</li>
            ))}
          </ul>
        </details>
      </section>
    </main>
  );
}
