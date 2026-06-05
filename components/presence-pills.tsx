// components/presence-pills.tsx
// ホーム上部の presence ピル群。「○○さんが架電中」をリアルタイム表示する。
// 自分以外の present メンバーを表示。誰もいなければ何も描かない。
"use client";

import { usePresence } from "@/hooks/use-presence";
import { useCurrentMember } from "@/components/member-context";

function firstName(name: string): string {
  return (name ?? "").split(/[\s　]+/)[0] || name;
}

export function PresencePills({ activity = "架電中" }: { activity?: string }) {
  const me = useCurrentMember();
  const present = usePresence({ ...me, activity });
  const others = present.filter((p) => p.id !== me.id);

  if (others.length === 0) return null;

  return (
    <div className="presence-row">
      {others.slice(0, 3).map((p) => (
        <span className="pill" key={p.id}>
          <span className="dot" style={{ background: p.color }} />
          {firstName(p.name)}さんが{p.activity}
        </span>
      ))}
    </div>
  );
}
