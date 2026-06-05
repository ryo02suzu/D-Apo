// lib/match.ts
// 電話番号補完の「誤マッチ防止」中核ロジック（純粋関数）。
// Places候補を、名称類似度＋厚労省座標との距離でスコアリングし、
// 高信頼のみ自動採用、曖昧なものは確認キュー行きと判定する。

export type RawCandidate = {
  place_id?: string | null;
  name?: string | null;
  formatted_address?: string | null;
  phone?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type ScoredCandidate = RawCandidate & {
  name_score: number; // 0..1
  distance_m: number | null; // m（座標が無ければ null）
  confidence: number; // 0..1
};

export type MatchDecision =
  | { kind: "accept"; best: ScoredCandidate; rest: ScoredCandidate[] }
  | { kind: "review"; candidates: ScoredCandidate[] }
  | { kind: "none" };

// ---- 判定しきい値（運用で調整可能） --------------------------------
export const THRESHOLDS = {
  /** これ以上の総合信頼度かつ下記条件を満たせば自動採用 */
  autoConfidence: 0.82,
  /** 自動採用に必要な最低 名称類似度 */
  autoName: 0.8,
  /** 自動採用に許す最大距離(m)。座標が一致の強い裏付け */
  autoDistanceM: 150,
  /** 2位との信頼度差がこれ未満なら「紛らわしい」とみなし自動採用しない */
  ambiguousMargin: 0.15,
  /** これ未満の候補はキューにも出さない（ノイズ） */
  minConfidence: 0.4,
  /** 距離スコアが0になる距離(m) */
  distanceFalloffM: 400,
} as const;

// ---- 文字列正規化 ---------------------------------------------------
/** 照合用に医院名を正規化（全半角統一・記号/空白除去・法人格や一般語の除去） */
export function normalizeName(input: string | null | undefined): string {
  if (!input) return "";
  let s = input.normalize("NFKC").toLowerCase();
  // 法人格
  s = s.replace(/医療法人(社団|財団)?/g, "");
  // 区切り・記号・空白
  s = s.replace(/[\s　・,，.。/／\-－―ー()（）'"’”]/g, "");
  return s;
}

/** bigram集合の Dice 係数（0..1）。短い文字列はそのもの一致で評価。 */
export function nameSimilarity(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return x === y ? 1 : 0;

  const bigrams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const ax = bigrams(x);
  const bx = bigrams(y);
  let inter = 0;
  for (const [g, c] of ax) {
    const d = bx.get(g);
    if (d) inter += Math.min(c, d);
  }
  const total = x.length - 1 + (y.length - 1);
  return (2 * inter) / total;
}

// ---- 距離 -----------------------------------------------------------
/** 2点間のハバーサイン距離(m) */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ---- スコアリング ---------------------------------------------------
function distanceScore(distanceM: number | null): number {
  if (distanceM === null) return 0.5; // 座標不明は中立
  return Math.max(0, 1 - distanceM / THRESHOLDS.distanceFalloffM);
}

export function scoreCandidate(
  clinic: { name: string; lat?: number | null; lng?: number | null },
  cand: RawCandidate,
): ScoredCandidate {
  const name_score = nameSimilarity(clinic.name, cand.name);
  const distance_m =
    clinic.lat != null &&
    clinic.lng != null &&
    cand.lat != null &&
    cand.lng != null
      ? Math.round(haversineMeters(clinic.lat, clinic.lng, cand.lat, cand.lng))
      : null;
  // 名称6割・距離4割。電話が無い候補は無価値なので0に。
  const base = 0.6 * name_score + 0.4 * distanceScore(distance_m);
  const confidence = cand.phone ? base : 0;
  return {
    ...cand,
    name_score: round2(name_score),
    distance_m,
    confidence: round2(confidence),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** 候補群から採用/確認キュー/なしを判定 */
export function decideMatch(
  clinic: { name: string; lat?: number | null; lng?: number | null },
  candidates: RawCandidate[],
): MatchDecision {
  const scored = candidates
    .map((c) => scoreCandidate(clinic, c))
    .filter((c) => c.confidence >= THRESHOLDS.minConfidence)
    .sort((a, b) => b.confidence - a.confidence);

  if (scored.length === 0) return { kind: "none" };

  const [best, second] = scored;
  const margin = second ? best.confidence - second.confidence : 1;

  const autoOk =
    best.confidence >= THRESHOLDS.autoConfidence &&
    best.name_score >= THRESHOLDS.autoName &&
    best.distance_m !== null &&
    best.distance_m <= THRESHOLDS.autoDistanceM &&
    margin >= THRESHOLDS.ambiguousMargin &&
    !!best.phone;

  if (autoOk) return { kind: "accept", best, rest: scored.slice(1) };
  return { kind: "review", candidates: scored };
}
