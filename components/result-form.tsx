// components/result-form.tsx
// 設計書 §3 / モック ResultScreen の本文（.p2-name 以降）。
// 結果ステータス選択 + メモ + 音声入力 + 「保存して次へ」。
// 保存時は call_logs に insert し、clinics.status / latest_memo / assigned_to / next_action_at を同期。
// 保存後は「次の未架電医院」へ自動遷移する（nextHref）。
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";
import { STATUS_OPTIONS } from "@/lib/status";
import type { ClinicStatus } from "@/lib/types";

// Web Speech API（ブラウザ実装。型は最小限を宣言）
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

// メモのクイック挿入定型文（設計のメモバンクより）。
const MEMO_TEMPLATES = [
  "留守電。折り返し依頼を残した。",
  "院長不在。改めて連絡。",
  "受付対応。担当は午後在席とのこと。",
  "新患集客に課題感あり。資料送付。",
  "予約管理をExcel運用中。",
  "現状システムで満足、今回は見送り。",
];

export function ResultForm({
  clinicId,
  clinicName,
  phone,
  currentStatus,
  memberId,
  nextHref,
}: {
  clinicId: string;
  clinicName: string;
  phone: string | null;
  currentStatus: ClinicStatus;
  memberId: string | null;
  nextHref: string | null;
}) {
  const router = useRouter();
  // モックと同様、未架電（not_called）のときは未選択スタート。
  const [sel, setSel] = useState<ClinicStatus | null>(
    currentStatus === "not_called" ? null : currentStatus,
  );
  const [memo, setMemo] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 音声入力（Web Speech API）の対応可否を判定（初期化時に1回・effect不要）。
  const [speechSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  });
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function startVoice() {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setMemo((m) => ((m ? m + " " : "") + transcript).slice(0, 200));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  // 定型文をメモへ追記（200字上限・既存内容があれば改行で区切る）。
  function appendTemplate(text: string) {
    setMemo((m) => {
      const joined = m ? `${m}\n${text}` : text;
      return joined.slice(0, 200);
    });
  }

  function save() {
    if (!sel) return;
    setError(null);
    startTransition(async () => {
      const supabase = createClient();

      // 1) 架電履歴を追加（担当者 member を記名）
      const { error: logErr } = await supabase.from("call_logs").insert({
        clinic_id: clinicId,
        outcome: sel,
        memo: memo || null,
        user_id: memberId,
      });
      if (logErr) {
        setError("登録に失敗しました");
        return;
      }

      // 2) 一覧表示用の冗長カラムを同期（担当者もこの医院に割り当てる）
      const { error: clinicErr } = await supabase
        .from("clinics")
        .update({
          status: sel,
          latest_memo: memo || null,
          next_action_at: nextActionAt
            ? new Date(nextActionAt).toISOString()
            : null,
          ...(memberId ? { assigned_to: memberId } : {}),
        })
        .eq("id", clinicId);
      if (clinicErr) {
        setError("医院情報の更新に失敗しました");
        return;
      }

      // 保存成功を即時表示し、次の医院（無ければ現在の詳細）へ速やかに遷移。
      setSaved(true);
      const dest = nextHref ?? `/clinics/${clinicId}`;
      setTimeout(() => {
        router.push(dest);
      }, 850);
    });
  }

  const tel = phone ? phone.replace(/[^\d+]/g, "") : "";

  return (
    <div className="pbody np">
      <div className="p2-name">{clinicName}</div>
      {phone && (
        <a className="p2-tel" href={`tel:${tel}`}>
          {phone}
        </a>
      )}

      <div className="fld-lbl">結果（ステータス）</div>
      <div className="stgrid">
        {STATUS_OPTIONS.map((o) => {
          const active = o.value === sel;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setSel(o.value)}
              className={`stbtn s-${o.color}` + (active ? " on" : "")}
            >
              {o.line ? (
                <Icon name={o.icon} size={30} sw={1.8} className="line-ic" />
              ) : (
                <span className="circ">
                  <Icon
                    name={o.icon}
                    size={24}
                    fill={o.fill}
                    sw={2.2}
                    style={{ color: "#fff" }}
                  />
                </span>
              )}
              {o.label}
            </button>
          );
        })}
      </div>

      <div className="fld-lbl">メモ（任意）</div>
      <div className="ta-wrap">
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={200}
          placeholder="聞き出した悩みや、次回約束などを入力"
        />
        <div className="ta-count">{memo.length}/200</div>
      </div>

      <div className="tmpl-row">
        <span className="tmpl-lbl">定型文</span>
        <div className="chips tmpl-chips">
          {MEMO_TEMPLATES.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              onClick={() => appendTemplate(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-outline voice"
        onClick={startVoice}
        disabled={!speechSupported}
        title={
          speechSupported
            ? undefined
            : "このブラウザは音声入力に対応していません"
        }
      >
        <Icon name="mic" size={18} />
        {listening ? "聞き取り中…" : "音声入力"}
      </button>

      <div className="fld-lbl next-action-lbl">次回予定（任意）</div>
      <input
        type="datetime-local"
        className="field"
        value={nextActionAt}
        onChange={(e) => setNextActionAt(e.target.value)}
      />

      {error && (
        <p
          style={{
            marginTop: 12,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--red-fg)",
          }}
        >
          {error}
        </p>
      )}

      <div className="p2foot">
        <button
          type="button"
          onClick={save}
          disabled={!sel || pending}
          className={
            "btn btn-primary" +
            (!sel ? " disabled" : "") +
            (saved ? " ok" : "")
          }
        >
          {saved ? (
            <>
              <Icon name="check" size={22} style={{ color: "#fff" }} />
              保存しました
            </>
          ) : pending ? (
            "保存中…"
          ) : (
            "保存して次へ"
          )}
        </button>
        <div className="cap">
          {sel ? "保存して次の医院へ進みます" : "ステータスを選択してください"}
        </div>
      </div>
    </div>
  );
}
