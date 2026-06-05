/**
 * 厚労省「医療情報ネット」オープンデータ（歯科診療所）→ Supabase clinics 取り込み
 * =====================================================================
 * 入力は2ファイル（ZIPを解凍したCSV, UTF-8-BOM）:
 *   - 施設票        03-1_dental_facility_info_YYYYMMDD.csv
 *   - 診療科・診療時間票 03-2_dental_speciality_hours_YYYYMMDD.csv
 * 両者を「ID」で結合し、診療時間票を hours(jsonb) に構造化して投入する。
 *
 * ※ 注意: 厚労省データに電話番号は含まれない。phone は NULL のまま投入し、
 *   架電前に別手段（Places API・手入力等）で補完する想定。
 *
 * 使い方:
 *   cp .env.local .env  # もしくは環境変数を直接渡す
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     pnpm import:clinics \
 *       --facility ./data/03-1_dental_facility_info_20251201.csv \
 *       --hours    ./data/03-2_dental_speciality_hours_20251201.csv \
 *       --prefecture 東京都 [--city 新宿区] [--limit 500] [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Interval, WeeklyHours } from "../lib/types";

// ---------------------------------------------------------------------
// CLI 引数
// ---------------------------------------------------------------------
function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

const facilityPath = getArg("facility");
const hoursPath = getArg("hours");
const filterPref = getArg("prefecture");
const filterCity = getArg("city");
const limit = getArg("limit") ? Number(getArg("limit")) : Infinity;
const dryRun = hasFlag("dry-run");
const source = getArg("source") ?? "mhlw";
const outSql = getArg("out-sql"); // 指定時: DB投入せず、貼り付け用SQLファイルを出力

if (!facilityPath || !hoursPath) {
  console.error(
    "Usage: pnpm import:clinics --facility <施設票.csv> --hours <診療時間票.csv> [--prefecture 東京都] [--city 新宿区] [--limit N] [--dry-run]",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------
// CSV パーサ（RFC4180準拠の最小実装。"" エスケープ・引用内カンマ/改行に対応）
// ---------------------------------------------------------------------
function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM除去
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else if (c === "\r") {
      // 次が \n の場合に処理されるためスキップ
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** ヘッダ名→列インデックスの引き当て（見つからなければ例外） */
function indexer(header: string[]) {
  const map = new Map(header.map((h, i) => [h.trim(), i]));
  return (name: string): number => {
    const i = map.get(name);
    if (i === undefined) {
      throw new Error(`列「${name}」が見つかりません。ヘッダ: ${header.join(", ")}`);
    }
    return i;
  };
}

// ---------------------------------------------------------------------
// 変換ヘルパー
// ---------------------------------------------------------------------
const DAY_COLS: { key: keyof WeeklyHours; start: string; end: string }[] = [
  { key: "mon", start: "月_診療開始時間", end: "月_診療終了時間" },
  { key: "tue", start: "火_診療開始時間", end: "火_診療終了時間" },
  { key: "wed", start: "水_診療開始時間", end: "水_診療終了時間" },
  { key: "thu", start: "木_診療開始時間", end: "木_診療終了時間" },
  { key: "fri", start: "金_診療開始時間", end: "金_診療終了時間" },
  { key: "sat", start: "土_診療開始時間", end: "土_診療終了時間" },
  { key: "sun", start: "日_診療開始時間", end: "日_診療終了時間" },
];
const DAY_ORDER: (keyof WeeklyHours)[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];
const DAY_JP: Record<string, string> = {
  mon: "月",
  tue: "火",
  wed: "水",
  thu: "木",
  fri: "金",
  sat: "土",
  sun: "日",
};

/** "9:00" → "09:00"。不正値は null。 */
function normalizeTime(raw: string): string | null {
  const t = raw.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = m[1].padStart(2, "0");
  return `${hh}:${m[2]}`;
}

/** 診療時間票（同一IDの複数行＝診療時間帯）から WeeklyHours を構築 */
function buildHoursMap(rows: string[][]): Map<string, WeeklyHours> {
  const header = rows[0];
  const col = indexer(header);
  const idIdx = col("ID");
  const dayIdx = DAY_COLS.map((d) => ({
    key: d.key,
    s: col(d.start),
    e: col(d.end),
  }));

  const map = new Map<string, WeeklyHours>();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length <= idIdx) continue;
    const id = row[idIdx]?.trim();
    if (!id) continue;

    // 初回出現時に全曜日を [] で初期化（空＝休診として扱う）
    let wh = map.get(id);
    if (!wh) {
      wh = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
      map.set(id, wh);
    }
    for (const d of dayIdx) {
      const start = normalizeTime(row[d.s] ?? "");
      const end = normalizeTime(row[d.e] ?? "");
      if (start && end && start < end) {
        (wh[d.key] as Interval[]).push([start, end]);
      }
    }
  }

  // 同一IDは診療科目（歯科・小児歯科・矯正…）ごとに行が分かれており、
  // 同じ時間帯が重複する。重複を除去し、開始時刻でソートする。
  for (const wh of map.values()) {
    for (const k of DAY_ORDER) {
      const iv = wh[k];
      if (!iv) continue;
      const seen = new Set<string>();
      const dedup: Interval[] = [];
      for (const pair of iv) {
        const key = `${pair[0]}-${pair[1]}`;
        if (!seen.has(key)) {
          seen.add(key);
          dedup.push(pair);
        }
      }
      dedup.sort((a, b) => a[0].localeCompare(b[0]));
      wh[k] = dedup;
    }
  }
  return map;
}

/** WeeklyHours → 一覧表示用の business_hours テキスト */
function toBusinessHoursText(wh: WeeklyHours): string | null {
  const open: string[] = [];
  const closed: string[] = [];
  for (const k of DAY_ORDER) {
    const iv = wh[k];
    if (iv && iv.length) {
      open.push(`${DAY_JP[k]} ${iv.map(([s, e]) => `${s}–${e}`).join(", ")}`);
    } else {
      closed.push(DAY_JP[k]);
    }
  }
  let s = open.join(" / ");
  if (closed.length) s += `${s ? " / " : ""}休: ${closed.join("・")}`;
  return s || null;
}

/** 所在地文字列から都道府県・市区町村を抽出 */
function parseRegion(addr: string): {
  prefecture: string | null;
  city: string | null;
} {
  const a = addr.trim();
  const pm = a.match(/^(北海道|東京都|京都府|大阪府|.{2,3}県)/);
  const prefecture = pm ? pm[1] : null;
  let city: string | null = null;
  if (prefecture) {
    const rest = a.slice(prefecture.length);
    // 政令市の区(市+区) → 市 → 特別区 → 郡+町村 → 町村 の順で貪欲に
    const cm = rest.match(
      /^(.+?市.+?区|.+?市|.+?区|.+?郡.+?[町村]|.+?[町村])/,
    );
    city = cm ? cm[1] : null;
  }
  return { prefecture, city };
}

type ClinicInsert = {
  external_id: string;
  name: string;
  address: string | null;
  prefecture: string | null;
  city: string | null;
  business_hours: string | null;
  hours: WeeklyHours;
  lat: number | null;
  lng: number | null;
  source: string;
};

/** "43.29" → 43.29。空・不正は null */
function parseCoord(raw: string | undefined): number | null {
  const n = Number((raw ?? "").trim());
  return Number.isFinite(n) && n !== 0 ? n : null;
}

// ---------------------------------------------------------------------
// 貼り付け用 SQL の生成（ターミナル無しの人向け：Supabase SQL Editor に貼る）
// ---------------------------------------------------------------------
function sqlStr(s: string | null): string {
  return s === null ? "null" : `'${s.replace(/'/g, "''")}'`;
}
function sqlNum(n: number | null): string {
  return n === null ? "null" : String(n);
}
function recordsToSql(records: ClinicInsert[]): string {
  const cols =
    "external_id,name,address,prefecture,city,business_hours,hours,lat,lng,source";
  const lines: string[] = [
    "-- 自動生成: 厚労省オープンデータ → clinics 投入用SQL",
    "-- Supabase ダッシュボード → SQL Editor に貼って Run（schema.sql 実行後）",
    "",
  ];
  const CHUNK = 500;
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK);
    lines.push(`insert into public.clinics (${cols}) values`);
    const values = chunk.map((r) => {
      const hours = `'${JSON.stringify(r.hours).replace(/'/g, "''")}'::jsonb`;
      return (
        `  (${sqlStr(r.external_id)}, ${sqlStr(r.name)}, ${sqlStr(r.address)}, ` +
        `${sqlStr(r.prefecture)}, ${sqlStr(r.city)}, ${sqlStr(r.business_hours)}, ` +
        `${hours}, ${sqlNum(r.lat)}, ${sqlNum(r.lng)}, ${sqlStr(r.source)})`
      );
    });
    lines.push(values.join(",\n"));
    // 再実行しても安全に（マスタ項目だけ更新、進捗・電話は保持）
    lines.push(
      "on conflict (external_id) do update set\n" +
        "  name=excluded.name, address=excluded.address, prefecture=excluded.prefecture,\n" +
        "  city=excluded.city, business_hours=excluded.business_hours, hours=excluded.hours,\n" +
        "  lat=excluded.lat, lng=excluded.lng, source=excluded.source;",
    );
    lines.push("");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------
// メイン
// ---------------------------------------------------------------------
async function main() {
  console.log("📂 CSV読込中...");
  const facilityRows = parseCsv(readFileSync(facilityPath!, "utf8"));
  const hoursRows = parseCsv(readFileSync(hoursPath!, "utf8"));
  console.log(
    `  施設票 ${facilityRows.length - 1}件 / 時間票 ${hoursRows.length - 1}行`,
  );

  console.log("⏱  診療時間を hours(jsonb) に変換中...");
  const hoursMap = buildHoursMap(hoursRows);

  const fHeader = facilityRows[0];
  const fc = indexer(fHeader);
  const idIdx = fc("ID");
  const nameIdx = fc("正式名称");
  const addrIdx = fc("所在地");
  const latIdx = fc("所在地座標（緯度）");
  const lngIdx = fc("所在地座標（経度）");

  const records: ClinicInsert[] = [];
  let skippedRegion = 0;
  for (let r = 1; r < facilityRows.length; r++) {
    const row = facilityRows[r];
    if (!row || row.length <= idIdx) continue;
    const external_id = row[idIdx]?.trim();
    const name = row[nameIdx]?.trim();
    if (!external_id || !name) continue;

    const address = row[addrIdx]?.trim() || null;
    const { prefecture, city } = address
      ? parseRegion(address)
      : { prefecture: null, city: null };

    // エリア絞り込み
    if (filterPref && prefecture !== filterPref) {
      skippedRegion++;
      continue;
    }
    if (filterCity && city !== filterCity) {
      skippedRegion++;
      continue;
    }

    const hours = hoursMap.get(external_id) ?? {};
    records.push({
      external_id,
      name,
      address,
      prefecture,
      city,
      business_hours: toBusinessHoursText(hours),
      hours,
      lat: parseCoord(row[latIdx]),
      lng: parseCoord(row[lngIdx]),
      source,
    });
    if (records.length >= limit) break;
  }

  console.log(
    `✅ 対象 ${records.length}件（エリア外スキップ ${skippedRegion}件）`,
  );

  if (records.length === 0) {
    console.log("対象が0件でした。--prefecture / --city の指定を確認してください。");
    return;
  }

  // サンプル表示
  console.log("\n--- サンプル(先頭3件) ---");
  for (const rec of records.slice(0, 3)) {
    console.log(
      `  ${rec.name}（${rec.prefecture ?? "?"}${rec.city ?? ""}）` +
        `\n    住所: ${rec.address}` +
        `\n    時間: ${rec.business_hours}` +
        `\n    hours: ${JSON.stringify(rec.hours)}`,
    );
  }
  console.log("");

  if (outSql) {
    writeFileSync(outSql, recordsToSql(records), "utf8");
    console.log(
      `📝 ${records.length}件分のSQLを書き出しました: ${outSql}\n   → Supabase の SQL Editor に貼って実行してください（ターミナル不要）。`,
    );
    return;
  }

  if (dryRun) {
    console.log("🌵 --dry-run のため DB への書き込みは行いません。");
    return;
  }

  // Supabase へ upsert（サービスロールキーで RLS をバイパス）
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "❌ NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を環境変数で渡してください。",
    );
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const BATCH = 500;
  let done = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    // external_id を衝突キーに upsert。status/latest_memo 等は payload に含めないため、
    // 再取込時も既存の架電進捗を保持する。
    const { error } = await supabase
      .from("clinics")
      .upsert(batch, { onConflict: "external_id" });
    if (error) {
      console.error(`❌ バッチ ${i / BATCH + 1} で失敗:`, error.message);
      process.exit(1);
    }
    done += batch.length;
    console.log(`  投入 ${done}/${records.length}`);
  }
  console.log(`🎉 完了: ${done}件を取り込みました。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
