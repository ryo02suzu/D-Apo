// components/status-badge.tsx
// 設計書 §3: 進捗ステータスを色付きバッジで表示。
import { STATUS_BADGE_CLASS, STATUS_LABEL } from "@/lib/status";
import type { ClinicStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ClinicStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
