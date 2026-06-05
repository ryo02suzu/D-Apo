// app/(app)/history/page.tsx
// 履歴（HistoryScreen）：全 call_logs を新しい順に並べたフィード。
// 発信者（members）と医院名（clinics）を join して表示。
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { StatusBadge } from "@/components/status-badge";
import { selectCallLogFeed } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatAt(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function HistoryScreen() {
  const supabase = await createClient();
  const feed = await selectCallLogFeed(supabase, 200);

  return (
    <div className="pbody list-body">
      <div className="sec-head" style={{ paddingTop: 14, marginBottom: 0 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800 }}>架電履歴</h3>
        <span className="count-pill">{feed.length}件</span>
      </div>

      {feed.length === 0 ? (
        <p className="empty" style={{ paddingTop: 40 }}>
          まだ架電履歴がありません
        </p>
      ) : (
        <div className="feed">
          {feed.map((h) => {
            const name = h.members?.name ?? "不明";
            const color = h.members?.color ?? "#9aa4ae";
            const body = (
              <>
                <Avatar name={name} color={color} size={36} />
                <div className="fi-body">
                  <div className="fi-top">
                    <b>{h.clinics?.name ?? "(不明な医院)"}</b>
                    <span className="fi-time">{formatAt(h.created_at)}</span>
                  </div>
                  <div className="fi-cl">
                    <StatusBadge status={h.outcome} />
                    <span>{name}</span>
                  </div>
                  {h.memo && <div className="fi-note">{h.memo}</div>}
                </div>
              </>
            );
            return h.clinics?.id ? (
              <Link key={h.id} href={`/clinics/${h.clinics.id}`} className="feed-item">
                {body}
              </Link>
            ) : (
              <div key={h.id} className="feed-item">
                {body}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
