// components/clinic-card.tsx
// 設計書 §3: 1医院のカード（Dentia.html の .listcard）。
// 名前・ステータスバッジ・住所・電話・次回予定・営業時間バッジ・発信FAB。
import Link from "next/link";
import { CallButton } from "@/components/call-button";
import { Icon } from "@/components/icon";
import { OpenStatusBadge } from "@/components/open-status-badge";
import { StatusBadge } from "@/components/status-badge";
import type { Clinic } from "@/lib/types";

function formatNextAction(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ClinicCard({ clinic }: { clinic: Clinic }) {
  const next = formatNextAction(clinic.next_action_at);
  const tel = clinic.phone ? clinic.phone.replace(/[^\d+]/g, "") : "";

  return (
    <Link href={`/clinics/${clinic.id}`} className="listcard">
      <div className="r1">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge status={clinic.status} />
          <OpenStatusBadge hours={clinic.hours} />
        </div>
        {clinic.phone && !clinic.phone_verified && (
          <span className="ago" style={{ color: "var(--amber-fg)" }}>
            未確認
          </span>
        )}
        {!clinic.phone && <span className="ago">番号なし</span>}
      </div>

      <div className="nm">{clinic.name}</div>

      {clinic.address && (
        <div className="ad">
          {clinic.prefecture}
          {clinic.city}
          {clinic.address}
        </div>
      )}

      {clinic.phone && (
        <a
          className="te"
          href={`tel:${tel}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon name="phone" size={14} style={{ color: "var(--muted)" }} />
          {clinic.phone}
        </a>
      )}

      <div className="foot">
        <div className="meta">
          {next && (
            <span>
              <Icon name="cal" size={14} style={{ color: "var(--muted2)" }} />
              次回 {next}
            </span>
          )}
          {clinic.business_hours && (
            <span>
              <Icon name="clock" size={14} style={{ color: "var(--muted2)" }} />
              {clinic.business_hours}
            </span>
          )}
          {clinic.latest_memo && (
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
              }}
            >
              <Icon name="chat" size={14} style={{ color: "var(--muted2)" }} />
              {clinic.latest_memo}
            </span>
          )}
        </div>
        <CallButton phone={clinic.phone} compact />
      </div>
    </Link>
  );
}
