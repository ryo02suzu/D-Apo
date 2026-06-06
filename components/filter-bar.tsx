// components/filter-bar.tsx
// 一覧（ListScreen）の絞り込みバー（モック）。
// 検索バー → エリアチップ行（全エリア + distinct city）→ ステータスチップ行。
// Dentia.html の .search-bar / .chips / .chip（配色付き）に対応。
"use client";

import { useMemo } from "react";
import { Icon } from "@/components/icon";
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import type { Clinic, ClinicStatus } from "@/lib/types";

export type Filters = {
  q: string;
  city?: string;
  status?: ClinicStatus;
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
  // エリア（市区町村）の選択肢：全件から distinct
  const cities = useMemo(
    () =>
      [...new Set(clinics.map((c) => c.city).filter(Boolean))] as string[],
    [clinics],
  );

  return (
    <div>
      <div className="search-bar">
        <Icon name="search" size={17} style={{ color: "var(--muted2)" }} />
        <input
          type="search"
          inputMode="search"
          placeholder="医院名・住所で検索"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
        />
        {filters.q && (
          <button
            type="button"
            className="clr"
            onClick={() => onChange({ ...filters, q: "" })}
            aria-label="検索をクリア"
          >
            <Icon name="x" size={15} />
          </button>
        )}
      </div>

      {/* エリア チップ */}
      <div className="chips">
        <button
          type="button"
          className={"chip" + (!filters.city ? " on" : "")}
          onClick={() => onChange({ ...filters, city: undefined })}
        >
          全エリア
        </button>
        {cities.map((city) => (
          <button
            key={city}
            type="button"
            className={"chip" + (filters.city === city ? " on" : "")}
            onClick={() =>
              onChange({
                ...filters,
                city: filters.city === city ? undefined : city,
              })
            }
          >
            {city}
          </button>
        ))}
      </div>

      {/* ステータス チップ */}
      <div className="chips">
        <button
          type="button"
          className={"chip" + (!filters.status ? " on" : "")}
          onClick={() => onChange({ ...filters, status: undefined })}
        >
          すべて
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            className={
              `chip chip-${STATUS_COLOR[s]}` +
              (filters.status === s ? " on" : "")
            }
            onClick={() =>
              onChange({
                ...filters,
                status: filters.status === s ? undefined : s,
              })
            }
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
