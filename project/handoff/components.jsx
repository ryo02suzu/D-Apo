/* ============================================================
   Dentia — shared UI components & icons
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

/* ---------------- Icons ---------------- */
const ICON_PATHS = {
  menu:    '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  bell:    '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  phone:   '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  phoneOff:'<path d="M10.7 13.3a16 16 0 0 0 3.4 2.6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-3.3-2.7m-2.7-3.3a19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9"/><line x1="2" y1="2" x2="22" y2="22"/>',
  home:    '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  list:    '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  clock:   '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
  chart:   '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  user:    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  chat:    '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
  cal:     '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="3" y1="10" x2="21" y2="10"/>',
  calCheck:'<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 15.5 11.2 17.7 15.5 13.5"/>',
  xcircle: '<circle cx="12" cy="12" r="9.2"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  search:  '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  chevR:   '<polyline points="9 18 15 12 9 6"/>',
  chevD:   '<polyline points="6 9 12 15 18 9"/>',
  chevL:   '<polyline points="15 18 9 12 15 6"/>',
  plus:    '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  mic:     '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
  info:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  pin:     '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/>',
  check:   '<polyline points="20 6 9 17 4 12"/>',
  x:       '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  filter:  '<polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/>',
  edit:    '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15"/>',
  building:'<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><path d="M9 22v-4h6v4"/>',
};
function Icon({ name, size = 22, fill = false, sw = 2, style, className }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: fill ? 'currentColor' : 'none',
    stroke: fill ? 'none' : 'currentColor',
    strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { display: 'block', flex: 'none', ...style }, className,
  };
  return React.createElement('svg', { ...common, dangerouslySetInnerHTML: { __html: ICON_PATHS[name] || '' } });
}

const SignalIcons = () => (
  <span className="sb-r">
    <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="5" y="4.5" width="3" height="7.5" rx="1"/><rect x="10" y="2" width="3" height="10" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 2.5c2.6 0 5 1 6.8 2.7l1.2-1.3C14.4 1.7 11.6.5 8.5.5S2.6 1.7.5 3.9l1.2 1.3C3.5 3.5 5.9 2.5 8.5 2.5Z"/><path d="M8.5 6c1.4 0 2.7.5 3.7 1.5l1.2-1.3C12.2 4.9 10.4 4.2 8.5 4.2s-3.7.7-4.9 2L4.8 7.5C5.8 6.5 7.1 6 8.5 6Z"/><circle cx="8.5" cy="10" r="1.6"/></svg>
    <svg width="26" height="13" viewBox="0 0 26 13" fill="none"><rect x="1" y="1" width="21" height="11" rx="3" stroke="currentColor" strokeWidth="1.2" opacity=".5"/><rect x="3" y="3" width="16" height="7" rx="1.5" fill="currentColor"/><rect x="23.5" y="4" width="2" height="5" rx="1" fill="currentColor" opacity=".5"/></svg>
  </span>
);

const StatusBar = () => (
  <div className="statusbar"><span>9:41</span><SignalIcons/></div>
);

/* ---------------- Badge ---------------- */
function Badge({ status, children, className = '' }) {
  const S = window.Dentia.STATUS;
  if (status && S[status]) {
    return <span className={`badge b-${S[status].color} ${className}`}>{S[status].label}</span>;
  }
  return <span className={`badge ${className}`}>{children}</span>;
}

/* ---------------- Avatar ---------------- */
function Avatar({ user, size = 40 }) {
  return (
    <span className="av" style={{ width: size, height: size, background: user.color, fontSize: size * 0.38 }}>
      {user.short}
    </span>
  );
}

/* ---------------- App header (back / title / action) ---------------- */
function AppHead({ left, title, right, titleLink, onLeft, onRight }) {
  return (
    <div className="apphead">
      <button className="ah-btn" onClick={onLeft} style={{ visibility: left ? 'visible' : 'hidden' }}>
        {left === 'back' ? <Icon name="chevL"/> : <Icon name={left || 'menu'}/>}
      </button>
      <span className="title">{title}</span>
      {titleLink
        ? <button className="ah-btn ttl-link" onClick={onRight}>{titleLink}</button>
        : <button className="ah-btn" onClick={onRight} style={{ visibility: right ? 'visible' : 'hidden' }}><Icon name={right || 'bell'}/></button>}
    </div>
  );
}

/* ---------------- Bottom tab bar ---------------- */
function TabBar({ tab, onTab }) {
  const tabs = [
    { key: 'home', label: 'ホーム', icon: 'home' },
    { key: 'list', label: '一覧', icon: 'list' },
    { key: 'next', label: '次の医院', fab: true },
    { key: 'history', label: '履歴', icon: 'clock' },
    { key: 'dash', label: 'ダッシュ', icon: 'chart' },
  ];
  return (
    <nav className="tabbar">
      {tabs.map(t => t.fab ? (
        <button key={t.key} className="tab fab" onClick={() => onTab(t.key)}>
          <span className="fab-c"><Icon name="phone" fill size={24}/></span>{t.label}
        </button>
      ) : (
        <button key={t.key} className={'tab' + (tab === t.key ? ' on' : '')} onClick={() => onTab(t.key)}>
          <Icon name={t.icon} size={22}/>{t.label}
        </button>
      ))}
    </nav>
  );
}

/* ---------------- Toast (realtime notice) ---------------- */
function Toast({ toast }) {
  if (!toast) return null;
  const U = window.Dentia.USERS;
  const u = U[toast.who] || U.suzuki;
  return (
    <div className="toast" key={toast.id}>
      <Avatar user={u} size={30}/>
      <div className="t-body">
        <b>{u.name}</b>
        <span>{toast.text}</span>
      </div>
      <span className="t-dot" style={{ background: 'var(--green)' }}></span>
    </div>
  );
}

/* ---------------- helpers ---------------- */
function fmtClock(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtAgo(iso) {
  if (!iso) return '';
  const diff = (new Date(window.Dentia.NOW) - new Date(iso)) / 60000;
  if (diff < 1) return 'たった今';
  if (diff < 60) return `${Math.floor(diff)}分前`;
  if (diff < 1440) return `${Math.floor(diff / 60)}時間前`;
  return `${Math.floor(diff / 1440)}日前`;
}

Object.assign(window, {
  Icon, SignalIcons, StatusBar, Badge, Avatar, AppHead, TabBar, Toast,
  fmtClock, fmtAgo,
});
