// components/filter-bar.tsx
// 設計書 §3/§5: 医院名検索＋都道府県／市区町村／ステータス絞り込み。
// 市区町村は選択中の都道府県に連動する（distinct 抽出）。
"use client";

import { useMemo } from "react";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import type { Clinic, ClinicStatus } from "@/lib/types";

export type Filters = {
  q: string;
  prefecture?: string;
  city?: string;
  status?: ClinicStatus;
  onlyOpen?: boolean;
};

export function FilterBar({
  clinics,
  filters,
  onChange,
}: {
  clinics: Clinic[];
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  // 都道府県の選択肢（全件から distinct）
  const prefectures = useMemo(
    () =>
      [...new Set(clinics.map((c) => c.prefecture).filter(Boolean))].sort(
        (a, b) => a!.localeCompare(b!, "ja"),
      ) as string[],
    [clinics],
  );

  // 市区町村は選択中の都道府県に連動
  const cities = useMemo(
    () =>
      [
        ...new Set(
          clinics
            .filter((c) => !filters.prefecture || c.prefecture === filters.prefecture)
            .map((c) => c.city)
            .filter(Boolean),
        ),
      ].sort((a, b) => a!.localeCompare(b!, "ja")) as string[],
    [clinics, filters.prefecture],
  );

  const selectClass =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none";

  const hasFilter =
    filters.q || filters.prefecture || filters.city || filters.status || filters.onlyOpen;

  return (
    <div className="space-y-2">
      <input
        type="search"
        inputMode="search"
        placeholder="医院名で検索"
        value={filters.q}
        onChange={(e) => onChange({ ...filters, q: e.target.value })}
        className={`w-full ${selectClass}`}
      />

      <div className="flex flex-wrap gap-2">
        <select
          value={filters.prefecture ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              prefecture: e.target.value || undefined,
              city: undefined, // 都道府県を変えたら市区町村はリセット
            })
          }
          className={selectClass}
        >
          <option value="">都道府県</option>
          {prefectures.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={filters.city ?? ""}
          onChange={(e) =>
            onChange({ ...filters, city: e.target.value || undefined })
          }
          className={selectClass}
        >
          <option value="">市区町村</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={filters.status ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              status: (e.target.value || undefined) as ClinicStatus | undefined,
            })
          }
          className={selectClass}
        >
          <option value="">すべてのステータス</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={!!filters.onlyOpen}
            onChange={(e) => onChange({ ...filters, onlyOpen: e.target.checked })}
            className="accent-emerald-600"
          />
          営業中のみ
        </label>

        {hasFilter && (
          <button
            type="button"
            onClick={() => onChange({ q: "" })}
            className="rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
          >
            条件をクリア
          </button>
        )}
      </div>
    </div>
  );
}
