/* ============================================================
   Dentia — app shell: state, navigation, realtime, tweaks
   ============================================================ */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#6ab3e0",
  "font": "Noto Sans JP",
  "density": "regular",
  "dark": false,
  "bots": true
}/*EDITMODE-END*/;

const SCREEN_TAB = { home: 'home', list: 'list', detail: 'list', result: 'list', history: 'history', dash: 'dash' };

function applyUpdateToClinics(clinics, u) {
  return clinics.map(c => {
    if (c.id !== u.clinicId) return c;
    return {
      ...c,
      status: u.status,
      owner: u.who,
      lastMemo: u.note || c.lastMemo,
      updatedAt: u.at,
      history: [{ at: u.at, who: u.who, status: u.status, note: u.note || '' }, ...c.history],
    };
  });
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [clinics, setClinics] = useState(() => window.Dentia.CLINICS.map(c => ({ ...c, history: [...c.history] })));
  const [presence, setPresence] = useState([]);
  const [toast, setToast] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const [view, setView] = useState({ screen: 'home', clinicId: null });

  const clinicsRef = useRef(clinics);
  clinicsRef.current = clinics;
  const rtRef = useRef(null);
  const toastTimer = useRef(null);
  const flashTimer = useRef(null);

  const showToast = useCallback((who, text) => {
    setToast({ id: Date.now() + Math.random(), who, text });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  }, []);

  const flash = useCallback((clinicId) => {
    setFlashId(clinicId);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashId(null), 1400);
  }, []);

  // remote / bot updates
  const onRemote = useCallback((u) => {
    setClinics(cs => applyUpdateToClinics(cs, u));
    if (u.who !== 'me') { showToast(u.who, u.text); flash(u.clinicId); }
  }, [showToast, flash]);

  const onPresence = useCallback((list) => {
    setPresence(list.filter(p => p.id !== 'me'));
  }, []);

  // local (me) update → apply + broadcast
  const applyUpdate = useCallback((u) => {
    setClinics(cs => applyUpdateToClinics(cs, u));
    if (rtRef.current) rtRef.current.broadcast(u);
  }, []);

  // init realtime
  useEffect(() => {
    const rt = window.Dentia.makeRealtime({
      onRemote: (u) => onRemote(u),
      onPresence: (list) => onPresence(list),
      getClinics: () => clinicsRef.current,
    });
    rtRef.current = rt;
    return () => rt.stop();
  }, [onRemote, onPresence]);

  // start/stop bots based on tweak
  useEffect(() => {
    const rt = rtRef.current;
    if (!rt) return;
    if (t.bots) rt.startBots();
    else { rt.stop(); setPresence([]); }
  }, [t.bots]);

  const nav = useCallback((screen, clinicId = null) => {
    if (screen === 'next') {
      const nx = window.nextToCall(clinicsRef.current);
      setView({ screen: 'detail', clinicId: nx.id });
    } else {
      setView({ screen, clinicId });
    }
    document.querySelector('.screen-scroll')?.scrollTo(0, 0);
  }, []);

  const store = { clinics, presence, nav, applyUpdate, flashId, clinicId: view.clinicId, me: 'me' };

  const Screen = {
    home: HomeScreen, list: ListScreen, detail: DetailScreen,
    result: ResultScreen, history: HistoryScreen, dash: DashScreen,
  }[view.screen] || HomeScreen;

  const densityClass = 'dens-' + t.density;

  return (
    <div className={'app-root ' + densityClass + (t.dark ? ' dark' : '')}
         style={{ '--teal': t.accent, '--teal-d': t.accent, fontFamily: `'${t.font}', sans-serif` }}>
      <div className="device">
        <div className="device-screen">
          <div className="screen-scroll">
            <Screen store={store}/>
          </div>
          <Toast toast={toast}/>
          <TabBar tab={SCREEN_TAB[view.screen]} onTab={nav}/>
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="ブランド"/>
        <TweakColor label="アクセント" value={t.accent}
                    options={['#0c8c8b', '#6ab3e0', '#8aa9e6', '#b596de', '#ec9bc1']}
                    onChange={v => setTweak('accent', v)}/>
        <TweakSelect label="フォント" value={t.font}
                     options={['Noto Sans JP', 'Zen Kaku Gothic New', 'Zen Maru Gothic', 'M PLUS Rounded 1c']}
                     onChange={v => setTweak('font', v)}/>
        <TweakSection label="レイアウト"/>
        <TweakRadio label="情報密度" value={t.density}
                    options={['compact', 'regular', 'comfy']}
                    onChange={v => setTweak('density', v)}/>
        <TweakToggle label="ダークモード" value={t.dark} onChange={v => setTweak('dark', v)}/>
        <TweakSection label="リアルタイム共有"/>
        <TweakToggle label="同僚の自動更新を流す" value={t.bots} onChange={v => setTweak('bots', v)}/>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
