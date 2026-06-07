// components/skeletons.tsx
// 各画面の loading.tsx で使う軽量スケルトン。ヘッダ／タブはレイアウトに残るため、
// ここでは本文（pbody）だけを描画する。タップ直後に即表示され体感速度を上げる。

function Card() {
  return (
    <div className="skel-card">
      <div className="skel skel-line" style={{ width: "30%", height: 18 }} />
      <div className="skel skel-line" style={{ width: "80%", height: 16, marginTop: 12 }} />
      <div className="skel skel-line" style={{ width: "60%" }} />
      <div className="skel skel-line" style={{ width: "45%" }} />
    </div>
  );
}

/** 一覧 */
export function ListSkeleton() {
  return (
    <div className="pbody list-body" aria-busy="true">
      <div className="skel" style={{ height: 44, marginTop: 6, borderRadius: 12 }} />
      <div className="skel skel-line" style={{ width: "70%", height: 30, marginTop: 14, borderRadius: 999 }} />
      <div className="skel skel-line" style={{ width: "55%", height: 22, marginTop: 12 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} />
      ))}
    </div>
  );
}

/** ホーム */
export function HomeSkeleton() {
  return (
    <div className="pbody" aria-busy="true">
      <div className="skel" style={{ height: 24, width: "40%", marginTop: 12 }} />
      <div className="skel" style={{ height: 40, width: "55%", marginTop: 10 }} />
      <div className="skel" style={{ height: 8, marginTop: 14, borderRadius: 6 }} />
      <div className="skel" style={{ height: 48, marginTop: 18 }} />
      <div className="skel-card" style={{ marginTop: 22 }}>
        <div className="skel skel-line" style={{ width: "40%", height: 16 }} />
        <div className="skel skel-line" style={{ width: "75%", height: 22, marginTop: 12 }} />
        <div className="skel skel-line" style={{ width: "55%" }} />
        <div className="skel" style={{ height: 54, marginTop: 16, borderRadius: 14 }} />
      </div>
    </div>
  );
}

/** 詳細 */
export function DetailSkeleton() {
  return (
    <div className="pbody np" aria-busy="true">
      <div className="skel" style={{ height: 28, width: "70%", marginTop: 14 }} />
      <div className="skel skel-line" style={{ width: "30%", height: 22, marginTop: 14, borderRadius: 999 }} />
      <div className="skel" style={{ height: 40, marginTop: 18, borderRadius: 10 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="skel skel-line" key={i} style={{ width: "90%", height: 16, marginTop: 18 }} />
      ))}
    </div>
  );
}

/** 結果入力 */
export function ResultSkeleton() {
  return (
    <div className="pbody np" aria-busy="true">
      <div className="skel" style={{ height: 26, width: "60%", margin: "16px auto 0" }} />
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 22 }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="skel" key={i} style={{ height: 96, borderRadius: 16 }} />
        ))}
      </div>
      <div className="skel" style={{ height: 120, marginTop: 20, borderRadius: 12 }} />
    </div>
  );
}

/** 履歴 */
export function HistorySkeleton() {
  return (
    <div className="pbody list-body" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{ display: "flex", gap: 11, padding: "14px 0", borderBottom: "1px solid var(--line)" }}
        >
          <div className="skel" style={{ width: 36, height: 36, borderRadius: "50%", flex: "none" }} />
          <div style={{ flex: 1 }}>
            <div className="skel skel-line" style={{ width: "60%", height: 14, marginTop: 0 }} />
            <div className="skel skel-line" style={{ width: "85%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** ダッシュ */
export function DashSkeleton() {
  return (
    <div className="pbody list-body" aria-busy="true">
      <div className="skel skel-line" style={{ width: "70%", height: 34, marginTop: 14, borderRadius: 999 }} />
      <div className="skel" style={{ height: 170, marginTop: 16, borderRadius: 16 }} />
      <div className="skel" style={{ height: 18, width: "40%", marginTop: 22 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="skel skel-line" key={i} style={{ width: "100%", height: 40, marginTop: 12 }} />
      ))}
    </div>
  );
}
