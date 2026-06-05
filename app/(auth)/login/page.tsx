// app/(auth)/login/page.tsx
"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";
import { login } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, null);

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="auth-mark">
            <Icon name="tooth" size={28} fill />
          </div>
          <h1 className="p2-name" style={{ marginTop: 0 }}>
            Dentia — 歯科医院 架電CRM
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              fontWeight: 500,
              color: "var(--muted)",
            }}
          >
            電話をかける → 結果を残す → 次に進む
          </p>
        </div>

        <form action={formAction}>
          <label className="fld-lbl first" style={{ display: "block" }}>
            合言葉
          </label>
          <div className="ta-wrap" style={{ padding: "4px 14px" }}>
            <input
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              placeholder="チーム共通の合言葉"
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 15,
                color: "var(--ink)",
                padding: "10px 0",
              }}
            />
          </div>

          {error && (
            <p
              style={{
                marginTop: 10,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--red-fg)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className={"btn btn-primary" + (pending ? " disabled" : "")}
            style={{ marginTop: 18 }}
          >
            {pending ? "ログイン中…" : "ログイン"}
          </button>

          <p
            style={{
              marginTop: 13,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--muted2)",
            }}
          >
            合言葉はチーム管理者にお問い合わせください
          </p>
        </form>
      </div>
    </main>
  );
}
