// components/filter-bar.tsx
// 一覧（ListScreen）の絞り込みバー（モック）。
// 検索バー → ビュー（クイックフィルタ）→ 都道府県セレクト + 市区町村テキスト
//   → ステータスチップ行。
// 全コントロールは URL searchParams に書き込み、サーバー側で1ページ目を再取得する。
// Dentia.html の .search-bar / .chips / .chip（配色付き）に対応。
"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "@/lib/status";

/** クイックフィルタ（ビュー）。単一選択。 */
export type ViewKey = "all" | "mine" | "follow" | "uncalled";

export const VIEW_OPTIONS: { value: ViewKey; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "mine", label: "自分の担当" },
  { value: "follow", label: "要フォロー" },
  { value: "uncalled", label: "未架電" },
];

/** 47 都道府県（コードは使わず name で eq("prefecture", …)） */
export const PREFECTURES: string[] = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

/** 現在の絞り込み（searchParams 由来）。 */
export type Filters = {
  q: string;
  pref?: string;
  city?: string;
  status?: string;
  view: ViewKey;
};

export function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  /** 1つ以上のキーをまとめて URL へ反映する */
  onChange: (patch: Partial<Filters>) => void;
}) {
  // 検索はローカル state で即時反映 → デバウンスで URL へ反映する。
  const [q, setQ] = useState(filters.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 外部（URL）から q が変わったらローカルも追従（描画中に前回値と比較する公式パターン）。
  const [prevQ, setPrevQ] = useState(filters.q);
  if (filters.q !== prevQ) {
    setPrevQ(filters.q);
    setQ(filters.q);
  }

  const onSearchChange = (value: string) => {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ q: value });
    }, 300);
  };

  const clearSearch = () => {
    setQ("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange({ q: "" });
  };

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  return (
    <div>
      <div className="search-bar">
        <Icon name="search" size={17} style={{ color: "var(--muted2)" }} />
        <input
          id="clinic-search"
          type="search"
          inputMode="search"
          placeholder="医院名・住所で検索"
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {q && (
          <button
            type="button"
            className="clr"
            onClick={clearSearch}
            aria-label="検索をクリア"
          >
            <Icon name="x" size={15} />
          </button>
        )}
      </div>

      {/* ビュー（クイックフィルタ）：単一選択のセグメント */}
      <div className="chips segviews" role="tablist" aria-label="ビュー">
        {VIEW_OPTIONS.map((v) => (
          <button
            key={v.value}
            type="button"
            role="tab"
            aria-selected={filters.view === v.value}
            className={"chip segview" + (filters.view === v.value ? " on" : "")}
            onClick={() => onChange({ view: v.value })}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* エリア：都道府県セレクト + 市区町村テキスト */}
      <div className="chips area-row">
        <select
          className="field area-pref"
          value={filters.pref ?? ""}
          onChange={(e) => onChange({ pref: e.target.value || undefined })}
          aria-label="都道府県"
        >
          <option value="">全国</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="search"
          inputMode="search"
          className="field area-city"
          placeholder="市区町村で絞り込み"
          defaultValue={filters.city ?? ""}
          key={filters.city ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange({ city: (e.target as HTMLInputElement).value || undefined });
            }
          }}
          onBlur={(e) => onChange({ city: e.target.value || undefined })}
          aria-label="市区町村"
        />
      </div>

      {/* ステータス チップ */}
      <div className="chips">
        <button
          type="button"
          className={"chip" + (!filters.status ? " on" : "")}
          onClick={() => onChange({ status: undefined })}
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
              onChange({ status: filters.status === s ? undefined : s })
            }
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
