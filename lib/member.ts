// lib/member.ts
// 合言葉ログイン後の「自分は誰か」を表す担当者（member）の識別レイヤ。
// d_apo_member Cookie に member.id（平文）を保持し、サーバー側で members 行を引く。
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Member } from "@/lib/types";

export const MEMBER_COOKIE = "d_apo_member";
const MEMBER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1年

// 新規メンバーに割り当てる、デザインに馴染む控えめなカラーパレット。
const MEMBER_COLORS = [
  "#0c8c8b",
  "#5b8def",
  "#e0729e",
  "#6bb38a",
  "#c79a3e",
  "#9b6fd1",
  "#e0894a",
  "#3aa0a0",
];

function pickColor(): string {
  return MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)];
}

/**
 * 現在のメンバー（Cookie の id で members を引く）。未設定/不在なら null。
 * React cache() で 1 リクエスト内の重複呼び出し（layout とページ等）を 1 クエリに集約する。
 */
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const store = await cookies();
  const id = store.get(MEMBER_COOKIE)?.value;
  if (!id) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return (data as Member | null) ?? null;
});

/** members 一覧（ピッカー表示用） */
export async function listMembers(): Promise<Member[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as Member[];
}

function setMemberCookie(store: Awaited<ReturnType<typeof cookies>>, id: string) {
  store.set(MEMBER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MEMBER_COOKIE_MAX_AGE,
  });
}

/** 既存メンバーを選ぶ（Cookie に id をセット）。 */
export async function setMember(id: string): Promise<void> {
  "use server";
  const store = await cookies();
  setMemberCookie(store, id);
  revalidatePath("/", "layout");
}

/** 新しいメンバーを作成して選ぶ。 */
export async function createAndSetMember(name: string): Promise<void> {
  "use server";
  const trimmed = name.trim();
  if (!trimmed) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .insert({ name: trimmed, color: pickColor() })
    .select("*")
    .single();

  if (error || !data) return;

  const store = await cookies();
  setMemberCookie(store, (data as Member).id);
  revalidatePath("/", "layout");
}

/** 担当者の選択を解除（ピッカーに戻す）。 */
export async function clearMember(): Promise<void> {
  "use server";
  const store = await cookies();
  store.delete(MEMBER_COOKIE);
  revalidatePath("/", "layout");
}
