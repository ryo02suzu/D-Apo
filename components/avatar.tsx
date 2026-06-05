// components/avatar.tsx
// デザインモック（Dentia.html）の .av に対応する、色付きイニシャルのアバター。
// 名前の先頭1文字を表示する（和名なら漢字/かな1字、英名なら頭文字）。
import type { CSSProperties } from "react";

export function initialOf(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  // 「山田 太郎」→「山」、"John" → "J"
  return Array.from(trimmed)[0] ?? "?";
}

export function Avatar({
  name,
  color,
  size = 40,
  style,
}: {
  name: string;
  color: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      className="av"
      style={{
        width: size,
        height: size,
        background: color || "#0c8c8b",
        fontSize: size * 0.4,
        ...style,
      }}
    >
      {initialOf(name)}
    </span>
  );
}
