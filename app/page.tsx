"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="app-page">
      <div className="app-section">
        <h1 className="app-title">Wiseman West FC</h1>
        <p className="app-subtitle">Squad • Fixtures • Events • Voting</p>

        <div className="app-actions">
          <button className="app-btn" onClick={() => router.push("/profile")}>
            My Profile
          </button>
          <button className="app-btn" onClick={() => router.push("/players")}>
            Players
          </button>
          <button className="app-btn" onClick={() => router.push("/fixtures")}>
            Fixtures
          </button>
          <button className="app-btn" onClick={() => router.push("/events")}>
            Events
          </button>
          <button className="app-btn" onClick={() => router.push("/admin")}>
            Admin
          </button>
          <button className="app-btn" onClick={() => router.push("/forum")}>
            Forum
          </button>
          <button className="app-btn" onClick={() => router.push("/ratings")}>
            Ratings
          </button>
        </div>
      </div>

      <div className="app-section">
        <h2 className="app-heading">Quick tips</h2>
        <ul className="app-list">
          <li>Admins create events in <b>Admin</b>.</li>
          <li>Players vote in/out on the <b>Events</b> page.</li>
          <li>Check <b>Fixtures</b> for upcoming matches.</li>
        </ul>
      </div>
    </div>
  );
}
