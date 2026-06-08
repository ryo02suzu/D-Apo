// components/call-log-form.tsx
// 設計書 §3 Phase 3: 架電結果＋メモを登録。
// call_logs に insert し、同時に clinics.latest_memo / status / next_action_at
// を更新する（一覧表示用の冗長カラムをここで同期）。
// Dentia.html の .stgrid/.stbtn/.ta-wrap/.btn-primary に対応。
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";
import { STATUS_OPTIONS } from "@/lib/status";
import type { ClinicStatus } from "@/lib/types";

export function CallLogForm({
  clinicId,
  defaultStatus,
  memberId,
}: {
  clinicId: string;
  defaultStatus: ClinicStatus;
  memberId: string | null;
}) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<ClinicStatus>(defaultStatus);
  const [memo, setMemo] = useState("");
  const [nextAt, setNextAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();

      // 架電履歴の追加(insert)と一覧用カラムの同期(update)は別テーブルで独立なので
      // 並列実行して保存の待ち時間を短縮する（担当者もこの医院に割り当てる）。
      const [logRes, clinicRes] = await Promise.all([
        supabase.from("call_logs").insert({
          clinic_id: clinicId,
          outcome,
          memo: memo || null,
          user_id: memberId,
        }),
        supabase
          .from("clinics")
          .update({
            status: outcome,
            latest_memo: memo || null,
            next_action_at: nextAt ? new Date(nextAt).toISOString() : null,
            ...(memberId ? { assigned_to: memberId } : {}),
          })
          .eq("id", clinicId),
      ]);
      if (logRes.error) {
        setError("登録に失敗しました");
        return;
      }
      if (clinicRes.error) {
        setError("医院情報の更新に失敗しました");
        return;
      }

      setSaved(true);
      setMemo("");
      setNextAt("");
      router.refresh(); // タイムライン・ヘッダを再取得
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div>
      <div className="fld-lbl first">結果（ステータス）</div>
      <div className="stgrid">
        {STATUS_OPTIONS.map((o) => {
          const active = o.value === outcome;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setOutcome(o.value)}
              className={`stbtn s-${o.color}` + (active ? " on" : "")}
            >
              {o.line ? (
                <Icon name={o.icon} size={30} sw={1.8} className="line-ic" />
              ) : (
                <span className="circ">
                  <Icon
                    name={o.icon}
                    size={24}
                    fill={o.fill}
                    sw={2.2}
                    style={{ color: "#fff" }}
                  />
                </span>
              )}
              {o.label}
            </button>
          );
        })}
      </div>

      <div className="fld-lbl">メモ（ヒアリング内容・次回の約束など）</div>
      <div className="ta-wrap">
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={200}
          placeholder="例）院長不在。木曜午後に再連絡の約束。"
        />
        <div className="ta-count">{memo.length}/200</div>
      </div>

      <div className="fld-lbl">次回予定（任意）</div>
      <input
        type="datetime-local"
        value={nextAt}
        onChange={(e) => setNextAt(e.target.value)}
        className="field"
      />

      {error && (
        <p
          style={{
            marginTop: 12,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--red-fg)",
          }}
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className={
          "btn btn-primary" +
          (pending ? " disabled" : "") +
          (saved ? " ok" : "")
        }
        style={{ marginTop: 18 }}
      >
        {saved ? (
          <>
            <Icon name="check" size={22} style={{ color: "#fff" }} />
            保存しました
          </>
        ) : pending ? (
          "保存中…"
        ) : (
          "結果を保存"
        )}
      </button>
    </div>
  );
}
