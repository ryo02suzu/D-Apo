// components/call-log-timeline.tsx
// 設計書 §3: 架電履歴の時系列表示（Dentia.html の .timeline/.tl/.ring/.note）。
import { StatusBadge } from "@/components/status-badge";
import { STATUS_COLOR } from "@/lib/status";
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
      <p className="empty" style={{ paddingTop: 30 }}>
        まだ架電履歴がありません
      </p>
    );
  }

  return (
    <div className="timeline">
      {logs.map((log, i) => (
        <div className="tl" key={log.id}>
          <div className="rail">
            <div className={`ring r-${STATUS_COLOR[log.outcome]}`} />
            {i < logs.length - 1 && <div className="stem" />}
          </div>
          <div className="body">
            <div className="meta">
              <span className="dt">{formatAt(log.created_at)}</span>
              <span className="who">{log.members?.name ?? "不明"}</span>
              <StatusBadge status={log.outcome} />
            </div>
            <div className="note">{log.memo || "—"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
