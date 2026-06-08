// components/presence-provider.tsx
// Supabase Realtime Presence を1チャンネルだけ購読し、結果をコンテキストで配る。
// 自分の activity は現在のルートから決める（モックの ACTIVITIES 語彙）:
//   /clinics → 架電中 / /clinics/list → 一覧を閲覧中 / /clinics/[id] → 医院詳細を確認中
// その他のルートでも妥当な語彙を割り当てる（モック realtime.js の ACTIVITIES）。
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrentMember } from "@/components/member-context";

export type PresenceMember = {
  id: string;
  name: string;
  color: string;
  activity: string;
  clinicId: string | null;
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

/**
 * 現在のルート → 対応中の医院ID。
 * /clinics/{id} または /clinics/{id}/result の {id}。
 * /clinics/list・/clinics/review は除外（null）。
 */
function clinicIdFor(pathname: string): string | null {
  const m = pathname.match(/^\/clinics\/([^/]+)(?:\/result)?$/);
  if (!m) return null;
  const id = m[1];
  if (id === "list" || id === "review") return null;
  return id;
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const me = useCurrentMember();
  const pathname = usePathname();
  const activity = activityFor(pathname);
  const clinicId = clinicIdFor(pathname);
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
            clinicId: meta.clinicId ?? null,
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
            clinicId,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me.id, me.name, me.color, activity, clinicId]);

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

/**
 * 指定医院を対応中の「自分以外の最初のメンバー」を返す（重複架電防止表示用）。
 * 該当が無ければ null。
 */
export function usePresenceForClinic(clinicId: string): PresenceMember | null {
  const present = usePresenceList();
  const me = useCurrentMember();
  return (
    present.find((p) => p.id !== me.id && p.clinicId === clinicId) ?? null
  );
}
