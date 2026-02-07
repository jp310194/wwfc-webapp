"use client";

import { useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export default function EnablePushButton() {
  const [status, setStatus] = useState("");

  async function enablePush() {
    try {
      setStatus("Clicked…");

      if (!("serviceWorker" in navigator)) {
        setStatus("Service workers not supported.");
        return;
      }
      if (!("PushManager" in window)) {
        setStatus("Push not supported on this browser.");
        return;
      }

      // 1) Ensure a SW is installed AND controlling this page
      if (!navigator.serviceWorker.controller) {
        setStatus("Installing service worker…");
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // If still not controlling, force a reload (most reliable across Safari/PWA setups)
        setStatus("Service worker installed. Reloading to activate…");
        window.location.reload();
        return;
      }

      // 2) Permission
      if (Notification.permission === "denied") {
        setStatus("Notifications are blocked for this site.");
        return;
      }
      if (Notification.permission !== "granted") {
        setStatus("Requesting permission…");
        const p = await Notification.requestPermission();
        if (p !== "granted") {
          setStatus("Permission not granted.");
          return;
        }
      }

      // 3) Get the active registration
      setStatus("Getting registration…");
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) {
        setStatus("No SW registration found. Refresh and try again.");
        return;
      }

      // 4) Subscribe (or reuse existing)
      setStatus("Checking existing subscription…");
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          setStatus("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
          return;
        }

        setStatus("Subscribing…");
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      } else {
        setStatus("Already subscribed — saving…");
      }

      // 5) Save to your API
      setStatus("Saving subscription…");
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      if (!res.ok) {
        const txt = await res.text();
        setStatus(`Save failed: ${txt}`);
        return;
      }

      setStatus("Push notifications enabled ✅ (saved)");
    } catch (e: any) {
      setStatus(e?.message || "Failed enabling push.");
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <button
        type="button"
        style={{
          width: "100%",
          background: "#0b1f5e",
          color: "white",
          fontWeight: 800,
          padding: "12px 14px",
          borderRadius: 14,
          border: "none",
          cursor: "pointer",
        }}
        onClick={enablePush}
      >
        Enable Push Notifications
      </button>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
        {status || "Click to enable (it may reload once)."}
      </div>
    </div>
  );
}
