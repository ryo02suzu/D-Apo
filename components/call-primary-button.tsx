// components/call-primary-button.tsx
// ホーム「次に電話する医院」のプライマリ「電話する」ボタン（モック HomeScreen）。
// 電話番号があれば <a href="tel:..."> で発信し、約400ms後に結果入力画面へ遷移。
// 番号が無ければ tel: なしで結果入力画面へのリンクとして描画する。
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";

export function CallPrimaryButton({
  clinicId,
  phone,
}: {
  clinicId: string;
  phone: string | null;
}) {
  const router = useRouter();
  const resultHref = `/clinics/${clinicId}?tab=result`;

  if (!phone) {
    return (
      <Link href={resultHref} className="btn btn-primary" style={{ marginTop: 18 }}>
        <Icon name="phone" fill size={22} style={{ color: "#fff" }} />
        電話する
      </Link>
    );
  }

  const tel = phone.replace(/[^\d+]/g, "");
  return (
    <a
      href={`tel:${tel}`}
      className="btn btn-primary"
      style={{ marginTop: 18 }}
      onClick={() => {
        setTimeout(() => router.push(resultHref), 400);
      }}
    >
      <Icon name="phone" fill size={22} style={{ color: "#fff" }} />
      電話する
    </a>
  );
}
