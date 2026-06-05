// =====================================================================
// 設計書 §2 データベース設計 / §4 状態管理 に対応する型定義
// =====================================================================

/** clinics.status / call_logs.outcome 共通のステータス（DB値） */
export type ClinicStatus =
  | "not_called" // 未架電（初期値）
  | "no_answer" // 不通（出ない／話中）
  | "unavailable" // 担当者不在（折り返し対象）
  | "heard" // ヒアリング済（悩みを聞けた）
  | "appointment" // アポ獲得（ゴール）
  | "rejected"; // お断り（デッドリード）

/** 曜日キー（hours jsonb のキー） */
export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

/** 診療時間帯 1区間。例: ["09:00", "13:00"] */
export type Interval = [string, string];

/** 曜日別診療時間。昼休みは2区間に分割、空配列＝休診日 */
export type WeeklyHours = Partial<Record<DayKey, Interval[]>>;

/** 営業中の判定結果 */
export type CallStatus = "open" | "lunch" | "closed_today" | "off" | "unknown";

/** profiles テーブル（auth.users と1:1） */
export type Profile = {
  id: string;
  display_name: string;
  created_at: string;
};

/** clinics テーブル（架電対象の歯科医院マスタ） */
export type Clinic = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  prefecture: string | null;
  city: string | null;
  business_hours: string | null;
  hours: WeeklyHours;
  status: ClinicStatus;
  assigned_to: string | null;
  next_action_at: string | null;
  latest_memo: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

/** call_logs テーブル（架電履歴。clinics に 1:N で従属） */
export type CallLog = {
  id: string;
  clinic_id: string;
  user_id: string;
  outcome: ClinicStatus;
  memo: string | null;
  created_at: string;
};

/** タイムライン表示用に発信者名を結合した架電履歴 */
export type CallLogWithUser = CallLog & {
  profiles: Pick<Profile, "display_name"> | null;
};
