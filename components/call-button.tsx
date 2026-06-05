// components/call-button.tsx
// 設計書 §3「ワンタップ発信（要件5）」: 電話番号からハイフン・空白を
// 除去して tel: URI にする。Dentia.html の .mini-fab / .btn-primary に対応。
import { Icon } from "@/components/icon";

export function CallButton({
  phone,
  compact = false,
}: {
  phone: string | null;
  compact?: boolean;
}) {
  if (!phone) return null;
  const tel = phone.replace(/[^\d+]/g, ""); // 数字と＋以外を除去

  if (compact) {
    return (
      <a
        href={`tel:${tel}`}
        aria-label={`${phone} に発信`}
        className="mini-fab"
        onClick={(e) => e.stopPropagation()}
      >
        <Icon name="phone" fill size={19} style={{ color: "#fff" }} />
      </a>
    );
  }

  return (
    <a href={`tel:${tel}`} className="btn btn-primary">
      <Icon name="phone" fill size={22} style={{ color: "#fff" }} />
      {phone} に発信
    </a>
  );
}
