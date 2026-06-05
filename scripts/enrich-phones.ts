/**
 * 電話番号の補完（Google Places → 信頼度つき＋確認キュー）
 * =====================================================================
 * phone が未設定の医院について Places を検索し、厚労省の座標と名称で
 * スコアリング。高信頼のみ自動採用（phone_verified=false の「未確認」）、
 * 曖昧なものは phone_candidates（確認キュー）に積む。
 *
 * 安全設計:
 *   - phone_verified=true / phone_source='manual' の医院は触らない
 *   - 自動採用しても「未確認」フラグ付き → UIで色分け＆人が確認
 *   - 採用/候補に place_id・距離・スコアを記録（監査可能）
 *
 * 使い方（本番）:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GOOGLE_MAPS_API_KEY=... \
 *     pnpm enrich:phones --prefecture 東京都 --city 新宿区 --limit 50
 *
 * 使い方（APIキー無しで照合ロジックを検証）:
 *   pnpm enrich:phones --mock scripts/__fixtures__/places.sample.json --dry-run
 *
 * 使い方（API 0回で対象件数＝想定API回数だけ見積もる）:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     pnpm enrich:phones --estimate --prefecture 東京都 --city 新宿区
 */
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { decideMatch, type RawCandidate } from "../lib/match";

// ---- CLI -----------------------------------------------------------
function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

const filterPref = getArg("prefecture");
const filterCity = getArg("city");
const limit = getArg("limit") ? Number(getArg("limit")) : 50;
const dryRun = hasFlag("dry-run");
const estimate = hasFlag("estimate");
const mockPath = getArg("mock");
const maxCandidates = getArg("max-candidates") ? Number(getArg("max-candidates")) : 5;

type ClinicRow = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  external_id: string | null;
};

// ---- Places 検索 ---------------------------------------------------
async function searchPlaces(clinic: ClinicRow): Promise<RawCandidate[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY が未設定です");

  const body: Record<string, unknown> = {
    textQuery: [clinic.name, clinic.address].filter(Boolean).join(" "),
    regionCode: "JP",
    languageCode: "ja",
    maxResultCount: maxCandidates,
  };
  if (clinic.lat != null && clinic.lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: clinic.lat, longitude: clinic.lng },
        radius: 500,
      },
    };
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.location",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Places API ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    places?: {
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      nationalPhoneNumber?: string;
      location?: { latitude: number; longitude: number };
    }[];
  };
  return (json.places ?? []).map((p) => ({
    place_id: p.id,
    name: p.displayName?.text ?? null,
    formatted_address: p.formattedAddress ?? null,
    phone: p.nationalPhoneNumber ?? null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
  }));
}

// ---- モック（APIの代わりにローカルJSONを引く） ---------------------
// 形式: { "<external_id or name>": { clinic?: {name,lat,lng}, candidates: [...] } }
type MockEntry = {
  clinic?: { name: string; lat?: number | null; lng?: number | null };
  candidates: RawCandidate[];
};
type MockMap = Record<string, MockEntry>;
function loadMock(path: string): MockMap {
  return JSON.parse(readFileSync(path, "utf8")) as MockMap;
}
function mockLookup(mock: MockMap, clinic: ClinicRow): RawCandidate[] {
  return (
    mock[clinic.external_id ?? ""]?.candidates ??
    mock[clinic.name]?.candidates ??
    []
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- メイン --------------------------------------------------------
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // --estimate: APIを一切呼ばず、対象件数（＝本実行で叩くAPI回数の目安）だけ出す
  if (estimate) {
    if (!url || !serviceKey) {
      console.error(
        "❌ --estimate には NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です。",
      );
      process.exit(1);
    }
    const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

    let q = sb
      .from("clinics")
      .select("*", { count: "exact", head: true })
      .is("phone", null)
      .eq("phone_verified", false);
    if (filterPref) q = q.eq("prefecture", filterPref);
    if (filterCity) q = q.eq("city", filterCity);
    const { count, error } = await q;
    if (error) {
      console.error("❌ 件数取得に失敗:", error.message);
      process.exit(1);
    }

    // 座標ありの件数（強い照合が効く＝自動採用されやすい）
    let qc = sb
      .from("clinics")
      .select("*", { count: "exact", head: true })
      .is("phone", null)
      .eq("phone_verified", false)
      .not("lat", "is", null);
    if (filterPref) qc = qc.eq("prefecture", filterPref);
    if (filterCity) qc = qc.eq("city", filterCity);
    const { count: withCoords } = await qc;

    const total = count ?? 0;
    const effective = Math.min(total, limit);
    const scope =
      [filterPref, filterCity].filter(Boolean).join(" ") || "全件";
    console.log(`📊 見積もり（${scope}）— API呼び出しなし`);
    console.log(`  電話未取得の対象: ${total}件`);
    console.log(`  うち座標あり（照合が効く）: ${withCoords ?? 0}件`);
    console.log(`  今回の --limit ${limit} 適用後に叩くAPI回数: 約 ${effective}回`);
    console.log(`  ※ 1医院 = Text Search 1回。候補の電話番号は同じ応答に含まれます。`);
    return;
  }

  const mock = mockPath ? loadMock(mockPath) : null;

  // モック＋dry-run なら DB 無しでも照合ロジックを検証できる
  let clinics: ClinicRow[];
  let supabase: SupabaseClient | null = null;

  if (mock && dryRun && !url) {
    // フィクスチャの clinic 情報から擬似的な医院を組み立てる
    clinics = Object.entries(mock)
      .filter(([k]) => !k.startsWith("_")) // _comment 等のメタキーを除外
      .map(([k, v], i) => ({
        id: `mock-${i}`,
        name: v.clinic?.name ?? k,
        address: null,
        lat: v.clinic?.lat ?? null,
        lng: v.clinic?.lng ?? null,
        external_id: k,
      }));
    console.log(`🧪 モック検証モード: ${clinics.length}件`);
  } else {
    if (!url || !serviceKey) {
      console.error(
        "❌ NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です（または --mock + --dry-run）。",
      );
      process.exit(1);
    }
    supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    let q = supabase
      .from("clinics")
      .select("id,name,address,lat,lng,external_id")
      .is("phone", null)
      .eq("phone_verified", false)
      .limit(limit);
    if (filterPref) q = q.eq("prefecture", filterPref);
    if (filterCity) q = q.eq("city", filterCity);
    const { data, error } = await q;
    if (error) {
      console.error("❌ 医院の取得に失敗:", error.message);
      process.exit(1);
    }
    clinics = (data ?? []) as unknown as ClinicRow[];
    console.log(`🔎 対象 ${clinics.length}件`);
  }

  let accepted = 0;
  let queued = 0;
  let none = 0;

  for (const clinic of clinics) {
    let raws: RawCandidate[];
    try {
      raws = mock ? mockLookup(mock, clinic) : await searchPlaces(clinic);
    } catch (e) {
      console.error(`  ⚠️ ${clinic.name}: 検索失敗 ${(e as Error).message}`);
      continue;
    }

    const decision = decideMatch(
      { name: clinic.name, lat: clinic.lat, lng: clinic.lng },
      raws,
    );

    if (decision.kind === "accept") {
      accepted++;
      const b = decision.best;
      console.log(
        `  ✅ 自動採用 ${clinic.name} → ${b.phone}（${b.name}, ${b.distance_m}m, conf ${b.confidence}）`,
      );
      if (!dryRun && supabase) {
        await supabase
          .from("clinics")
          .update({
            phone: b.phone,
            phone_source: "places",
            phone_verified: false, // 「未確認」: かけた人が最終確認
            place_id: b.place_id ?? null,
          })
          .eq("id", clinic.id);
      }
    } else if (decision.kind === "review") {
      queued++;
      const top = decision.candidates[0];
      console.log(
        `  🟡 要確認 ${clinic.name}（${decision.candidates.length}候補, 最有力 ${top.phone ?? "-"} conf ${top.confidence}）`,
      );
      if (!dryRun && supabase) {
        const rows = decision.candidates.slice(0, maxCandidates).map((c) => ({
          clinic_id: clinic.id,
          place_id: c.place_id ?? null,
          name: c.name ?? null,
          formatted_address: c.formatted_address ?? null,
          phone: c.phone ?? null,
          distance_m: c.distance_m,
          name_score: c.name_score,
          confidence: c.confidence,
          status: "pending",
        }));
        await supabase.from("phone_candidates").insert(rows);
      }
    } else {
      none++;
      console.log(`  ⚪ 候補なし ${clinic.name}`);
    }

    if (!mock) await sleep(200); // APIレート配慮
  }

  console.log(
    `\n📊 結果: 自動採用 ${accepted} / 要確認 ${queued} / 候補なし ${none}` +
      (dryRun ? "（dry-run: 書き込みなし）" : ""),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
