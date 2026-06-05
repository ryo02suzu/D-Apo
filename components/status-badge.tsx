// components/status-badge.tsx
// 設計書 §3: 進捗ステータスを色付きバッジで表示（Dentia.html の .badge/.b-*）。
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/status";
import type { ClinicStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ClinicStatus }) {
  return (
    <span className={`badge b-${STATUS_COLOR[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
