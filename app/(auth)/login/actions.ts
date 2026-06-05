// app/(auth)/login/actions.ts
// 設計書 §3: /login … Supabase Auth でログイン。公開サインアップは無効化し、
// メンバーはダッシュボードから招待する想定（ここでは sign in のみ）。
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function login(_prev: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return "メールアドレスまたはパスワードが正しくありません";
  }

  revalidatePath("/", "layout");
  redirect("/clinics");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
