import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmtINR(n) {
  const num = Math.round(n);
  const s = num.toString();
  if (s.length <= 3) return '₹' + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return '₹' + rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

function fmtShort(n) {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000)   return '₹' + (n / 100000).toFixed(1) + ' L';
  return fmtINR(n);
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

function useCountUp(target, duration, running) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!running) { setVal(0); return; }
    let start = null;
    let raf;
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, target, duration]);
  return val;
}

function usePhaseSequence(phases, started) {
  const [currentPhase, setCurrentPhase] = useState(-1);
  useEffect(() => {
    if (!started) { setCurrentPhase(-1); return; }
    const timers = phases.map(({ delay, phase }) =>
      setTimeout(() => setCurrentPhase(phase), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [started]);
  return currentPhase;
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function ProgressDots({ current, total = 10 }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-3 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i < current
                  ? 'w-2.5 h-2.5 bg-teal'
                  : i === current
                  ? 'w-3 h-3 bg-teal ring-2 ring-teal/30'
                  : 'w-2 h-2 bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 font-sans">
          Chapter {current + 1} of {total}
        </p>
      </div>
    </div>
  );
}

function InsightBox({ text, node, large }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl p-3 my-3"
    >
      <p className={`${large ? 'text-base' : 'text-sm'} font-sans text-amber-900 leading-relaxed`}>
        <span className="mr-2">💡</span>{node || text}
      </p>
    </motion.div>
  );
}

function CTAButton({ label, onClick }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-5 pt-3"
      style={{ background: 'linear-gradient(to top, white 70%, transparent)' }}>
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.97 }}
        className="w-full max-w-sm mx-auto block py-3 px-5 text-white font-bold text-sm font-sans rounded-xl shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2a9d8f 100%)' }}
      >
        {label}
      </motion.button>
    </div>
  );
}

function CalendarFlip({ startYear = 2026, endYear = 2036, duration = 400, onComplete, running }) {
  const [year, setYear] = useState(startYear);
  const [flipping, setFlipping] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!running) { setYear(startYear); doneRef.current = false; return; }
    let cur = startYear;
    doneRef.current = false;

    const flipNext = () => {
      if (cur >= endYear) {
        if (!doneRef.current) { doneRef.current = true; onComplete && onComplete(); }
        return;
      }
      setFlipping(true);
      setTimeout(() => {
        cur++;
        setYear(cur);
        setFlipping(false);
        setTimeout(flipNext, duration * 0.3);
      }, duration * 0.5);
    };

    const t = setTimeout(flipNext, 200);
    return () => clearTimeout(t);
  }, [running]);

  return (
    <div className="calendar-wrap flex justify-center mb-4">
      <div
        className="bg-white rounded-xl border-2 border-navy shadow-md overflow-hidden"
        style={{ width: 80, fontFamily: 'Lora, serif' }}
      >
        <div className="bg-navy text-white text-xs font-bold text-center py-1 tracking-wide">YEAR</div>
        <motion.div
          animate={{ rotateX: flipping ? -90 : 0 }}
          transition={{ duration: duration / 2000, ease: 'easeIn' }}
          className="calendar-inner py-2 text-center text-xl font-bold text-navy"
          style={{ transformOrigin: 'top center' }}
        >
          {year}
        </motion.div>
      </div>
    </div>
  );
}

function MoneyTower({ floors, maxFloors, color, label, amount, width = 80, compact = false }) {
  const floorH = compact ? 8 : 12;
  const gap = 2;
  const totalH = maxFloors * (floorH + gap);
  const visibleH = floors * (floorH + gap);

  return (
    <div className="flex flex-col items-center">
      <div style={{ height: totalH, width, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <AnimatePresence>
          {Array.from({ length: floors }).map((_, i) => {
            const brightness = 0.7 + (i / Math.max(maxFloors, 1)) * 0.3;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  height: floorH,
                  background: color,
                  opacity: brightness,
                  borderRadius: 4,
                  marginBottom: gap,
                }}
              />
            );
          })}
        </AnimatePresence>
      </div>
      {label && <p className="text-xs font-bold font-sans mt-1 text-center" style={{ color }}>{label}</p>}
      {amount && <p className="text-xs font-sans text-gray-600 text-center mt-0.5">{amount}</p>}
    </div>
  );
}

// ─── APP CONTEXT ──────────────────────────────────────────────────────────────

const AppCtx = React.createContext({ onRestart: () => {}, onBack: () => {}, currentScreen: 0 });

// ─── REPLAY BUTTON ────────────────────────────────────────────────────────────

function ReplayButton({ onClick }) {
  return (
    <div className="flex justify-center mt-2 mb-1">
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 rounded-full px-4 py-1.5 font-sans text-xs font-semibold border border-gray-200"
        style={{ background: '#f9fafb', color: '#1a3a5c' }}
      >
        <span style={{ fontSize: '0.9rem' }}>↺</span> Replay chapter
      </button>
    </div>
  );
}

// ─── RESTART BAR ──────────────────────────────────────────────────────────────

function RestartBar() {
  const { onRestart, onBack, currentScreen } = React.useContext(AppCtx);
  return (
    <div className="flex justify-center items-center gap-6 pt-4 pb-28">
      {currentScreen > 0 && (
        <button
          onClick={onBack}
          className="font-sans text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Previous chapter
        </button>
      )}
      <button
        onClick={onRestart}
        className="font-sans text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        ↺ Start from beginning
      </button>
    </div>
  );
}

// ─── SCREEN WRAPPER ───────────────────────────────────────────────────────────

function ScreenWrap({ children }) {
  return (
    <div className="min-h-screen w-full bg-white">
      {children}
      <RestartBar />
    </div>
  );
}

function ScreenLayout({ title, subtitle, children, screenIndex }) {
  return (
    <div className="max-w-lg mx-auto px-4 pt-20 pb-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold font-serif text-navy mb-2 leading-tight">{title}</h1>
        <p className="text-sm font-sans text-gray-500 leading-relaxed">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

// ─── INTRO SCREEN ─────────────────────────────────────────────────────────────

const INTRO_QUESTIONS = [
  { icon: '💡', text: 'Why do we need to invest?' },
  { icon: '📊', text: 'How do we invest?' },
  { icon: '🗺️', text: 'Where should we invest?' },
];

function IntroScreen({ onNext }) {
  const [phase, setPhase] = useState(0);
  const [questionsVisible, setQuestionsVisible] = useState(0);
  const [showCTA, setShowCTA] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);   // title in
    const t2 = setTimeout(() => setPhase(2), 1400);  // tagline in
    const t3 = setTimeout(() => setPhase(3), 2200);  // "3 questions" in
    const q1 = setTimeout(() => setQuestionsVisible(1), 3000);
    const q2 = setTimeout(() => setQuestionsVisible(2), 3600);
    const q3 = setTimeout(() => setQuestionsVisible(3), 4200);
    const tCTA = setTimeout(() => setShowCTA(true), 5000);
    return () => [t1,t2,t3,q1,q2,q3,tCTA].forEach(clearTimeout);
  }, []);

  return (
    <ScreenWrap screenIndex={0}>
      <div className="flex flex-col px-6 text-center" style={{ background: 'linear-gradient(160deg, #0d2540 0%, #1a3a5c 55%, #0e4d45 100%)', minHeight: '100dvh', height: '100dvh', overflow: 'hidden' }}>

        {/* Scrollable content area */}
        <div className="flex-1 flex flex-col items-center justify-center py-4">

          {/* IFM Logo */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: phase >= 1 ? 1 : 0, opacity: phase >= 1 ? 1 : 0 }}
            transition={{ duration: 0.7, ease: 'backOut' }}
            className="mb-3"
          >
            <motion.div
              animate={{ boxShadow: ['0 0 20px #c9a84c55', '0 0 40px #c9a84c99', '0 0 20px #c9a84c55'] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="rounded-full border-4 overflow-hidden mx-auto"
              style={{ width: 72, height: 72, borderColor: '#c9a84c', background: '#fff' }}
            >
              <img src="ifm-logo-round.png" alt="Investing for Mummies" className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>

          {/* Title */}
          <AnimatePresence>
            {phase >= 1 && (
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-1">
                <h1 className="font-serif text-white font-bold leading-tight" style={{ fontSize: '1.8rem' }}>The Wealth</h1>
                <h1 className="font-serif font-bold leading-tight" style={{ fontSize: '1.8rem', color: '#c9a84c' }}>Conversation</h1>
              </motion.div>
            )}
          </AnimatePresence>

          {/* By line */}
          <AnimatePresence>
            {phase >= 2 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-3">
                <p className="font-sans text-xs font-semibold tracking-widest uppercase" style={{ color: '#bde9e4', letterSpacing: '0.12em' }}>
                  by Investing for Mummies
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider */}
          {phase >= 3 && (
            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5 }}
              className="mb-3 rounded-full mx-auto" style={{ width: 40, height: 3, background: '#c9a84c' }} />
          )}

          {/* 3 Questions intro text */}
          <AnimatePresence>
            {phase >= 3 && (
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="font-sans text-sm mb-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Let's understand investing by exploring<br />
                <span style={{ color: '#bde9e4', fontWeight: 600 }}>3 simple questions</span>
              </motion.p>
            )}
          </AnimatePresence>

          {/* Questions */}
          <div className="w-full max-w-xs space-y-2">
            {INTRO_QUESTIONS.map((q, i) => (
              <AnimatePresence key={q.text}>
                {questionsVisible > i && (
                  <motion.div
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.45, ease: 'backOut' }}
                    className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    <div className="flex-shrink-0 rounded-xl flex items-center justify-center"
                      style={{ width: 36, height: 36, background: 'rgba(201,168,76,0.18)', fontSize: '1.2rem' }}>
                      {q.icon}
                    </div>
                    <p className="font-serif text-white text-sm font-semibold leading-snug text-left">{q.text}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            ))}
          </div>
        </div>

        {/* CTA — always visible at bottom */}
        <div className="pb-6 pt-2 flex-shrink-0">
          <AnimatePresence>
            {showCTA && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <button
                  onClick={() => setShowPopup(true)}
                  className="w-full font-sans font-bold text-base py-4 rounded-2xl shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #e6c96a)', color: '#1a3a5c' }}
                >
                  Begin the Conversation →
                </button>
                <p className="text-center font-sans text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  10 chapters · 5–8 minutes
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center px-6"
            style={{ background: 'rgba(10,20,40,0.92)', zIndex: 50 }}>
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'backOut' }}
              className="w-full max-w-xs rounded-2xl px-5 py-6"
              style={{ background: 'linear-gradient(160deg, #0d1f38, #1a3a5c)', border: '1px solid rgba(201,168,76,0.35)' }}>
              <p className="font-sans text-xs font-bold tracking-widest uppercase text-center mb-4" style={{ color: 'rgba(201,168,76,0.7)' }}>
                UP NEXT · CHAPTER 1
              </p>
              <div className="text-3xl text-center mb-3">💰</div>
              <p className="font-serif text-white font-bold text-lg text-center leading-snug mb-2">
                Why Saving Isn't Enough
              </p>
              <p className="font-sans text-sm text-center mb-5 leading-relaxed" style={{ color: 'rgba(189,233,228,0.8)' }}>
                Savings protect your money from being spent. Investing gives it the chance to grow.
              </p>
              {[
                { icon: '🔒', text: 'Savings: keeps money safe, slowly loses value to inflation' },
                { icon: '🌱', text: 'Investing: gives money a job — to grow over time' },
              ].map(r => (
                <div key={r.icon} className="flex items-start gap-3 mb-3 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.18)' }}>
                  <span className="text-lg">{r.icon}</span>
                  <p className="font-sans text-xs leading-relaxed" style={{ color: 'rgba(189,233,228,0.85)' }}>{r.text}</p>
                </div>
              ))}
              <button onClick={() => { setShowPopup(false); onNext(); }}
                className="w-full mt-4 font-sans font-bold text-sm py-3 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e6c96a)', color: '#1a3a5c' }}>
                Let's find out why →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </ScreenWrap>
  );
}

// ─── SCREEN 1: Why Saving Isn't Enough ────────────────────────────────────────

function Screen1({ onNext }) {
  const [logoVisible, setLogoVisible] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const videoRef = useRef(null);

  const handleReplay = useCallback(() => {
    setLogoVisible(false);
    if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
  }, []);

  // Show IFM logo coin at the tree crown ~6s in, hide on loop restart
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTime = () => {
      if (vid.currentTime >= 5.5 && vid.currentTime < 7.8) {
        setLogoVisible(true);
      } else {
        setLogoVisible(false);
      }
    };
    vid.addEventListener('timeupdate', onTime);
    return () => vid.removeEventListener('timeupdate', onTime);
  }, []);

  return (
    <ScreenWrap screenIndex={1}>
      <ProgressDots current={0} />

      {/* Full-bleed Higgsfield hero video */}
      <div className="relative overflow-hidden rounded-2xl mx-auto" style={{ aspectRatio: '9/16', height: '58vh' }}>
        <video
          ref={videoRef}
          src="chapter1-hero.mp4"
          autoPlay
          loop
          muted
          playsInline
          onPlay={() => {}}
          className="w-full h-full object-cover"
          style={{ display: 'block' }}
        />

        {/* Gradient overlay — bottom fade to white so content below blends in */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ height: '40%', background: 'linear-gradient(to bottom, transparent, white)' }}
        />

        {/* IFM logo coin — appears at tree crown ~6s in */}
        <AnimatePresence>
          {logoVisible && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'backOut' }}
              className="absolute"
              style={{ top: '8%', right: '12%' }}
            >
              <motion.div
                animate={{ boxShadow: ['0 0 16px #c9a84c88', '0 0 32px #c9a84ccc', '0 0 16px #c9a84c88'] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="rounded-full overflow-hidden border-4 border-yellow-400"
                style={{ width: 64, height: 64, background: '#fff' }}
              >
                <img src="ifm-logo-round.png" alt="IFM" className="w-full h-full object-cover" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Content below video */}
      <div className="px-4 pt-3 pb-6 max-w-sm mx-auto w-full">

        {/* Box 2 */}
        <div className="rounded-2xl px-4 py-4 mb-4"
          style={{ background: 'linear-gradient(135deg, #0d1f38, #1a3a5c)', border: '1px solid rgba(201,168,76,0.25)' }}>
          <p className="font-sans text-sm leading-relaxed text-center" style={{ color: 'rgba(189,233,228,0.9)' }}>
            In today's world where costs are rising and goals are becoming more expensive, saving is no longer enough.
          </p>
          <p className="font-serif font-bold text-center mt-2" style={{ color: '#c9a84c', fontSize: '1rem' }}>
            Our money needs to grow. But why?
          </p>
        </div>

        <CTAButton label="Meet Inflation — the silent thief →" onClick={() => setShowPopup(true)} />

      </div>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center px-6"
            style={{ background: 'rgba(10,20,40,0.92)', zIndex: 50 }}>
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'backOut' }}
              className="w-full max-w-xs rounded-2xl px-5 py-6"
              style={{ background: 'linear-gradient(160deg, #0d1f38, #1a3a5c)', border: '1px solid rgba(201,168,76,0.35)' }}>
              <p className="font-sans text-xs font-bold tracking-widest uppercase text-center mb-4" style={{ color: 'rgba(201,168,76,0.7)' }}>
                UP NEXT · CHAPTER 2
              </p>
              <div className="text-3xl text-center mb-3">📉</div>
              <p className="font-serif text-white font-bold text-lg text-center leading-snug mb-5">
                Inflation is the cost of things rising over time.
              </p>
              <div className="rounded-xl px-4 py-3 text-center mb-2"
                style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}>
                <p className="font-serif font-bold text-sm" style={{ color: '#c9a84c' }}>Average India inflation: ~6% per year</p>
                <p className="font-sans text-xs mt-1" style={{ color: 'rgba(189,233,228,0.7)' }}>That ₹100 today? Worth ₹56 in 10 years.</p>
              </div>
              <button onClick={() => { setShowPopup(false); onNext(); }}
                className="w-full mt-4 font-sans font-bold text-sm py-3 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e6c96a)', color: '#1a3a5c' }}>
                Show me →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </ScreenWrap>
  );
}

// ─── SCREEN 2: Meet Inflation ─────────────────────────────────────────────────

const S2_SLIDES = [
  {
    year: 2026,
    price: 100000,
    label: 'Today',
    sublabel: 'This basket costs',
    color: '#1a3a5c',
    tagColor: '#1a3a5c',
    note: null,
  },
  {
    year: 2029,
    price: 133100,
    label: '3 years later',
    sublabel: 'The same basket costs',
    color: '#c9a84c',
    tagColor: '#c9a84c',
    note: 'Prices have crept up by ₹33,100 — just from everyday inflation.',
  },
  {
    year: 2033,
    price: 214359,
    label: '7 years later',
    sublabel: 'The same basket costs',
    color: '#e07b39',
    tagColor: '#e07b39',
    note: 'More than double for the same basket.',
  },
  {
    year: 2036,
    price: 259374,
    label: '10 years later',
    sublabel: 'The same basket costs',
    color: '#c0392b',
    tagColor: '#c0392b',
    final: true,
  },
];

function Screen2({ onNext }) {
  const [slide, setSlide] = useState(0);
  const [dir, setDir] = useState(1); // 1 = forward, -1 = back
  const [showPopup, setShowPopup] = useState(false);
  const isLast = slide === S2_SLIDES.length - 1;
  const current = S2_SLIDES[slide];

  const goTo = (i) => {
    setDir(i > slide ? 1 : -1);
    setSlide(i);
  };
  const advance = () => { if (!isLast) goTo(slide + 1); };

  // Drag-to-swipe support
  const dragRef = useRef(null);
  const handleDragEnd = useCallback((e, info) => {
    if (info.offset.x < -40 && slide < S2_SLIDES.length - 1) goTo(slide + 1);
    if (info.offset.x > 40 && slide > 0) goTo(slide - 1);
  }, [slide]);

  const variants = {
    enter:  (d) => ({ x: d * 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d) => ({ x: -d * 60, opacity: 0 }),
  };

  return (
    <ScreenWrap screenIndex={2}>
      <ProgressDots current={1} />

      <div className="px-4 pt-1 pb-4 max-w-sm mx-auto w-full flex flex-col" style={{ minHeight: '90vh' }}>

        {/* Title */}
        <div className="text-center mb-3">
          <h2 className="font-serif text-navy font-bold text-xl leading-tight">Meet Inflation</h2>
          <p className="font-sans text-gray-500 text-xs mt-1">Swipe or tap → to see prices rise over time</p>
        </div>

        {/* Basket image — stays fixed */}
        <div className="relative flex justify-center mb-3">
          <div className="relative" style={{ width: '100%', maxWidth: 300 }}>
            <img
              src="chapter2-basket.png"
              alt="Shopping basket"
              className="rounded-2xl shadow-md w-full"
              style={{ aspectRatio: '4/3', objectFit: 'cover' }}
            />
            {/* Item chips */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {[['🥛','Food'],['⛽','Fuel'],['🏥','Health'],['🎓','Edu'],['✈️','Life']].map(([e,l]) => (
                <div key={l} className="flex flex-col items-center bg-white bg-opacity-90 rounded-lg px-1 py-0.5 shadow-sm">
                  <span style={{ fontSize: '1rem' }}>{e}</span>
                  <span className="font-sans text-gray-600" style={{ fontSize: '0.5rem' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Carousel slide area */}
        <div className="relative overflow-hidden rounded-2xl flex-1" style={{ minHeight: 220 }}>
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={slide}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 flex flex-col"
              style={{ cursor: 'grab' }}
            >
              {current.final ? (
                /* ── Final reveal slide ── */
                <div className="flex flex-col h-full">
                  {/* Price reveal header */}
                  <div className="rounded-2xl p-4 text-center mb-3"
                    style={{ background: current.tagColor }}>
                    <p className="font-sans text-white text-xs uppercase tracking-widest mb-1 opacity-80">
                      {current.label} — {current.year}
                    </p>
                    <p className="font-sans text-white text-xs opacity-75 mb-1">{current.sublabel}</p>
                    <p className="font-serif text-white font-bold text-3xl">{fmtINR(current.price)}</p>
                  </div>

                  {/* "The basket didn't change" */}
                  <div className="bg-navy rounded-2xl p-4 text-center mb-3">
                    <p className="font-sans text-white text-sm leading-relaxed mb-1">
                      The basket didn't change over the years.
                    </p>
                    <p className="font-serif font-bold text-base leading-snug" style={{ color: '#c9a84c' }}>
                      Only the price did.
                    </p>
                  </div>

                </div>
              ) : (
                /* ── Regular year slide ── */
                <div className="flex flex-col h-full">
                  {/* Year + price card */}
                  <div className="rounded-2xl p-5 text-center mb-3"
                    style={{ background: current.tagColor }}>
                    <p className="font-sans text-white text-xs uppercase tracking-widest mb-1 opacity-80">
                      {current.label} — {current.year}
                    </p>
                    <p className="font-sans text-white text-xs opacity-75 mb-1">{current.sublabel}</p>
                    <p className="font-serif text-white font-bold text-4xl">{fmtINR(current.price)}</p>
                  </div>

                  {/* Context note */}
                  {current.note ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                      <p className="font-sans text-amber-800 text-sm leading-relaxed font-medium">{current.note}</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl p-5 text-center flex-1 flex flex-col items-center justify-center gap-3"
                      style={{ background: 'linear-gradient(135deg, #0d1f38, #1a3a5c)' }}>
                      <p className="font-serif text-white font-bold text-base leading-snug">
                        Imagine this basket costs ₹1,00,000 today.
                      </p>
                      <p className="font-sans text-sm leading-relaxed" style={{ color: 'rgba(189,233,228,0.85)' }}>
                        What do you think it will cost in 10 years?
                      </p>
                      <p className="font-sans text-xs font-semibold tracking-wide uppercase"
                        style={{ color: 'rgba(201,168,76,0.8)' }}>Swipe to find out →</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel dots */}
        <div className="flex justify-center gap-2 mt-3 mb-3">
          {S2_SLIDES.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className="rounded-full transition-all"
              style={{
                width: i === slide ? 20 : 8,
                height: 8,
                background: i === slide ? '#1a3a5c' : '#d1d5db',
              }}
            />
          ))}
        </div>

        {/* CTA — changes on last slide */}
        {isLast ? (
          <>
            <InsightBox text="Inflation doesn't reduce the amount of money you have. It reduces what that money can do for you." />
            <div className="mt-3"><CTAButton label="So what happens to your money? →" onClick={() => setShowPopup(true)} /></div>
          </>
        ) : (
          <button onClick={advance}
            className="w-full font-sans font-semibold text-sm text-navy border-2 border-navy rounded-2xl py-3 flex items-center justify-center gap-2 transition-opacity active:opacity-70"
          >
            Next <span className="text-base">→</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center px-6"
            style={{ background: 'rgba(10,20,40,0.92)', zIndex: 50 }}>
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'backOut' }}
              className="w-full max-w-xs rounded-2xl px-5 py-6"
              style={{ background: 'linear-gradient(160deg, #0d1f38, #1a3a5c)', border: '1px solid rgba(201,168,76,0.35)' }}>
              <p className="font-sans text-xs font-bold tracking-widest uppercase text-center mb-4" style={{ color: 'rgba(201,168,76,0.7)' }}>
                UP NEXT · CHAPTER 3
              </p>
              <div className="text-3xl text-center mb-3">🛒</div>
              <p className="font-serif text-white font-bold text-lg text-center leading-snug mb-2">
                The Purchasing Power Problem
              </p>
              <p className="font-sans text-sm text-center mb-4 leading-relaxed" style={{ color: 'rgba(189,233,228,0.8)' }}>
                Over time, inflation reduces the value of your money.
              </p>
              {[
                'Same ₹1L buys less every passing year',
                'Your money stays the same — its power shrinks',
                'The longer you wait, the more buying power you lose',
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2 mb-2">
                  <div className="rounded-full flex-shrink-0 mt-1.5" style={{ width: 5, height: 5, background: '#c9a84c' }} />
                  <p className="font-sans text-xs leading-relaxed" style={{ color: 'rgba(189,233,228,0.8)' }}>{t}</p>
                </div>
              ))}
              <button onClick={() => { setShowPopup(false); onNext(); }}
                className="w-full mt-4 font-sans font-bold text-sm py-3 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e6c96a)', color: '#1a3a5c' }}>
                Show me →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </ScreenWrap>
  );
}

// ─── SCREEN 3: The Purchasing Power Problem ───────────────────────────────────

const ALL_ITEMS = [
  { emoji: '🥛', label: 'Food' },
  { emoji: '⛽', label: 'Fuel' },
  { emoji: '🏥', label: 'Healthcare' },
  { emoji: '🎓', label: 'Education' },
  { emoji: '🏡', label: 'Household' },
  { emoji: '🛍️', label: 'Shopping' },
  { emoji: '🎉', label: 'Entertainment' },
  { emoji: '🍽️', label: 'Dining Out' },
  { emoji: '✈️', label: 'Vacation' },
  { emoji: '🚗', label: 'Transport' },
];

// Items removed in order as years pass (synced to ~8s video)
const S3_REMOVALS = [
  { delay: 1800, label: 'Shopping' },
  { delay: 3200, label: 'Entertainment' },
  { delay: 4400, label: 'Dining Out' },
  { delay: 5600, label: 'Vacation' },
  { delay: 7000, label: 'Transport' },
];

function Screen3({ onNext }) {
  const [videoEnded, setVideoEnded] = useState(false);
  const [captionVisible, setCaptionVisible] = useState(false);
  const [visibleItems, setVisibleItems] = useState(ALL_ITEMS.map(i => i.label));
  const [showFinal, setShowFinal] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const videoRef = useRef(null);
  const timersRef = useRef([]);
  const removalsStartedRef = useRef(false);

  // Start item-removal sequence when video plays (guard prevents double-fire)
  const startRemovals = useCallback(() => {
    if (removalsStartedRef.current) return;
    removalsStartedRef.current = true;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = S3_REMOVALS.map(({ delay, label }) =>
      setTimeout(() => setVisibleItems(v => v.filter(l => l !== label)), delay)
    );
    // Show caption after 1s
    setTimeout(() => setCaptionVisible(true), 1000);
  }, []);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
    setTimeout(() => setShowFinal(true), 600);
  }, []);

  const handleReplay = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    removalsStartedRef.current = false;
    setVideoEnded(false);
    setCaptionVisible(false);
    setVisibleItems(ALL_ITEMS.map(i => i.label));
    setShowFinal(false);
    if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
  }, []);

  return (
    <ScreenWrap screenIndex={3}>
      <ProgressDots current={2} />

      <div className="px-4 pt-2 pb-4 max-w-sm mx-auto w-full">
        <div className="text-center mb-3">
          <h2 className="font-serif text-navy font-bold text-xl leading-tight">The Purchasing Power Problem</h2>
          <p className="font-sans text-gray-500 text-xs mt-1">Your money stayed the same. What it can buy did not.</p>
        </div>

        {/* Higgsfield video hero */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-3 mx-auto"
          style={{ aspectRatio: '9/16', height: '58vh' }}>
          <video
            ref={videoRef}
            src="chapter3-hero.mp4"
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            onPlay={startRemovals}
            onEnded={handleVideoEnd}
          />
          {/* Bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0"
            style={{ height: '35%', background: 'linear-gradient(to bottom, transparent, white)' }} />

          {/* Frozen money badge — stays static throughout */}
          <div className="absolute top-4 left-0 right-0 flex justify-center">
            <div className="bg-white bg-opacity-95 border-2 border-red-300 rounded-xl px-3 py-1.5 shadow-md text-center">
              <p className="font-sans text-navy font-semibold" style={{ fontSize: '0.65rem' }}>If money available</p>
              <p className="font-serif font-bold text-navy text-base leading-none">₹1,00,000</p>
              <p className="font-sans text-red-500 font-semibold" style={{ fontSize: '0.65rem' }}>never changes…</p>
            </div>
          </div>

          {/* Caption fades in after 1s */}
          <AnimatePresence>
            {captionVisible && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-10 left-0 right-0 px-4 text-center">
                <div className="inline-block bg-navy bg-opacity-85 rounded-xl px-4 py-2 backdrop-blur-sm">
                  <p className="font-sans text-white text-xs">Watch what disappears from your basket…</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {videoEnded && <ReplayButton onClick={handleReplay} />}

        {/* Final reveal after video ends */}
        <AnimatePresence>
          {showFinal && (
            <motion.div key="final" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Before / after comparison with actual items */}
              <div className="flex gap-2 mb-3">
                {/* 2026 — all 10 items */}
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="font-sans text-xs text-gray-400 text-center mb-2">📅 2026 — ₹1,00,000</p>
                  <div className="grid grid-cols-5 gap-1">
                    {ALL_ITEMS.map(item => (
                      <div key={item.label} className="flex flex-col items-center">
                        <span style={{ fontSize: '1.1rem' }}>{item.emoji}</span>
                      </div>
                    ))}
                  </div>
                  <p className="font-sans text-xs text-center mt-2 font-bold text-navy">10 items ✓</p>
                </div>
                <div className="flex items-center">
                  <span className="text-red-400 font-bold text-lg">→</span>
                </div>
                {/* 2036 — only 5 items, rest crossed out */}
                <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="font-sans text-xs text-red-400 text-center mb-2">📅 2036 — ₹1,00,000</p>
                  <div className="grid grid-cols-5 gap-1">
                    {ALL_ITEMS.map(item => {
                      const removed = !visibleItems.includes(item.label);
                      return (
                        <div key={item.label} className="flex flex-col items-center relative">
                          <span style={{ fontSize: '1.1rem', opacity: removed ? 0.2 : 1 }}>{item.emoji}</span>
                          {removed && (
                            <span className="absolute inset-0 flex items-center justify-center text-red-500 font-bold" style={{ fontSize: '1rem' }}>✕</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="font-sans text-xs text-center mt-2 font-bold text-red-600">Only 5 items ✗</p>
                </div>
              </div>
              <InsightBox text="As inflation increases, the purchasing power of your money decreases. That means, what ₹1L can buy in the future is less, compared to what it can buy today." />
              <div className="mt-3"><CTAButton label="So how do we beat inflation? →" onClick={() => setShowPopup(true)} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center px-6"
            style={{ background: 'rgba(10,20,40,0.92)', zIndex: 50 }}>
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'backOut' }}
              className="w-full max-w-xs rounded-2xl px-5 py-6"
              style={{ background: 'linear-gradient(160deg, #0d1f38, #1a3a5c)', border: '1px solid rgba(201,168,76,0.35)' }}>
              <p className="font-sans text-xs font-bold tracking-widest uppercase text-center mb-4" style={{ color: 'rgba(201,168,76,0.7)' }}>
                UP NEXT · CHAPTER 4
              </p>
              <div className="text-3xl text-center mb-3">🚀</div>
              <p className="font-serif text-white font-bold text-lg text-center leading-snug mb-2">
                The answer: Investing
              </p>
              <p className="font-sans text-sm text-center mb-4 leading-relaxed" style={{ color: 'rgba(189,233,228,0.8)' }}>
                The only way to beat inflation is by investing your money to make it grow.
              </p>
              <div className="rounded-xl px-4 py-3 text-center"
                style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}>
                <p className="font-serif font-bold text-sm" style={{ color: '#c9a84c' }}>
                  🌱 Let's start with a single ₹10,000.
                </p>
                <p className="font-sans text-xs mt-1" style={{ color: 'rgba(189,233,228,0.7)' }}>
                  Invested once, then left untouched — watch what it can grow into over time.
                </p>
              </div>
              <button onClick={() => { setShowPopup(false); onNext(); }}
                className="w-full mt-4 font-sans font-bold text-sm py-3 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e6c96a)', color: '#1a3a5c' }}>
                Show me how →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </ScreenWrap>
  );
}

// ─── SCREEN 4: The Magic of Compounding ───────────────────────────────────────

const S4_DISPLAY_MILESTONES = [
  { years: 20, value: 96463,  label: '20 yrs' },
  { years: 30, value: 299599, label: '30 yrs' },
  { years: 40, value: 930510, label: '40 yrs' },
];

function Screen4({ onNext }) {
  const [introPhase, setIntroPhase] = useState(2); // 2=main (intro cards merged into Ch3 exit popup)
  const [captionVisible, setCaptionVisible] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const videoRef = useRef(null);
  const captionStartedRef = useRef(false);

  const startCaption = useCallback(() => {
    if (captionStartedRef.current) return;
    captionStartedRef.current = true;
    setTimeout(() => setCaptionVisible(true), 1000);
  }, []);

  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
    setTimeout(() => setShowFinal(true), 500);
  }, []);

  const handleReplay = useCallback(() => {
    captionStartedRef.current = false;
    setCaptionVisible(false);
    setVideoEnded(false);
    setShowFinal(false);
    if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
  }, []);

  // ── Intro overlays (phases 0 and 1) ─────────────────────────────────────────
  if (introPhase < 2) {
    return (
      <ScreenWrap screenIndex={4}>
        <div
          className="min-h-screen flex flex-col items-center justify-center px-6 text-center cursor-pointer"
          style={{ background: introPhase === 0 ? 'linear-gradient(160deg, #0d2540, #1a3a5c)' : '#fff' }}
          onClick={() => setIntroPhase(p => p + 1)}
        >
          {introPhase === 0 ? (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'backOut' }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1.2, 1.2, 1.2, 1] }}
                transition={{ duration: 0.8, delay: 0.3 }}
                style={{ fontSize: '5rem' }}
              >💡</motion.div>
              <h1 className="font-serif text-white font-bold mt-4 leading-tight" style={{ fontSize: '2.8rem' }}>
                By investing!
              </h1>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="font-sans text-mint text-sm mt-3 opacity-70"
              >
                Tap to continue
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              <div style={{ fontSize: '3rem' }} className="mb-4">🌱</div>
              <h2 className="font-serif text-navy font-bold text-2xl leading-snug mb-3">
                Let's see what ONE investment of ₹10,000 can grow to?
              </h2>
              <p className="font-sans text-gray-400 text-sm mt-2">Tap to watch</p>
            </motion.div>
          )}
        </div>
      </ScreenWrap>
    );
  }

  // ── Main screen (introPhase === 2) ───────────────────────────────────────────
  return (
    <ScreenWrap screenIndex={4}>
      <ProgressDots current={3} />

      <div className="px-4 pt-2 pb-4 max-w-sm mx-auto w-full">
        <div className="text-center mb-3">
          <h2 className="font-serif text-navy font-bold text-xl leading-tight">The Magic of Compounding</h2>
          <p className="font-sans text-gray-500 text-xs mt-1">₹10,000 invested once. Watch what time does to it.</p>
        </div>

        {/* Higgsfield video hero */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-3 mx-auto"
          style={{ aspectRatio: '9/16', height: '58vh' }}>
          <video
            ref={videoRef}
            src="chapter4-hero.mp4"
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            onPlay={startCaption}
            onEnded={handleVideoEnd}
          />
          {/* Bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0"
            style={{ height: '30%', background: 'linear-gradient(to bottom, transparent, white)' }} />

          {/* Caption */}
          <AnimatePresence>
            {captionVisible && !videoEnded && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-10 left-0 right-0 px-4 text-center">
                <div className="inline-block bg-navy bg-opacity-85 rounded-xl px-4 py-2 backdrop-blur-sm">
                  <p className="font-sans text-white text-xs">Watch your ₹10,000 compound over time…</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {videoEnded && <ReplayButton onClick={handleReplay} />}

        {/* Final reveal after video ends */}
        <AnimatePresence>
          {showFinal && (
            <motion.div key="final" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Big result card */}
              <div className="rounded-2xl p-4 text-center mb-3" style={{ background: '#1a3a5c' }}>
                <p className="font-sans text-mint text-xs uppercase tracking-widest mb-1">₹10,000 grew to</p>
                <p className="font-serif font-bold text-white text-3xl">₹9,30,510</p>
                <p className="font-sans text-xs opacity-60 text-white mt-1">in 40 years at 12% p.a.</p>
              </div>

              {/* 20 / 30 / 40 yr milestones */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {S4_DISPLAY_MILESTONES.map((ms, i) => (
                  <div key={ms.years}
                    className={`rounded-xl p-3 text-center border ${i === 2 ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
                    <p className={`font-sans text-xs mb-1 ${i === 2 ? 'text-amber-600' : 'text-gray-400'}`}>{ms.label}</p>
                    <p className={`font-serif font-bold text-xs ${i === 2 ? 'text-amber-700' : 'text-navy'}`}>{fmtINR(ms.value)}</p>
                  </div>
                ))}
              </div>

              <InsightBox text="This is the magic of Compounding. It rewards patience. The longer you stay invested, the harder your money works." />
              <div className="mt-3"><CTAButton label="But what if you invested every month? →" onClick={onNext} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScreenWrap>
  );
}

// ─── SCREEN 5: Small Amounts Matter ───────────────────────────────────────────

const S5_DISPLAY_MILESTONES = [
  { years: 20, label: '20 yrs', short: '₹49.9 L',  invested: '₹12 L' },
  { years: 30, label: '30 yrs', short: '₹1.76 Cr', invested: '₹18 L' },
  { years: 40, label: '40 yrs', short: '₹5.94 Cr', invested: '₹24 L' },
];

function Screen5({ onNext }) {
  const [introPhase, setIntroPhase] = useState(0); // 0=popup, 1=main
  const [captionVisible, setCaptionVisible] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const videoRef = useRef(null);
  const captionStartedRef = useRef(false);

  const startCaption = useCallback(() => {
    if (captionStartedRef.current) return;
    captionStartedRef.current = true;
    setTimeout(() => setCaptionVisible(true), 1000);
  }, []);

  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
    setTimeout(() => setShowFinal(true), 500);
  }, []);

  const handleReplay = useCallback(() => {
    captionStartedRef.current = false;
    setCaptionVisible(false);
    setVideoEnded(false);
    setShowFinal(false);
    if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
  }, []);

  // ── Intro popup ──────────────────────────────────────────────────────────────
  if (introPhase === 0) {
    return (
      <ScreenWrap screenIndex={5}>
        <div className="fixed inset-0 flex items-center justify-center px-6"
          style={{ background: 'rgba(10,20,40,0.92)', zIndex: 50 }}>
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'backOut' }}
            className="w-full max-w-xs rounded-2xl px-5 py-6"
            style={{ background: 'linear-gradient(160deg, #0d1f38, #1a3a5c)', border: '1px solid rgba(201,168,76,0.35)' }}>
            <p className="font-sans text-xs font-bold tracking-widest uppercase text-center mb-4" style={{ color: 'rgba(201,168,76,0.7)' }}>
              UP NEXT · CHAPTER 5
            </p>
            <div className="text-3xl text-center mb-3">💰</div>
            <p className="font-serif text-white font-bold text-lg text-center leading-snug mb-2">
              Small amounts, every month
            </p>
            <p className="font-sans text-sm text-center mb-4 leading-relaxed" style={{ color: 'rgba(189,233,228,0.8)' }}>
              What does ₹5,000 invested every month grow into?
            </p>
            <div className="rounded-xl px-4 py-3 text-center"
              style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <p className="font-serif font-bold text-sm" style={{ color: '#c9a84c' }}>
                📅 ₹5,000 a month. Every month.
              </p>
              <p className="font-sans text-xs mt-1" style={{ color: 'rgba(189,233,228,0.7)' }}>
                Watch consistency do what a one-time amount can't.
              </p>
            </div>
            <button onClick={() => setIntroPhase(1)}
              className="w-full mt-4 font-sans font-bold text-sm py-3 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e6c96a)', color: '#1a3a5c' }}>
              Show me →
            </button>
          </motion.div>
        </div>
      </ScreenWrap>
    );
  }

  // ── Main screen ──────────────────────────────────────────────────────────────
  return (
    <ScreenWrap screenIndex={5}>
      <ProgressDots current={4} />

      <div className="px-4 pt-2 pb-4 max-w-sm mx-auto w-full">
        <div className="text-center mb-3">
          <h2 className="font-serif text-navy font-bold text-xl leading-tight">Small Amounts Matter</h2>
          <p className="font-sans text-gray-500 text-xs mt-1">₹5,000 every month. Watch what time does to it.</p>
        </div>

        {/* Higgsfield video hero */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-3 mx-auto"
          style={{ aspectRatio: '9/16', height: '58vh' }}>
          <video
            ref={videoRef}
            src="chapter5-hero.mp4"
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            onPlay={startCaption}
            onEnded={handleVideoEnd}
          />
          {/* Bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0"
            style={{ height: '30%', background: 'linear-gradient(to bottom, transparent, white)' }} />

          {/* Caption */}
          <AnimatePresence>
            {captionVisible && !videoEnded && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-10 left-0 right-0 px-4 text-center">
                <div className="inline-block bg-navy bg-opacity-85 rounded-xl px-4 py-2 backdrop-blur-sm">
                  <p className="font-sans text-white text-xs">Every ₹5,000 builds the tower…</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {videoEnded && <ReplayButton onClick={handleReplay} />}

        {/* Final reveal */}
        <AnimatePresence>
          {showFinal && (
            <motion.div key="final" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Big result */}
              <div className="rounded-2xl p-4 text-center mb-3" style={{ background: '#1a3a5c' }}>
                <p className="font-sans text-mint text-xs uppercase tracking-widest mb-1">₹5,000/month grew to</p>
                <p className="font-serif font-bold text-white text-3xl">₹5.94 Crore</p>
                <p className="font-sans text-xs opacity-60 text-white mt-1">in 40 years at 12% p.a.</p>
              </div>

              {/* 20 / 30 / 40 yr milestones */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {S5_DISPLAY_MILESTONES.map((ms, i) => (
                  <div key={ms.years}
                    className={`rounded-xl p-3 text-center border ${i === 2 ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
                    <p className={`font-sans text-xs mb-1 ${i === 2 ? 'text-amber-600' : 'text-gray-400'}`}>{ms.label}</p>
                    <p className="font-sans text-gray-400 mb-0.5" style={{ fontSize: '0.6rem' }}>Invested {ms.invested}</p>
                    <div className="border-t border-gray-200 my-1" />
                    <p className={`font-serif font-bold text-xs ${i === 2 ? 'text-amber-700' : 'text-navy'}`}>{ms.short}</p>
                  </div>
                ))}
              </div>

              <InsightBox text="You do not need a huge amount to start investing. You need discipline, patience and time." />
              <div className="mt-3"><CTAButton label="What if your investments grew with you? →" onClick={onNext} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScreenWrap>
  );
}

// ─── SCREEN 6: The Power of Growing With Your Income ──────────────────────────

// Overlay cards timed to 9s video: badges appear early, result cards appear as towers diverge
const S6_OVERLAY_TIMES = [
  { id: 'msg1', delay: 1200, side: 'msg', text: 'Both start identical…' },
  { id: 'msg2', delay: 3500, side: 'msg', text: 'The gap is starting to show…' },
  { id: 'msg3', delay: 6200, side: 'msg', text: 'Now impossible to ignore.' },
  { id: 'regular', delay: 6500, side: 'left',  label: 'Regular SIP', sub: '₹5,000/mo', result: '₹5.94 Cr', color: '#3B82F6' },
  { id: 'growing', delay: 7400, side: 'right', label: 'Growing SIP', sub: '+10%/yr',    result: '₹17.1 Cr', color: '#22C55E' },
];

function Screen6({ onNext }) {
  const [introPhase, setIntroPhase] = useState(0); // 0=popup, 1=main
  const [visibleIds, setVisibleIds] = useState([]);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const videoRef = useRef(null);
  const timersRef = useRef([]);
  const startedRef = useRef(false);

  const startOverlays = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    timersRef.current.forEach(clearTimeout);
    setVisibleIds([]);
    timersRef.current = S6_OVERLAY_TIMES.map(item =>
      setTimeout(() => {
        if (item.side === 'msg') {
          setCaptionText(item.text);
        } else {
          setVisibleIds(ids => [...ids, item.id]);
        }
      }, item.delay)
    );
  }, []);

  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
    setTimeout(() => setShowFinal(true), 300);
  }, []);

  const handleReplay = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    startedRef.current = false;
    setVisibleIds([]);
    setVideoEnded(false);
    setShowFinal(false);
    setCaptionText('');
    if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
  }, []);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const leftCard  = S6_OVERLAY_TIMES.find(x => x.id === 'regular');
  const rightCard = S6_OVERLAY_TIMES.find(x => x.id === 'growing');

  // ── Intro popup ────────────────────────────────────────────────────────────
  if (introPhase === 0) {
    return (
      <ScreenWrap screenIndex={6}>
        <div className="fixed inset-0 flex items-center justify-center px-6"
          style={{ background: 'rgba(10,20,40,0.92)', zIndex: 50 }}>
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'backOut' }}
            className="w-full max-w-xs rounded-2xl px-5 py-6"
            style={{ background: 'linear-gradient(160deg, #0d1f38, #1a3a5c)', border: '1px solid rgba(201,168,76,0.35)' }}>
            <p className="font-sans text-xs font-bold tracking-widest uppercase text-center mb-4" style={{ color: 'rgba(201,168,76,0.7)' }}>
              UP NEXT · CHAPTER 6
            </p>
            <div className="text-3xl text-center mb-3">📈</div>
            <p className="font-serif text-white font-bold text-lg text-center leading-snug mb-2">
              Grow with your income
            </p>
            <p className="font-sans text-sm text-center mb-4 leading-relaxed" style={{ color: 'rgba(189,233,228,0.8)' }}>
              What if you increased your ₹5,000 monthly investment by 10% every year?
            </p>
            <div className="rounded-xl px-4 py-3 text-center"
              style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <p className="font-serif font-bold text-sm" style={{ color: '#c9a84c' }}>
                📊 A small yearly raise to your SIP.
              </p>
              <p className="font-sans text-xs mt-1" style={{ color: 'rgba(189,233,228,0.7)' }}>
                See how much more it builds over the same 40 years.
              </p>
            </div>
            <button onClick={() => setIntroPhase(1)}
              className="w-full mt-4 font-sans font-bold text-sm py-3 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e6c96a)', color: '#1a3a5c' }}>
              Find out →
            </button>
          </motion.div>
        </div>
      </ScreenWrap>
    );
  }

  return (
    <ScreenWrap screenIndex={6}>
      <ProgressDots current={5} />
      <div className="px-4 pt-2 pb-4 max-w-sm mx-auto w-full">
        <div className="text-center mb-3">
          <h2 className="font-serif text-navy font-bold text-xl leading-tight">The Power of Growing With Your Income</h2>
          <p className="font-sans text-gray-500 text-xs mt-1">Small increases create huge differences.</p>
        </div>

        {/* Higgsfield video hero */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-3 mx-auto"
          style={{ aspectRatio: '9/16', height: '58vh' }}>
          <video
            ref={videoRef}
            src="chapter6-hero.mp4"
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            onPlay={startOverlays}
            onEnded={handleVideoEnd}
          />

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0"
            style={{ height: '25%', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.85))' }} />

          {/* Left tower badge */}
          <div className="absolute top-3 left-3">
            <div className="rounded-xl px-2.5 py-1.5 shadow-md" style={{ background: 'rgba(255,255,255,0.95)', maxWidth: '42vw' }}>
              <p className="font-serif font-bold text-sm leading-tight" style={{ color: '#3B82F6' }}>No increase</p>
              <p className="font-sans text-xs text-gray-500">₹5,000/mo fixed</p>
            </div>
          </div>

          {/* Right tower badge */}
          <div className="absolute top-3 right-3">
            <div className="rounded-xl px-2.5 py-1.5 shadow-md text-right" style={{ background: 'rgba(255,255,255,0.95)', maxWidth: '42vw' }}>
              <p className="font-serif font-bold text-sm leading-tight" style={{ color: '#22C55E' }}>10% increment</p>
              <p className="font-sans text-xs" style={{ color: '#22C55E' }}>every year</p>
            </div>
          </div>

          {/* Result cards — stagger in as video progresses */}
          <AnimatePresence>
            {visibleIds.includes('regular') && (
              <motion.div
                key="regular"
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: 'backOut' }}
                className="absolute bottom-16 left-3 rounded-xl px-3 py-2 shadow-lg"
                style={{ background: '#3B82F6' }}
              >
                <p className="font-sans text-xs font-bold text-white opacity-80">40 years</p>
                <p className="font-serif font-bold text-white text-lg">₹5.94 Cr</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {visibleIds.includes('growing') && (
              <motion.div
                key="growing"
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: 'backOut' }}
                className="absolute bottom-16 right-3 rounded-xl px-3 py-2 shadow-lg"
                style={{ background: '#22C55E' }}
              >
                <p className="font-sans text-xs font-bold text-white opacity-80">40 years</p>
                <p className="font-serif font-bold text-white text-lg">₹17.1 Cr</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Caption */}
          <AnimatePresence>
            {captionText && !videoEnded && (
              <motion.div
                key={captionText}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute bottom-10 left-0 right-0 px-4 text-center">
                <div className="inline-block bg-navy bg-opacity-85 rounded-xl px-4 py-2 backdrop-blur-sm">
                  <p className="font-sans text-white text-xs">{captionText}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {videoEnded && <ReplayButton onClick={handleReplay} />}

        {/* Final reveal */}
        <AnimatePresence>
          {showFinal && (
            <motion.div key="final" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Dramatic comparison */}
              <div className="rounded-2xl p-4 mb-3 text-center" style={{ background: '#1a3a5c' }}>
                <div className="flex items-center justify-center gap-4 mb-2">
                  <div>
                    <p className="font-sans text-xs text-gray-400 mb-0.5">Regular SIP</p>
                    <p className="font-serif font-bold text-2xl" style={{ color: '#93C5FD' }}>₹5.94 Cr</p>
                  </div>
                  <p className="font-serif text-2xl text-gray-400 font-bold">vs</p>
                  <div>
                    <p className="font-sans text-xs text-gray-400 mb-0.5">Growing SIP</p>
                    <p className="font-serif font-bold text-2xl" style={{ color: '#86EFAC' }}>₹17.1 Cr</p>
                  </div>
                </div>
                <p className="font-sans text-sm text-mint">Same starting amount. Different habit.</p>
                <p className="font-sans text-xs text-gray-400 mt-1">+₹11 Crore simply by increasing contributions</p>
              </div>

              {/* Context chips */}
              <div className="flex gap-2 flex-wrap justify-center mb-3">
                {[
                  { label: '₹5,000/month', sub: 'starting amount' },
                  { label: '+10%/year', sub: 'annual increase' },
                  { label: '2.9× more', sub: 'wealth created' },
                ].map(c => (
                  <div key={c.label} className="bg-mint bg-opacity-30 rounded-xl px-3 py-1.5 text-center">
                    <p className="font-serif font-bold text-navy text-sm">{c.label}</p>
                    <p className="font-sans text-xs text-gray-500">{c.sub}</p>
                  </div>
                ))}
              </div>

              <InsightBox text="Merely increasing your investments marginally every year accelerates your compounding." />
              <div className="mt-3"><CTAButton label="But does starting earlier matter more? →" onClick={() => setShowPopup(true)} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center px-6"
            style={{ background: 'rgba(10,20,40,0.92)', zIndex: 50 }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'backOut' }}
              className="rounded-2xl px-6 py-8 text-center w-full max-w-xs"
              style={{ background: '#1a3a5c', border: '1px solid rgba(201,168,76,0.3)' }}
            >
              <p className="font-serif text-white font-bold leading-snug mb-3" style={{ fontSize: '1.2rem' }}>
                What if Tanya, Kabir and Rohan started investing at different ages —
              </p>
              <div className="flex justify-center gap-3 mb-4">
                {[['👩','Tanya','22 yrs'],['👨','Kabir','27 yrs'],['👨','Rohan','32 yrs']].map(([e,n,a]) => (
                  <div key={n} className="flex flex-col items-center gap-1">
                    <span style={{ fontSize: '1.6rem' }}>{e}</span>
                    <span className="font-sans font-bold text-white text-xs">{n}</span>
                    <span className="font-sans text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.2)', color: '#e6c96a' }}>{a}</span>
                  </div>
                ))}
              </div>
              <p className="font-sans text-sm leading-relaxed mb-5" style={{ color: 'rgba(189,233,228,0.9)' }}>
                All investing ₹5,000/month in the same fund, till age 60. Who makes the most — and by how much?
              </p>
              <button
                onClick={() => { setShowPopup(false); onNext(); }}
                className="w-full font-sans font-bold text-sm py-3 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e6c96a)', color: '#1a3a5c' }}
              >
                Find out →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </ScreenWrap>
  );
}

// ─── SCREEN 7: The Cost of Waiting ────────────────────────────────────────────

const S7_CHARS = [
  { name: 'Tanya', emoji: '👩', start: 22, invested: '₹22.8L', final: '₹4.99 Cr', value: 49900000, color: '#22C55E', floors: 40 },
  { name: 'Kabir', emoji: '👨', start: 27, invested: '₹19.8L', final: '₹2.87 Cr', value: 28700000, color: '#3B82F6', floors: 30 },
  { name: 'Rohan', emoji: '👨', start: 32, invested: '₹16.8L', final: '₹1.64 Cr', value: 16400000, color: '#F59E0B', floors: 20 },
];

function Screen7({ onNext }) {
  const [videoEnded, setVideoEnded] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const videoRef = useRef(null);
  const startedRef = useRef(false);

  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
    setTimeout(() => setShowFinal(true), 500);
  }, []);

  const handleReplay = useCallback(() => {
    startedRef.current = false;
    setVideoEnded(false);
    setShowFinal(false);
    if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
  }, []);

  return (
    <ScreenWrap screenIndex={7}>
      <ProgressDots current={6} />
      <div className="px-4 pt-2 pb-4 max-w-sm mx-auto w-full">
        <div className="text-center mb-3">
          <h2 className="font-serif text-navy font-bold text-xl leading-tight">The Cost of Waiting</h2>
          <p className="font-sans text-gray-500 text-xs mt-1">Time is often more important than amount.</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-3 mx-auto"
          style={{ aspectRatio: '9/16', height: '58vh' }}>
          <video ref={videoRef} src="chapter7-hero.mp4" autoPlay muted playsInline
            className="w-full h-full object-cover" onEnded={handleVideoEnd} />
          <div className="absolute bottom-0 left-0 right-0"
            style={{ height: '30%', background: 'linear-gradient(to bottom, transparent, white)' }} />
        </div>

        {videoEnded && <ReplayButton onClick={handleReplay} />}

        <AnimatePresence>
          {showFinal && (
            <motion.div key="final" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden pb-4"
              style={{ background: 'linear-gradient(160deg, #0d1f38 0%, #1a3a5c 100%)' }}>
              {/* Three person cards */}
              <div className="grid grid-cols-3 gap-2 p-4 pb-3">
                {S7_CHARS.map((c, i) => {
                  const cardStyle = i === 0
                    ? { background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)' }
                    : i === 1
                    ? { background: 'rgba(125,211,252,0.1)', border: '1px solid rgba(125,211,252,0.3)' }
                    : { background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.25)' };
                  const grewColor = i === 0 ? '#c9a84c' : i === 1 ? '#7dd3fc' : '#94a3b8';
                  const investedColor = i === 0 ? 'rgba(201,168,76,0.7)' : i === 1 ? 'rgba(125,211,252,0.7)' : 'rgba(148,163,184,0.7)';
                  return (
                    <div key={c.name} className="flex flex-col items-center text-center rounded-xl px-1.5 py-2.5" style={cardStyle}>
                      <p className="text-xl mb-1">{c.emoji}</p>
                      <p className="font-serif font-bold text-xs text-white mb-0.5">{c.name}</p>
                      <p className="font-sans text-white mb-2" style={{ fontSize: '0.6rem', opacity: 0.45 }}>Age {c.start}</p>
                      <p className="font-sans uppercase mb-0.5" style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>Invested</p>
                      <p className="font-sans font-bold text-xs mb-2" style={{ color: investedColor }}>{c.invested}</p>
                      <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 8 }} />
                      <p className="font-sans uppercase mb-0.5" style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>Grew to</p>
                      <p className="font-serif font-bold text-sm" style={{ color: grewColor }}>{c.final}</p>
                    </div>
                  );
                })}
              </div>
              {/* Winner callout */}
              <div className="mx-4 mb-3 rounded-xl px-4 py-3 text-center"
                style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)' }}>
                <p className="font-sans text-xs mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Tanya put in only ₹6L more than Rohan — yet ended up with</p>
                <p className="font-serif font-bold text-sm" style={{ color: '#c9a84c' }}>₹3.35 Cr more. Just by starting 10 years earlier.</p>
              </div>
              {/* Lightbulb insight */}
              <div className="mx-4 mb-4">
                <InsightBox node={<>The most expensive words in investing are: <span className="font-bold">"I'll start later."</span> Time compounds. So does delay.</>} />
              </div>
              <div className="px-4">
                <CTAButton label="But how do you start? →" onClick={() => setShowPopup(true)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center px-6"
            style={{ background: 'rgba(10,20,40,0.92)', zIndex: 50 }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'backOut' }}
              className="rounded-2xl px-6 py-8 w-full max-w-xs"
              style={{ background: '#0d1f38', border: '1px solid rgba(201,168,76,0.3)' }}
            >
              <p className="font-sans text-center mb-2" style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(189,233,228,0.7)' }}>Chapter 8</p>
              <p className="font-serif font-bold text-center leading-snug mb-2" style={{ fontSize: '1.25rem', color: '#fff' }}>
                Giving money a <span style={{ color: '#c9a84c' }}>purpose</span> is even more important.
              </p>
              <p className="font-sans text-center italic mb-4" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                Investing becomes easier when every rupee knows where it's going.
              </p>
              <div className="rounded-xl px-4 py-3 mb-5" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)' }}>
                <p className="font-sans font-bold mb-2" style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(201,168,76,0.8)' }}>🎯 In this chapter</p>
                {[
                  'Financial goals are the foundation of any financial plan.',
                  'Before choosing investments, know what you\'re investing for.',
                ].map((t, i) => (
                  <div key={i} className="flex gap-2 items-start mb-1.5 last:mb-0">
                    <div className="rounded-full flex-shrink-0 mt-1.5" style={{ width: 5, height: 5, background: '#c9a84c' }} />
                    <p className="font-sans" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>{t}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setShowPopup(false); onNext(); }}
                className="w-full font-sans font-bold py-3 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e6c96a)', color: '#1a3a5c', fontSize: '0.8rem' }}
              >
                How do you organise your money? →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </ScreenWrap>
  );
}

// ─── SCREEN 8: Hidden Treasures ───────────────────────────────────────────────

function Screen8({ onNext }) {
  const [videoEnded, setVideoEnded] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const videoRef = useRef(null);

  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
    setTimeout(() => setShowFinal(true), 500);
  }, []);

  const handleReplay = useCallback(() => {
    setVideoEnded(false);
    setShowFinal(false);
    if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
  }, []);

  return (
    <ScreenWrap screenIndex={8}>
      <ProgressDots current={7} />
      <div className="px-4 pt-2 pb-4 max-w-sm mx-auto w-full">
        <div className="text-center mb-3">
          <h2 className="font-serif text-navy font-bold text-xl leading-tight">Hidden Treasures</h2>
          <p className="font-sans text-gray-500 text-xs mt-1">Small amounts. Big possibilities.</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-3 mx-auto"
          style={{ aspectRatio: '9/16', height: '58vh' }}>
          <video ref={videoRef} src="chapter8-hero.mp4" autoPlay muted playsInline
            className="w-full h-full object-cover" onEnded={handleVideoEnd} />
          <div className="absolute bottom-0 left-0 right-0"
            style={{ height: '30%', background: 'linear-gradient(to bottom, transparent, white)' }} />
        </div>

        {videoEnded && <ReplayButton onClick={handleReplay} />}

        <AnimatePresence>
          {showFinal && (
            <motion.div key="final" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-navy rounded-xl p-4 text-center mb-3">
                <p className="font-serif text-white text-lg font-bold leading-snug">
                  Small amounts can become<br/>
                  <span style={{ color: '#c9a84c' }}>surprisingly large amounts.</span>
                </p>
                <p className="font-serif text-mint text-sm italic mt-2">If given enough time.</p>
              </div>
              <div className="rounded-xl p-4 text-center mb-3"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e6c96a)' }}>
                <p className="font-serif text-white text-base font-bold mb-1">🎮 Ready to Discover Your Hidden Treasures?</p>
                <p className="font-sans text-white text-xs mb-3 opacity-90">See how everyday amounts can become surprisingly large investments.</p>
                <a href="https://investingformummies.com/hidden-fortunes/" target="_blank" rel="noopener noreferrer"
                  className="inline-block bg-white font-sans font-bold text-sm px-5 py-2 rounded-full"
                  style={{ color: '#1a3a5c' }}>🎮 Play Hidden Treasures →</a>
              </div>
              <InsightBox text="We often notice large expenses. We ignore small amounts. Yet ₹50 a day, invested consistently, can become meaningful wealth." />
              <div className="mt-3"><CTAButton label="How Do We Organise Our Investments? →" onClick={onNext} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScreenWrap>
  );
}

// ─── SCREEN 9: Giving Your Money a Purpose ───────────────────────────────────

function Screen9({ onNext }) {
  const [videoEnded, setVideoEnded] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const videoRef = useRef(null);

  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
    setTimeout(() => setShowFinal(true), 500);
  }, []);

  const handleReplay = useCallback(() => {
    setVideoEnded(false);
    setShowFinal(false);
    if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
  }, []);

  return (
    <ScreenWrap screenIndex={9}>
      <ProgressDots current={7} />
      <div className="px-4 pt-2 pb-4 max-w-sm mx-auto w-full">
        <div className="text-center mb-3">
          <h2 className="font-serif text-navy font-bold text-xl leading-tight">Giving Your Money a Purpose</h2>
          <p className="font-sans text-gray-500 text-xs mt-1">Every investment journey begins with a destination.</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-3 mx-auto"
          style={{ aspectRatio: '9/16', height: '58vh' }}>
          <video ref={videoRef} src="chapter9-hero.mp4" autoPlay muted playsInline
            className="w-full h-full object-cover" onEnded={handleVideoEnd} />
          <div className="absolute bottom-0 left-0 right-0"
            style={{ height: '30%', background: 'linear-gradient(to bottom, transparent, white)' }} />
        </div>

        {videoEnded && <ReplayButton onClick={handleReplay} />}

        <AnimatePresence>
          {showFinal && (
            <motion.div key="final" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-navy rounded-xl p-4 text-center mb-3">
                <p className="font-serif text-white text-sm leading-relaxed">
                  "Every rupee should have a job.<br/>Every job should have a destination."
                </p>
              </div>
              <InsightBox text="A financial plan isn't a list of investments. It's a list of goals — and the strategy needed to achieve them." />
              <div className="mt-3"><CTAButton label="A Simple Way To Organise Your Money →" onClick={() => setShowPopup(true)} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center px-6"
            style={{ background: 'rgba(10,20,40,0.92)', zIndex: 50 }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'backOut' }}
              className="rounded-2xl px-5 py-7 w-full max-w-xs"
              style={{ background: 'linear-gradient(160deg, #0d1f38, #1a3a5c)', border: '1px solid rgba(201,168,76,0.3)' }}
            >
              <p className="font-serif font-bold text-center leading-snug mb-4" style={{ fontSize: '1.15rem', color: '#fff' }}>
                Organise your investments &amp; financial goals into <span style={{ color: '#c9a84c' }}>3 buckets</span>
              </p>
              {[
                { icon: '🛡️', cls: 'red',   title: 'Emergency Bucket', desc: 'Protection against emergencies. Short term goals.', tag: 'Less than 1 year',  cr: '#FC8181', cb: 'rgba(239,68,68,0.15)',  cb2: 'rgba(239,68,68,0.35)',  ct: 'rgba(239,68,68,0.2)',  ctc: '#FCA5A5' },
                { icon: '🏠', cls: 'blue',  title: 'Stability Bucket',  desc: 'Brings stability to your portfolio. Medium term goals.', tag: '1 – 3 years', cr: '#93C5FD', cb: 'rgba(59,130,246,0.15)', cb2: 'rgba(59,130,246,0.35)', ct: 'rgba(59,130,246,0.2)', ctc: '#BFDBFE' },
                { icon: '🚀', cls: 'green', title: 'Growth Bucket',     desc: 'For wealth generation. Long term goals.', tag: 'More than 5 years',         cr: '#86EFAC', cb: 'rgba(34,197,94,0.15)',  cb2: 'rgba(34,197,94,0.35)',  ct: 'rgba(34,197,94,0.2)',  ctc: '#BBF7D0' },
              ].map(b => (
                <div key={b.title} className="flex gap-3 items-start rounded-xl px-3 py-2.5 mb-2.5"
                  style={{ background: b.cb, border: `1px solid ${b.cb2}` }}>
                  <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: 1 }}>{b.icon}</span>
                  <div>
                    <p className="font-sans font-bold text-xs mb-1" style={{ color: b.cr }}>{b.title}</p>
                    <p className="font-sans text-xs mb-1.5 leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>{b.desc}</p>
                    <span className="font-sans font-bold rounded-full px-2 py-0.5"
                      style={{ fontSize: '0.6rem', background: b.ct, color: b.ctc }}>
                      {b.tag}
                    </span>
                  </div>
                </div>
              ))}
              <button
                onClick={() => { setShowPopup(false); onNext(); }}
                className="w-full font-sans font-bold py-3 rounded-xl mt-2"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e6c96a)', color: '#1a3a5c', fontSize: '0.8rem' }}
              >
                Show me the buckets →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </ScreenWrap>
  );
}

// ─── SCREEN 10: The 3 Bucket Investment Strategy ─────────────────────────────

const S10_BUCKETS = [
  {
    key: 'emergency',
    emoji: '🛡️',
    label: 'Emergency',
    purpose: 'Protection',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    goals: ['🏥 Medical Emergency', '💼 Job Loss Fund', '🚨 Emergency Fund'],
  },
  {
    key: 'stability',
    emoji: '🏠',
    label: 'Stability',
    purpose: 'Reliability',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    goals: ['✈️ Family Vacation', '🏠 Home Down Payment', '🎓 Education'],
  },
  {
    key: 'growth',
    emoji: '🚀',
    label: 'Growth',
    purpose: 'Wealth Creation',
    color: '#22C55E',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    goals: ['🌴 Retirement', '💰 Wealth Creation', '🚀 Freedom'],
  },
];

function Screen10({ onNext }) {
  const [videoEnded, setVideoEnded] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const videoRef = useRef(null);

  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
    setTimeout(() => setShowFinal(true), 500);
  }, []);

  const handleReplay = useCallback(() => {
    setVideoEnded(false);
    setShowFinal(false);
    if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
  }, []);

  return (
    <ScreenWrap screenIndex={10}>
      <ProgressDots current={8} />
      <div className="px-4 pt-2 pb-4 max-w-sm mx-auto w-full">
        <div className="text-center mb-3">
          <h2 className="font-serif text-navy font-bold text-xl leading-tight">The 3 Bucket Investment Strategy</h2>
          <p className="font-sans text-gray-500 text-xs mt-1">Different money has different jobs.</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-3 mx-auto"
          style={{ aspectRatio: '9/16', height: '58vh' }}>
          <video ref={videoRef} src="chapter10-hero.mp4" autoPlay muted playsInline
            className="w-full h-full object-cover" onEnded={handleVideoEnd} />
          <div className="absolute bottom-0 left-0 right-0"
            style={{ height: '30%', background: 'linear-gradient(to bottom, transparent, white)' }} />
        </div>

        {videoEnded && <ReplayButton onClick={handleReplay} />}

        <AnimatePresence>
          {showFinal && (
            <motion.div key="final" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

              {/* Cinematic bucket visual */}
              <div className="rounded-2xl overflow-hidden mb-3"
                style={{ background: 'linear-gradient(160deg, #080f1a 0%, #0d1f38 60%, #081a14 100%)' }}>

                <p className="text-center font-serif text-white text-sm pt-4 px-4 opacity-70 italic">
                  Different goals need different kinds of money.
                </p>

                <div className="flex gap-2 px-3 py-4">
                  {[
                    { label: 'Emergency', purpose: 'Protection', icon: '🛡️', color: '#EF4444', glow: 'rgba(239,68,68,0.35)', goals: ['🏥 Medical', '💼 Job Loss', '🚨 Emergency'] },
                    { label: 'Stability',  purpose: 'Reliability',      icon: '🏠', color: '#3B82F6', glow: 'rgba(59,130,246,0.35)', goals: ['✈️ Vacation', '🏠 Home', '🎓 Education'] },
                    { label: 'Growth',     purpose: 'Wealth Creation',  icon: '🚀', color: '#22C55E', glow: 'rgba(34,197,94,0.35)',  goals: ['🌴 Retirement', '💰 Wealth', '🚀 Freedom'] },
                  ].map((b, i) => (
                    <motion.div key={b.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.15, duration: 0.5, ease: 'backOut' }}
                      className="flex-1 rounded-xl flex flex-col items-center pt-3 pb-3 px-1.5"
                      style={{
                        background: `linear-gradient(180deg, ${b.glow} 0%, rgba(255,255,255,0.03) 100%)`,
                        border: `1px solid ${b.color}55`,
                        boxShadow: `0 0 18px ${b.glow}, inset 0 0 12px ${b.glow}`,
                      }}>
                      {/* Icon */}
                      <div className="text-2xl mb-1" style={{ filter: `drop-shadow(0 0 8px ${b.color})` }}>
                        {b.icon}
                      </div>
                      {/* Label */}
                      <p className="font-serif font-bold text-xs text-white mb-0.5">{b.label}</p>
                      <p className="font-sans text-xs mb-2" style={{ color: b.color, opacity: 0.8, fontSize: '0.6rem' }}>{b.purpose}</p>
                      {/* Goals */}
                      <div className="w-full space-y-1 mb-2">
                        {b.goals.map(g => (
                          <div key={g} className="rounded-md px-1.5 py-1 text-center font-sans"
                            style={{ background: `${b.color}22`, border: `1px solid ${b.color}44`, color: b.color, fontSize: '0.6rem', fontWeight: 600, lineHeight: 1.3 }}>
                            {g}
                          </div>
                        ))}
                      </div>
                      {/* Bucket emoji with glow */}
                      <div className="text-xl mt-auto" style={{ filter: `drop-shadow(0 0 6px ${b.color})` }}>🪣</div>
                    </motion.div>
                  ))}
                </div>

                {/* Connecting golden line */}
                <div className="mx-3 mb-4 flex items-center gap-1">
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #c9a84c)' }} />
                  <div className="text-xs font-sans px-2" style={{ color: '#c9a84c', opacity: 0.7 }}>they work together</div>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #c9a84c)' }} />
                </div>
              </div>

              <div className="bg-navy rounded-xl p-4 text-center mb-3">
                <p className="font-serif text-white text-sm leading-relaxed mb-1">
                  Wealth is not built by finding the perfect investment.
                </p>
                <p className="font-serif font-bold text-sm" style={{ color: '#c9a84c' }}>
                  Wealth is built by giving every investment the right job.
                </p>
              </div>

              <InsightBox text="When goals are organised, investing becomes simpler, more intentional, and far less overwhelming. Different goals need different kinds of investment strategy." />
              <div className="mt-3"><CTAButton label="Where Do These Buckets Invest? →" onClick={() => setShowPopup(true)} /></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ch9→Ch10 popup */}
        <AnimatePresence>
          {showPopup && (
            <motion.div key="popup-ch10"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
              style={{ background: 'rgba(10,20,40,0.92)' }}>
              <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', duration: 0.5, ease: 'backOut' }}
                className="w-full max-w-sm rounded-2xl p-6"
                style={{ background: 'linear-gradient(160deg, #0d1f38, #081a14)', border: '1px solid rgba(201,168,76,0.4)' }}>

                <p className="font-serif text-white text-base font-bold text-center mb-1 leading-snug">
                  We invest in <span style={{ color: '#c9a84c' }}>asset classes.</span>
                </p>
                <p className="font-sans text-xs text-center mb-5 leading-relaxed" style={{ color: 'rgba(189,233,228,0.75)' }}>
                  Every asset class has a different role to play in your financial life.
                </p>

                {[
                  { label: 'Purpose', icon: '🎯', text: 'Why this asset class exists in your portfolio' },
                  { label: 'Characteristics', icon: '🔍', text: 'How it behaves — risk, return, liquidity' },
                  { label: 'Goals', icon: '🏆', text: 'Which bucket and which life goal it belongs to' },
                ].map((pill, i) => (
                  <motion.div key={pill.label}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.1 }}
                    className="flex items-start gap-3 mb-3 rounded-xl p-3"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <span className="text-xl">{pill.icon}</span>
                    <div>
                      <p className="font-serif font-bold text-sm" style={{ color: '#c9a84c' }}>{pill.label}</p>
                      <p className="font-sans text-xs leading-relaxed" style={{ color: 'rgba(189,233,228,0.8)' }}>{pill.text}</p>
                    </div>
                  </motion.div>
                ))}

                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                  onClick={() => { setShowPopup(false); onNext(); }}
                  className="w-full mt-4 py-4 rounded-xl font-sans font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2a9d8f 100%)' }}
                  whileTap={{ scale: 0.97 }}>
                  Show me the asset classes →
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScreenWrap>
  );
}

// ─── SCREEN 11: Where Can We Invest? ─────────────────────────────────────────

const S11_ASSETS = [
  {
    emoji: '💵', name: 'Cash', desc: 'Safe. Liquid. Always available.',
    best: ['Safety', 'Easy access', 'Emergency use'],
    know: ['Lowest risk', 'Lowest growth', 'May not beat inflation'],
    buckets: ['🛟 Emergency'],
    color: '#64748B',
  },
  {
    emoji: '🏦', name: 'Debt', desc: 'Stable. Predictable. Reliable.',
    best: ['Stability', 'Regular income', 'Predictability'],
    know: ['Lower risk than equity', 'Moderate returns', 'Good for medium-term'],
    buckets: ['🏠 Stability'],
    color: '#3B82F6',
  },
  {
    emoji: '🏠', name: 'Real Estate', desc: 'Tangible. Long-term. Illiquid.',
    best: ['Physical ownership', 'Appreciation potential', 'Rental income'],
    know: ['Needs large capital', 'Hard to sell quickly', 'Long horizon'],
    buckets: ['🏠 Stability', '🚀 Growth'],
    color: '#F59E0B',
  },
  {
    emoji: '🥇', name: 'Gold', desc: 'Protection during uncertainty.',
    best: ['Wealth preservation', 'Diversification', 'Familiarity'],
    know: ['Protects during uncertainty', 'Complements other assets', 'Not the fastest growing'],
    buckets: ['🛟 Emergency', '🏠 Stability'],
    color: '#C9A84C',
  },
  {
    emoji: '📈', name: 'Equity', desc: 'Growth. Volatility. Wealth creation.',
    best: ['Long-term growth', 'Beating inflation', 'Compounding'],
    know: ['Can fluctuate a lot', 'Rewards patience', 'Strongest long-term creator'],
    buckets: ['🚀 Growth'],
    color: '#22C55E',
    highlight: true,
  },
  {
    emoji: '🎯', name: 'Alternatives', desc: 'Specialised. Higher complexity.',
    best: ['Diversification', 'Unique opportunities'],
    know: ['Can be complex', 'Higher capital needed', 'For experienced investors'],
    buckets: ['🚀 Growth'],
    color: '#8B5CF6',
  },
];

function AssetCard({ asset, index, visible, expanded, onToggle }) {
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={onToggle}
      className="rounded-xl p-3 cursor-pointer"
      style={{
        background: expanded
          ? `linear-gradient(160deg, #0d1f38, ${asset.color}22)`
          : 'linear-gradient(160deg, #0d1f38, #12243a)',
        border: `1.5px solid ${expanded ? asset.color : asset.color + '44'}`,
        boxShadow: expanded ? `0 0 16px ${asset.color}33` : 'none',
      }}
    >
      <div className="text-center">
        <div className="text-2xl mb-1" style={{ filter: expanded ? `drop-shadow(0 0 6px ${asset.color})` : 'none' }}>{asset.emoji}</div>
        <p className="font-sans text-xs font-bold text-white">{asset.name}</p>
        <p className="font-sans text-xs leading-tight" style={{ color: 'rgba(189,233,228,0.65)' }}>{asset.desc}</p>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${asset.color}33` }}>
              <p className="font-sans text-xs font-bold mb-1" style={{ color: asset.color }}>Best Known For</p>
              {asset.best.map(b => <p key={b} className="font-sans text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>• {b}</p>)}
              <p className="font-sans text-xs font-bold mt-2 mb-1" style={{ color: 'rgba(201,168,76,0.8)' }}>Things To Know</p>
              {asset.know.map(k => <p key={k} className="font-sans text-xs" style={{ color: 'rgba(189,233,228,0.6)' }}>• {k}</p>)}
              <p className="font-sans text-xs font-bold mt-2 mb-1" style={{ color: 'rgba(201,168,76,0.8)' }}>Usually Found In</p>
              {asset.buckets.map(bk => (
                <span key={bk} className="inline-block text-xs rounded-full px-2 py-0.5 mr-1 mb-1 font-sans"
                  style={{ background: asset.color + '30', border: `1px solid ${asset.color}66`, color: asset.color }}>
                  {bk}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Screen11({ onNext }) {
  const [phase, setPhase] = useState(-1);
  const [visibleCards, setVisibleCards] = useState(0);
  const [expandedCard, setExpandedCard] = useState(null);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => setPhase(0), 500);
    const t1 = setTimeout(() => setPhase(1), 2000);
    // Cards appear one by one
    S11_ASSETS.forEach((_, i) => {
      setTimeout(() => setVisibleCards(i + 1), 2500 + i * 300);
    });
    const lastDelay = 2500 + S11_ASSETS.length * 300 + 800;
    const tCTA = setTimeout(() => setShowCTA(true), lastDelay);
    return () => [t0, t1, tCTA].forEach(clearTimeout);
  }, []);

  return (
    <ScreenWrap screenIndex={11}>
      <ProgressDots current={9} />
      <ScreenLayout title="Where Can We Invest?" subtitle="Every asset class has a different job to do.">

        <AnimatePresence mode="wait">
          {phase === 0 && (
            <motion.p key="msg0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center font-serif text-base text-navy italic mb-4">
              If every bucket has a purpose…<br/>what can we put inside them?
            </motion.p>
          )}
          {phase >= 1 && (
            <motion.p key="msg1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center font-sans text-xs text-gray-500 mb-3">
              Tap any card to learn more 👇
            </motion.p>
          )}
        </AnimatePresence>

        {/* 2×3 grid */}
        <div className="grid grid-cols-2 gap-3 mb-4"
          style={{ background: 'linear-gradient(160deg, #080f1a, #0d1f38)', borderRadius: '1rem', padding: '0.75rem' }}>
          {S11_ASSETS.map((asset, i) => (
            <AssetCard
              key={asset.name}
              asset={asset}
              index={i}
              visible={visibleCards > i}
              expanded={expandedCard === i}
              onToggle={() => setExpandedCard(expandedCard === i ? null : i)}
            />
          ))}
        </div>

        {/* Final reveal */}
        <AnimatePresence>
          {showCTA && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
              <div className="bg-navy rounded-xl p-4 text-center mb-3">
                <p className="font-serif text-white text-sm leading-relaxed">
                  No asset class is perfect.<br/>
                  No asset class is useless.<br/>
                  <span className="text-gold font-bold">Every asset class has a role.</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <InsightBox text="The goal isn't to find the 'best' investment. The goal is to build the right combination for your goals." />
        <CTAButton label="Complete The Wealth Conversation →" onClick={onNext} />
      </ScreenLayout>
    </ScreenWrap>
  );
}

// ─── FINAL SCREEN ─────────────────────────────────────────────────────────────

function GameCard({ video, href, emoji, title, desc, tags, cardBg, titleColor, descColor, tagBg, tagColor, badgeBg, badgeColor, accent }) {
  const [showVideo, setShowVideo] = useState(false);
  return (
    <>
      <div className="rounded-2xl overflow-hidden relative" style={{ background: cardBg }}>
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="absolute top-2 right-2 rounded-full px-2 py-0.5 font-sans font-bold text-xs no-underline z-10"
          style={{ background: badgeBg, color: badgeColor, textDecoration: 'none' }}>
          PLAY FREE →
        </a>
        <div className="flex gap-3 p-3">
          {/* Tap-to-play portrait thumbnail */}
          <button onClick={() => setShowVideo(true)}
            className="relative flex-shrink-0 rounded-xl overflow-hidden"
            style={{ width: 84, aspectRatio: '9/16', background: '#000' }}>
            <video src={`${video}#t=0.5`} muted playsInline preload="metadata"
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.25)' }}>
              <div className="rounded-full flex items-center justify-center"
                style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.92)' }}>
                <span style={{ color: accent, fontSize: '0.85rem', marginLeft: 2 }}>▶</span>
              </div>
            </div>
            <div className="absolute bottom-1 left-0 right-0 text-center font-sans font-bold"
              style={{ color: '#fff', fontSize: '0.5rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              ▶ WATCH
            </div>
          </button>
          {/* Text */}
          <a href={href} target="_blank" rel="noopener noreferrer" className="flex-1 no-underline pr-14" style={{ textDecoration: 'none' }}>
            <div className="text-2xl mb-0.5">{emoji}</div>
            <p className="font-serif font-bold text-base leading-tight mb-0.5" style={{ color: titleColor }}>{title}</p>
            <p className="font-sans text-xs leading-relaxed" style={{ color: descColor }}>{desc}</p>
            <div className="mt-2 flex gap-1 flex-wrap">
              {tags.map(t => (
                <span key={t} className="font-sans text-xs rounded-full px-2 py-0.5"
                  style={{ background: tagBg, color: tagColor }}>{t}</span>
              ))}
            </div>
          </a>
        </div>
      </div>

      {/* Full-screen portrait player */}
      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col items-center justify-center px-6"
            style={{ background: 'rgba(8,12,20,0.96)', zIndex: 60 }}
            onClick={() => setShowVideo(false)}>
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'backOut' }}
              className="relative w-full max-w-xs" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowVideo(false)}
                className="absolute -top-9 right-0 font-sans text-sm font-bold"
                style={{ color: 'rgba(255,255,255,0.7)' }}>✕ Close</button>
              <video src={video} autoPlay controls playsInline
                className="w-full rounded-2xl" style={{ aspectRatio: '9/16', background: '#000' }} />
              <a href={href} target="_blank" rel="noopener noreferrer"
                onClick={() => setShowVideo(false)}
                className="block w-full mt-3 py-3 rounded-xl text-center font-sans font-bold text-sm no-underline"
                style={{ background: badgeBg, color: badgeColor, textDecoration: 'none' }}>
                {emoji} Play {title} →
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FinalScreen({ onRestart }) {
  return (
    <ScreenWrap screenIndex={12}>
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #080f1a 0%, #0d1f38 50%, #081a14 100%)' }}>

        {/* Hero — logo + completion */}
        <div className="flex flex-col items-center justify-center px-6 pt-10 pb-6 text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'backOut' }}
            className="mb-5"
          >
            <img src="ifm-logo-round.png" alt="Investing for Mummies"
              className="w-24 h-24 rounded-full mx-auto mb-4 shadow-lg border-4"
              style={{ borderColor: '#c9a84c', background: '#fff', boxShadow: '0 0 32px rgba(42,157,143,0.4)' }} />
            <p className="font-sans text-xs tracking-widest uppercase mb-3" style={{ color: 'rgba(201,168,76,0.8)' }}>
              BY INVESTING FOR MUMMIES
            </p>
            <h1 className="font-serif text-white font-bold text-2xl leading-tight mb-1">
              You've completed
            </h1>
            <h2 className="font-serif font-bold text-2xl leading-tight mb-4" style={{ color: '#c9a84c' }}>
              The Wealth Conversation
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-serif text-sm italic mb-6 leading-relaxed max-w-xs"
            style={{ color: 'rgba(189,233,228,0.85)' }}
          >
            "The best time to start understanding money was yesterday.<br/>
            The next best time is today."
          </motion.p>
        </div>

        {/* White card panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-t-3xl px-5 pt-7 pb-10"
          style={{ background: 'white', flex: 1 }}
        >
          <h3 className="font-serif text-navy text-lg font-bold text-center mb-1">
            Continue Your Learning Journey
          </h3>
          <p className="font-sans text-xs text-gray-400 text-center mb-5">
            with Investing for Mummies
          </p>

          {/* Join a batch — primary CTA */}
          <a href="https://investingformummies.com/batches/" target="_blank" rel="noopener noreferrer"
            className="block rounded-2xl p-4 mb-5 text-center no-underline"
            style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2a9d8f 100%)', textDecoration: 'none' }}>
            <p className="font-serif text-white font-bold text-base mb-0.5">🎓 Join a Live Batch</p>
            <p className="font-sans text-xs leading-relaxed" style={{ color: 'rgba(189,233,228,0.85)' }}>
              Learn to invest in small groups.<br/>Real conversations. Real money. Real clarity.
            </p>
            <div className="mt-3 inline-block px-5 py-1.5 rounded-full font-sans font-bold text-xs"
              style={{ background: '#c9a84c', color: '#0d1f38' }}>
              See upcoming batches →
            </div>
          </a>

          {/* Game cards */}
          <p className="font-sans text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-3">Play &amp; Learn</p>

          <p className="font-sans text-xs text-center mb-3" style={{ color: '#9ca3af' }}>
            ▶ Tap a video to watch the 30-second trailer
          </p>
          <div className="space-y-3 mb-5">
            <GameCard
              video="chapter8-hero.mp4"
              href="https://investingformummies.com/hidden-fortunes/"
              emoji="💰"
              title="Hidden Treasures"
              desc="Discover how small amounts grow into serious wealth over time."
              tags={['Compounding', 'SIP', 'Wealth']}
              cardBg="linear-gradient(135deg, #c9a84c 0%, #7a5c10 100%)"
              titleColor="#fff"
              descColor="rgba(255,255,255,0.85)"
              tagBg="rgba(255,255,255,0.2)"
              tagColor="#fff"
              badgeBg="#fff"
              badgeColor="#7a5c10"
              accent="#7a5c10"
            />
            <GameCard
              video="swayamvar-teaser.mp4"
              href="https://investingformummies.com/swayamvar/"
              emoji="💍"
              title="Asset Class Swayamvar"
              desc="Match every investment to the right goal. Who swipes right on who?"
              tags={['Asset Classes', 'Goals', 'Buckets']}
              cardBg="linear-gradient(135deg, #5a0000 0%, #2d0000 100%)"
              titleColor="#fbbf24"
              descColor="rgba(253,230,138,0.85)"
              tagBg="rgba(251,191,36,0.2)"
              tagColor="#fbbf24"
              badgeBg="#fbbf24"
              badgeColor="#2d0000"
              accent="#2d0000"
            />
          </div>

          {/* Social + restart */}
          <div className="text-center mb-5">
            <p className="font-sans text-xs text-gray-400 mb-2">Follow for simple money conversations</p>
            <a href="https://www.instagram.com/investingformummies" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-sans text-sm font-bold"
              style={{ color: '#E1306C' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              @investingformummies
            </a>
          </div>

          <button
            onClick={onRestart}
            className="w-full border-2 border-gray-200 text-gray-400 font-sans font-bold text-sm py-3 rounded-xl"
          >
            ↺ Start Again
          </button>
        </motion.div>
      </div>
    </ScreenWrap>
  );
}

function App() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const next = () => setCurrentScreen(s => s + 1);

  // debug hook for QA navigation (harmless in production)
  useEffect(() => { window.__goto = setCurrentScreen; }, []);

  // Scroll back to top on every screen change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentScreen]);

  const screenProps = { key: `screen-${currentScreen}`, initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -16 }, transition: { duration: 0.35 } };

  const restart = () => setCurrentScreen(0);
  const back = () => setCurrentScreen(s => Math.max(0, s - 1));

  return (
    <AppCtx.Provider value={{ onRestart: restart, onBack: back, currentScreen }}>
      <div className="font-sans">
        <AnimatePresence mode="wait">
          {currentScreen === 0  && <motion.div {...screenProps}><IntroScreen onNext={next} /></motion.div>}
          {currentScreen === 1  && <motion.div {...screenProps}><Screen1 onNext={next} /></motion.div>}
          {currentScreen === 2  && <motion.div {...screenProps}><Screen2 onNext={next} /></motion.div>}
          {currentScreen === 3  && <motion.div {...screenProps}><Screen3 onNext={next} /></motion.div>}
          {currentScreen === 4  && <motion.div {...screenProps}><Screen4 onNext={next} /></motion.div>}
          {currentScreen === 5  && <motion.div {...screenProps}><Screen5 onNext={next} /></motion.div>}
          {currentScreen === 6  && <motion.div {...screenProps}><Screen6 onNext={next} /></motion.div>}
          {currentScreen === 7  && <motion.div {...screenProps}><Screen7  onNext={next} /></motion.div>}
          {currentScreen === 8  && <motion.div {...screenProps}><Screen9  onNext={next} /></motion.div>}
          {currentScreen === 9  && <motion.div {...screenProps}><Screen10 onNext={next} /></motion.div>}
          {currentScreen === 10 && <motion.div {...screenProps}><Screen11 onNext={next} /></motion.div>}
          {currentScreen >= 11  && <motion.div {...screenProps}><FinalScreen onRestart={restart} /></motion.div>}
        </AnimatePresence>
      </div>
    </AppCtx.Provider>
  );
}

// ─── PASSWORD GATE ────────────────────────────────────────────────────────────

const WC_PASSWORD = 'IFM2026';
const WC_GATE_KEY = 'wc_unlocked';

function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(WC_GATE_KEY) === '1'; } catch (e) { return false; }
  });
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (value.trim().toLowerCase() === WC_PASSWORD.toLowerCase()) {
      try { sessionStorage.setItem(WC_GATE_KEY, '1'); } catch (err) {}
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  if (unlocked) return children;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'linear-gradient(160deg, #0d2540 0%, #1a3a5c 55%, #0e4d45 100%)' }}>
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'backOut' }}
        className="w-full max-w-xs">
        <div className="rounded-full border-4 overflow-hidden mx-auto mb-5"
          style={{ width: 72, height: 72, borderColor: '#c9a84c', background: '#fff' }}>
          <img src="ifm-logo-round.png" alt="Investing for Mummies" className="w-full h-full object-cover" />
        </div>
        <h1 className="font-serif text-white font-bold leading-tight" style={{ fontSize: '1.6rem' }}>The Wealth</h1>
        <h1 className="font-serif font-bold leading-tight mb-1" style={{ fontSize: '1.6rem', color: '#c9a84c' }}>Conversation</h1>
        <p className="font-sans text-xs tracking-widest uppercase mb-6" style={{ color: '#bde9e4', letterSpacing: '0.12em' }}>
          by Investing for Mummies
        </p>

        <p className="font-sans text-sm mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
          🔒 This experience is password protected.
        </p>

        <form onSubmit={submit}>
          <input
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false); }}
            placeholder="Enter password"
            autoFocus
            className="w-full font-sans text-center text-base py-3 px-4 rounded-xl mb-3 outline-none"
            style={{ background: 'rgba(255,255,255,0.95)', color: '#1a3a5c', border: error ? '2px solid #ef4444' : '2px solid transparent' }}
          />
          {error && (
            <p className="font-sans text-xs mb-3" style={{ color: '#fca5a5' }}>
              Incorrect password. Please try again.
            </p>
          )}
          <button type="submit"
            className="w-full font-sans font-bold text-base py-3 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e6c96a)', color: '#1a3a5c' }}>
            Unlock →
          </button>
        </form>

        <p className="font-sans text-xs mt-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Need access? Contact Investing for Mummies.
        </p>
      </motion.div>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<PasswordGate><App /></PasswordGate>);
