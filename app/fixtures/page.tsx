"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

type FixtureRow = {
  id: string;
  title: string;
  opponent: string | null;
  start_time: string;
  meet_time: string | null;
  location: string | null;
  kit_colour: string | null;
  type: string;
};

type VoteCountMap = Record<string, { yes: number; no: number }>;

function isoToLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  // convert to "YYYY-MM-DDTHH:mm" in local time for datetime-local input
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  const local = new Date(d.getTime() - tzOffsetMs);
  return local.toISOString().slice(0, 16);
}

function localInputToISO(localValue: string) {
  // datetime-local gives local time; convert to ISO UTC
  if (!localValue) return "";
  return new Date(localValue).toISOString();
}

export default function FixturesPage() {
  const router = useRouter();
  const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
  const [voteCounts, setVoteCounts] = useState<VoteCountMap>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");

  // Admin form state (Create OR Edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [location, setLocation] = useState("");
  const [startTimeLocal, setStartTimeLocal] = useState("");
  const [meetTimeLocal, setMeetTimeLocal] = useState("");
  const [kitColour, setKitColour] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const session = data.session;
      if (!session) return router.push("/login");

      const { data: me, error: meErr } = await supabaseBrowser
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (meErr) setStatus("Role check failed: " + meErr.message);
      setIsAdmin(me?.role === "admin");

      await loadFixturesAndCounts();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadFixturesAndCounts() {
    setStatus("");

    const { data: evs, error } = await supabaseBrowser
      .from("events")
      .select("id,title,opponent,start_time,meet_time,location,kit_colour,type")
      .eq("type", "fixture")
      .order("start_time", { ascending: true });

    if (error) {
      setStatus("Load failed: " + error.message);
      setFixtures([]);
      setVoteCounts({});
      return;
    }

    const list = (evs ?? []) as FixtureRow[];
    setFixtures(list);

    const ids = list.map((e) => e.id);
    if (ids.length === 0) {
      setVoteCounts({});
      return;
    }

    const { data: votes, error: votesErr } = await supabaseBrowser
      .from("votes")
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

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setOpponent("");
    setLocation("");
    setStartTimeLocal("");
    setMeetTimeLocal("");
    setKitColour("");
  }

  function beginEdit(f: FixtureRow) {
    setStatus("");
    setEditingId(f.id);
    setTitle(f.title ?? "");
    setOpponent(f.opponent ?? "");
    setLocation(f.location ?? "");
    setStartTimeLocal(isoToLocalInput(f.start_time));
    setMeetTimeLocal(isoToLocalInput(f.meet_time));
    setKitColour(f.kit_colour ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveFixture() {
    setStatus("");

    const { data } = await supabaseBrowser.auth.getSession();
    const session = data.session;
    if (!session) return router.push("/login");
    if (!isAdmin) return setStatus("Not allowed: admin only.");

    if (!title.trim()) return setStatus("Please add a title.");
    if (!startTimeLocal) return setStatus("Please pick a kickoff time.");

    const startISO = localInputToISO(startTimeLocal);
    const meetISO = meetTimeLocal ? localInputToISO(meetTimeLocal) : null;

    const payload: any = {
      type: "fixture",
      title: title.trim(),
      opponent: opponent.trim() || null,
      location: location.trim() || null,
      start_time: startISO,
      meet_time: meetISO,
      kit_colour: kitColour.trim() || null,
    };

    if (editingId) {
      const { error } = await supabaseBrowser.from("events").update(payload).eq("id", editingId);

      if (error) {
        setStatus("Update failed: " + error.message);
        return;
      }

      setStatus("Fixture updated ✅");
      resetForm();
      await loadFixturesAndCounts();
      return;
    }

    // create
    payload.created_by = session.user.id;
    const { error } = await supabaseBrowser.from("events").insert(payload);

    if (error) {
      setStatus("Create failed: " + error.message);
      return;
    }

    setStatus("Fixture added ✅");
    resetForm();
    await loadFixturesAndCounts();
  }

  const { nextFixture, upcomingRest, pastFixtures } = useMemo(() => {
    const now = new Date();

    const upcoming = fixtures
      .filter((f) => new Date(f.start_time) >= now)
      .sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time));

    const past = fixtures
      .filter((f) => new Date(f.start_time) < now)
      .sort((a, b) => +new Date(b.start_time) - +new Date(a.start_time));

    return {
      nextFixture: upcoming[0] ?? null,
      upcomingRest: upcoming.slice(1),
      pastFixtures: past,
    };
  }, [fixtures]);

  function FixtureCard({ f }: { f: FixtureRow }) {
    const c = voteCounts[f.id] ?? { yes: 0, no: 0 };

    return (
      <div key={f.id} style={{ border: "1px solid #eee", padding: 12, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <b>{f.title}</b>
            <div>{new Date(f.start_time).toLocaleString()}</div>
            <div>{f.location}</div>
            <div>Kit: {f.kit_colour}</div>
            {f.meet_time && <div>Meet: {new Date(f.meet_time).toLocaleString()}</div>}
          </div>

          {isAdmin && (
            <button
              onClick={() => beginEdit(f)}
              style={{
                height: 32,
                padding: "0 10px",
                borderRadius: 8,
                border: "1px solid #111",
                background: "white",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
          )}
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
          <span>
            🟢 Yes: <b>{c.yes}</b>
          </span>
          <span>
            🔴 No: <b>{c.no}</b>
          </span>
        </div>

        <button style={{ marginTop: 8 }} onClick={() => router.push(`/event/${f.id}`)}>
          Open / Vote
        </button>
      </div>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <button onClick={() => router.push("/")}>← Home</button>
      <h1>Fixtures</h1>

      {status && (
        <div style={{ marginTop: 10, marginBottom: 10, color: "#444" }}>{status}</div>
      )}

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
          <b>{editingId ? "Edit Fixture (Admin)" : "Add Fixture (Admin)"}</b>

          <div style={{ display: "grid", gap: 8, marginTop: 10, maxWidth: 420 }}>
            <label>
              Title
              <input
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Wiseman West FC vs Hayes Town"
              />
            </label>

            <label>
              Opponent (optional)
              <input
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Hayes Town"
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
              Kickoff time
              <input
                type="datetime-local"
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                value={startTimeLocal}
                onChange={(e) => setStartTimeLocal(e.target.value)}
              />
            </label>

            <label>
              Location
              <input
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Home pitch / away pitch address"
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

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={saveFixture}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #111",
                  background: "#111",
                  color: "white",
                  cursor: "pointer",
                  flex: 1,
                }}
              >
                {editingId ? "Save Changes" : "Add Fixture"}
              </button>

              {editingId && (
                <button
                  onClick={resetForm}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    background: "white",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div>Loading…</div>
      ) : fixtures.length === 0 ? (
        <div style={{ marginTop: 12, color: "#666" }}>No fixtures yet.</div>
      ) : (
        <>
          {/* Next upcoming fixture pinned */}
          {nextFixture ? (
            <div style={{ border: "2px solid #111", padding: 12, borderRadius: 10, marginBottom: 14 }}>
              <div style={{ marginBottom: 8, color: "#444" }}>
                <b>Next Fixture</b>
              </div>
              <FixtureCard f={nextFixture} />
            </div>
          ) : (
            <div style={{ marginTop: 12, marginBottom: 12, color: "#666" }}>
              No upcoming fixtures.
            </div>
          )}

          {/* Upcoming fixtures (excluding the next one) */}
          <h2 style={{ marginTop: 10 }}>Upcoming Fixtures</h2>
          {upcomingRest.length === 0 ? (
            <div style={{ marginTop: 12, color: "#666" }}>No more upcoming fixtures.</div>
          ) : (
            upcomingRest.map((f) => <FixtureCard key={f.id} f={f} />)
          )}

          {/* Past fixtures */}
          <details style={{ marginTop: 18 }}>
            <summary style={{ cursor: "pointer" }}>
              <b>Past Fixtures</b> ({pastFixtures.length})
            </summary>
            <div style={{ marginTop: 12 }}>
              {pastFixtures.length === 0 ? (
                <div style={{ color: "#666" }}>No past fixtures yet.</div>
              ) : (
                pastFixtures.map((f) => <FixtureCard key={f.id} f={f} />)
              )}
            </div>
          </details>
        </>
      )}
    </main>
  );
}
