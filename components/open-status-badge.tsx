// components/open-status-badge.tsx
// 設計書 §3/§4: hours から「営業中／昼休み／営業時間外／休診」を
// 判定して表示（JST基準）。時間未登録は無印。
// 現在時刻に依存するため useSyncExternalStore で評価し、SSR では
// "unknown"（非表示）→ マウント後にクライアントの実時刻で表示する。
"use client";

import { useSyncExternalStore } from "react";
import { CALL_STATUS_LABEL, callStatusNow } from "@/lib/hours";
import type { CallStatus, WeeklyHours } from "@/lib/types";

// 1分ごとに再評価するための外部ストア購読
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

// CallStatus → デザインモック（Dentia.html）のバッジ配色キー
const CALL_STATUS_COLOR: Record<CallStatus, string> = {
  open: "green",
  lunch: "amber",
  closed_today: "gray",
  off: "red",
  unknown: "gray",
};

export function OpenStatusBadge({ hours }: { hours: WeeklyHours }) {
  const status = useSyncExternalStore<CallStatus>(
    subscribe,
    () => callStatusNow(hours), // クライアントの実時刻で判定
    () => "unknown", // サーバーでは判定せず非表示
  );

  if (status === "unknown") return null;

  return (
    <span className={`badge b-${CALL_STATUS_COLOR[status]}`}>
      {CALL_STATUS_LABEL[status]}
    </span>
  );
}
