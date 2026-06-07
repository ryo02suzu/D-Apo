// components/clinic-busy-badge.tsx
// 詳細画面の重複架電防止バッジ。
// 自分以外のメンバーが同じ医院を対応中なら「○○さんが対応中」を表示する。
"use client";

import { usePresenceForClinic } from "@/components/presence-provider";

function firstName(name: string): string {
  return (name ?? "").split(/[\s　]+/)[0] || name;
}

export function ClinicBusyBadge({ clinicId }: { clinicId: string }) {
  const busy = usePresenceForClinic(clinicId);
  if (!busy) return null;

  return (
    <div className="busy-row">
      <span className="busy">
        <span className="dot" />
        「{firstName(busy.name)}さんが対応中」
      </span>
    </div>
  );
}
