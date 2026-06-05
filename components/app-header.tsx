// components/app-header.tsx
// 共通ヘッダ。左にメニュー（番号確認 / 担当者を変更 / ログアウト）、
// 中央にブランド、右に現在のメンバーのアバター。
// デザインモック（components.jsx AppHead 左="menu"）に対応。
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useCurrentMember } from "@/components/member-context";

export function AppHeader({
  onLogout,
  onChangeMember,
}: {
  onLogout: () => Promise<void>;
  onChangeMember: () => Promise<void>;
}) {
  const me = useCurrentMember();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <header className="apphead">
      <div className="ah-menu-wrap" ref={ref}>
        <button
          type="button"
          className="ah-btn"
          aria-label="メニュー"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="menu" />
        </button>
        {open && (
          <div className="ah-menu" role="menu">
            <div className="ah-menu-id">
              <Avatar name={me.name} color={me.color} size={34} />
              <div>
                <div className="ah-menu-name">{me.name}</div>
                <div className="ah-menu-role">担当者</div>
              </div>
            </div>
            <Link
              href="/clinics/review"
              className="menuitem"
              onClick={() => setOpen(false)}
            >
              <Icon name="phone" size={18} style={{ color: "var(--teal)" }} />
              <span className="mi-label">電話番号の確認キュー</span>
              <Icon name="chevR" size={16} style={{ color: "var(--muted2)" }} />
            </Link>
            <form action={onChangeMember}>
              <button type="submit" className="menuitem" style={{ width: "100%" }}>
                <Icon name="user" size={18} style={{ color: "var(--teal)" }} />
                <span className="mi-label">担当者を変更</span>
              </button>
            </form>
            <form action={onLogout}>
              <button
                type="submit"
                className="menuitem danger"
                style={{ width: "100%" }}
              >
                <Icon name="x" size={18} className="red-ic" />
                <span className="mi-label">ログアウト</span>
              </button>
            </form>
          </div>
        )}
      </div>

      <Link href="/clinics" className="brand">
        <span className="mark">
          <Icon name="tooth" size={18} fill />
        </span>
        <span className="title">架電CRM</span>
      </Link>

      <Avatar name={me.name} color={me.color} size={32} />
    </header>
  );
}
