// components/clinic-card.tsx
// 設計書 §3: 1医院のカード。名前・ステータスバッジ・診療時間・
// 営業時間バッジ・次回予定・ワンタップ発信。
import Link from "next/link";
import { CallButton } from "@/components/call-button";
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

  return (
    <Link
      href={`/clinics/${clinic.id}`}
      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={clinic.status} />
          <OpenStatusBadge hours={clinic.hours} />
        </div>

        <h3 className="mt-1.5 truncate text-base font-bold text-slate-900">
          {clinic.name}
        </h3>

        {clinic.address && (
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {clinic.prefecture}
            {clinic.city}
            {clinic.address}
          </p>
        )}

        {clinic.business_hours && (
          <p className="mt-1 truncate text-xs text-slate-400">
            🕒 {clinic.business_hours}
          </p>
        )}

        {next && (
          <p className="mt-1 text-xs font-medium text-emerald-700">
            次回予定: {next}
          </p>
        )}

        {clinic.latest_memo && (
          <p className="mt-1 line-clamp-1 text-xs text-slate-500">
            💬 {clinic.latest_memo}
          </p>
        )}
      </div>

      <div className="shrink-0 self-center">
        <CallButton phone={clinic.phone} compact />
      </div>
    </Link>
  );
}
