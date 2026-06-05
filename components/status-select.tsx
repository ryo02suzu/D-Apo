// components/status-select.tsx
// 設計書 §3 Phase 3: ステータス変更（楽観的更新）。
// 詳細画面でクリック→即 UI 反映→clinics.status を更新。
// Dentia.html の .stgrid/.stbtn/.s-* グリッドで表示。
"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";
import { STATUS_OPTIONS } from "@/lib/status";
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
      <div className="stgrid">
        {STATUS_OPTIONS.map((o) => {
          const active = o.value === status;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => change(o.value)}
              aria-pressed={active}
              className={`stbtn s-${o.color}` + (active ? " on" : "")}
            >
              {o.line ? (
                <Icon
                  name={o.icon}
                  size={30}
                  sw={1.8}
                  className="line-ic"
                />
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
    </div>
  );
}
