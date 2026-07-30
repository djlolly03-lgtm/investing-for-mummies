// Shared UI bits — sparkline, avatar, common buttons.

const SR_COLORS = {
  bg: '#ffffff',
  paper: '#fafaf7',
  ink: '#111111',
  muted: '#6b6b6b',
  faint: '#e6e3dc',
  up: '#1f7a4d',
  down: '#c24a3a',
};

function Sparkline(props) {
  try { return _SparklineInner(props); }
  catch (e) { try { console.warn('[Sparkline] render failed:', e); } catch(_){} return null; }
}
function _SparklineInner({ data, width = 80, height = 28, stroke }) {
  // Manual index-based array build — no spread, no filter, no iterators.
  const arr = [];
  if (data != null) {
    const len = (typeof data.length === 'number' && isFinite(data.length)) ? data.length : 0;
    for (let i = 0; i < len; i++) {
      const v = data[i];
      if (typeof v === 'number' && isFinite(v)) arr.push(v);
    }
  }
  if (arr.length < 2) return null;
  const min = Math.min.apply(null, arr);
  const max = Math.max.apply(null, arr);
  const range = max - min || 1;
  const pad = 2;
  const pts = arr.map((v, i) => {
    const x = pad + (i / (arr.length - 1)) * (width - 2 * pad);
    const y = pad + (1 - (v - min) / range) * (height - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const up = arr[arr.length - 1] >= arr[0];
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none"
        stroke={stroke || (up ? SR_COLORS.up : SR_COLORS.down)}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Avatar({ name, color, avatar, size = 32 }) {
  // If we have an emoji avatar, render that on a coloured disc.
  if (avatar) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color || '#cbd5e1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.6, flexShrink: 0,
        border: '1.5px solid #111',
        lineHeight: 1,
      }}>{avatar}</div>
    );
  }
  // Fallback: first initial of name on a coloured disc.
  const initial = (name || '?')[0].toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color || '#888', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Geist, ui-sans-serif', fontWeight: 600,
      fontSize: size * 0.42, flexShrink: 0,
      border: '1.5px solid #111',
    }}>{initial}</div>
  );
}

function PriceDelta({ price, prev }) {
  if (prev == null || price == null) return null;
  const diff = price - prev;
  const pct = (diff / prev) * 100;
  const up = diff >= 0;
  if (Math.abs(pct) < 0.01) return <span style={{ color: SR_COLORS.muted, fontVariantNumeric: 'tabular-nums' }}>—</span>;
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
  const v = n || 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e7) return sign + '₹' + parseFloat((abs / 1e7).toFixed(2)) + ' Cr';
  if (abs >= 1e5) return sign + '₹' + parseFloat((abs / 1e5).toFixed(2)) + 'L';
  return sign + '₹' + abs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// Sector colour palette — same chip on briefing, trade card, portfolio, etc.
const SECTOR_COLORS = {
  Tech:     { bg: '#e8f0ff', border: '#4f80f7', text: '#1a3a8f' },
  FMCG:     { bg: '#fff8e6', border: '#f59e0b', text: '#92400e' },
  Energy:   { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  Finance:  { bg: '#e8fff4', border: '#10b981', text: '#065f46' },
  Consumer: { bg: '#fdf4ff', border: '#a855f7', text: '#6b21a8' },
  Retail:   { bg: '#e8f5ff', border: '#0ea5e9', text: '#0c4a6e' },
};
const RISK_META = {
  low:    { label: 'LOW RISK',  color: '#15803d', bg: 'rgba(22,163,74,0.10)' },
  medium: { label: 'MEDIUM',    color: '#b45309', bg: 'rgba(217,119,6,0.12)' },
  high:   { label: 'HIGH RISK', color: '#b91c1c', bg: 'rgba(220,38,38,0.10)' },
};

function SectorTag({ sector, size = 'sm' }) {
  if (!sector) return null;
  const col = SECTOR_COLORS[sector] || SECTOR_COLORS.Tech;
  const padding = size === 'lg' ? '3px 9px' : '2px 7px';
  const fontSize = size === 'lg' ? 11 : 10;
  return (
    <span style={{
      display: 'inline-block',
      padding,
      background: col.border, color: '#fff',
      fontFamily: 'Geist Mono, ui-monospace',
      fontSize, fontWeight: 700,
      letterSpacing: '0.06em',
      borderRadius: 4,
    }}>{String(sector).toUpperCase()}</span>
  );
}

// Countdown timer — shows time REMAINING (not elapsed). Flashes red in the
// last 15 seconds. When startedAt is null, shows "—:—" (timer paused, waiting
// for teacher to dismiss the round-transition popup).
//
// IMPORTANT: ALL hooks live at the top — never early-return before they're
// declared, or React throws "Rendered fewer hooks than expected" when
// startedAt flips between number and null on round transitions.
function RoundTimer({ startedAt, durationSec, compact = false, onExpire, pausedMs = 0, isPaused = false, pausedAt = null }) {
  const [now, setNow] = React.useState(Date.now());
  const firedRef = React.useRef(false);

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const notStarted = !startedAt || !durationSec;
  // Effective elapsed = wall elapsed - accumulated paused ms - current pause span (if paused)
  const currentPauseSpan = (isPaused && pausedAt) ? (now - pausedAt) : 0;
  const wallElapsed = notStarted ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
  const effElapsed  = notStarted ? 0 : Math.max(0, wallElapsed - Math.floor((pausedMs + currentPauseSpan) / 1000));
  // Signed remaining — allowed to go negative once the round runs into
  // overtime. Teacher-controlled flow means we NEVER auto-advance from a
  // timer expiry — the timer just bleeds red and shows +MM:SS OVER until
  // the teacher clicks Next Round.
  const remaining = notStarted ? 0 : durationSec - effElapsed;
  const expired   = !notStarted && !isPaused && remaining <= 0;
  const overtime  = expired ? -remaining : 0;
  const urgent    = !notStarted && !isPaused && remaining > 0 && remaining <= 15;
  const paused    = notStarted; // legacy alias for paused (= "showing —:—")

  // Fire onExpire ONCE per active timer; reset the latch when the timer
  // is paused or restarted with a different startedAt. onExpire is now
  // opt-in (host omits it so the timer bleeds past 0 rather than auto-
  // advancing). Retained for any future caller that DOES want auto-fire.
  React.useEffect(() => {
    if (paused) { firedRef.current = false; return; }
    if (expired && !firedRef.current) {
      firedRef.current = true;
      try { window.SR_AUDIO?.countdownEnd?.(); } catch(e){}
      if (onExpire) onExpire();
    }
    if (!expired) firedRef.current = false;
  }, [paused, expired, startedAt, onExpire]);

  // Countdown ticks in the last 5 seconds — only on host (non-compact)
  const lastTickRef = React.useRef(-1);
  React.useEffect(() => {
    if (compact) return; // only host plays ticks; phones don't
    if (urgent && remaining > 0 && remaining <= 5 && lastTickRef.current !== remaining) {
      lastTickRef.current = remaining;
      try { window.SR_AUDIO?.countdownTick?.(); } catch(e){}
    }
    if (!urgent) lastTickRef.current = -1;
  }, [urgent, remaining, compact]);

  // Paused render
  if (paused) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: compact ? '2px 7px' : '3px 9px',
        background: 'rgba(15,23,42,0.06)',
        color: '#94a3b8',
        borderRadius: 5,
        fontFamily: 'Geist Mono, ui-monospace',
        fontSize: compact ? 11 : 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
      }} title="Waiting for teacher to start the round timer">
        ⏱ —:—
      </span>
    );
  }

  // Once expired, we flip to an OVERTIME +MM:SS readout so the teacher can
  // see how far past the buffer they've gone but the round never auto-advances.
  const displaySec = expired ? overtime : remaining;
  const mm = Math.floor(displaySec / 60).toString().padStart(2, '0');
  const ss = (displaySec % 60).toString().padStart(2, '0');
  const isRed = urgent || expired;

  return (
    <>
      {isRed && (
        // Full-screen red border flash — visible on both host (projector) and student phone
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1700,
          pointerEvents: 'none',
          boxShadow: `inset 0 0 0 ${compact ? '5px' : '10px'} rgba(220,38,38,0.65)`,
          animation: 'rt-flash 0.9s infinite',
        }} />
      )}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: compact ? '3px 10px' : '6px 16px',
        background: isRed ? '#dc2626' : 'rgba(15,23,42,0.08)',
        color:      isRed ? '#fff' : '#0f172a',
        borderRadius: 8,
        fontFamily: 'Geist Mono, ui-monospace',
        fontSize: compact ? 14 : 20,
        fontWeight: 800,
        letterSpacing: '0.06em',
        boxShadow: isRed ? '0 0 0 5px rgba(220,38,38,0.22)' : 'none',
        animation: isRed ? 'rt-pulse 0.9s infinite' : 'none',
      }} title={expired ? 'Overtime — teacher advances when ready' : 'Time left in this round'}>
        <style>{`
          @keyframes rt-pulse {
            0%,100% { opacity: 1; transform: scale(1); }
            50%     { opacity: 0.65; transform: scale(1.06); }
          }
          @keyframes rt-flash {
            0%,100% { opacity: 1; }
            50%     { opacity: 0.3; }
          }
        `}</style>
        ⏱ {expired ? '+' : ''}{mm}:{ss}{expired && !compact ? ' OVER' : ''}
      </span>
    </>
  );
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Audio cues — tiny Web Audio engine generating short tones for game moments.
// No sound files, no CDN — everything is synthesized in-browser. Respects
// the browser's "user gesture required" rule by lazily creating the
// AudioContext on first call. Mutable via window.SR_AUDIO.mute = true.
// ─────────────────────────────────────────────────────────────────────────────
const SR_AUDIO = (() => {
  let ctx = null;
  let muted = false;

  function ensureCtx() {
    if (muted) return null;
    if (ctx) {
      // Chrome/Safari/iOS suspend the ctx if it was created before any user
      // gesture, or if the tab lost focus. Resume on every access so a stale
      // ctx from before the first click doesn't stay silent forever.
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e){} }
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e){} }
      return ctx;
    } catch (e) { return null; }
  }

  // User-gesture unlock — the reliable way to make Web Audio play at all on
  // strict browsers (iOS Safari, Chrome autoplay-restricted). First click,
  // tap, or key inside the page primes/resumes the AudioContext.
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const unlock = () => {
      const c = ensureCtx();
      if (c && c.state === 'suspended') { try { c.resume(); } catch(e){} }
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };
    document.addEventListener('click', unlock, true);
    document.addEventListener('touchstart', unlock, true);
    document.addEventListener('keydown', unlock, true);
  }

  // beep(freq, durMs, type, volume) — single oscillator tone
  function beep(freq, durMs, type = 'sine', vol = 0.18) {
    const c = ensureCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + durMs / 1000);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + durMs / 1000);
  }

  // chord(notes, durMs, type, vol) — quick stacked chord
  function chord(notes, durMs = 350, type = 'sine', vol = 0.14) {
    notes.forEach(f => beep(f, durMs, type, vol));
  }

  return {
    set mute(v) { muted = !!v; },
    get mute() { return muted; },

    // Game cues
    newsDrop()      { chord([523.25, 659.25, 783.99], 280, 'square', 0.08); }, // C E G — alert
    bigMove()       { chord([523.25, 659.25, 783.99, 1046.5], 380, 'sine', 0.15); }, // C major chord
    bigBet()        { beep(220, 60, 'sawtooth', 0.18); setTimeout(() => beep(330, 120, 'sawtooth', 0.18), 70); }, // bwoop
    rankUp()        { beep(523.25, 80, 'triangle', 0.18); setTimeout(() => beep(659.25, 80, 'triangle', 0.18), 90); setTimeout(() => beep(783.99, 200, 'triangle', 0.18), 180); }, // ascending
    lockIn()        { beep(440, 60, 'sine', 0.18); setTimeout(() => beep(660, 100, 'sine', 0.16), 70); }, // soft click
    countdownTick() { beep(880, 60, 'square', 0.10); }, // tick
    countdownEnd()  { chord([261.63, 329.63, 392.00], 600, 'sine', 0.20); }, // C E G low
    roundStart()    { chord([392.00, 493.88, 587.33], 420, 'triangle', 0.16); }, // G B D ascending
    gameOver()      { chord([523.25, 659.25, 783.99, 1046.5], 800, 'triangle', 0.20); }, // full chord
    playerJoin()    { beep(660, 60, 'sine', 0.12); setTimeout(() => beep(880, 80, 'sine', 0.10), 70); }, // chime
  };
})();

Object.assign(window, { Sparkline, Avatar, PriceDelta, formatMoney, SR_COLORS, SECTOR_COLORS, RISK_META, SectorTag, RiskBadge, RoundTimer, SR_AUDIO });
