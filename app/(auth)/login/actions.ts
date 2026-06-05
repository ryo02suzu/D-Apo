// app/(auth)/login/actions.ts
// 合言葉（共有パスワード）でログイン。Supabase Auth は使わず、
// 署名付き Cookie でログイン状態を保持する。合言葉は環境変数 APP_PASSWORD。
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  checkPassword,
  createToken,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
} from "@/lib/auth";

export async function login(_prev: string | null, formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!checkPassword(password)) {
    return "合言葉が違います";
  }

  const store = await cookies();
  store.set(COOKIE_NAME, await createToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  redirect("/clinics");
}

export async function logout() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  redirect("/login");
}
