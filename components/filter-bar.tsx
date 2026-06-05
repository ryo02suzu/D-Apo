// components/filter-bar.tsx
// 設計書 §3/§5: 医院名検索＋都道府県／市区町村／ステータス絞り込み。
// Dentia.html の .search-bar / .chips / .chip（配色付き）に対応。
"use client";

import { useMemo } from "react";
import { Icon } from "@/components/icon";
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
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
            .filter(
              (c) => !filters.prefecture || c.prefecture === filters.prefecture,
            )
            .map((c) => c.city)
            .filter(Boolean),
        ),
      ].sort((a, b) => a!.localeCompare(b!, "ja")) as string[],
    [clinics, filters.prefecture],
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

      {/* エリア・営業中フィルタ */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          paddingTop: 11,
        }}
      >
        <select
          value={filters.prefecture ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              prefecture: e.target.value || undefined,
              city: undefined, // 都道府県を変えたら市区町村はリセット
            })
          }
          className="field"
          style={{ width: "auto", flex: "1 1 0", minWidth: 0 }}
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
          className="field"
          style={{ width: "auto", flex: "1 1 0", minWidth: 0 }}
        >
          <option value="">市区町村</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label
          className="chip"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={!!filters.onlyOpen}
            onChange={(e) =>
              onChange({ ...filters, onlyOpen: e.target.checked })
            }
            style={{ accentColor: "var(--teal)" }}
          />
          営業中のみ
        </label>
      </div>
    </div>
  );
}
