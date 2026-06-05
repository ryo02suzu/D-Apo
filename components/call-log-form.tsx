// components/call-log-form.tsx
// 設計書 §3 Phase 3: 架電結果＋メモを登録。
// call_logs に insert し、同時に clinics.latest_memo / status / next_action_at
// を更新する（一覧表示用の冗長カラムをここで同期）。
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import type { ClinicStatus } from "@/lib/types";

export function CallLogForm({
  clinicId,
  defaultStatus,
}: {
  clinicId: string;
  defaultStatus: ClinicStatus;
}) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<ClinicStatus>(defaultStatus);
  const [memo, setMemo] = useState("");
  const [nextAt, setNextAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();

      // 1) 架電履歴を追加（合言葉方式のため記名なし）
      const { error: logErr } = await supabase.from("call_logs").insert({
        clinic_id: clinicId,
        outcome,
        memo: memo || null,
      });
      if (logErr) {
        setError("登録に失敗しました");
        return;
      }

      // 2) 一覧表示用の冗長カラムを同期
      const { error: clinicErr } = await supabase
        .from("clinics")
        .update({
          status: outcome,
          latest_memo: memo || null,
          next_action_at: nextAt ? new Date(nextAt).toISOString() : null,
        })
        .eq("id", clinicId);
      if (clinicErr) {
        setError("医院情報の更新に失敗しました");
        return;
      }

      setMemo("");
      setNextAt("");
      router.refresh(); // タイムライン・ヘッダを再取得
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">
          結果（ステータス）
        </label>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setOutcome(s)}
              className={`rounded-xl px-2 py-2.5 text-sm font-medium transition ${
                s === outcome
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">
          メモ（ヒアリング内容・次回の約束など）
        </label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          placeholder="例）院長不在。木曜午後に再連絡の約束。"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">
          次回予定（任意）
        </label>
        <input
          type="datetime-local"
          value={nextAt}
          onChange={(e) => setNextAt(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "保存中…" : "結果を保存"}
      </button>
    </div>
  );
}
