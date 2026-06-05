// hooks/use-presence.ts
// Supabase Realtime Presence で「いま誰がオンラインか」を共有する。
// 自分の {name,color,activity} を track し、'sync' で全員分を集約して返す。
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PresenceMember = {
  id: string;
  name: string;
  color: string;
  activity: string;
};

type PresencePayload = {
  id: string;
  name: string;
  color: string;
  activity: string;
};

export function usePresence(me: {
  id: string;
  name: string;
  color: string;
  activity?: string;
}): PresenceMember[] {
  const [present, setPresent] = useState<PresenceMember[]>([]);
  const activity = me.activity ?? "オンライン";

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

  return present;
}
