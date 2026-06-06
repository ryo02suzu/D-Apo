/* ============================================================
   Dentia — screens
   props: { store } where store = {
     clinics, presence, me, nav(screen,clinicId), applyUpdate(update), flash(id)
   }
   ============================================================ */

/* ---------- derived helpers ---------- */
function useProgress(clinics) {
  const total = clinics.length;
  const done = clinics.filter(c => c.status !== 'none').length;
  const heard = clinics.filter(c => ['heard', 'appo'].includes(c.status)).length;
  const appo = clinics.filter(c => c.status === 'appo').length;
  const rate = done ? (heard / done * 100) : 0;
  return { total, done, heard, appo, rate };
}
const FOLLOWUP = ['none', 'noanswer', 'absent'];
function nextToCall(clinics) {
  return clinics.find(c => c.status === 'none')
      || clinics.find(c => FOLLOWUP.includes(c.status))
      || clinics[0];
}

/* ================= HOME ================= */
function HomeScreen({ store }) {
  const { clinics, presence, nav } = store;
  const p = useProgress(clinics);
  const next = nextToCall(clinics);
  const U = window.Dentia.USERS;
  const sched = window.Dentia.TODAY_SCHEDULE.map(s => ({
    ...s, clinic: clinics.find(c => c.id === s.clinicId),
  })).filter(s => s.clinic);

  return (
    <div className="screen">
      <StatusBar/>
      <AppHead left="menu" title="コールキュー" right="bell"/>
      <div className="pbody">

        {/* presence pills */}
        {presence.length > 0 && (
          <div className="presence-row">
            {presence.slice(0, 2).map(pr => (
              <span className="pill" key={pr.id}>
                <span className="dot"></span>{U[pr.id]?.name.split(' ')[0]}さんが{pr.activity}
              </span>
            ))}
          </div>
        )}

        {/* progress */}
        <div className="sec" style={{ paddingTop: presence.length ? 4 : 12 }}>
          <div className="pc-top">
            <span className="lbl">今日の進捗</span>
            <span className="link" onClick={() => nav('dash')}>詳細を見る</span>
          </div>
          <div className="pc-num"><b>{p.done}</b><span>/ {p.total} 件</span></div>
          <div className="bar"><i style={{ width: (p.total ? p.done / p.total * 100 : 0) + '%' }}></i></div>
          <div className="stat3">
            <div className="cell"><div className="k">ヒアリング</div><div className="v">{p.heard}<small>件</small></div></div>
            <div className="cell"><div className="k">アポ獲得</div><div className="v">{p.appo}<small>件</small></div></div>
            <div className="cell"><div className="k">ヒアリング率</div><div className="v">{p.rate.toFixed(1)}<small>%</small></div></div>
          </div>
        </div>
        <div className="divider"></div>

        {/* next clinic */}
        <div className="sec clinic">
          <div className="sec-head"><h3>次に電話する医院</h3><span className="link" onClick={() => nav('list')}>リストを表示</span></div>
          <div className="row1"><Badge status={next.status}/><span className="ago">{fmtAgo(next.updatedAt) || '未架電'}</span></div>
          <div className="name" onClick={() => nav('detail', next.id)}>{next.name}</div>
          <div className="addr">{next.address}</div>
          <a className="tel" href={'tel:' + next.tel.replace(/-/g, '')}>
            <Icon name="phone" size={16} style={{ color: 'var(--muted)' }}/>{next.tel}
          </a>
          {next.lastMemo && <><div className="memo-lbl">前回メモ</div><div className="memo-tx">{next.lastMemo}</div></>}
          <a className="btn btn-primary" href={'tel:' + next.tel.replace(/-/g, '')} onClick={() => setTimeout(() => nav('result', next.id), 400)}>
            <Icon name="phone" fill size={22} style={{ color: '#fff' }}/>電話する
          </a>
        </div>
        <div className="divider"></div>

        {/* schedule */}
        <div className="sec sched">
          <div className="sec-head"><h3>次回予定</h3><span className="link" onClick={() => nav('list')}>すべて見る</span></div>
          {sched.map((s, i) => (
            <div className="item" key={i} onClick={() => nav('detail', s.clinic.id)}>
              <span className="time">{s.time}</span>
              <span className="cl">{s.clinic.name}</span>
              <Badge status={s.clinic.status}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= LIST ================= */
function ListScreen({ store }) {
  const { clinics, nav } = store;
  const S = window.Dentia.STATUS;
  const [q, setQ] = useState('');
  const [ward, setWard] = useState('');
  const [status, setStatus] = useState('');
  const wards = [...new Set(clinics.map(c => c.city))];

  const filtered = clinics.filter(c =>
    (!q || c.name.includes(q) || c.address.includes(q)) &&
    (!ward || c.city === ward) &&
    (!status || c.status === status)
  );

  return (
    <div className="screen">
      <StatusBar/>
      <AppHead left="menu" title="医院一覧" right="search"/>
      <div className="pbody list-body">
        <div className="search-bar">
          <Icon name="search" size={17} style={{ color: 'var(--muted2)' }}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="医院名・住所で検索"/>
          {q && <button className="clr" onClick={() => setQ('')}><Icon name="x" size={15}/></button>}
        </div>
        <div className="chips">
          <button className={'chip' + (ward === '' ? ' on' : '')} onClick={() => setWard('')}>全エリア</button>
          {wards.map(w => <button key={w} className={'chip' + (ward === w ? ' on' : '')} onClick={() => setWard(ward === w ? '' : w)}>{w}</button>)}
        </div>
        <div className="chips">
          <button className={'chip' + (status === '' ? ' on' : '')} onClick={() => setStatus('')}>すべて</button>
          {window.Dentia.STATUS_ORDER.map(k => (
            <button key={k} className={'chip chip-' + S[k].color + (status === k ? ' on' : '')} onClick={() => setStatus(status === k ? '' : k)}>{S[k].label}</button>
          ))}
        </div>

        <div className="list-count">{filtered.length}件</div>
        <div className="cards">
          {filtered.map(c => (
            <div className={'listcard' + (store.flashId === c.id ? ' flash' : '')} key={c.id} onClick={() => nav('detail', c.id)}>
              <div className="r1"><Badge status={c.status}/><span className="ago">{fmtAgo(c.updatedAt) ? fmtAgo(c.updatedAt) + '更新' : '未架電'}</span></div>
              <div className="nm">{c.name}</div>
              <div className="ad">{c.address}</div>
              <a className="te" href={'tel:' + c.tel.replace(/-/g, '')} onClick={e => e.stopPropagation()}>
                <Icon name="phone" size={14} style={{ color: 'var(--muted)' }}/>{c.tel}
              </a>
              <div className="foot">
                <div className="meta">
                  {c.nextSchedule && <span><Icon name="cal" size={14} style={{ color: 'var(--muted2)' }}/>次回 {c.nextSchedule}</span>}
                  <span><Icon name="user" size={14} style={{ color: 'var(--muted2)' }}/>{c.owner ? window.Dentia.USERS[c.owner].name : '未割当'}</span>
                </div>
                <a className="mini-fab" href={'tel:' + c.tel.replace(/-/g, '')} onClick={e => e.stopPropagation()}><Icon name="phone" fill size={19} style={{ color: '#fff' }}/></a>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="empty">条件に合う医院がありません</div>}
        </div>
      </div>
    </div>
  );
}

/* ================= DETAIL ================= */
function DetailScreen({ store }) {
  const { clinics, nav, clinicId } = store;
  const c = clinics.find(x => x.id === clinicId) || clinics[0];
  const U = window.Dentia.USERS;
  const [tab, setTab] = useState('history');

  return (
    <div className="screen">
      <StatusBar/>
      <AppHead left="back" title="" titleLink="編集" onLeft={() => nav('list')}/>
      <div className="pbody np">
        <div className="p3-top">
          <div className="name">{c.name}</div>
          <a className="call-fab" href={'tel:' + c.tel.replace(/-/g, '')}><Icon name="phone" fill size={24} style={{ color: '#fff' }}/></a>
        </div>
        <a className="tel" href={'tel:' + c.tel.replace(/-/g, '')}>
          <Icon name="phone" size={16} style={{ color: 'var(--muted)' }}/>{c.tel}
        </a>
        <div className="badges">
          <Badge status={c.status}/>
          {c.updatedAt && <span className="badge b-gray">{fmtAgo(c.updatedAt)}更新</span>}
        </div>

        <div className="tabs">
          <div className={'t' + (tab === 'history' ? ' on' : '')} onClick={() => setTab('history')}>履歴</div>
          <div className={'t' + (tab === 'info' ? ' on' : '')} onClick={() => setTab('info')}>基本情報</div>
        </div>

        {tab === 'history' ? (
          <div className="timeline">
            {c.history.length === 0 && <div className="empty" style={{ paddingTop: 30 }}>まだ架電履歴がありません</div>}
            {c.history.map((h, i) => (
              <div className="tl" key={i}>
                <div className="rail"><div className={'ring r-' + window.Dentia.STATUS[h.status].color}></div>{i < c.history.length - 1 && <div className="stem"></div>}</div>
                <div className="body">
                  <div className="meta">
                    <span className="dt">{fmtClock(h.at)}</span>
                    <span className="who">{U[h.who]?.name || ''}</span>
                    <Badge status={h.status}/>
                  </div>
                  <div className="note">{h.note || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="info">
            <div className="info-row"><span className="ik">電話番号</span><a className="iv link" href={'tel:' + c.tel.replace(/-/g, '')}>{c.tel}</a></div>
            <div className="info-row"><span className="ik">住所</span><span className="iv">{c.address}</span></div>
            <div className="info-row"><span className="ik">診療時間</span><span className="iv">{c.hours}</span></div>
            <div className="info-row"><span className="ik">担当者</span><span className="iv">{c.owner ? U[c.owner].name : '未割当'}</span></div>
            <div className="info-row"><span className="ik">エリア</span><span className="iv">{c.prefecture} {c.city}</span></div>
            <div className="map"><Icon name="pin" size={20} style={{ color: 'var(--teal)' }}/><span>地図で開く</span></div>
          </div>
        )}

        <div className="p3foot">
          <button className="btn btn-outline" onClick={() => nav('result', c.id)}>
            <Icon name="plus" size={18}/>架電結果を追加
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= RESULT INPUT ================= */
const STATUS_ICON = {
  none:     { icon: 'phone',    line: true },
  noanswer: { icon: 'phoneOff', line: true },
  absent:   { icon: 'user',     line: false, str: true },
  heard:    { icon: 'chat',     line: false },
  appo:     { icon: 'calCheck', line: false, str: true },
  reject:   { icon: 'xcircle',  line: false, str: true },
};
function ResultScreen({ store }) {
  const { clinics, nav, clinicId, applyUpdate } = store;
  const c = clinics.find(x => x.id === clinicId) || clinics[0];
  const S = window.Dentia.STATUS;
  const [sel, setSel] = useState(c.status === 'none' ? null : c.status);
  const [memo, setMemo] = useState('');
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (!sel) return;
    applyUpdate({
      id: 'u' + Date.now(),
      clinicId: c.id, status: sel, note: memo,
      who: 'me', at: new Date().toISOString(),
      text: `${c.name}を「${S[sel].label}」に更新`,
    });
    setSaved(true);
    setTimeout(() => {
      const nxt = nextToCall(store.clinics.filter(x => x.id !== c.id));
      nav('detail', c.id);
    }, 850);
  };

  return (
    <div className="screen">
      <StatusBar/>
      <AppHead left="close" title="架電結果を入力" onLeft={() => nav('detail', c.id)}/>
      <div className="pbody np">
        <div className="p2-name">{c.name}</div>
        <a className="p2-tel" href={'tel:' + c.tel.replace(/-/g, '')}>{c.tel}</a>

        <div className="fld-lbl">結果（ステータス）</div>
        <div className="stgrid">
          {window.Dentia.STATUS_ORDER.map(k => {
            const cfg = STATUS_ICON[k];
            const on = sel === k;
            return (
              <button key={k} className={`stbtn s-${S[k].color}` + (on ? ' on' : '')} onClick={() => setSel(k)}>
                {cfg.line
                  ? <Icon name={cfg.icon} size={30} sw={1.8} className="line-ic"/>
                  : <span className="circ"><Icon name={cfg.icon} size={24} fill={!cfg.str} sw={2.2} style={{ color: '#fff' }}/></span>}
                {S[k].label}
              </button>
            );
          })}
        </div>

        <div className="fld-lbl">メモ（任意）</div>
        <div className="ta-wrap">
          <textarea value={memo} maxLength={200} onChange={e => setMemo(e.target.value)} placeholder="聞き出した悩みや、次回約束などを入力"></textarea>
          <div className="ta-count">{memo.length}/200</div>
        </div>

        <button className="btn btn-outline voice" onClick={() => setMemo(m => (m ? m + ' ' : '') + '（音声入力：次回は木曜午後に再連絡）')}>
          <Icon name="mic" size={18}/>音声入力
        </button>

        <div className="p2foot">
          <button className={'btn btn-primary' + (!sel ? ' disabled' : '') + (saved ? ' ok' : '')} onClick={save} disabled={!sel}>
            {saved ? <><Icon name="check" size={22} style={{ color: '#fff' }}/>保存しました</> : '保存して次へ'}
          </button>
          <div className="cap">{sel ? 'Enterで保存' : 'ステータスを選択してください'}</div>
        </div>
      </div>
    </div>
  );
}

/* ================= HISTORY (global feed) ================= */
function HistoryScreen({ store }) {
  const { clinics, nav } = store;
  const U = window.Dentia.USERS;
  const feed = [];
  clinics.forEach(c => c.history.forEach(h => feed.push({ ...h, clinic: c })));
  feed.sort((a, b) => new Date(b.at) - new Date(a.at));

  return (
    <div className="screen">
      <StatusBar/>
      <AppHead left="menu" title="架電履歴" right="refresh"/>
      <div className="pbody list-body">
        <div className="feed">
          {feed.map((h, i) => (
            <div className="feed-item" key={i} onClick={() => nav('detail', h.clinic.id)}>
              <Avatar user={U[h.who] || U.me} size={36}/>
              <div className="fi-body">
                <div className="fi-top"><b>{h.clinic.name}</b><span className="fi-time">{fmtClock(h.at)}</span></div>
                <div className="fi-meta"><Badge status={h.status}/><span className="fi-who">{U[h.who]?.name}</span></div>
                {h.note && <div className="fi-note">{h.note}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= DASHBOARD ================= */
function DashScreen({ store }) {
  const { clinics, nav } = store;
  const S = window.Dentia.STATUS;
  const p = useProgress(clinics);
  const counts = {};
  window.Dentia.STATUS_ORDER.forEach(k => counts[k] = clinics.filter(c => c.status === k).length);
  const appoRate = p.done ? (p.appo / p.done * 100) : 0;

  return (
    <div className="screen">
      <StatusBar/>
      <AppHead left="menu" title="進捗ダッシュボード" right="refresh"/>
      <div className="pbody list-body">
        <div className="dash-card">
          <div className="dash-head"><h4>今週の進捗 (6/1〜6/7)</h4></div>
          <div className="dash3">
            <div className="c"><div className="k">架電数</div><div className="v">{p.done}<small>件</small></div></div>
            <div className="c"><div className="k">ヒアリング</div><div className="v">{p.heard}<small>件</small></div></div>
            <div className="c"><div className="k">アポ獲得</div><div className="v">{p.appo}<small>件</small></div></div>
          </div>
          <div className="dash-bar"></div>
          <div className="dash2">
            <div className="c"><div className="k">ヒアリング率</div><div className="v">{p.rate.toFixed(1)}<small>%</small></div></div>
            <div className="c"><div className="k">アポ率</div><div className="v">{appoRate.toFixed(1)}<small>%</small></div></div>
          </div>
        </div>

        <div className="cc-block">
          <h2>ステータス別サマリー</h2>
          {window.Dentia.STATUS_ORDER.map(k => (
            <div className="sumrow" key={k} onClick={() => nav('list')}>
              <span className="sdot" style={{ background: `var(--${S[k].color})` }}></span>
              <span className="slabel">{S[k].label}</span>
              <span className="scount">{counts[k]}<small>件</small></span>
              <Icon name="chevR" size={16} sw={2.4} style={{ color: 'var(--muted2)' }}/>
            </div>
          ))}
        </div>

        <div className="cc-block">
          <h2>架電数の内訳（バー）</h2>
          <div className="hbars">
            {window.Dentia.STATUS_ORDER.map(k => {
              const max = Math.max(...Object.values(counts), 1);
              return (
                <div className="hbar" key={k}>
                  <span className="hb-label">{S[k].label}</span>
                  <div className="hb-track"><i style={{ width: (counts[k] / max * 100) + '%', background: `var(--${S[k].color})` }}></i></div>
                  <span className="hb-num">{counts[k]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, ListScreen, DetailScreen, ResultScreen, HistoryScreen, DashScreen, nextToCall });
