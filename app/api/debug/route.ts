// 一時デバッグ用。本番関数内からSupabaseに到達できるか/件数/エラーを確認する。
// 確認後に削除する。proxy で /login に飛ばされないよう、合言葉Cookieを付けてアクセスすること。
import { NextResponse } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = {
    url: SUPABASE_URL,
    keyPrefix: SUPABASE_ANON_KEY.slice(0, 28),
    keyLen: SUPABASE_ANON_KEY.length,
    envUrlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    envKeySet: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    region: process.env.VERCEL_REGION ?? null,
  };

  // (1) 素のfetchでREST到達性を確認
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/clinics?select=id`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
      cache: "no-store",
    });
    out.fetch = {
      status: r.status,
      range: r.headers.get("content-range"),
      body: (await r.text()).slice(0, 160),
    };
  } catch (e) {
    out.fetch = { err: String(e instanceof Error ? e.message : e) };
  }

  // (2) アプリと同じ @supabase/ssr クライアント経由
  try {
    const sb = await createClient();
    const { data, error } = await sb.from("clinics").select("id");
    out.sdk = { rows: data?.length ?? null, error: error?.message ?? null };
  } catch (e) {
    out.sdk = { err: String(e instanceof Error ? e.message : e) };
  }

  return NextResponse.json(out);
}
