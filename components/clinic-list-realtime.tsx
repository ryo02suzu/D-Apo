// components/clinic-list-realtime.tsx
// 一覧（ListScreen）。Server Component の初期データを受け取り Realtime 購読しつつ、
// 絞り込みをクライアント側の派生計算で行う。
// モック ListScreen に合わせ FilterBar（検索＋エリア＋ステータス）＋件数＋カードリスト。
"use client";

import { useMemo, useState } from "react";
import { ClinicCard } from "@/components/clinic-card";
import { FilterBar, type Filters } from "@/components/filter-bar";
import { useRealtimeClinics } from "@/hooks/use-realtime-clinics";
import { STATUS_ORDER } from "@/lib/status";
import type { Clinic, ClinicStatus } from "@/lib/types";

export function ClinicListRealtime({
  initial,
  initialStatus,
}: {
  initial: Clinic[];
  initialStatus?: string;
}) {
  const { clinics } = useRealtimeClinics(initial);
  const [filters, setFilters] = useState<Filters>({
    q: "",
    status: STATUS_ORDER.includes(initialStatus as ClinicStatus)
      ? (initialStatus as ClinicStatus)
      : undefined,
  });

  // 絞り込み
  const filtered = useMemo(
    () =>
      clinics.filter(
        (c) =>
          (!filters.q ||
            c.name.includes(filters.q) ||
            (c.address ?? "").includes(filters.q)) &&
          (!filters.city || c.city === filters.city) &&
          (!filters.status || c.status === filters.status),
      ),
    [clinics, filters],
  );

  return (
    <div>
      <FilterBar clinics={clinics} filters={filters} onChange={setFilters} />

      <div className="list-count">{filtered.length}件</div>

      <div className="cards">
        {filtered.map((c) => (
          <ClinicCard key={c.id} clinic={c} />
        ))}
        {filtered.length === 0 && (
          <p className="empty">条件に合う医院がありません</p>
        )}
      </div>
    </div>
  );
}
