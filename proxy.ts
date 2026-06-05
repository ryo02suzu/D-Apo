// Next.js 16 では従来の middleware は proxy に名称変更された。
// 設計書 Phase 1 の「未ログインは /login へ／セッション更新」を担う。
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // 静的アセット・画像最適化・favicon を除く全ルートを通す
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
