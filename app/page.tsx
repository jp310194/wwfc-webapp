"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState<string>("player");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.push("/login");

      const uid = sess.session.user.id;
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("name,role")
        .eq("id", uid)
        .single();

      if (error) return alert(error.message);

      setName(prof?.name ?? "");
      setRole(prof?.role ?? "player");
    })();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1>Wiseman West Football Club</h1>
      <div style={{ opacity: 0.75, marginTop: 4 }}>
        {name ? `Signed in as ${name}` : ""} {role ? `· ${role}` : ""}
      </div>

      {/* BUTTON ROW */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        <button onClick={() => router.push("/players")}>Players</button>
        <button onClick={() => router.push("/fixtures")}>Fixtures</button>
        <button onClick={() => router.push("/events")}>Upcoming Events</button>
        <button onClick={() => router.push("/motm")}>MOTM Voting</button>
        {role === "admin" && <button onClick={() => router.push("/admin")}>Admin</button>}
        <button onClick={logout}>Log out</button>
<button onClick={() => router.push("/profile")}>My Profile</button>
<button onClick={() => router.push("/forum")}>Forum</button>
<button onClick={() => router.push("/ratings")}>Ratings</button>


      </div>

      <section style={{ marginTop: 18, border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Quick tips</h2>
        <ul style={{ marginTop: 6 }}>
          <li>Admins create events in <b>Admin</b>.</li>
          <li>Players vote <b>In/Maybe/Out</b> inside each event.</li>
          <li><b>MOTM Voting</b> is for past fixtures.</li>
        </ul>
      </section>
    </main>
  );
}
