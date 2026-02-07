"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/utils/supabase/client";

export default function AdminPushPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [title, setTitle] = useState("WWFC");
  const [body, setBody] = useState("Training tonight 7pm — vote in/out now");
  const [url, setUrl] = useState("/events");

  const [status, setStatus] = useState("");

  // ✅ Check admin on load
  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data: me } = await supabaseBrowser
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      setIsAdmin(me?.role === "admin");
      setLoading(false);
    })();
  }, []);

  // ✅ Send push with Bearer token
  async function sendPush() {
    try {
      setStatus("Sending…");

      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setStatus("Failed: Not logged in");
        return;
      }

      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, body, url }),
      });

      const text = await res.text();

      if (!res.ok) {
        setStatus(`Failed: ${text}`);
        return;
      }

      setStatus(`Sent ✅ ${text}`);
    } catch (e: any) {
      setStatus(e?.message || "Failed to send");
    }
  }

  return (
    <div className="app-page">
      <div className="app-section">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link className="app-link" href="/admin">
            ← Admin
          </Link>
          <h1 className="app-title" style={{ margin: 0 }}>
            Send Push
          </h1>
        </div>

        <p className="app-subtitle" style={{ opacity: 0.8 }}>
          Admin-only broadcast to all subscribed devices.
        </p>

        {loading ? (
          <div className="app-card">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              Checking access…
            </div>
          </div>
        ) : !isAdmin ? (
          <div className="app-card" style={{ borderColor: "#fecaca" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              Not allowed
            </div>
            <div style={{ color: "#991b1b" }}>
              You must be an admin to send push notifications.
            </div>
          </div>
        ) : (
          <div className="app-card">
            <div style={{ fontWeight: 800, marginBottom: 10 }}>
              Push Message
            </div>

            <label style={{ fontSize: 12, opacity: 0.8 }}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                marginTop: 6,
                marginBottom: 12,
              }}
            />

            <label style={{ fontSize: 12, opacity: 0.8 }}>Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                marginTop: 6,
                marginBottom: 12,
              }}
            />

            <label style={{ fontSize: 12, opacity: 0.8 }}>
              Link (opens on tap)
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                marginTop: 6,
              }}
            />

            <button
              type="button"
              onClick={sendPush}
              style={{
                width: "100%",
                background: "#0b1f5e",
                color: "white",
                fontWeight: 800,
                padding: "12px 14px",
                borderRadius: 14,
                border: "none",
                cursor: "pointer",
                marginTop: 14,
              }}
            >
              Send Push
            </button>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
              {status ||
                "Tip: keep it short and action-led (e.g. “Vote closes at 6pm”)."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
