"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (navigator.serviceWorker?.controller) return;

    (async () => {
      try {
        if (!("serviceWorker" in navigator)) return;
        await navigator.serviceWorker.register("/sw.js");
      } catch (e) {}
    })();
  }, []);

  return null;
}
