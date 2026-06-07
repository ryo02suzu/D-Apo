/**
 * 電話番号の補完（厚労省「医療情報ネット（ナビイ）」スクレイピング版 / Google API 不使用）
 * =====================================================================
 * MHLW のオープンデータ CSV には電話番号が無いが、ナビイの施設詳細ページには
 * 電話番号が掲載されている。ここでは:
 *   1) 各院の name でナビイのフリーワード検索を実行（Playwright; 検索フォームは JS 駆動）
 *   2) 検索結果一覧（S2400）から施設詳細リンク a[href*="S2430"] と施設名を取得
 *   3) 名称（必要なら住所）でベストマッチを選択
 *   4) 詳細ページ（S2430; サーバレンダリングの素の HTML）を取得して
 *      「案内用電話番号」行の <a href="tel:..."> から電話番号を抽出（FAX は tel: を持たないので除外される）
 *
 * 安全設計:
 *   - 既定は dry-run（DB 書き込みなし、結果を表形式で出力するだけ）
 *   - --commit を付けた場合のみ phone / phone_source='mhlw' / phone_verified=true を書き込む
 *   - HIGH / MEDIUM マッチのみ採用。曖昧（LOW / 無し）は skip して報告
 *
 * 礼儀:
 *   - 識別可能な User-Agent（DentiaResearch/1.0）
 *   - 約 1 req/sec のレート制限
 *
 * 使い方:
 *   npx tsx scripts/enrich-phones-mhlw.ts --city 新宿区 --limit 5            # dry-run（既定）
 *   npx tsx scripts/enrich-phones-mhlw.ts --city 新宿区 --limit 5 --commit   # 書き込み
 */

// Playwright はグローバルインストール（/opt/node22/...）にあるため絶対パスで読み込む。
// @ts-ignore  グローバルパス（/opt/node22/...）からの読み込みのため型解決はスキップ
import { chromium, type Browser, type Page } from "playwright";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase/config";

// ---- 定数 ----------------------------------------------------------
const BASE = "https://www.iryou.teikyouseido.mhlw.go.jp";
const SEARCH_URL = `${BASE}/znk-web/juminkanja/S2310/initialize?pref=13`;
const UA = "DentiaResearch/1.0 (clinic phone enrichment; contact: ops@dentia.example)";
const RATE_MS = 1100; // 約 1 req/sec

// ---- CLI -----------------------------------------------------------
function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

const filterCity = getArg("city");
const filterPref = getArg("prefecture");
const allJapan = hasFlag("all");
const scopeLabel = allJapan ? "全国" : (filterPref ?? filterCity ?? "新宿区");
const limit = getArg("limit")
  ? Number(getArg("limit"))
  : allJapan || filterPref
    ? 0 // 0 = 上限なし（全件処理）
    : 5;
const commit = hasFlag("commit");
const dryRun = !commit; // 既定は dry-run

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- 正規化 / マッチング -------------------------------------------
/** 全角半角・空白・記号差を吸収して比較用に正規化する。 */
function norm(s: string): string {
  return (s || "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[　・,，.．\-―ー－]/g, "")
    .toLowerCase()
    .trim();
}

/** 検索用に院名から法人格・先頭の括弧書きを除去（サイト検索のヒット率向上）。 */
function searchName(s: string): string {
  let t = (s || "").normalize("NFKC").trim();
  // 先頭の括弧グループを繰り返し除去:（公社）（医） や (...)
  for (let i = 0; i < 4; i++) {
    const u = t.replace(/^[（(][^（）()]*[）)]\s*/, "").trim();
    if (u === t) break;
    t = u;
  }
  // 法人格の語を除去
  t = t
    .replace(
      /(医療法人社団|医療法人財団|医療法人|社会医療法人|公益社団法人|一般社団法人|公益財団法人|一般財団法人|社会福祉法人|独立行政法人|国立大学法人)/g,
      "",
    )
    .replace(/^[（(][^（）()]*[）)]\s*/, "")
    .trim();
  return t.length >= 2 ? t : (s || "").normalize("NFKC").trim();
}

type Confidence = "high" | "medium";
type MatchResult = { name: string; href: string; confidence: Confidence } | null;

/** 検索結果候補の中から、我々の院名にベストマッチするものを選ぶ。 */
function pickBest(
  ourName: string,
  candidates: { name: string; href: string }[],
): MatchResult {
  const target = norm(ourName);
  // 1) 完全一致 → high
  for (const c of candidates) {
    if (norm(c.name) === target) return { name: c.name, href: c.href, confidence: "high" };
  }
  // 2) 包含（どちらかが他方を含む）→ medium
  for (const c of candidates) {
    const n = norm(c.name);
    if (n && (n.includes(target) || target.includes(n))) {
      return { name: c.name, href: c.href, confidence: "medium" };
    }
  }
  return null;
}

// ---- 電話番号抽出（詳細ページ HTML） --------------------------------
/**
 * 詳細ページ HTML から「案内用電話番号」を抽出する。
 * 構造:  <th><label class="ptn1ItemName">案内用電話番号</label></th>
 *        <td> ... <a href="tel:0312345678" ...>(03)1234-5678</a> ... </td>
 * FAX 行は tel: リンクを持たないため、電話番号行の td 内の tel: のみを拾えば誤検出しない。
 * 取得できた tel: の数字を 0XX-XXXX-XXXX 形式へ整形する。
 */
function extractPhone(html: string): string | null {
  // 「電話番号」を含み「FAX」を含まないラベルの th を起点に、その後の td 内の tel: を探す。
  // ラベル → 直後の td までを緩く切り出す。
  const labelRe = /ptn1ItemName">([^<]*?電話番号[^<]*?)<\/label>/g;
  let m: RegExpExecArray | null;
  while ((m = labelRe.exec(html)) !== null) {
    const label = m[1];
    if (/FAX|ＦＡＸ/i.test(label)) continue; // FAX ラベルは除外
    // このラベル以降、次のラベル（or 表終わり）までの区間で tel: を探す
    const rest = html.slice(m.index, m.index + 1200);
    const tel = rest.match(/href="tel:(\d{6,15})"/);
    if (tel) return formatPhone(tel[1]);
    // tel: が無い場合、color-link テキストから数字列を拾う（保険）
    const txt = rest.match(/class="color-link">\(?0\d[\d()\-－）]{6,}/);
    if (txt) {
      const digits = txt[0].replace(/\D/g, "");
      if (digits.length >= 9) return formatPhone(digits);
    }
  }
  return null;
}

/** 数字列を日本の固定電話っぽい区切り（市外局番-局番-番号）に整形する。失敗時はそのまま返す。 */
function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  // 東京 03 / 06 等 2桁市外局番
  if (/^0[36]\d{8}$/.test(d)) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  // 一般的な 10 桁（市外3-局番3-番号4 など）はそのまま 0XX-XXX-XXXX に寄せる
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  return d;
}

// ---- Supabase（REST; anon キーで READ / UPDATE） -------------------
type ClinicRow = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  external_id: string | null;
  phone: string | null;
};

async function fetchClinics(): Promise<ClinicRow[]> {
  // PostgREST は 1 リクエスト最大 1000 行のため、offset でページングして
  // phone 未登録の対象を全件読み込む（書き込み前の読み取りなので offset は安定）。
  const PAGE = 1000;
  const out: ClinicRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/clinics`);
    url.searchParams.set("select", "id,name,address,city,external_id,phone");
    if (allJapan) {
      // 地域フィルタなし（全国）
    } else if (filterPref) {
      url.searchParams.set("prefecture", `eq.${filterPref}`);
    } else {
      url.searchParams.set("city", `eq.${filterCity ?? "新宿区"}`);
    }
    url.searchParams.set("phone", "is.null");
    url.searchParams.set("order", "id.asc");
    url.searchParams.set("limit", String(PAGE));
    url.searchParams.set("offset", String(offset));
    const res = await fetch(url.toString(), {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
    const rows = (await res.json()) as ClinicRow[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    if (limit > 0 && out.length >= limit) break;
  }
  return limit > 0 ? out.slice(0, limit) : out;
}

async function updatePhone(id: string, phone: string): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/clinics?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ phone, phone_source: "mhlw", phone_verified: true }),
  });
  if (!res.ok) throw new Error(`Supabase update failed: ${res.status} ${await res.text()}`);
}

// ---- ナビイ検索（Playwright） --------------------------------------
/** 院名でフリーワード検索し、結果一覧から詳細リンク候補を返す。 */
async function searchSite(page: Page, name: string): Promise<{ name: string; href: string }[]> {
  // networkidle はこのサイト（常時通信）で最大60秒待ちになり激遅。
  // domcontentloaded + 要素待ちにして高速化（1件あたり ~20s → ~3-5s）。
  await page.goto(SEARCH_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("#keyword1", { timeout: 15000 });
  await page.fill("#keyword1", searchName(name));
  await page.click("#keyword1");
  await Promise.all([
    page.waitForURL(/S2400/, { timeout: 30000 }).catch(() => {}),
    page.keyboard.press("Enter"),
  ]);
  // 結果リンクが出るまで待つ（無ければ短時間で諦める＝検索結果なし）
  await page.waitForSelector("a[href*='S2430']", { timeout: 8000 }).catch(() => {});
  // 結果一覧（S2400）から S2430 詳細リンクを収集
  return page.$$eval("a[href*='S2430']", (els: Element[]) =>
    els.map((e) => ({
      name: (e as HTMLElement).innerText.trim(),
      href: (e as HTMLAnchorElement).getAttribute("href") || "",
    })).filter((x) => x.href),
  );
}

/** 詳細ページ HTML を fetch（素の HTML; JS 不要）。 */
async function fetchDetail(href: string): Promise<string> {
  const url = href.startsWith("http") ? href : `${BASE}${href}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`detail fetch failed: ${res.status} ${url}`);
  return res.text();
}

// ---- メイン --------------------------------------------------------
type Report = {
  ourName: string;
  matchedName: string | null;
  phone: string | null;
  confidence: Confidence | "-";
  note: string;
};

async function main() {
  console.log(`# MHLW ナビイ 電話番号補完  scope=${scopeLabel} limit=${limit} ` + (dryRun ? "(DRY-RUN: 書き込みなし)" : "(COMMIT: 書き込みあり)"));
  console.log(`# レート制限: 約 ${(1000 / RATE_MS).toFixed(2)} req/sec / UA="${UA}"`);

  const clinics = await fetchClinics();
  console.log(`# 対象 ${clinics.length} 件（phone IS NULL）\n`);

  const browser: Browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, userAgent: UA });
  const page = await ctx.newPage();

  const reports: Report[] = [];

  for (const clinic of clinics) {
    let report: Report = { ourName: clinic.name, matchedName: null, phone: null, confidence: "-", note: "" };
    try {
      const candidates = await searchSite(page, clinic.name);
      await sleep(RATE_MS); // 検索後のレート制限

      if (candidates.length === 0) {
        report.note = "検索結果なし";
      } else {
        const best = pickBest(clinic.name, candidates);
        if (!best) {
          report.note = `候補${candidates.length}件あるが名称一致せず: ${candidates.slice(0, 3).map((c) => c.name).join(" / ")}`;
        } else {
          report.matchedName = best.name;
          report.confidence = best.confidence;
          const html = await fetchDetail(best.href);
          await sleep(RATE_MS); // 詳細取得後のレート制限
          const phone = extractPhone(html);
          if (!phone) {
            report.note = "詳細ページに電話番号が見つからず";
          } else {
            report.phone = phone;
            if (commit) {
              await updatePhone(clinic.id, phone);
              report.note = "更新済み";
            } else {
              report.note = "dry-run（未書き込み）";
            }
          }
        }
      }
    } catch (e) {
      report.note = `エラー: ${(e as Error).message}`;
    }
    reports.push(report);
    console.error(`  done: ${clinic.name} -> ${report.phone ?? "(なし)"} [${report.confidence}] ${report.note}`);
  }

  await browser.close();

  // ---- 結果テーブル ----
  console.log("\n| our clinic name | matched site name | extracted phone | confidence | note |");
  console.log("|---|---|---|---|---|");
  for (const r of reports) {
    console.log(`| ${r.ourName} | ${r.matchedName ?? "-"} | ${r.phone ?? "-"} | ${r.confidence} | ${r.note} |`);
  }
  console.log(`\n# ${dryRun ? "DRY-RUN 完了: DB への書き込みは行っていません。" : "COMMIT 完了。"}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
