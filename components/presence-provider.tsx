// components/presence-provider.tsx
// Supabase Realtime Presence を1チャンネルだけ購読し、結果をコンテキストで配る。
// 自分の activity は現在のルートから決める（モックの ACTIVITIES 語彙）:
//   /clinics → 架電中 / /clinics/list → 一覧を閲覧中 / /clinics/[id] → 医院詳細を確認中
// その他のルートでも妥当な語彙を割り当てる（モック realtime.js の ACTIVITIES）。
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrentMember } from "@/components/member-context";

export type PresenceMember = {
  id: string;
  name: string;
  color: string;
  activity: string;
};

type PresencePayload = PresenceMember;

const PresenceContext = createContext<PresenceMember[]>([]);

/** 現在のルート → 同僚に見せる activity（モック realtime.js の ACTIVITIES から） */
function activityFor(pathname: string): string {
  if (pathname === "/clinics") return "架電中";
  if (pathname === "/clinics/list") return "一覧を閲覧中";
  if (pathname === "/history") return "履歴を確認中";
  if (pathname === "/dashboard") return "ダッシュボードを確認中";
  if (/^\/clinics\/[^/]+$/.test(pathname)) return "医院詳細を確認中";
  return "オンライン";
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const me = useCurrentMember();
  const pathname = usePathname();
  const activity = activityFor(pathname);
  const [present, setPresent] = useState<PresenceMember[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("presence-room", {
      config: { presence: { key: me.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresencePayload>();
        const list: PresenceMember[] = [];
        for (const key of Object.keys(state)) {
          const metas = state[key];
          if (!metas || metas.length === 0) continue;
          const meta = metas[0];
          list.push({
            id: meta.id ?? key,
            name: meta.name ?? "",
            color: meta.color ?? "#0c8c8b",
            activity: meta.activity ?? "オンライン",
          });
        }
        setPresent(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: me.id,
            name: me.name,
            color: me.color,
            activity,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me.id, me.name, me.color, activity]);

  return (
    <PresenceContext.Provider value={present}>
      {children}
    </PresenceContext.Provider>
  );
}

/** present メンバー一覧（自分含む）。 */
export function usePresenceList(): PresenceMember[] {
  return useContext(PresenceContext);
}
