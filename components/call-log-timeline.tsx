// components/call-log-timeline.tsx
// 設計書 §3: 架電履歴の時系列表示。
import { STATUS_BADGE_CLASS, STATUS_LABEL } from "@/lib/status";
import type { CallLogWithUser } from "@/lib/types";

function formatAt(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function CallLogTimeline({ logs }: { logs: CallLogWithUser[] }) {
  if (logs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">
        まだ架電履歴はありません
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {logs.map((log) => (
        <li key={log.id} className="flex gap-3">
          <div className="mt-1 flex flex-col items-center">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="mt-1 w-px flex-1 bg-slate-200" />
          </div>
          <div className="flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">
                {formatAt(log.created_at)}
              </span>
              <span>{log.profiles?.display_name ?? "不明"}</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${STATUS_BADGE_CLASS[log.outcome]}`}
              >
                {STATUS_LABEL[log.outcome]}
              </span>
            </div>
            {log.memo && (
              <p className="mt-1 text-sm text-slate-700">{log.memo}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
