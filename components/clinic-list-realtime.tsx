// components/clinic-list-realtime.tsx
// 一覧（ListScreen）。Server Component の初期データを受け取り Realtime 購読しつつ、
// 絞り込み・並び替え・無限スクロール・CSV出力をクライアント側の派生計算で行う。
// モック ListScreen に合わせ FilterBar（検索＋ビュー＋エリア＋ステータス）＋件数＋カードリスト。
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClinicCard } from "@/components/clinic-card";
import { FilterBar, type Filters, type ViewKey } from "@/components/filter-bar";
import { useCurrentMember } from "@/components/member-context";
import { useRealtimeClinics } from "@/hooks/use-realtime-clinics";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import type { Clinic, ClinicStatus } from "@/lib/types";

/** 並び替えキー */
type SortKey = "uncalled" | "next" | "updated" | "name";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "uncalled", label: "未架電優先" },
  { value: "next", label: "次回が近い順" },
  { value: "updated", label: "最終更新順" },
  { value: "name", label: "名前順" },
];

const PAGE_SIZE = 40;

/** 要フォロー（ビュー）に含めるステータス */
const FOLLOW_STATUSES: ClinicStatus[] = ["no_answer", "unavailable"];

function matchesView(c: Clinic, view: ViewKey, memberId: string): boolean {
  switch (view) {
    case "mine":
      return c.assigned_to === memberId;
    case "follow":
      return FOLLOW_STATUSES.includes(c.status);
    case "uncalled":
      return c.status === "not_called";
    case "all":
    default:
      return true;
  }
}

function compareClinics(a: Clinic, b: Clinic, sort: SortKey): number {
  switch (sort) {
    case "next": {
      // next_action_at 昇順、null は最後
      const an = a.next_action_at;
      const bn = b.next_action_at;
      if (an === bn) return 0;
      if (!an) return 1;
      if (!bn) return -1;
      return an < bn ? -1 : an > bn ? 1 : 0;
    }
    case "updated":
      // updated_at 降順
      return a.updated_at < b.updated_at
        ? 1
        : a.updated_at > b.updated_at
          ? -1
          : 0;
    case "name":
      return a.name.localeCompare(b.name, "ja");
    case "uncalled":
    default: {
      // 未架電を先頭、その後 updated_at 降順
      const ua = a.status === "not_called" ? 0 : 1;
      const ub = b.status === "not_called" ? 0 : 1;
      if (ua !== ub) return ua - ub;
      return a.updated_at < b.updated_at
        ? 1
        : a.updated_at > b.updated_at
          ? -1
          : 0;
    }
  }
}

/** CSV セルのエスケープ（ダブルクォート/カンマ/改行を含む場合は囲む） */
function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatNextActionForCsv(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function exportCsv(clinics: Clinic[]): void {
  const header = [
    "医院名",
    "電話番号",
    "住所",
    "ステータス",
    "担当者",
    "次回予定",
    "最新メモ",
  ];
  const rows = clinics.map((c) =>
    [
      c.name ?? "",
      c.phone ?? "",
      c.address ?? "",
      STATUS_LABEL[c.status],
      c.members?.name ?? "",
      formatNextActionForCsv(c.next_action_at),
      c.latest_memo ?? "",
    ]
      .map((v) => csvCell(String(v)))
      .join(","),
  );
  // Excel(JP) 対応で UTF-8 BOM を先頭に付与
  const body = "﻿" + [header.join(","), ...rows].join("\r\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const tokyo = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replace(/\D/g, ""); // YYYYMMDD

  const a = document.createElement("a");
  a.href = url;
  a.download = `dentia_clinics_${tokyo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ClinicListRealtime({
  initial,
  initialStatus,
}: {
  initial: Clinic[];
  initialStatus?: string;
}) {
  const { clinics } = useRealtimeClinics(initial);
  const member = useCurrentMember();
  // Provider 配下では非 null。万一に備えて id をガード（空文字なら mine は0件）。
  const memberId = member?.id ?? "";

  const [filters, setFilters] = useState<Filters>({
    q: "",
    view: "all",
    status: STATUS_ORDER.includes(initialStatus as ClinicStatus)
      ? (initialStatus as ClinicStatus)
      : undefined,
  });
  const [sort, setSort] = useState<SortKey>("uncalled");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // 絞り込み（検索／エリア／ステータス／ビュー を AND 結合）
  const filtered = useMemo(
    () =>
      clinics.filter(
        (c) =>
          (!filters.q ||
            c.name.includes(filters.q) ||
            (c.address ?? "").includes(filters.q)) &&
          (!filters.city || c.city === filters.city) &&
          (!filters.status || c.status === filters.status) &&
          matchesView(c, filters.view, memberId),
      ),
    [clinics, filters, memberId],
  );

  // 並び替え
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => compareClinics(a, b, sort));
    return arr;
  }, [filtered, sort]);

  // 絞り込み／並び替え／検索が変わったら表示件数をリセット
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filters, sort]);

  // 無限スクロール：sentinel が見えたら +PAGE_SIZE
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const total = sorted.length;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((v) => (v < total ? v + PAGE_SIZE : v));
        }
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [total]);

  const shown = sorted.slice(0, visible);

  return (
    <div>
      <FilterBar clinics={clinics} filters={filters} onChange={setFilters} />

      <div className="list-toolbar">
        <span className="list-count">{total}件</span>
        <div className="list-tools">
          <select
            className="field sort-field"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="並び替え"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="csv-btn"
            onClick={() => exportCsv(sorted)}
            disabled={total === 0}
          >
            CSV出力
          </button>
        </div>
      </div>

      <div className="cards">
        {shown.map((c) => (
          <ClinicCard key={c.id} clinic={c} />
        ))}
        {total === 0 && <p className="empty">条件に合う医院がありません</p>}
        <div ref={sentinelRef} aria-hidden className="list-sentinel" />
      </div>
    </div>
  );
}
