// components/sw-register.tsx
// クライアントで Service Worker (/sw.js) を一度だけ登録する。失敗は握りつぶす。
"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    try {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    } catch {
      // 何もしない（防御的）。
    }
  }, []);

  return null;
}
