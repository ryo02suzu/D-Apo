// components/clinic-list-realtime.tsx
// 一覧（ListScreen）。サーバーが取得した1ページ目（initial）＋総件数（total）＋
// フィルタ（searchParams 由来）を受け取り、以降は anon ブラウザクライアントで
// 同じ条件のまま次ページを追加読み込みする（サーバー側フィルタ＆ページング）。
// 絞り込み・検索・並び替え・ビューの変更は URL へ反映し、サーバーが1ページ目を再取得する。
// Realtime 購読・スワイプ・対応中バッジ・CSV はそのまま維持。
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SwipeableCard } from "@/components/swipeable-card";
import { FilterBar, type Filters, type ViewKey } from "@/components/filter-bar";
import { useCurrentMember } from "@/components/member-context";
import { usePresenceList } from "@/components/presence-provider";
import { createClient } from "@/lib/supabase/client";
import { escapeIlike } from "@/lib/ilike";
import { STATUS_LABEL } from "@/lib/status";
import type { Clinic } from "@/lib/types";

/** 並び替えキー */
type SortKey = "uncalled" | "next" | "updated" | "name";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "uncalled", label: "未架電優先" },
  { value: "next", label: "次回が近い順" },
  { value: "updated", label: "最終更新順" },
  { value: "name", label: "名前順" },
];

/** 1ページの件数（サーバー側ページング） */
const PAGE = 50;
/** CSV 出力の安全上限（これ以上は出力しない） */
const CSV_CAP = 5000;

const VIEW_KEYS: ViewKey[] = ["all", "mine", "follow", "uncalled"];
const SORT_KEYS: SortKey[] = ["uncalled", "next", "updated", "name"];

/** 現在のフィルタを Supabase クエリへ適用（ブラウザクライアント用・load more / CSV 共用） */
function buildQuery(
  supabase: ReturnType<typeof createClient>,
  filters: Filters,
  memberId: string,
  select: string,
) {
  let q = supabase.from("clinics").select(select);
  if (filters.q) {
    const v = escapeIlike(filters.q);
    q = q.or(`name.ilike.%${v}%,address.ilike.%${v}%`);
  }
  if (filters.pref) q = q.eq("prefecture", filters.pref);
  if (filters.city) q = q.ilike("city", `%${escapeIlike(filters.city)}%`);
  if (filters.status) q = q.eq("status", filters.status);
  switch (filters.view) {
    case "mine":
      q = q.eq("assigned_to", memberId);
      break;
    case "follow":
      q = q.in("status", ["no_answer", "unavailable"]);
      break;
    case "uncalled":
      q = q.eq("status", "not_called");
      break;
    default:
      break;
  }
  return q;
}

function applySort(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  q: any,
  sort: SortKey,
) {
  switch (sort) {
    case "next":
      return q.order("next_action_at", { ascending: true, nullsFirst: false });
    case "name":
      return q.order("name", { ascending: true });
    case "updated":
    case "uncalled":
    default:
      return q.order("updated_at", { ascending: false });
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

function downloadCsv(clinics: Clinic[]): void {
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
  total,
  filters,
}: {
  initial: Clinic[];
  total: number;
  filters: Filters & { sort: SortKey };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const member = useCurrentMember();
  const memberId = member?.id ?? "";

  const [supabase] = useState(() => createClient());

  // 現在ロード済みの行。サーバーから来た1ページ目で初期化し、
  // initial（=フィルタ変更による再取得）が差し替わったら追従する。
  const [rows, setRows] = useState<Clinic[]>(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setRows(initial);
  }

  const [loading, setLoading] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  // スワイプで開いているカード（一度に1枚だけ開く）
  const [openId, setOpenId] = useState<string | null>(null);

  // 重複架電防止：各医院を「自分以外の誰か」が対応中なら、その人を引けるマップ。
  const present = usePresenceList();
  const busyByClinic = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const p of present) {
      if (p.id === memberId || !p.clinicId) continue;
      if (!map.has(p.clinicId)) {
        map.set(p.clinicId, { name: p.name, color: p.color });
      }
    }
    return map;
  }, [present, memberId]);

  // URL へフィルタを反映（サーバーが1ページ目を再取得 → initial 差し替え）
  const updateUrl = useCallback(
    (patch: Partial<Filters & { sort: SortKey }>) => {
      const params = new URLSearchParams(searchParams.toString());
      const setOrDelete = (key: string, value?: string) => {
        if (value) params.set(key, value);
        else params.delete(key);
      };
      if ("q" in patch) setOrDelete("q", patch.q);
      if ("pref" in patch) setOrDelete("pref", patch.pref);
      if ("city" in patch) setOrDelete("city", patch.city);
      if ("status" in patch) setOrDelete("status", patch.status);
      if ("view" in patch)
        setOrDelete("view", patch.view === "all" ? undefined : patch.view);
      if ("sort" in patch)
        setOrDelete(
          "sort",
          patch.sort === "uncalled" ? undefined : patch.sort,
        );
      router.replace(`/clinics/list?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Realtime：ロード済みの行だけ差分反映（範囲外の INSERT などは無視）
  useEffect(() => {
    const channel = supabase
      .channel("clinics-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinics" },
        (payload) => {
          setRows((prev) => {
            if (payload.eventType === "UPDATE") {
              const next = payload.new as Clinic;
              // 画面に出ていない医院の更新（補完による電話番号書き込み等）は
              // 同じ参照を返して再描画を起こさない＝大量更新中のもたつきを防ぐ。
              if (!prev.some((c) => c.id === next.id)) return prev;
              return prev.map((c) =>
                c.id === next.id ? { ...c, ...next } : c,
              );
            }
            if (payload.eventType === "DELETE") {
              const old = payload.old as Clinic;
              if (!prev.some((c) => c.id === old.id)) return prev;
              return prev.filter((c) => c.id !== old.id);
            }
            // INSERT は現在のフィルタ/ページ範囲に属するか不明なので無視。
            return prev;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // 追加読み込み：次の PAGE 件を同条件で取得して末尾に追加
  const loadMore = useCallback(async () => {
    if (loading || rows.length >= total) return;
    setLoading(true);
    try {
      const from = rows.length;
      const to = from + PAGE - 1;
      let q = buildQuery(
        supabase,
        filters,
        memberId,
        "*, members:assigned_to(name,color)",
      );
      q = applySort(q, filters.sort);
      let res = await q.range(from, to);
      if (res.error) {
        // embed 失敗時は embed なしで再試行
        let q2 = buildQuery(supabase, filters, memberId, "*");
        q2 = applySort(q2, filters.sort);
        res = await q2.range(from, to);
      }
      const more = (res.data ?? []) as unknown as Clinic[];
      if (more.length > 0) {
        setRows((prev) => {
          const seen = new Set(prev.map((c) => c.id));
          const add = more.filter((c) => !seen.has(c.id));
          return add.length ? [...prev, ...add] : prev;
        });
      }
    } finally {
      setLoading(false);
    }
  }, [loading, rows.length, total, supabase, filters, memberId]);

  // 無限スクロール：sentinel が見えたら次ページ
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = rows.length < total;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  // CSV：現在の絞り込み集合を anon クライアントでページングして出力（上限 CSV_CAP）
  const csvCapped = total > CSV_CAP;
  const onExportCsv = useCallback(async () => {
    if (csvBusy || total === 0) return;
    setCsvBusy(true);
    try {
      const all: Clinic[] = [];
      const limit = Math.min(total, CSV_CAP);
      let from = 0;
      while (from < limit) {
        const to = Math.min(from + PAGE - 1, limit - 1);
        let q = buildQuery(
          supabase,
          filters,
          memberId,
          "*, members:assigned_to(name,color)",
        );
        q = applySort(q, filters.sort);
        let res = await q.range(from, to);
        if (res.error) {
          let q2 = buildQuery(supabase, filters, memberId, "*");
          q2 = applySort(q2, filters.sort);
          res = await q2.range(from, to);
        }
        const chunk = (res.data ?? []) as unknown as Clinic[];
        all.push(...chunk);
        if (chunk.length === 0) break;
        from += PAGE;
      }
      downloadCsv(all);
    } finally {
      setCsvBusy(false);
    }
  }, [csvBusy, total, supabase, filters, memberId]);

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={(patch) => updateUrl(patch)}
      />

      <div className="list-toolbar">
        <span className="list-count">{total}件</span>
        <div className="list-tools">
          <select
            className="field sort-field"
            value={filters.sort}
            onChange={(e) => updateUrl({ sort: e.target.value as SortKey })}
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
            onClick={onExportCsv}
            disabled={total === 0 || csvBusy}
            title={
              csvCapped
                ? `先頭 ${CSV_CAP} 件のみ出力します`
                : undefined
            }
          >
            {csvBusy ? "出力中…" : "CSV出力"}
          </button>
        </div>
      </div>

      <div className="cards">
        {rows.map((c) => (
          <SwipeableCard
            key={c.id}
            clinic={c}
            busyBy={busyByClinic.get(c.id)}
            openId={openId}
            onOpen={setOpenId}
          />
        ))}
        {total === 0 && <p className="empty">条件に合う医院がありません</p>}
        {hasMore && (
          <button
            type="button"
            className="csv-btn load-more"
            onClick={() => void loadMore()}
            disabled={loading}
          >
            {loading ? "読み込み中…" : "もっと読む"}
          </button>
        )}
        <div ref={sentinelRef} aria-hidden className="list-sentinel" />
      </div>
    </div>
  );
}

export { VIEW_KEYS, SORT_KEYS };
