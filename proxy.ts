// Next.js 16 では従来の middleware は proxy に名称変更された。
// 合言葉方式：署名付き Cookie を検証し、未ログインは /login へ飛ばす。
import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const ok = await verifyToken(request.cookies.get(COOKIE_NAME)?.value);
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login");

  // 未ログインで保護ルートにアクセス → /login へ
  if (!ok && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ログイン済みで /login に来たら一覧へ
  if (ok && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/clinics";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 静的アセット・画像最適化・favicon を除く全ルートを通す
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
