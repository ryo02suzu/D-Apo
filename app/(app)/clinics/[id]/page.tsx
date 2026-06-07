// app/(app)/clinics/[id]/page.tsx
// 設計書 §3 / モック DetailScreen: 医院詳細。
// .p3-top（医院名＋発信FAB） / .tel / .badges（ステータス＋「N前更新」） /
// .tabs（履歴・基本情報の2タブ） / .p3foot（架電結果を追加）。
// 架電結果の入力は別ルート /clinics/[id]/result に移動。
import { notFound } from "next/navigation";
import Link from "next/link";
import { CallLogTimeline } from "@/components/call-log-timeline";
import { ClinicBusyBadge } from "@/components/clinic-busy-badge";
import { ClinicDetailTabs } from "@/components/clinic-detail-tabs";
import { Icon } from "@/components/icon";
import { PhoneEditor } from "@/components/phone-editor";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentMember } from "@/lib/member";
import { selectClinic, selectClinicLogs } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { fmtAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ClinicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();
  await getCurrentMember();

  const c = await selectClinic(supabase, id);
  if (!c) notFound();

  const logs = await selectClinicLogs(supabase, id);
  const tel = c.phone ? c.phone.replace(/[^\d+]/g, "") : "";
  const ago = fmtAgo(c.updated_at);
  const mapQuery = encodeURIComponent(
    c.address || [c.prefecture, c.city, c.name].filter(Boolean).join(" "),
  );

  return (
    <div className="pbody np">
      <div className="p3-top">
        <div className="name">{c.name}</div>
        {c.phone && (
          <a className="call-fab" href={`tel:${tel}`}>
            <Icon name="phone" fill size={24} style={{ color: "#fff" }} />
          </a>
        )}
      </div>

      {c.phone && (
        <a className="tel" href={`tel:${tel}`}>
          <Icon name="phone" size={16} style={{ color: "var(--muted)" }} />
          {c.phone}
        </a>
      )}

      <div className="badges">
        <StatusBadge status={c.status} />
        {ago && <span className="badge b-gray">{ago}更新</span>}
      </div>

      <ClinicBusyBadge clinicId={c.id} />

      <ClinicDetailTabs
        defaultTab={tab === "info" ? "info" : "history"}
        history={<CallLogTimeline logs={logs} />}
        info={
          <div className="info">
            <div className="info-row">
              <span className="ik">電話番号</span>
              <div className="iv" style={{ flex: 1, minWidth: 0 }}>
                <PhoneEditor
                  clinicId={c.id}
                  phone={c.phone}
                  phoneSource={c.phone_source}
                  phoneVerified={c.phone_verified}
                />
              </div>
            </div>
            {c.address && (
              <div className="info-row">
                <span className="ik">住所</span>
                <span className="iv">{c.address}</span>
              </div>
            )}
            {c.business_hours && (
              <div className="info-row">
                <span className="ik">診療時間</span>
                <span className="iv">{c.business_hours}</span>
              </div>
            )}
            <div className="info-row">
              <span className="ik">担当者</span>
              <span className="iv">{c.members?.name ?? "未割当"}</span>
            </div>
            <div className="info-row">
              <span className="ik">エリア</span>
              <span className="iv">
                {c.prefecture} {c.city}
              </span>
            </div>
            <a
              className="map"
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="pin" size={20} style={{ color: "var(--teal)" }} />
              <span>地図で開く</span>
            </a>
          </div>
        }
      />

      <div className="p3foot">
        <Link href={`/clinics/${c.id}/result`} className="btn btn-outline">
          <Icon name="plus" size={18} />
          架電結果を追加
        </Link>
      </div>
    </div>
  );
}
