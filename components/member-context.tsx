// components/member-context.tsx
// 現在のメンバー（id/name/color）をクライアントツリーに配るための軽量コンテキスト。
// サーバーの getCurrentMember() の結果を layout から渡す。
"use client";

import { createContext, useContext } from "react";

export type CurrentMember = {
  id: string;
  name: string;
  color: string;
};

const MemberContext = createContext<CurrentMember | null>(null);

export function MemberProvider({
  member,
  children,
}: {
  member: CurrentMember;
  children: React.ReactNode;
}) {
  return (
    <MemberContext.Provider value={member}>{children}</MemberContext.Provider>
  );
}

/** 現在のメンバー。Provider 配下では必ず非 null。 */
export function useCurrentMember(): CurrentMember {
  const m = useContext(MemberContext);
  if (!m) {
    throw new Error("useCurrentMember は MemberProvider の内側で使ってください");
  }
  return m;
}
