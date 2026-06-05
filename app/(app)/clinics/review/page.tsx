// app/(app)/clinics/review/page.tsx
// 電話番号 確認キュー：自動採用できなかった候補を人が承認/却下する。
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">
          電話番号の確認キュー
        </h1>
        <Link href="/clinics" className="text-sm text-slate-500 hover:text-slate-700">
          一覧へ →
        </Link>
      </div>

      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
        自動では判断できなかった候補です。正しい番号を選んで採用してください
        （座標と名称から算出した信頼度つき）。
      </p>

      {groups.size === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          確認待ちの候補はありません 🎉
        </p>
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([clinicId, g]) => (
            <section
              key={clinicId}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/clinics/${clinicId}`}
                    className="font-bold text-slate-900 hover:underline"
                  >
                    {g.name}
                  </Link>
                  {g.address && (
                    <p className="truncate text-xs text-slate-500">{g.address}</p>
                  )}
                </div>
                <form action={rejectClinicCandidates.bind(null, clinicId)}>
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                  >
                    全部違う
                  </button>
                </form>
              </div>

              <ul className="space-y-2">
                {g.items.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <ConfidenceDot value={c.confidence} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {c.phone ?? "（番号なし）"}
                        </span>
                        <span className="text-xs text-slate-500">{c.name}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        信頼度 {pct(c.confidence)} ・ 名称一致 {pct(c.name_score)}
                        {c.distance_m != null && ` ・ ${c.distance_m}m`}
                        {c.formatted_address && ` ・ ${c.formatted_address}`}
                      </p>
                    </div>
                    <form action={acceptCandidate.bind(null, c.id)}>
                      <button
                        type="submit"
                        disabled={!c.phone}
                        className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                      >
                        採用
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
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
    v >= 0.75 ? "bg-emerald-500" : v >= 0.55 ? "bg-amber-500" : "bg-slate-300";
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />;
}
