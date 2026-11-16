"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const timer = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Install is a progressive enhancement; the site works without it.
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
