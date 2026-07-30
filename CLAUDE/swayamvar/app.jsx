/* Shaadi.com for your Money — app shell (role picker + root)
   Precompiled from JSX by esbuild — see build-jsx.sh. Loads after
   ui-common.js / host-view.js / player-view.js so HostApp, PlayerApp,
   Petals and Ornament are already on window. */
const { useState, useEffect } = React;

/* ── Landing (role picker shown only on bare URL) ── */
function Landing({ onRole }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', textAlign: 'center',
      background: 'radial-gradient(ellipse 120% 80% at 50% -10%, #5a0000 0%, #2d0000 40%, #0e0000 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      <Petals />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, width: '100%' }}>
        <div className="caps" style={{ fontSize: '0.62rem', color: '#fbbf24', letterSpacing: '0.4em', marginBottom: 16 }}>
          Investing for Mummies
        </div>
        <h1 className="display" style={{ color: '#fbbf24', fontSize: 'clamp(2.6rem,8vw,5rem)', fontWeight: 700, lineHeight: 0.92 }}>
          Swayamvar
        </h1>
        <div className="display ital" style={{ color: '#fde68a', fontSize: 'clamp(1.5rem,4.5vw,2.5rem)', marginTop: 6 }}>
          for your Money
        </div>
        <Ornament word="est. 1995" style={{ margin: '24px auto', maxWidth: 380 }} />
        <p className="serif ital" style={{ color: 'rgba(253,230,138,0.85)', fontSize: '1.1rem', lineHeight: 1.5, marginBottom: 36 }}>
          Finding the Perfect Match for your savings since 1995.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="role-btn host" onClick={() => onRole('host')}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📽️</div>
            <div className="caps" style={{ fontSize: '0.55rem', color: '#fde68a', marginBottom: 4 }}>Teacher / Projector</div>
            <div className="serif" style={{ fontSize: '1.3rem', color: '#fff', fontWeight: 600 }}>I'm the Host</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(253,230,138,0.65)', marginTop: 6, fontWeight: 700 }}>
              Show suitors on the big screen
            </div>
          </button>

          <button className="role-btn player" onClick={() => onRole('player')}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📱</div>
            <div className="caps" style={{ fontSize: '0.55rem', color: '#fde68a', marginBottom: 4 }}>Student / Phone</div>
            <div className="serif" style={{ fontSize: '1.3rem', color: '#fff', fontWeight: 600 }}>I'm a Guest</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(253,230,138,0.65)', marginTop: 6, fontWeight: 700 }}>
              Vote from your phone
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Root ── */
function Root() {
  const params = new URLSearchParams(window.location.search);
  const urlRole = params.get('role');
  // Default to host: the only people who open this URL directly are teachers
  // (on a projector). Students always arrive via the QR, which carries
  // ?role=player. So a bare load goes straight to the host lobby + QR — the
  // role picker is no longer shown (a guest with no host can't start a game).
  const [role, setRole] = useState(urlRole || 'host');

  const pickRole = (r) => {
    setRole(r);
    const p = new URLSearchParams(window.location.search);
    p.set('role', r);
    window.history.replaceState(null, '', '?' + p.toString());
  };

  if (!role) return <Landing onRole={pickRole} />;
  if (role === 'host')   return <HostApp />;
  if (role === 'player') return <PlayerApp />;
  return <Landing onRole={pickRole} />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
