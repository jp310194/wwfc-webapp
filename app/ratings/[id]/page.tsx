"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type Player = { id: string; name: string };
type RatingRow = { rated_player_id: string; rating: number };
type AllRating = { rated_player_id: string; rating: number; profiles?: { name: string } | null };

export default function RatingsEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [allRatings, setAllRatings] = useState<AllRating[]>([]);

  async function loadAll() {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return router.push("/login");
    const uid = sess.session.user.id;

    // event
    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();
    if (evErr) return alert(evErr.message);
    if (ev.type !== "fixture") return alert("Ratings are only for fixtures.");
    if (new Date(ev.start_time).getTime() > Date.now()) return alert("Ratings are for past matches only.");
    setEvent(ev);

    // players list:
    // If you’ve used squad release, we’ll rate that squad (best).
    // If no squad exists, fall back to all profiles.
    const { data: squadRows, error: sErr } = await supabase
      .from("squad_members")
      .select("player_id, profiles(name)")
      .eq("event_id", id);

    let ppl: Player[] = [];
    if (!sErr && (squadRows ?? []).length > 0) {
      ppl = (squadRows ?? [])
        .map((r: any) => ({ id: r.player_id, name: r.profiles?.name ?? "?" }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } else {
      const { data: allP, error: pErr } = await supabase
        .from("profiles")
        .select("id,name")
        .order("name", { ascending: true });
      if (pErr) return alert(pErr.message);
      ppl = (allP ?? []) as any;
    }
    setPlayers(ppl);

    // my ratings for this event
    const { data: mine, error: mErr } = await supabase
      .from("player_ratings")
      .select("rated_player_id,rating")
      .eq("event_id", id)
      .eq("rater_id", uid);

    if (mErr) return alert(mErr.message);
    const map: Record<string, number> = {};
    (mine ?? []).forEach((r: any) => (map[r.rated_player_id] = r.rating));
    setMyRatings(map);

    // all ratings for averages
    const { data: all, error: aErr } = await supabase
      .from("player_ratings")
      .select("rated_player_id,rating, profiles:profiles!player_ratings_rated_player_id_fkey(name)")
      .eq("event_id", id);

    if (aErr) return alert(aErr.message);
    setAllRatings((all ?? []) as any);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const averages = useMemo(() => {
    const agg = new Map<string, { sum: number; count: number; name: string }>();
    for (const r of allRatings) {
      const name = r.profiles?.name ?? "?";
      const cur = agg.get(r.rated_player_id);
      if (!cur) agg.set(r.rated_player_id, { sum: r.rating, count: 1, name });
      else { cur.sum += r.rating; cur.count += 1; }
    }
    return agg;
  }, [allRatings]);

  async function saveAll() {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return router.push("/login");

    setSaving(true);
    try {
      const rows = players
        .filter(p => myRatings[p.id] != null)
        .map(p => ({
          event_id: id,
          rater_id: uid,
          rated_player_id: p.id,
          rating: myRatings[p.id],
          updated_at: new Date().toISOString(),
        }));

      if (rows.length === 0) return alert("Set at least one rating first.");

      const { error } = await supabase
        .from("player_ratings")
        .upsert(rows, { onConflict: "event_id,rater_id,rated_player_id" });

      if (error) return alert(error.message);

      alert("Ratings saved ✅");
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  if (!event) return <main style={{ padding: 20 }}>Loading…</main>;

  return (
    <main style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      <button onClick={() => router.push("/ratings")}>← Back</button>

      <h1 style={{ marginBottom: 6 }}>Ratings: {event.title}</h1>
      <div style={{ opacity: 0.75 }}>{new Date(event.start_time).toLocaleString()}</div>

      <section style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Rate players (1–10)</h2>

        <div style={{ display: "grid", gap: 10 }}>
          {players.map((p) => {
            const avg = averages.get(p.id);
            const avgText = avg ? (avg.sum / avg.count).toFixed(2) : "-";
            const count = avg ? avg.count : 0;

            return (
              <div key={p.id} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 800 }}>{p.name}</div>
                  <div style={{ opacity: 0.75, fontSize: 13 }}>
                    Avg: <b>{avgText}</b> ({count})
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={myRatings[p.id] ?? 5}
                    onChange={(e) =>
                      setMyRatings((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
                    }
                    style={{ width: 260 }}
                  />
                  <select
                    value={myRatings[p.id] ?? 5}
                    onChange={(e) =>
                      setMyRatings((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
                    }
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={saveAll} disabled={saving} style={{ marginTop: 14, padding: 12 }}>
          {saving ? "Saving…" : "Save my ratings"}
        </button>

        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 13 }}>
          Tip: This uses the released squad if available; otherwise it shows all players.
        </div>
      </section>
    </main>
  );
}
