// components/call-button.tsx
// 設計書 §3「ワンタップ発信（要件5）」: 電話番号からハイフン・空白を
// 除去して tel: URI にする。
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
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition active:scale-95"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-lg">📞</span>
      </a>
    );
  }

  return (
    <a
      href={`tel:${tel}`}
      className="block rounded-xl bg-emerald-600 px-4 py-3 text-center font-bold text-white shadow-sm transition active:scale-[0.99] hover:bg-emerald-700"
    >
      📞 {phone} に発信
    </a>
  );
}
