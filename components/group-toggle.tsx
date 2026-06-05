// components/group-toggle.tsx
// 設計書 §3/§5: 表示の分け方を切替（なし／都道府県／市区町村／ステータス）。
"use client";

export type GroupBy = "none" | "prefecture" | "city" | "status";

const OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "none", label: "なし" },
  { value: "prefecture", label: "都道府県" },
  { value: "city", label: "市区町村" },
  { value: "status", label: "ステータス" },
];

export function GroupToggle({
  value,
  onChange,
}: {
  value: GroupBy;
  onChange: (next: GroupBy) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        paddingRight: 2,
      }}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={"chip" + (value === o.value ? " on" : "")}
          style={{ padding: "5px 11px", fontSize: 12 }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
