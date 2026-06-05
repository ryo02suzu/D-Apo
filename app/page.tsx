import { redirect } from "next/navigation";

// 設計書 §3 画面遷移: ルートは一覧（メイン）へ。
// 未ログインなら middleware が /login へ飛ばす。
export default function Home() {
  redirect("/clinics");
}
