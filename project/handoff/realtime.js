/* ============================================================
   Dentia — realtime transport (cross-tab) + colleague bots
   ============================================================ */
(function () {
  const CH = 'dentia-sync-v1';
  const TAB_ID = Math.random().toString(36).slice(2, 8);

  const BOT_NOTES = {
    noanswer: ['呼び出し音のみ。後ほど再架電。', '話し中。時間を空けて再トライ。', '留守電。折り返し依頼を残した。'],
    absent:   ['受付対応。担当は午後在席とのこと。', '院長不在。明日午前に再連絡。', '担当者会議中。夕方かけ直す。'],
    heard:    ['新患集客に課題感あり。資料送付。', '予約管理をExcel運用中。改善余地大。', 'リコール率の改善に関心あり。'],
    appo:     ['来院デモのアポ獲得！', '院長と商談アポ確定。', 'オンラインデモの日程確定。'],
    reject:   ['現状システムで満足、今回は見送り。', '予算が合わず今期は見送り。'],
  };
  const ACTIVITIES = [
    '架電中', 'メモを更新中', '一覧を閲覧中', '医院詳細を確認中', 'ステータスを更新中',
  ];

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function makeRealtime({ onRemote, onPresence, getClinics }) {
    let channel = null;
    try { channel = new BroadcastChannel(CH); } catch (e) { channel = null; }

    if (channel) {
      channel.onmessage = (ev) => {
        const m = ev.data;
        if (!m || m.tab === TAB_ID) return;
        if (m.kind === 'update') onRemote && onRemote(m.payload, true);
        if (m.kind === 'presence') onPresence && onPresence(m.payload, true);
      };
    }

    function broadcast(kind, payload) {
      if (channel) { try { channel.postMessage({ kind, payload, tab: TAB_ID }); } catch (e) {} }
    }

    let botTimer = null, presenceTimer = null;

    function startBots() {
      stop();
      // ambient status updates from colleagues
      const tick = () => {
        const clinics = getClinics ? getClinics() : window.Dentia.CLINICS;
        const colleagues = ['suzuki', 'tanaka', 'sato'];
        const who = pick(colleagues);
        // prefer clinics not owned by "me"
        const pool = clinics.filter(c => c.owner !== 'me');
        const target = pick(pool.length ? pool : clinics);
        const statusKeys = ['noanswer', 'absent', 'heard', 'appo', 'reject'];
        const status = pick(statusKeys);
        const note = pick(BOT_NOTES[status] || ['']);
        const update = {
          id: 'u' + Date.now() + Math.random().toString(36).slice(2, 5),
          clinicId: target.id,
          status, note, who,
          at: new Date().toISOString(),
          text: `${target.name}を「${window.Dentia.STATUS[status].label}」に更新`,
          remote: true,
        };
        onRemote && onRemote(update, false);     // apply locally
        broadcast('update', update);               // sync to other tabs
        botTimer = setTimeout(tick, 7000 + Math.random() * 6000);
      };
      botTimer = setTimeout(tick, 4500);

      // ambient presence
      const ptick = () => {
        const colleagues = ['suzuki', 'tanaka', 'sato'];
        const active = colleagues
          .filter(() => Math.random() > 0.25)
          .map(id => ({ id, activity: pick(ACTIVITIES) }));
        const payload = active.length ? active : [{ id: 'suzuki', activity: '架電中' }];
        onPresence && onPresence(payload, false);
        broadcast('presence', payload);
        presenceTimer = setTimeout(ptick, 3500 + Math.random() * 2500);
      };
      ptick();
    }

    function stop() {
      if (botTimer) clearTimeout(botTimer);
      if (presenceTimer) clearTimeout(presenceTimer);
      botTimer = presenceTimer = null;
    }

    // user-originated change → apply + broadcast
    function pushUpdate(update) { broadcast('update', update); }

    return { broadcast: pushUpdate, startBots, stop, TAB_ID };
  }

  window.Dentia = window.Dentia || {};
  window.Dentia.makeRealtime = makeRealtime;
})();
