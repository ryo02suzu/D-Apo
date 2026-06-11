// components/clinic-card.tsx
// 一覧の医院カード（モック .listcard）。
// r1=Badge+「N分前更新/未架電」、名前、住所、電話、フッター（次回・担当者 + ミニ発信FAB）。
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { CallButton } from "@/components/call-button";
import { Icon } from "@/components/icon";
import { OpenStatusBadge } from "@/components/open-status-badge";
import { StatusBadge } from "@/components/status-badge";
import { fmtAgo } from "@/lib/time";
import type { Clinic } from "@/lib/types";

function firstName(name: string): string {
  return (name ?? "").split(/[\s　]+/)[0] || name;
}

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

export function ClinicCard({
  clinic,
  busyBy,
}: {
  clinic: Clinic;
  busyBy?: { name: string; color: string } | null;
}) {
  const next = formatNextAction(clinic.next_action_at);
  const tel = clinic.phone ? clinic.phone.replace(/[^\d+]/g, "") : "";
  const ago =
    clinic.status === "not_called"
      ? "未架電"
      : `${fmtAgo(clinic.updated_at)}更新`;

  return (
    <Link href={`/clinics/${clinic.id}`} className="listcard">
      <div className="r1">
        <StatusBadge status={clinic.status} />
        <OpenStatusBadge hours={clinic.hours} />
        {busyBy && (
          <span className="busy">
            <span className="dot" />
            {firstName(busyBy.name)}さんが対応中
          </span>
        )}
        <span className="ago">{ago}</span>
      </div>

      <div className="nm">{clinic.name}</div>

      {clinic.address && <div className="ad">{clinic.address}</div>}

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
          <span>
            {clinic.members ? (
              <>
                <Avatar
                  name={clinic.members.name}
                  color={clinic.members.color}
                  size={16}
                />
                担当 {clinic.members.name}
              </>
            ) : (
              <>
                <Icon name="user" size={14} style={{ color: "var(--muted2)" }} />
                未割当
              </>
            )}
          </span>
          {!clinic.phone && (
            <span>
              <Icon name="phoneOff" size={14} style={{ color: "var(--muted2)" }} />
              番号なし
            </span>
          )}
        </div>
        <CallButton phone={clinic.phone} compact />
      </div>
    </Link>
  );
}
