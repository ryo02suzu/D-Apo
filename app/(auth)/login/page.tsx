// app/(auth)/login/page.tsx
"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, null);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl">
            🦷
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Dentia — 歯科医院 架電CRM
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            電話をかける → 結果を残す → 次に進む
          </p>
        </div>

        <form
          action={formAction}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              合言葉
            </label>
            <input
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              placeholder="チーム共通の合言葉"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending ? "ログイン中…" : "ログイン"}
          </button>

          <p className="pt-1 text-center text-xs text-slate-400">
            合言葉はチーム管理者にお問い合わせください
          </p>
        </form>
      </div>
    </main>
  );
}
