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
      <div>
        <input
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="03-1234-5678"
          className="field"
        />
        {error && (
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--red-fg)",
            }}
          >
            {error}
          </p>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className={"btn btn-primary btn-sm" + (pending ? " disabled" : "")}
            style={{ width: "auto", flex: 1 }}
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(phone ?? "");
              setEditing(false);
            }}
            className="btn btn-outline btn-sm"
            style={{ width: "auto", flex: 1 }}
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
      }}
    >
      {phone ? (
        <a
          href={`tel:${tel}`}
          className="tel"
          style={{ marginTop: 0, color: "var(--teal)", fontSize: 16 }}
        >
          {phone}
        </a>
      ) : (
        <span style={{ fontSize: 14, color: "var(--muted2)" }}>
          電話番号 未登録
        </span>
      )}

      {unverified && (
        <span className="badge b-amber">
          未確認{phoneSource === "places" ? "（自動取得）" : ""}
        </span>
      )}
      {phone && phoneVerified && <span className="badge b-green">確認済</span>}

      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        {unverified && (
          <button
            type="button"
            onClick={markVerified}
            disabled={pending}
            className="chip"
            style={{ padding: "6px 11px", fontSize: 12 }}
          >
            確認済みにする
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="chip"
          style={{ padding: "6px 11px", fontSize: 12 }}
        >
          {phone ? "編集" : "番号を追加"}
        </button>
      </div>
    </div>
  );
}
