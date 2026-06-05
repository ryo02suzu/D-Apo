// lib/next-clinic.ts
// 「次に電話する医院」を選ぶロジック（HomeScreen / 中央FAB で共有）。
// 未架電を最優先、無ければ折り返し対象（不通・担当者不在）、それも無ければ先頭。
import type { Clinic, ClinicStatus } from "@/lib/types";

const FOLLOWUP: ClinicStatus[] = ["no_answer", "unavailable"];

export function nextToCall<T extends Pick<Clinic, "status">>(
  clinics: T[],
): T | null {
  if (clinics.length === 0) return null;
  return (
    clinics.find((c) => c.status === "not_called") ??
    clinics.find((c) => FOLLOWUP.includes(c.status)) ??
    clinics[0]
  );
}
