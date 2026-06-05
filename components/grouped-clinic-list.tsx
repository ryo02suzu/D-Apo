// components/grouped-clinic-list.tsx
// 設計書 §3/§5: グループ見出し＋件数バッジ付きでカードをセクション表示。
import { ClinicCard } from "@/components/clinic-card";
import type { Clinic } from "@/lib/types";

export type ClinicGroup = { key: string; label: string; items: Clinic[] };

export function GroupedClinicList({
  groups,
  grouped,
}: {
  groups: ClinicGroup[];
  grouped: boolean;
}) {
  if (groups.every((g) => g.items.length === 0)) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
        条件に合う医院がありません
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key}>
          {grouped && (
            <div className="mb-2 flex items-center gap-2 px-1">
              <h2 className="text-sm font-bold text-slate-700">{group.label}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                {group.items.length}件
              </span>
            </div>
          )}
          <div className="space-y-2">
            {group.items.map((clinic) => (
              <ClinicCard key={clinic.id} clinic={clinic} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
