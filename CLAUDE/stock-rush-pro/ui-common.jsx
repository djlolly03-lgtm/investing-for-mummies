// Stock Rush Pro — shared UI components

const SR_COLORS = {
  bg:    '#ffffff',
  paper: '#fafaf7',
  ink:   '#111111',
  muted: '#6b6b6b',
  faint: '#e6e3dc',
  up:    '#1f7a4d',
  down:  '#c24a3a',
};

const SECTOR_COLORS = {
  Tech:     { bg: '#e8f0ff', border: '#4f80f7', text: '#1a3a8f' },
  FMCG:     { bg: '#fff8e6', border: '#f59e0b', text: '#92400e' },
  Energy:   { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  Finance:  { bg: '#e8fff4', border: '#10b981', text: '#065f46' },
  Consumer: { bg: '#fdf4ff', border: '#a855f7', text: '#6b21a8' },
  Retail:   { bg: '#e8f5ff', border: '#0ea5e9', text: '#0c4a6e' },
};

function Sparkline({ data, width = 80, height = 28, stroke }) {
  if (!data || data.length < 2) return null;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const pad   = 2;
  const pts   = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - 2 * pad);
    const y = pad + (1 - (v - min) / range) * (height - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={stroke || (up ? SR_COLORS.up : SR_COLORS.down)}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Avatar({ name, color, avatar, size = 32 }) {
  if (avatar) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color || '#cbd5e1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.65, flexShrink: 0,
        border: '1.5px solid rgba(0,0,0,0.12)',
        lineHeight: 1, overflow: 'hidden',
      }}>
        {avatar}
      </div>
    );
  }
  const initial = (name || '?')[0].toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color || '#888', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Geist, ui-sans-serif', fontWeight: 600,
      fontSize: size * 0.42, flexShrink: 0,
      border: '1.5px solid #111',
    }}>
      {initial}
    </div>
  );
}

function PriceDelta({ price, prev }) {
  if (prev == null || price == null) return null;
  const diff = price - prev;
  const pct  = (diff / prev) * 100;
  const up   = diff >= 0;
  if (Math.abs(pct) < 0.01) return (
    <span style={{ color: SR_COLORS.muted, fontVariantNumeric: 'tabular-nums' }}>—</span>
  );
  return (
    <span style={{
      color: up ? SR_COLORS.up : SR_COLORS.down,
      fontVariantNumeric: 'tabular-nums',
      fontFamily: 'Geist Mono, ui-monospace',
      fontSize: '0.85em',
      fontWeight: 500,
    }}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function formatMoney(n) {
  const v   = n || 0;
  const abs = Math.abs(v);
  const sgn = v < 0 ? '-' : '';
  if (abs >= 1e7) return sgn + '₹' + parseFloat((abs / 1e7).toFixed(2)) + ' Cr';
  if (abs >= 1e5) return sgn + '₹' + parseFloat((abs / 1e5).toFixed(2)) + 'L';
  return sgn + '₹' + abs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const RISK_META = {
  low:    { label: 'LOW RISK',  color: '#15803d', bg: 'rgba(22,163,74,0.10)' },
  medium: { label: 'MEDIUM',    color: '#b45309', bg: 'rgba(217,119,6,0.12)' },
  high:   { label: 'HIGH RISK', color: '#b91c1c', bg: 'rgba(220,38,38,0.10)' },
};

function RiskBadge({ risk }) {
  const m = RISK_META[risk] || RISK_META.medium;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 7px',
      background: m.bg, color: m.color,
      fontFamily: 'Geist Mono, ui-monospace',
      fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
      borderRadius: 4,
      border: `1px solid ${m.color}33`,
    }}>{m.label}</span>
  );
}

function RoundTimer({ startedAt, durationSec, paused, pausedMs, compact = false }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!startedAt) return null;

  // Pause-aware elapsed seconds (paused time already excluded via pausedMs;
  // the display also freezes entirely when state.paused is true).
  const eSec = Math.max(0, Math.floor((now - startedAt - (pausedMs || 0)) / 1000));

  if (paused) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: compact ? '4px 10px' : '7px 14px',
        background: 'rgba(217,119,6,0.18)',
        color: '#92400e',
        border: '1.5px solid #f0d398',
        borderRadius: 8,
        fontFamily: 'Geist Mono, ui-monospace',
        fontSize: compact ? 15 : 20,
        fontWeight: 700,
        letterSpacing: '0.04em',
      }} title="Paused for discussion">
        ⏸ Paused
      </span>
    );
  }

  // Countdown mode if a duration is provided, else count up
  if (durationSec) {
    const remaining = Math.max(0, durationSec - eSec);
    const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
    const ss = (remaining % 60).toString().padStart(2, '0');
    const warn = remaining <= 15;
    const critical = remaining <= 5;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: compact ? '4px 10px' : '7px 14px',
        background: critical ? 'rgba(220,38,38,0.18)' : warn ? 'rgba(217,119,6,0.18)' : 'rgba(15,23,42,0.08)',
        color:      critical ? '#b91c1c'             : warn ? '#b45309'             : '#0f172a',
        border: '1.5px solid ' + (critical ? '#fca5a5' : warn ? '#f0d398' : 'rgba(15,23,42,0.15)'),
        borderRadius: 8,
        fontFamily: 'Geist Mono, ui-monospace',
        fontSize: compact ? 15 : 20,
        fontWeight: 700,
        letterSpacing: '0.04em',
        fontVariantNumeric: 'tabular-nums',
        animation: critical ? 'sr-timer-pulse 0.9s ease-in-out infinite' : 'none',
      }} title={`Auto-advance in ${remaining}s — teacher can force-advance any time`}>
        ⏱ {mm}:{ss}
        <style>{`
          @keyframes sr-timer-pulse {
            0%, 100% { transform: scale(1); }
            50%      { transform: scale(1.05); }
          }
        `}</style>
      </span>
    );
  }

  // Fallback: count up (used when no duration configured)
  const mm = Math.floor(eSec / 60).toString().padStart(2, '0');
  const ss = (eSec % 60).toString().padStart(2, '0');
  const stale = eSec > 120;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: compact ? '4px 10px' : '7px 14px',
      background: stale ? 'rgba(217,119,6,0.14)' : 'rgba(15,23,42,0.08)',
      color:      stale ? '#b45309' : '#0f172a',
      border: '1.5px solid ' + (stale ? '#f0d398' : 'rgba(15,23,42,0.15)'),
      borderRadius: 8,
      fontFamily: 'Geist Mono, ui-monospace',
      fontSize: compact ? 15 : 20,
      fontWeight: 700,
      letterSpacing: '0.04em',
      fontVariantNumeric: 'tabular-nums',
    }} title="Time since this round started">
      ⏱ {mm}:{ss}
    </span>
  );
}

Object.assign(window, { Sparkline, Avatar, PriceDelta, formatMoney, SR_COLORS, SECTOR_COLORS, RISK_META, RiskBadge, RoundTimer });
