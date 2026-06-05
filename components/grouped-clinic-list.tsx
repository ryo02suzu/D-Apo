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
    return <p className="empty">条件に合う医院がありません</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {groups.map((group) => (
        <section key={group.key}>
          {grouped && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 2px 10px",
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                {group.label}
              </h2>
              <span className="badge b-gray">{group.items.length}件</span>
            </div>
          )}
          <div className="cards">
            {group.items.map((clinic) => (
              <ClinicCard key={clinic.id} clinic={clinic} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
