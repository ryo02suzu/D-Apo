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

/** members テーブル（合言葉ログイン後にアプリ内で選ぶ担当者） */
export type Member = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

/** join 用の最小メンバー情報（name/color のみ） */
export type MemberRef = Pick<Member, "name" | "color">;

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
  external_id: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  phone_source: string | null;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
  /** assigned_to を members に join したときのみ存在（担当者の表示用） */
  members?: MemberRef | null;
};

/** 担当者（members）を join した医院 */
export type ClinicWithMember = Clinic & { members: MemberRef | null };

/** 電話番号補完の確認キュー（Places候補） */
export type PhoneCandidate = {
  id: string;
  clinic_id: string;
  place_id: string | null;
  name: string | null;
  formatted_address: string | null;
  phone: string | null;
  distance_m: number | null;
  name_score: number | null;
  confidence: number | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

/** call_logs テーブル（架電履歴。clinics に 1:N で従属） */
export type CallLog = {
  id: string;
  clinic_id: string;
  user_id: string | null; // 合言葉方式では記名なし（null）
  outcome: ClinicStatus;
  memo: string | null;
  created_at: string;
};

/** タイムライン表示用に発信者名を結合した架電履歴 */
export type CallLogWithUser = CallLog & {
  /** user_id を members に join したときのみ存在（発信者の表示用） */
  members?: MemberRef | null;
};

/** 履歴フィード用：医院名も結合した架電履歴 */
export type CallLogFeedItem = CallLog & {
  members: MemberRef | null;
  clinics: Pick<Clinic, "id" | "name"> | null;
};
