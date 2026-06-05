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

/**
 * デザインモック（Dentia.html）の配色キー。
 * `.b-*` / `.s-*` / `.chip-*` / `.r-*` などの CSS クラスのサフィックスに使う。
 */
export type StatusColor =
  | "gray"
  | "amber"
  | "orange"
  | "cyan"
  | "green"
  | "red";

/** DB値 → モックの配色キー */
export const STATUS_COLOR: Record<ClinicStatus, StatusColor> = {
  not_called: "gray",
  no_answer: "amber",
  unavailable: "orange",
  heard: "cyan",
  appointment: "green",
  rejected: "red",
};

/**
 * 結果入力グリッド（`.stgrid`/`.stbtn`）の表示メタ。
 * - `icon`: components/icon.tsx のアイコン名
 * - `line`: 細線アイコン（円の塗りなし）で表示するか
 * - `fill`: 円の中のアイコンを塗りつぶすか（`line:false` のとき）
 */
export const STATUS_OPTIONS: {
  value: ClinicStatus;
  label: string;
  color: StatusColor;
  icon: string;
  line: boolean;
  fill: boolean;
}[] = [
  { value: "not_called", label: STATUS_LABEL.not_called, color: "gray", icon: "phone", line: true, fill: false },
  { value: "no_answer", label: STATUS_LABEL.no_answer, color: "amber", icon: "phoneOff", line: true, fill: false },
  { value: "unavailable", label: STATUS_LABEL.unavailable, color: "orange", icon: "user", line: false, fill: false },
  { value: "heard", label: STATUS_LABEL.heard, color: "cyan", icon: "chat", line: false, fill: true },
  { value: "appointment", label: STATUS_LABEL.appointment, color: "green", icon: "calCheck", line: false, fill: false },
  { value: "rejected", label: STATUS_LABEL.rejected, color: "red", icon: "xcircle", line: false, fill: false },
];
