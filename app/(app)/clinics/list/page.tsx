// app/(app)/clinics/list/page.tsx
// 一覧（ListScreen）。Server Component が searchParams を読み、サーバー側で絞り込み＋
// 1ページ目だけを取得（全件は読まない）。総件数は count:"exact" で取得し、
// ClinicListRealtime（Client）へ initial / total / filters を渡す。
import { ClinicListRealtime } from "@/components/clinic-list-realtime";
import {
  PREFECTURES,
  type CorpKey,
  type Filters,
  type HpKey,
  type ViewKey,
} from "@/components/filter-bar";
import { getCurrentMember } from "@/lib/member";
import { normalizeMulti, selectClinicsPage } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { STATUS_ORDER } from "@/lib/status";

export const dynamic = "force-dynamic";

const PAGE = 50;
const VIEW_KEYS = ["all", "mine", "follow", "uncalled"];
const SORT_KEYS = ["uncalled", "next", "updated", "name"];

type SortKey = "uncalled" | "next" | "updated" | "name";

export default async function ClinicsListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    pref?: string;
    city?: string;
    status?: string;
    view?: string;
    sort?: string;
    corp?: string;
    hp?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const member = await getCurrentMember();

  const q = sp.q?.trim() || undefined;
  const pref = normalizeMulti(sp.pref, PREFECTURES);
  const city = sp.city?.trim() || undefined;
  const status = normalizeMulti(sp.status, STATUS_ORDER);
  const view = (VIEW_KEYS.includes(sp.view ?? "") ? sp.view : "all") as ViewKey;
  const sort = (SORT_KEYS.includes(sp.sort ?? "")
    ? sp.sort
    : "uncalled") as SortKey;
  const corp = (["houjin", "kojin"].includes(sp.corp ?? "")
    ? sp.corp
    : undefined) as CorpKey | undefined;
  // 複数選択（カンマ区切り）。不正値は捨てる。
  const hp = normalizeMulti(sp.hp, ["has", "none", "unknown"]) as
    | HpKey[]
    | undefined;

  const { rows, count } = await selectClinicsPage(supabase, {
    filters: {
      q,
      pref,
      city,
      status,
      view,
      sort,
      corp,
      hp,
      memberId: member?.id,
    },
    range: { from: 0, to: PAGE - 1 },
  });

  const filters: Filters & { sort: SortKey } = {
    q: q ?? "",
    pref,
    city,
    status,
    view,
    sort,
    corp,
    hp,
  };

  return (
    <div className="pbody list-body">
      <ClinicListRealtime initial={rows} total={count} filters={filters} />
    </div>
  );
}
