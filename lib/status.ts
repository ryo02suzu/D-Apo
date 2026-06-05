// =====================================================================
// 設計書 §2「ステータス定義」/ §3 StatusBadge・StatusSelect 用の
// 画面表示ラベルと配色をまとめる。
// =====================================================================
import type { ClinicStatus } from "@/lib/types";

/** DB値 → 画面表示ラベル */
export const STATUS_LABEL: Record<ClinicStatus, string> = {
  not_called: "未架電",
  no_answer: "不通",
  unavailable: "担当者不在",
  heard: "ヒアリング済",
  appointment: "アポ獲得",
  rejected: "お断り",
};

/** StatusSelect / 集計でのステータス並び順 */
export const STATUS_ORDER: ClinicStatus[] = [
  "not_called",
  "no_answer",
  "unavailable",
  "heard",
  "appointment",
  "rejected",
];

/** StatusBadge の Tailwind クラス（色分け） */
export const STATUS_BADGE_CLASS: Record<ClinicStatus, string> = {
  not_called: "bg-slate-100 text-slate-600",
  no_answer: "bg-amber-100 text-amber-700",
  unavailable: "bg-orange-100 text-orange-700",
  heard: "bg-cyan-100 text-cyan-700",
  appointment: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

/** 結果入力グリッド（アイコン付き）の表示メタ */
export const STATUS_OPTIONS: { value: ClinicStatus; label: string; icon: string }[] =
  STATUS_ORDER.map((value) => ({
    value,
    label: STATUS_LABEL[value],
    icon: {
      not_called: "📞",
      no_answer: "📵",
      unavailable: "🙍",
      heard: "💬",
      appointment: "🎉",
      rejected: "🚫",
    }[value],
  }));
