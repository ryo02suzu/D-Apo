// components/app-header.tsx
// 共通ヘッダ（モック components.jsx の AppHead）。
// [左ボタン] [中央 .title] [右ボタン] の3分割を usePathname() でルート別に出し分ける。
//   /clinics        → 左=menu  / コールキュー       / 右=bell
//   /clinics/list   → 左=menu  / 医院一覧           / 右=search
//   /history        → 左=menu  / 架電履歴           / 右=refresh
//   /dashboard      → 左=menu  / 進捗ダッシュボード / 右=refresh
//   /clinics/[id]   → 左=back(→/clinics/list) / （空） / 右なし
//   /clinics/review → 左=back(→/clinics)       / 電話番号の確認 / 右なし
// menu はハンバーガー＝既存ドロップダウン（必要なアプリ機能）を開く。
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { useCurrentMember } from "@/components/member-context";

type LeftKind = "menu" | "back" | "close";
type RightKind = "bell" | "search" | "refresh" | null;

type HeadSpec = {
  left: LeftKind;
  title: string;
  right: RightKind;
  backHref?: string;
  /** タイトル右の .ttl-link テキストリンク（モック titleLink）。 */
  titleLink?: { label: string; href: string };
};

function specFor(pathname: string): HeadSpec {
  if (pathname === "/clinics")
    return { left: "menu", title: "コールキュー", right: "bell" };
  if (pathname === "/clinics/list")
    return { left: "menu", title: "医院一覧", right: "search" };
  if (pathname === "/history")
    return { left: "menu", title: "架電履歴", right: "refresh" };
  if (pathname === "/dashboard")
    return { left: "menu", title: "進捗ダッシュボード", right: "refresh" };
  if (pathname === "/clinics/review")
    return { left: "back", title: "電話番号の確認", right: null, backHref: "/clinics" };
  // /clinics/[id]/result（架電結果入力）
  const resultMatch = pathname.match(/^\/clinics\/([^/]+)\/result$/);
  if (resultMatch)
    return {
      left: "close",
      title: "架電結果を入力",
      right: null,
      backHref: `/clinics/${resultMatch[1]}`,
    };
  // /clinics/[id]（詳細）
  const detailMatch = pathname.match(/^\/clinics\/([^/]+)$/);
  if (detailMatch)
    return {
      left: "back",
      title: "",
      right: null,
      backHref: "/clinics/list",
      titleLink: { label: "編集", href: `/clinics/${detailMatch[1]}?tab=info` },
    };
  // フォールバック
  return { left: "menu", title: "コールキュー", right: "bell" };
}

export function AppHeader({
  onLogout,
  onChangeMember,
}: {
  onLogout: () => Promise<void>;
  onChangeMember: () => Promise<void>;
}) {
  const me = useCurrentMember();
  const pathname = usePathname();
  const router = useRouter();
  const spec = specFor(pathname);

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

  // ルートが変わったらメニューを閉じる
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="apphead">
      {/* 左ボタン */}
      {spec.left === "back" || spec.left === "close" ? (
        <Link
          href={spec.backHref ?? "/clinics"}
          className="ah-btn"
          aria-label={spec.left === "close" ? "閉じる" : "戻る"}
        >
          <Icon name={spec.left === "close" ? "x" : "chevL"} />
        </Link>
      ) : (
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
      )}

      {/* 中央タイトル */}
      <span className="title">{spec.title}</span>

      {/* 右ボタン */}
      {spec.titleLink ? (
        <Link href={spec.titleLink.href} className="ah-btn ttl-link">
          {spec.titleLink.label}
        </Link>
      ) : spec.right === "refresh" ? (
        <button
          type="button"
          className="ah-btn"
          aria-label="再読み込み"
          onClick={() => router.refresh()}
        >
          <Icon name="refresh" />
        </button>
      ) : spec.right ? (
        <button
          type="button"
          className="ah-btn"
          aria-label={spec.right === "bell" ? "通知" : "検索"}
        >
          <Icon name={spec.right} />
        </button>
      ) : (
        // 右ボタンが無いルートでも中央タイトルを中央寄せに保つためのスペーサ
        <span className="ah-btn" aria-hidden="true" style={{ visibility: "hidden" }}>
          <Icon name="bell" />
        </span>
      )}
    </header>
  );
}
