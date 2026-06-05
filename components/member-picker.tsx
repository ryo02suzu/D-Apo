// components/member-picker.tsx
// 合言葉ログイン後に「自分は誰か」を選ぶゲート。
// 既存メンバーから選ぶか、名前を入力して新規追加する。
// 選択/作成すると Cookie がセットされ、layout の revalidate で children が表示される。
"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import type { Member } from "@/lib/types";

export function MemberPicker({
  members,
  onSelect,
  onCreate,
}: {
  members: Member[];
  onSelect: (id: string) => Promise<void>;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(members.length === 0);
  const [pending, startTransition] = useTransition();

  function select(id: string) {
    startTransition(async () => {
      await onSelect(id);
    });
  }

  function create() {
    if (!name.trim()) return;
    startTransition(async () => {
      await onCreate(name.trim());
    });
  }

  return (
    <div className="picker-wrap">
      <div className="picker-card">
        <div className="auth-mark">
          <Icon name="user" size={26} style={{ color: "#fff" }} />
        </div>
        <h1 className="picker-title">あなたは誰ですか？</h1>
        <p className="picker-sub">担当者を選ぶと、架電結果や presence に名前が記録されます。</p>

        {members.length > 0 && (
          <div className="picker-list">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                className="picker-item"
                onClick={() => select(m.id)}
                disabled={pending}
              >
                <Avatar name={m.name} color={m.color} size={40} />
                <span className="picker-name">{m.name}</span>
                <Icon
                  name="chevR"
                  size={18}
                  sw={2.4}
                  style={{ color: "var(--muted2)", marginLeft: "auto" }}
                />
              </button>
            ))}
          </div>
        )}

        {adding ? (
          <div className="picker-add">
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="お名前（例：山田 太郎）"
              maxLength={20}
              onKeyDown={(e) => {
                if (e.key === "Enter") create();
              }}
              autoFocus
            />
            <button
              type="button"
              className={"btn btn-primary" + (pending || !name.trim() ? " disabled" : "")}
              onClick={create}
              disabled={pending || !name.trim()}
              style={{ marginTop: 12 }}
            >
              この名前で始める
            </button>
            {members.length > 0 && (
              <button
                type="button"
                className="link"
                style={{ marginTop: 14, alignSelf: "center" }}
                onClick={() => setAdding(false)}
              >
                既存メンバーから選ぶ
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-outline"
            style={{ marginTop: 16 }}
            onClick={() => setAdding(true)}
          >
            <Icon name="plus" size={18} />
            新しく追加
          </button>
        )}
      </div>
    </div>
  );
}
