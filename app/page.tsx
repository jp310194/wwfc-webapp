"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="app-page">
      <div className="app-section">
        <h1 className="app-title">Wiseman West FC</h1>
        <p className="app-subtitle">Squad • Fixtures • Events • Voting</p>

        <div className="nav-grid">
          {/* Left column (4) */}
          <button className="nav-card" onClick={() => router.push("/players")}>
            Players
          </button>
          <button className="nav-card" onClick={() => router.push("/fixtures")}>
            Fixtures
          </button>
          <button className="nav-card" onClick={() => router.push("/events")}>
            Events (Vote In/Out)
          </button>
          <button className="nav-card" onClick={() => router.push("/forum")}>
            Forum
          </button>

          {/* Right column (3) */}
          <button className="nav-card" onClick={() => router.push("/motm")}>
            MOTM
          </button>
          <button className="nav-card" onClick={() => router.push("/ratings")}>
            Ratings
          </button>
          <button className="nav-card" onClick={() => router.push("/profile")}>
            My Profile
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
