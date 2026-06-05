// app/(app)/clinics/[id]/page.tsx
// 設計書 §3: 医院詳細。基本情報＋発信ボタン＋ステータス変更＋
// メモ付き架電結果フォーム＋過去履歴のタイムライン。
// Dentia.html の .p3-top / .badges / .tabs / .timeline / .info-row に対応。
import Link from "next/link";
import { notFound } from "next/navigation";
import { CallLogForm } from "@/components/call-log-form";
import { CallLogTimeline } from "@/components/call-log-timeline";
import { ClinicDetailTabs } from "@/components/clinic-detail-tabs";
import { Icon } from "@/components/icon";
import { OpenStatusBadge } from "@/components/open-status-badge";
import { PhoneEditor } from "@/components/phone-editor";
import { StatusBadge } from "@/components/status-badge";
import { StatusSelect } from "@/components/status-select";
import { createClient } from "@/lib/supabase/server";
import type { CallLogWithUser, Clinic } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", id)
    .single();

  if (!clinic) notFound();
  const c = clinic as Clinic;

  const { data: logsData } = await supabase
    .from("call_logs")
    .select("*, profiles(display_name)")
    .eq("clinic_id", id)
    .order("created_at", { ascending: false });

  const logs = (logsData ?? []) as CallLogWithUser[];
  const tel = c.phone ? c.phone.replace(/[^\d+]/g, "") : "";

  return (
    <div className="pbody np">
      <div className="apphead" style={{ margin: "0 -18px", borderBottom: "none" }}>
        <Link href="/clinics" className="ah-btn">
          <Icon name="chevL" />
        </Link>
        <span className="title" />
        <span style={{ width: 34 }} />
      </div>

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
        <OpenStatusBadge hours={c.hours} />
      </div>

      <ClinicDetailTabs
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
                <span className="iv">
                  {c.prefecture}
                  {c.city}
                  {c.address}
                </span>
              </div>
            )}
            {c.business_hours && (
              <div className="info-row">
                <span className="ik">診療時間</span>
                <span className="iv">{c.business_hours}</span>
              </div>
            )}
            <div className="info-row">
              <span className="ik">エリア</span>
              <span className="iv">
                {c.prefecture} {c.city}
              </span>
            </div>
          </div>
        }
        result={
          <div style={{ paddingTop: 18 }}>
            <div className="fld-lbl first">現在のステータス</div>
            <StatusSelect clinicId={c.id} value={c.status} />
            <div
              className="divider"
              style={{ margin: "22px -18px 0" }}
            />
            <CallLogForm clinicId={c.id} defaultStatus={c.status} />
          </div>
        }
      />
    </div>
  );
}
