// app/(app)/clinics/review/page.tsx
// 電話番号 確認キュー：自動採用できなかった候補を人が承認/却下する。
// モックには無い画面のため、同じデザイン言語（カード/バッジ/ボタン）で構成。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { acceptCandidate, rejectClinicCandidates } from "./actions";
import type { PhoneCandidate } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = PhoneCandidate & {
  clinics: { name: string; address: string | null } | null;
};

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("phone_candidates")
    .select("*, clinics(name, address)")
    .eq("status", "pending")
    .order("clinic_id", { ascending: true })
    .order("confidence", { ascending: false });

  const rows = (data ?? []) as Row[];

  // 医院ごとにまとめる
  const groups = new Map<
    string,
    { name: string; address: string | null; items: Row[] }
  >();
  for (const r of rows) {
    if (!groups.has(r.clinic_id)) {
      groups.set(r.clinic_id, {
        name: r.clinics?.name ?? "(不明)",
        address: r.clinics?.address ?? null,
        items: [],
      });
    }
    groups.get(r.clinic_id)!.items.push(r);
  }

  return (
    <div className="pbody list-body">
      <p className="notice" style={{ marginTop: 14 }}>
        自動では判断できなかった候補です。正しい番号を選んで採用してください
        （座標と名称から算出した信頼度つき）。
      </p>

      {groups.size === 0 ? (
        <p className="empty" style={{ paddingTop: 40 }}>
          確認待ちの候補はありません 🎉
        </p>
      ) : (
        <div className="cards" style={{ marginTop: 16 }}>
          {[...groups.entries()].map(([clinicId, g]) => (
            <section key={clinicId} className="listcard">
              <div className="r1" style={{ alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <Link href={`/clinics/${clinicId}`} className="nm">
                    {g.name}
                  </Link>
                  {g.address && (
                    <div className="ad" style={{ marginTop: 4 }}>
                      {g.address}
                    </div>
                  )}
                </div>
                <form action={rejectClinicCandidates.bind(null, clinicId)}>
                  <button
                    type="submit"
                    className="chip"
                    style={{ padding: "6px 11px", fontSize: 12 }}
                  >
                    全部違う
                  </button>
                </form>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                {g.items.map((c) => (
                  <div key={c.id} className="cand-row">
                    <ConfidenceDot value={c.confidence} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 800,
                            color: "var(--ink)",
                            fontSize: 15,
                          }}
                        >
                          {c.phone ?? "（番号なし）"}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>
                          {c.name}
                        </span>
                      </div>
                      <p
                        style={{
                          marginTop: 3,
                          fontSize: 11,
                          color: "var(--muted2)",
                          fontWeight: 500,
                        }}
                      >
                        信頼度 {pct(c.confidence)} ・ 名称一致{" "}
                        {pct(c.name_score)}
                        {c.distance_m != null && ` ・ ${c.distance_m}m`}
                        {c.formatted_address && ` ・ ${c.formatted_address}`}
                      </p>
                    </div>
                    <form action={acceptCandidate.bind(null, c.id)}>
                      <button
                        type="submit"
                        disabled={!c.phone}
                        className={
                          "btn btn-primary btn-sm" + (!c.phone ? " disabled" : "")
                        }
                        style={{ width: "auto", padding: "9px 16px" }}
                      >
                        採用
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function pct(v: number | null): string {
  return v == null ? "-" : `${Math.round(v * 100)}%`;
}

function ConfidenceDot({ value }: { value: number | null }) {
  const v = value ?? 0;
  const color =
    v >= 0.75 ? "var(--green)" : v >= 0.55 ? "var(--amber)" : "var(--muted2)";
  return <span className="cand-dot" style={{ background: color }} />;
}
