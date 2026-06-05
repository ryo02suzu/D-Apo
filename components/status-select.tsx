// components/status-select.tsx
// 設計書 §3 Phase 3: ステータス変更（楽観的更新）。
// 詳細画面でクリック→即 UI 反映→clinics.status を更新。
"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_BADGE_CLASS, STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import type { ClinicStatus } from "@/lib/types";

export function StatusSelect({
  clinicId,
  value,
}: {
  clinicId: string;
  value: ClinicStatus;
}) {
  const [status, setStatus] = useState<ClinicStatus>(value);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: ClinicStatus) {
    if (next === status) return;
    const prev = status;
    setStatus(next); // 楽観的更新
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("clinics")
        .update({ status: next })
        .eq("id", clinicId);
      if (error) {
        setStatus(prev); // ロールバック
        setError("更新に失敗しました");
      }
    });
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {STATUS_ORDER.map((s) => {
          const active = s === status;
          return (
            <button
              key={s}
              type="button"
              onClick={() => change(s)}
              aria-pressed={active}
              className={`rounded-xl px-2 py-3 text-sm font-medium transition ${
                active
                  ? `${STATUS_BADGE_CLASS[s]} ring-2 ring-emerald-400`
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
