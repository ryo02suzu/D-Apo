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
    <div className="flex items-center gap-1 text-xs text-slate-500">
      <span className="mr-1">グループ:</span>
      <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              value === o.value
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
