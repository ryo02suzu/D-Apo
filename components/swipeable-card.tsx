// components/swipeable-card.tsx
// iOS 風「スワイプでアクションを表示」ラッパー。
// 左スワイプ → 右側に「結果入力」(teal)、右スワイプ → 左側に「発信」(green)。
// タップ（移動<8px・閉状態）は下層の <a>（カード）でそのまま詳細へ遷移。
// 開状態でのタップはアクションを閉じるだけ（遷移しない）。
// 縦スクロールを阻害しないよう、横スワイプと判定したときだけ preventDefault する。
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClinicCard } from "@/components/clinic-card";
import { Icon } from "@/components/icon";
import type { Clinic } from "@/lib/types";

/** 片側アクションパネルの幅(px) */
const ACTION_W = 84;
/** 横スワイプと判定する最小移動量(px) */
const SWIPE_THRESHOLD = 8;
/** タップ（非スワイプ）と判定する移動量の上限(px) */
const TAP_SLOP = 8;
/** スナップ開閉のしきい値（アクション幅に対する比率） */
const OPEN_RATIO = 0.4;

type OpenState = "closed" | "left" | "right";

export function SwipeableCard({
  clinic,
  busyBy,
  openId,
  onOpen,
}: {
  clinic: Clinic;
  busyBy?: { name: string; color: string } | null;
  /** 現在開いているカードの id（自分以外なら自動で閉じる） */
  openId?: string | null;
  /** 自身が開いたことを親へ通知（他カードを閉じる用） */
  onOpen?: (id: string) => void;
}) {
  const router = useRouter();
  const tel = clinic.phone ? clinic.phone.replace(/[^\d+]/g, "") : "";
  const hasPhone = tel.length > 0;

  const [open, setOpen] = useState<OpenState>("closed");
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  // ポインタ追跡用の可変参照（再レンダーを避ける）
  const startX = useRef(0);
  const startY = useRef(0);
  const captured = useRef(false); // 横スワイプとして取り込み済みか
  const decided = useRef(false); // 横/縦の判定が済んだか
  const baseOffset = useRef(0); // ドラッグ開始時点の表示オフセット
  const pointerId = useRef<number | null>(null);
  const movedTotal = useRef(0);
  const curOffset = useRef(0); // 現在の表示オフセット（finishDrag 用に同期）

  const openOffset = (s: OpenState) =>
    s === "left" ? ACTION_W : s === "right" ? -ACTION_W : 0;

  const close = useCallback(() => {
    setOpen("closed");
    setDx(0);
  }, []);

  // 他カードが開いたら自分は閉じる（一度に1枚だけ開く）
  useEffect(() => {
    if (openId && openId !== clinic.id && open !== "closed") {
      close();
    }
  }, [openId, clinic.id, open, close]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    baseOffset.current = openOffset(open);
    curOffset.current = baseOffset.current;
    captured.current = false;
    decided.current = false;
    pointerId.current = e.pointerId;
    movedTotal.current = 0;
    setDragging(false);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    const mx = e.clientX - startX.current;
    const my = e.clientY - startY.current;
    movedTotal.current = Math.max(movedTotal.current, Math.hypot(mx, my));

    if (!decided.current) {
      // まだ閾値未満なら何も判定しない（縦スクロールを許可）
      if (Math.abs(mx) < SWIPE_THRESHOLD && Math.abs(my) < SWIPE_THRESHOLD) {
        return;
      }
      decided.current = true;
      // 横移動が縦移動より大きいときだけ横スワイプとして取り込む
      if (Math.abs(mx) > Math.abs(my) && Math.abs(mx) > SWIPE_THRESHOLD) {
        captured.current = true;
        setDragging(true);
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
      } else {
        // 縦スワイプ：以後このジェスチャは無視（ブラウザのスクロールに任せる）
        captured.current = false;
      }
    }

    if (!captured.current) return;

    // 横スワイプ確定：スクロールのちらつきを防ぐ
    e.preventDefault();
    let next = baseOffset.current + mx;
    // 片側 ACTION_W にクランプ
    if (next > ACTION_W) next = ACTION_W;
    if (next < -ACTION_W) next = -ACTION_W;
    // 発信は電話番号が無いときも見た目は出すが、開いても無効表示
    curOffset.current = next;
    setDx(next);
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    setDragging(false);

    if (!captured.current) {
      // 横スワイプではなかった
      decided.current = false;
      return;
    }
    captured.current = false;
    decided.current = false;

    const offset = curOffset.current;
    const openThreshold = ACTION_W * OPEN_RATIO;
    let nextOpen: OpenState = "closed";
    if (offset >= openThreshold) nextOpen = "left"; // 右スワイプ → 左アクション(発信)
    else if (offset <= -openThreshold) nextOpen = "right"; // 左スワイプ → 右アクション(結果入力)

    setOpen(nextOpen);
    setDx(0);
    if (nextOpen !== "closed") onOpen?.(clinic.id);
  };

  // 表示オフセット：ドラッグ中は dx、そうでなければ open 状態
  const translate = dragging ? dx : openOffset(open);

  // カード（下層 <a>）のタップを横取りするか判定。
  // 開いている、またはスワイプ中（移動が TAP_SLOP 超）のときは遷移させない。
  const onCardClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (open !== "closed") {
      // 開いているならタップで閉じるだけ
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (movedTotal.current > TAP_SLOP) {
      // スワイプ操作だった：遷移させない
      e.preventDefault();
      e.stopPropagation();
    }
    // それ以外（純粋なタップ）は <a> の既定遷移に任せる
  };

  const callAction = () => {
    if (!hasPhone) return;
    window.location.href = `tel:${tel}`;
  };

  const resultAction = () => {
    setOpen("closed");
    setDx(0);
    router.push(`/clinics/${clinic.id}/result`);
  };

  return (
    <div className="swipe-wrap" data-open={open}>
      {/* 左側アクション：発信（右スワイプで出る） */}
      <div className="swipe-actions swipe-actions-left" aria-hidden={open !== "left"}>
        <button
          type="button"
          className={`swipe-btn swipe-call${hasPhone ? "" : " is-disabled"}`}
          onClick={callAction}
          disabled={!hasPhone}
          tabIndex={open === "left" ? 0 : -1}
        >
          <Icon name="phone" size={20} />
          <span className="swipe-label">発信</span>
        </button>
      </div>

      {/* 右側アクション：結果入力（左スワイプで出る） */}
      <div
        className="swipe-actions swipe-actions-right"
        aria-hidden={open !== "right"}
      >
        <button
          type="button"
          className="swipe-btn swipe-result"
          onClick={resultAction}
          tabIndex={open === "right" ? 0 : -1}
        >
          <Icon name="plus" size={20} />
          <span className="swipe-label">結果入力</span>
        </button>
      </div>

      {/* 前面：スライドするカード本体 */}
      <div
        className="swipe-fore"
        style={{
          transform: `translateX(${translate}px)`,
          transition: dragging ? "none" : "transform .18s ease",
          touchAction: "pan-y",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClickCapture={onCardClickCapture}
      >
        <ClinicCard clinic={clinic} busyBy={busyBy} />
      </div>
    </div>
  );
}
