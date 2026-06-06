// components/presence-pills.tsx
// ホーム上部の presence ピル群。「○○さんが架電中」をリアルタイム表示する。
// 在席メンバーは PresenceProvider（layout で購読）から取得し、自分以外を出す。
"use client";

import { usePresenceList } from "@/components/presence-provider";
import { useCurrentMember } from "@/components/member-context";

function firstName(name: string): string {
  return (name ?? "").split(/[\s　]+/)[0] || name;
}

export function PresencePills() {
  const me = useCurrentMember();
  const present = usePresenceList();
  const others = present.filter((p) => p.id !== me.id);

  if (others.length === 0) return null;

  return (
    <div className="presence-row">
      {others.slice(0, 2).map((p) => (
        <span className="pill" key={p.id}>
          <span className="dot" style={{ background: "var(--teal)" }} />
          {firstName(p.name)}さんが{p.activity}
        </span>
      ))}
    </div>
  );
}
