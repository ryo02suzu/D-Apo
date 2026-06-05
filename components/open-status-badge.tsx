// components/open-status-badge.tsx
// 設計書 §3/§4: hours から「営業中／昼休み／営業時間外／休診」を
// 判定して表示（JST基準）。時間未登録は無印。
// 現在時刻に依存するため useSyncExternalStore で評価し、SSR では
// "unknown"（非表示）→ マウント後にクライアントの実時刻で表示する。
"use client";

import { useSyncExternalStore } from "react";
import { CALL_STATUS_CLASS, CALL_STATUS_LABEL, callStatusNow } from "@/lib/hours";
import type { CallStatus, WeeklyHours } from "@/lib/types";

// 1分ごとに再評価するための外部ストア購読
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

export function OpenStatusBadge({ hours }: { hours: WeeklyHours }) {
  const status = useSyncExternalStore<CallStatus>(
    subscribe,
    () => callStatusNow(hours), // クライアントの実時刻で判定
    () => "unknown", // サーバーでは判定せず非表示
  );

  if (status === "unknown") return null;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${CALL_STATUS_CLASS[status]}`}
    >
      {CALL_STATUS_LABEL[status]}
    </span>
  );
}
