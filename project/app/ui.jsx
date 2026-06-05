/* ============ Shared UI components ============ */
const { STATUS, STATUS_ORDER, USERS } = window.DENTAL;
const Icon = window.Icon;

function Badge({ status, size }) {
  const s = STATUS[status];
  if (!s) return null;
  return React.createElement('span', { className: 'badge b-' + s.cls + (size === 'lg' ? ' badge-lg' : '') }, s.label);
}

function Avatar({ user, size = 40 }) {
  const u = USERS[user];
  if (!u) return React.createElement('div', { className: 'av', style: { width: size, height: size, background: '#cbd3da' } });
  return React.createElement('div', {
    className: 'av',
    style: { width: size, height: size, background: u.color, fontSize: size * 0.38 },
  }, u.short);
}

// One-tap call link
function CallLink({ tel, className, children, onCall }) {
  const digits = (tel || '').replace(/[^0-9]/g, '');
  return React.createElement('a', {
    href: 'tel:' + digits,
    className: className,
    onClick: () => { if (onCall) onCall(); },
  }, children);
}

// The 6-status selection grid (used in Result input)
function StatusGrid({ value, onChange }) {
  return React.createElement('div', { className: 'stgrid' },
    STATUS_ORDER.map((key) => {
      const s = STATUS[key];
      const active = value === key;
      const isLine = key === 'pending' || key === 'noanswer';
      const iconEl = isLine
        ? React.createElement(Icon, { name: s.icon, size: 30, stroke: 1.8, className: 'line-ic' })
        : React.createElement('span', { className: 'circ' },
            React.createElement(Icon, { name: s.icon, size: 24, fill: s.icon === 'message', stroke: 2.2 }));
      return React.createElement('button', {
        key,
        className: 'stbtn s-' + s.cls + (active ? ' on' : ''),
        onClick: () => onChange(key),
      }, iconEl, React.createElement('span', null, s.label));
    })
  );
}

// Toast for realtime updates
function Toast({ data }) {
  if (!data) return null;
  const u = USERS[data.user];
  return React.createElement('div', { className: 'toast', key: data.key },
    React.createElement(Avatar, { user: data.user, size: 30 }),
    React.createElement('div', { className: 'toast-tx' },
      React.createElement('b', null, u.name),
      React.createElement('span', null, ' が ' + data.clinic + ' を更新'),
      React.createElement('div', { className: 'toast-sub' },
        React.createElement(Badge, { status: data.status }))
    )
  );
}

window.UI = { Badge, Avatar, CallLink, StatusGrid, Toast };
