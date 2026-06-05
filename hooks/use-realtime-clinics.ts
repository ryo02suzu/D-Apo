// hooks/use-realtime-clinics.ts
// 設計書 §4: Realtime 購読フック（中核）＋ 楽観的更新。
// Server Component が取得した初期データを受け取り、以降は
// postgres_changes で差分同期する。
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Clinic, ClinicStatus } from "@/lib/types";

export function useRealtimeClinics(initial: Clinic[]) {
  const [clinics, setClinics] = useState<Clinic[]>(initial);
  const [supabase] = useState(() => createClient());

  // Server Component 側の再取得（router.refresh）で初期データが差し替わったら
  // 追従する。effect ではなく描画中に前回値と比較して同期する公式パターン。
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setClinics(initial);
  }

  useEffect(() => {
    const channel = supabase
      .channel("clinics-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinics" },
        (payload) => {
          setClinics((prev) => {
            if (payload.eventType === "INSERT")
              return [payload.new as Clinic, ...prev];
            if (payload.eventType === "UPDATE")
              return prev.map((c) =>
                c.id === (payload.new as Clinic).id
                  ? (payload.new as Clinic)
                  : c,
              );
            if (payload.eventType === "DELETE")
              return prev.filter((c) => c.id !== (payload.old as Clinic).id);
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // 楽観的更新：先に UI を反映 → 失敗したら元に戻す
  const updateStatus = useCallback(
    async (id: string, status: ClinicStatus) => {
      const prevClinic = clinics.find((c) => c.id === id);
      setClinics((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c)),
      );
      const { error } = await supabase
        .from("clinics")
        .update({ status })
        .eq("id", id);
      if (error && prevClinic) {
        // 失効時はロールバック（トースト演出は呼び出し側で）
        setClinics((prev) =>
          prev.map((c) => (c.id === id ? prevClinic : c)),
        );
        throw error;
      }
    },
    [clinics, supabase],
  );

  return { clinics, updateStatus };
}
