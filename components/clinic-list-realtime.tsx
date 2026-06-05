// components/clinic-list-realtime.tsx
// 設計書 §3/§4: Server Component が取得した初期データを受け取り、
// Realtime 購読しつつ、絞り込み・グループ化をクライアント側の
// 派生計算で行う（サーバー再取得なし）。
"use client";

import { useMemo, useState } from "react";
import { FilterBar, type Filters } from "@/components/filter-bar";
import { GroupToggle, type GroupBy } from "@/components/group-toggle";
import {
  GroupedClinicList,
  type ClinicGroup,
} from "@/components/grouped-clinic-list";
import { useRealtimeClinics } from "@/hooks/use-realtime-clinics";
import { callStatusNow } from "@/lib/hours";
import { STATUS_LABEL } from "@/lib/status";
import type { Clinic } from "@/lib/types";

export function ClinicListRealtime({ initial }: { initial: Clinic[] }) {
  const { clinics } = useRealtimeClinics(initial);
  const [filters, setFilters] = useState<Filters>({ q: "" });
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  // 絞り込み
  const filtered = useMemo(
    () =>
      clinics.filter(
        (c) =>
          (!filters.q || c.name.includes(filters.q)) &&
          (!filters.prefecture || c.prefecture === filters.prefecture) &&
          (!filters.city || c.city === filters.city) &&
          (!filters.status || c.status === filters.status) &&
          (!filters.onlyOpen || callStatusNow(c.hours) === "open"),
      ),
    [clinics, filters],
  );

  // グループ化
  const groups = useMemo<ClinicGroup[]>(() => {
    if (groupBy === "none")
      return [{ key: "all", label: "すべて", items: filtered }];
    const map = new Map<string, Clinic[]>();
    for (const c of filtered) {
      const key =
        (groupBy === "status" ? STATUS_LABEL[c.status] : c[groupBy]) ?? "未設定";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()]
      .map(([key, items]) => ({ key, label: key, items }))
      .sort((a, b) => a.label.localeCompare(b.label, "ja"));
  }, [filtered, groupBy]);

  return (
    <div>
      <FilterBar clinics={clinics} filters={filters} onChange={setFilters} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span className="list-count">{filtered.length}件</span>
        <GroupToggle value={groupBy} onChange={setGroupBy} />
      </div>

      <GroupedClinicList groups={groups} grouped={groupBy !== "none"} />
    </div>
  );
}
