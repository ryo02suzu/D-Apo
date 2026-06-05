// components/phone-editor.tsx
// 詳細画面の電話番号の表示・手入力・確認。
// - Placesの自動採用は phone_verified=false（未確認）→ ここで人が確認できる
// - 手入力は source='manual' / verified=true（最も信頼できる）
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PhoneEditor({
  clinicId,
  phone,
  phoneSource,
  phoneVerified,
}: {
  clinicId: string;
  phone: string | null;
  phoneSource: string | null;
  phoneVerified: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(phone ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const tel = phone ? phone.replace(/[^\d+]/g, "") : "";
  const unverified = !!phone && !phoneVerified;

  function save() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const next = value.trim() || null;
      const { error } = await supabase
        .from("clinics")
        .update({
          phone: next,
          phone_source: "manual",
          phone_verified: !!next, // 手入力＝確認済み
        })
        .eq("id", clinicId);
      if (error) {
        setError("保存に失敗しました");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function markVerified() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase
        .from("clinics")
        .update({ phone_verified: true })
        .eq("id", clinicId);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <input
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="03-1234-5678"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(phone ?? "");
              setEditing(false);
            }}
            className="rounded-lg px-3 py-2 text-sm text-slate-500"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {phone ? (
        <a href={`tel:${tel}`} className="text-lg font-bold text-emerald-700 underline">
          {phone}
        </a>
      ) : (
        <span className="text-sm text-slate-400">電話番号 未登録</span>
      )}

      {unverified && (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          未確認{phoneSource === "places" ? "（自動取得）" : ""}
        </span>
      )}
      {phone && phoneVerified && (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          確認済
        </span>
      )}

      <div className="ml-auto flex gap-2">
        {unverified && (
          <button
            type="button"
            onClick={markVerified}
            disabled={pending}
            className="rounded-lg border border-emerald-300 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            確認済みにする
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          {phone ? "編集" : "番号を追加"}
        </button>
      </div>
    </div>
  );
}
