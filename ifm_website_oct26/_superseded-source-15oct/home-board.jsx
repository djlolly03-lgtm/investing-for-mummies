// ═══ THE BOX OFFICE — batches as Bollywood movie posters ═══
// "Now showing at a classroom near you." Each batch is a film:
// poster, tagline, rating, and a perforated ticket stub to book.

const FILM_META = {
  1: { tagline: 'The blockbuster. 16 hours of drama, laughter & compounding.', genre: 'Drama · Comedy · Compounding', prog: 'Investing for Mummies' },
  2: { tagline: 'The trailer. Four mornings, the essentials, no pressure.', genre: 'Short film · 4 days', prog: 'Investing for Mummies' },
  3: { tagline: 'Pocket money, first salary, first SIP. The next generation gets its turn.', genre: 'Coming-of-age · 4 days', prog: 'Investing for Teens & Young Adults' },
};

function BoxOffice() {
  const D = window.IFM;
  const progOf = (code) => (D.progs || []).find(p => p.code === code) || {};

  const statusOf = (b) =>
    b.status === 'few'  ? { label: 'FILLING FAST', cls: 'few' } :
    b.status === 'soon' ? { label: 'COMING SOON', cls: 'soon' } :
                          { label: 'NOW SHOWING', cls: 'open' };

  return (
    <div className="boxoffice reveal">
      <div className="bo-marquee">
        <div className="bo-bulbs" aria-hidden="true">{Array.from({length: 22}, (_, i) => <i key={i} style={{animationDelay: (i % 4) * .3 + 's'}}></i>)}</div>
        <div className="bo-title">NOW ENROLLING · AT A CLASSROOM NEAR YOU</div>
        <div className="bo-bulbs" aria-hidden="true">{Array.from({length: 22}, (_, i) => <i key={i} style={{animationDelay: (i % 4) * .3 + 's'}}></i>)}</div>
      </div>

      <div className="bo-grid">
        {D.batches.map((b, k) => {
          const p = progOf(b.prog);
          const meta = FILM_META[b.n] || {};
          const st = statusOf(b);
          return (
            <a className={'film s-' + b.status} key={b.n} href="https://register.investingformummies.com"
               style={{ '--film-accent': p.color || 'var(--teal)', '--film-rot': ((k % 2 ? 1 : -1) * (0.5 + (k % 3) * 0.4)) + 'deg' }}>
              <div className="film-poster">
                <div className={'film-status st-' + st.cls}>{st.label}</div>
                <div className="film-prog">{meta.prog || p.name || b.prog}</div>
                <h3 className="film-title">{b.title}</h3>
                <div className="film-tagline">“{meta.tagline}”</div>
                <div className="film-genre">{meta.genre}</div>
                <div className="film-stars">★★★★★ <span>loved by 50+ women</span></div>
                <div className="film-shine" aria-hidden="true"></div>
              </div>
              <div className="film-stub">
                <div className="stub-left">
                  <div className="stub-row">📅 {b.when}</div>
                  <div className="stub-row">🕑 {b.fmt}</div>
                  <div className="stub-row">📍 {b.where}</div>
                </div>
                <div className="stub-right">
                  <span className="stub-book">BOOK<br/>SEAT</span>
                  <small>{b.seatsTxt}</small>
                </div>
              </div>
            </a>
          );
        })}

      </div>
    </div>
  );
}

Object.assign(window, { BoxOffice });
