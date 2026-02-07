import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import EnablePushButton from "@/components/EnablePushButton";
import RegisterSW from "@/components/RegisterSW";

type NextUpRow = {
  kind: "event" | "fixture";
  id: string;
  title: string;
  starts_at: string;
  location: string;
  extra: any;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HomePage() {
  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc("next_up").maybeSingle<NextUpRow>();
  const nextUp = !error ? data : null;

  return (
    <div className="app-page">
      <div className="app-section">
        <h1 className="app-title">Wiseman West FC</h1>
        <p className="app-subtitle">Squad • Fixtures • Events • Voting</p>

        {error ? (
          <div className="app-card" style={{ borderColor: "#fecaca" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Next up</div>
            <div style={{ color: "#991b1b" }}>
              Couldn’t load next fixture/event (RPC error).
            </div>
          </div>
        ) : nextUp ? (
          <div className="app-card">
            <div className="app-card-top">
              <div className="app-pill">
                {nextUp.kind === "fixture" ? "FIXTURE" : "EVENT"}
              </div>
              <div className="app-card-title">{nextUp.title}</div>
            </div>

            <div className="app-card-meta">
              <div><b>When:</b> {formatDateTime(nextUp.starts_at)}</div>
              {nextUp.location && <div><b>Where:</b> {nextUp.location}</div>}
              {nextUp.extra?.meet_time && (
                <div><b>Meet:</b> {formatDateTime(nextUp.extra.meet_time)}</div>
              )}
              {nextUp.extra?.kick_off_time && (
                <div><b>Kick off:</b> {formatDateTime(nextUp.extra.kick_off_time)}</div>
              )}
              {nextUp.extra?.kit_colour && (
                <div><b>Kit:</b> {nextUp.extra.kit_colour}</div>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <Link
                className="app-link"
                href={nextUp.kind === "fixture" ? "/fixtures" : "/events"}
              >
                View all {nextUp.kind === "fixture" ? "fixtures" : "events"} →
              </Link>
            </div>
          </div>
        ) : (
          <div className="app-card">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Next up</div>
            <div style={{ opacity: 0.8 }}>No upcoming fixture/event found.</div>
          </div>
        )}

        {/* Registers your PWA service worker */}
        <RegisterSW />

        <div className="app-grid">
          <Link className="app-tile" href="/profile">My Profile</Link>
          <Link className="app-tile" href="/players">Players</Link>
          <Link className="app-tile" href="/transfer-value">Transfer Value</Link>
          <Link className="app-tile" href="/events">Events</Link>
          <Link className="app-tile" href="/performance">Performance</Link>
          <Link className="app-tile" href="/fixtures">Fixtures</Link>
          <Link className="app-tile" href="/league-table">League Table</Link>
          <Link className="app-tile" href="/forum">Forum</Link>
          <Link className="app-tile" href="/ratings">Ratings</Link>
          <Link className="app-tile" href="/motm">MOTM</Link>
        </div>

        {/* Push button */}
        <EnablePushButton />
      </div>
    </div>
  );
}
