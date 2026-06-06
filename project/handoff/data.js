/* ============================================================
   Dentia — mock data
   ============================================================ */
(function () {
  // ---- Status definitions (order matters for grids/summary) ----
  const STATUS = {
    none:    { key: 'none',    label: '未架電',     color: 'gray'   },
    noanswer:{ key: 'noanswer',label: '不通',       color: 'amber'  },
    absent:  { key: 'absent',  label: '担当者不在', color: 'orange' },
    heard:   { key: 'heard',   label: 'ヒアリング済', color: 'cyan' },
    appo:    { key: 'appo',    label: 'アポ獲得',   color: 'green'  },
    reject:  { key: 'reject',  label: 'お断り',     color: 'red'    },
  };
  const STATUS_ORDER = ['none', 'noanswer', 'absent', 'heard', 'appo', 'reject'];

  // ---- Team members ----
  const USERS = {
    me:    { id: 'me',    name: '山田 太郎', short: '山', color: '#5b8def' },
    suzuki:{ id: 'suzuki',name: '鈴木 花子', short: '鈴', color: '#e0729e' },
    tanaka:{ id: 'tanaka',name: '田中 一郎', short: '田', color: '#6bb38a' },
    sato:  { id: 'sato',  name: '佐藤 美咲', short: '佐', color: '#c79a3e' },
  };

  // ---- helpers ----
  const HOURS = [
    '平日 9:00–18:00 / 土 9:00–13:00',
    '平日 9:30–19:00 / 土日 休',
    '月火水金 9:00–18:30 / 木土 9:00–13:00',
    '平日 10:00–13:00, 14:30–19:00 / 土 〜17:00',
    '平日 9:00–12:30, 14:00–18:00 / 木 休',
  ];

  // base time = "now" in the mock world
  const NOW = new Date('2026-06-05T09:41:00');
  function ago(mins) { return new Date(NOW.getTime() - mins * 60000); }

  // raw clinic seeds: [name, ward, addr, tel, statusKey, ownerId, lastMins, memo]
  const SEED = [
    ['さくら歯科医院',        '新宿区', '西新宿1-2-3 さくらビル2F',    '03-1234-5678', 'absent',  'me',     4320, '院長不在。木曜午後に再連絡の約束。'],
    ['みなみ歯科クリニック',  '渋谷区', '神南1-15-8 渋谷フロント3F',   '03-2345-6789', 'heard',   'suzuki', 180,  '矯正の新患集客に課題感あり。資料送付済み。'],
    ['アオバデンタルクリニック','世田谷区','三軒茶屋2-11-4',            '03-3456-7890', 'appo',    'me',     1440, '6/12 15:00に院長と商談アポ獲得。'],
    ['ひかり歯科',            '杉並区', '高円寺南3-22-1 ハイツ高円寺', '03-4567-8901', 'noanswer','tanaka', 60,   '呼び出しのみ。昼休み明けに再架電。'],
    ['なかの総合歯科',        '中野区', '中野5-33-7 中野駅前ビル6F',   '03-5678-9012', 'none',    null,     null, ''],
    ['グリーン歯科医院',      '目黒区', '自由が丘1-8-12',              '03-6789-0123', 'absent',  'sato',   2880, '受付の方対応。担当は火曜在席とのこと。'],
    ['さとう歯科クリニック',  '品川区', '大井町2-4-9 大井タワー4F',    '03-7890-1234', 'heard',   'suzuki', 300,  '自費診療の予約管理をExcelで運用中。'],
    ['うみのファミリー歯科',  '大田区', '蒲田4-18-6',                  '03-8901-2345', 'reject',  'me',     5760, '現状システムで満足、今回は見送り。'],
    ['けやき歯科医院',        '港区',   '麻布十番1-5-2 けやき坂ビル',  '03-9012-3456', 'none',    null,     null, ''],
    ['あおぞらデンタルオフィス','文京区','本郷3-25-11',                '03-0123-4567', 'appo',    'tanaka', 720,  '6/10 11:00デモ確定。分院長も同席予定。'],
    ['とよた歯科',            '豊島区', '池袋2-40-3 池袋セントラル5F',  '03-1357-2468', 'noanswer','me',     120,  '話し中。15分後に再架電予定。'],
    ['ねりま中央歯科',        '練馬区', '練馬1-12-7',                  '03-2468-1357', 'absent',  'suzuki', 1440, 'ホームページ刷新を検討中との情報。'],
    ['みどり歯科クリニック',  '江東区', '豊洲3-2-20 豊洲フロント8F',   '03-3579-4680', 'heard',   'sato',   480,  'リコール率の改善に関心。次回数値共有。'],
    ['やまもと歯科医院',      '台東区', '上野6-7-1 上野駅前ビル3F',    '03-4680-3579', 'none',    null,     null, ''],
    ['しおかぜ歯科',          '墨田区', '錦糸町4-9-5',                 '03-5791-6802', 'appo',    'me',     2160, '6/15 10:30に来院デモのアポ。'],
    ['はなぞの歯科クリニック','北区',   '赤羽1-30-14 赤羽ハウス2F',    '03-6802-5791', 'reject',  'tanaka', 4320, '予算が合わず今期は見送り。来期再打診。'],
    ['つきしま歯科医院',      '中央区', '月島2-15-6',                  '03-7913-8024', 'none',    null,     null, ''],
    ['ふじ歯科クリニック',    '板橋区', '成増2-18-9 成増スカイビル4F', '03-8024-7913', 'noanswer','suzuki', 240,  '留守番電話。折り返し依頼を残した。'],
    ['こもれび歯科',          '足立区', '北千住3-22-1',                '03-9135-0246', 'heard',   'me',     900,  '訪問歯科に注力したい意向。担当者◎。'],
    ['ゆめのデンタルクリニック','葛飾区','亀有5-11-3 亀有プラザ2F',     '03-0246-9135', 'absent',  'sato',   1440, '院長は午前のみ在席。次は午前に架電。'],
  ];

  function buildHistory(idx, statusKey, ownerId, lastMins, memo) {
    if (statusKey === 'none') return [];
    const owner = ownerId || 'me';
    const hist = [{
      at: ago(lastMins).toISOString(),
      who: owner,
      status: statusKey,
      note: memo || '',
    }];
    // add 0–2 older entries for texture
    const olders = [
      { status: 'noanswer', note: '呼び出し音のみ。' },
      { status: 'absent',   note: '担当者不在。受付対応。' },
      { status: 'none',     note: '初回リストアップ。' },
    ];
    const n = idx % 3; // 0,1,2 repeating
    for (let i = 0; i < n; i++) {
      const o = olders[i];
      hist.push({
        at: ago(lastMins + (i + 1) * 2880 + idx * 60).toISOString(),
        who: i % 2 === 0 ? 'suzuki' : 'tanaka',
        status: o.status,
        note: o.note,
      });
    }
    return hist;
  }

  const SCHEDULE_TIMES = ['6/13 14:00', '6/12 15:00', '6/10 11:00', '6/15 10:30', null, null, null];

  const CLINICS = SEED.map((s, i) => {
    const [name, ward, addr, tel, status, ownerId, lastMins, memo] = s;
    const hasSched = (status === 'appo' || status === 'absent' || status === 'heard') && i % 2 === 0;
    return {
      id: 'c' + (i + 1),
      name,
      tel,
      prefecture: '東京都',
      city: ward,
      address: '東京都' + ward + addr,
      hours: HOURS[i % HOURS.length],
      status,
      owner: ownerId,
      lastMemo: memo,
      updatedAt: lastMins == null ? null : ago(lastMins).toISOString(),
      nextSchedule: hasSched ? SCHEDULE_TIMES[i % SCHEDULE_TIMES.length] : null,
      history: buildHistory(i, status, ownerId, lastMins, memo),
    };
  });

  // Today's schedule (home screen) — a few upcoming items
  const TODAY_SCHEDULE = [
    { time: '14:00', clinicId: 'c4',  status: 'absent'  },
    { time: '15:30', clinicId: 'c2',  status: 'heard'   },
    { time: '16:30', clinicId: 'c5',  status: 'none'    },
    { time: '17:15', clinicId: 'c11', status: 'noanswer'},
  ];

  window.Dentia = window.Dentia || {};
  Object.assign(window.Dentia, {
    STATUS, STATUS_ORDER, USERS, CLINICS, TODAY_SCHEDULE,
    NOW: NOW.toISOString(),
  });
})();
