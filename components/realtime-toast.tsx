// components/realtime-toast.tsx
// 同僚の架電結果更新をリアルタイム通知するトースト（モックの体験の核）。
// call_logs の INSERT を購読し、発信者(members)と医院(clinics)を引いて
// 「{name} {医院名}を「{ステータス}」に更新」を上部に出す。3.6sで自動消去。
// 自分（currentMember）の更新はスキップ。
"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { useCurrentMember } from "@/components/member-context";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABEL } from "@/lib/status";
import type { CallLog, ClinicStatus } from "@/lib/types";

type ToastData = {
  id: string;
  name: string;
  color: string;
  text: string;
};

export function RealtimeToast() {
  const me = useCurrentMember();
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("call-logs-toast")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_logs" },
        async (payload) => {
          const row = payload.new as CallLog;
          // 自分の更新はスキップ
          if (row.user_id && row.user_id === me.id) return;

          // 発信者・医院名を引く
          const [memberRes, clinicRes] = await Promise.all([
            row.user_id
              ? supabase
                  .from("members")
                  .select("name,color")
                  .eq("id", row.user_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            supabase
              .from("clinics")
              .select("name")
              .eq("id", row.clinic_id)
              .maybeSingle(),
          ]);

          const member = memberRes.data as
            | { name: string; color: string }
            | null;
          const clinic = clinicRes.data as { name: string } | null;
          const label = STATUS_LABEL[row.outcome as ClinicStatus] ?? row.outcome;
          const clinicName = clinic?.name ?? "医院";

          setToast({
            id: row.id,
            name: member?.name ?? "メンバー",
            color: member?.color ?? "#9aa4ae",
            text: `${clinicName}を「${label}」に更新`,
          });

          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setToast(null), 3600);
        },
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [me.id]);

  if (!toast) return null;

  return (
    <div className="toast" key={toast.id}>
      <Avatar name={toast.name} color={toast.color} size={30} />
      <div className="t-body">
        <b>{toast.name}</b>
        <span>{toast.text}</span>
      </div>
      <span className="t-dot" style={{ background: "var(--green)" }} />
    </div>
  );
}
