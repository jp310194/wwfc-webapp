"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

   return (

  <main style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>

    <h1 className="app-title">Wiseman West FC</h1>
    <p className="app-subtitle">Squad • Fixtures • Events • Voting</p>

    <div className="dashboard-grid">

      <div className="dashboard-card" onClick={() => router.push("/players")}>
        <h2>Players</h2>
      </div>

      <div className="dashboard-card" onClick={() => router.push("/fixtures")}>
        <h2>Fixtures</h2>
      </div>

      <div className="dashboard-card" onClick={() => router.push("/events")}>
        <h2>Events</h2>
      </div>

      <div className="dashboard-card" onClick={() => router.push("/ratings")}>
        <h2>Ratings</h2>
      </div>

      <div className="dashboard-card" onClick={() => router.push("/forum")}>
        <h2>Forum</h2>
      </div>

      <div className="dashboard-card" onClick={() => router.push("/profile")}>
        <h2>My Profile</h2>
      </div>

      <div className="dashboard-card" onClick={() => router.push("/admin")}>
        <h2>Admin</h2>
      </div>

    </div>

  </main>
 );

}
