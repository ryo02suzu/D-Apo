// components/clinic-detail-tabs.tsx
// 設計書 §3 / モック DetailScreen のタブ（履歴／基本情報の2タブ）。
// Dentia.html の .tabs/.t に対応。サーバーで描画済みのタブ中身を
// children として受け取り、クライアントで表示切替のみ行う。
"use client";

import { useState } from "react";

type TabKey = "history" | "info";

export function ClinicDetailTabs({
  history,
  info,
  defaultTab = "history",
}: {
  history: React.ReactNode;
  info: React.ReactNode;
  defaultTab?: TabKey;
}) {
  const [tab, setTab] = useState<TabKey>(defaultTab);

  return (
    <>
      <div className="tabs">
        <button
          className={"t" + (tab === "history" ? " on" : "")}
          onClick={() => setTab("history")}
        >
          履歴
        </button>
        <button
          className={"t" + (tab === "info" ? " on" : "")}
          onClick={() => setTab("info")}
        >
          基本情報
        </button>
      </div>

      <div style={{ display: tab === "history" ? "block" : "none" }}>
        {history}
      </div>
      <div style={{ display: tab === "info" ? "block" : "none" }}>{info}</div>
    </>
  );
}
