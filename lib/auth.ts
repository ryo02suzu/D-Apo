// lib/auth.ts
// 合言葉（共有パスワード）方式の軽量認証。
// Supabase Auth を使わず、HMAC 署名付き Cookie でログイン状態を保持する。
// proxy(Edge) と Server Action(Node) の両方から呼ぶため、Web Crypto のみ使用。

export const COOKIE_NAME = "d_apo_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30日

// 署名用シークレット。未設定なら合言葉を流用（合言葉を変えるとログインは失効）。
function secret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.APP_PASSWORD ||
    "dev-insecure-secret-change-me"
  );
}

function toB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return toB64Url(new Uint8Array(sig));
}

// 合言葉のデフォルト値。環境変数 APP_PASSWORD を設定すればそちらが優先される。
// （Vercel で env を設定しなくても、まずはこの合言葉でログインできる）
export const DEFAULT_PASSWORD = "dentia2026";

/** 合言葉が一致するか。APP_PASSWORD 未設定時は DEFAULT_PASSWORD を使う。 */
export function checkPassword(input: string): boolean {
  const pw = process.env.APP_PASSWORD?.trim() || DEFAULT_PASSWORD;
  return input === pw;
}

/** ログイン Cookie に入れるトークンを発行（"<失効ms>.<署名>"）。 */
export async function createToken(): Promise<string> {
  const exp = String(Date.now() + COOKIE_MAX_AGE * 1000);
  return `${exp}.${await sign(exp)}`;
}

/** Cookie のトークンが有効か（署名一致＋未失効）。 */
export async function verifyToken(token?: string): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return (await sign(exp)) === sig;
}
