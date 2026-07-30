(() => {
  // ui-common.jsx
  var { useState, useEffect, useRef } = React;
  function Ornament({ word, style }) {
    return /* @__PURE__ */ React.createElement("div", { className: "orn", style }, /* @__PURE__ */ React.createElement("span", { className: "line" }), /* @__PURE__ */ React.createElement("span", { className: "di" }, "\u2756"), word && /* @__PURE__ */ React.createElement("span", { className: "word" }, word), /* @__PURE__ */ React.createElement("span", { className: "di" }, "\u2756"), /* @__PURE__ */ React.createElement("span", { className: "line r" }));
  }
  var _QRLib = window._QRLib;
  function QRCode({ size = 150 }) {
    const ref = useRef(null);
    useEffect(() => {
      if (!ref.current || !_QRLib) return;
      ref.current.innerHTML = "";
      const url = `https://ifm-deploy.vercel.app/swayamvar/?role=player&room=${window.SHAADI_CONFIG.roomCode}`;
      new _QRLib(ref.current, {
        text: url,
        width: size,
        height: size,
        colorDark: "#1c0a00",
        colorLight: "#ffffff",
        correctLevel: _QRLib.CorrectLevel.M
      });
    }, [size]);
    return /* @__PURE__ */ React.createElement("div", { ref, style: { lineHeight: 0, display: "inline-block", width: size, height: size } });
  }
  function RoomBadge({ dark = false, compact = false }) {
    const [zoom, setZoom] = useState(false);
    const qrSz = compact ? 76 : 108;
    const fg = dark ? "#fde68a" : "#1c0a00";
    const sub = dark ? "rgba(253,230,138,.7)" : "#78350f";
    useEffect(() => {
      if (!zoom) return;
      const onKey = (e) => {
        if (e.key === "Escape") setZoom(false);
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [zoom]);
    const bigSz = Math.min(
      Math.round(Math.min(window.innerHeight * 0.6, window.innerWidth * 0.8)),
      760
    );
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: () => setZoom(true),
        title: "Tap to enlarge the QR",
        style: {
          display: "flex",
          alignItems: "center",
          gap: compact ? 12 : 16,
          padding: compact ? "10px 12px" : "14px 18px",
          background: dark ? "rgba(10,0,0,.55)" : "#fff",
          border: `1.5px solid ${dark ? "rgba(251,191,36,.5)" : "#fbbf24"}`,
          borderRadius: 14,
          backdropFilter: dark ? "blur(4px)" : "none",
          boxShadow: dark ? "none" : "0 6px 20px rgba(28,10,0,.10)",
          cursor: "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "qr-wrap" }, /* @__PURE__ */ React.createElement(QRCode, { size: qrSz })),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } }, /* @__PURE__ */ React.createElement("span", { className: "caps", style: { fontSize: ".5rem", color: sub } }, "Scan to join \xB7 tap to enlarge"), /* @__PURE__ */ React.createElement("span", { className: "serif", style: { fontWeight: 600, fontSize: compact ? ".9rem" : "1.05rem", color: fg } }, window.SHAADI_CONFIG.joinUrl))
    ), zoom && /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: () => setZoom(false),
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          cursor: "pointer",
          background: "rgba(8,0,4,.94)",
          padding: "4vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "3vh"
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: "clamp(.7rem,2vw,1.05rem)", color: "#fbbf24", letterSpacing: ".3em" } }, "Scan to join the Swayamvar"),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          onClick: (e) => e.stopPropagation(),
          style: { background: "#fff", padding: "min(4vh,34px)", borderRadius: 24, boxShadow: "0 24px 90px rgba(0,0,0,.6)" }
        },
        /* @__PURE__ */ React.createElement("div", { className: "qr-wrap", style: { lineHeight: 0 } }, /* @__PURE__ */ React.createElement(QRCode, { size: bigSz }))
      ),
      /* @__PURE__ */ React.createElement("div", { className: "display", style: { fontSize: "clamp(1.4rem,4.5vw,2.8rem)", color: "#fde68a" } }, window.SHAADI_CONFIG.joinUrl),
      /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: "clamp(.55rem,1.6vw,.85rem)", color: "rgba(253,230,138,.7)", letterSpacing: ".2em" } }, "Tap anywhere to close \xB7 the game keeps running")
    ));
  }
  function MumChip({ name, color, small = false }) {
    const sz = small ? 34 : 44;
    return /* @__PURE__ */ React.createElement("div", { className: "mum-chip", style: { width: small ? 58 : 70 } }, /* @__PURE__ */ React.createElement("div", { style: { width: sz, height: sz, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `inset 0 0 0 2px #fff,inset 0 0 0 3.5px ${color}88,0 4px 12px rgba(28,10,0,.13)` } }, /* @__PURE__ */ React.createElement("span", { className: "serif", style: { fontWeight: 600, fontSize: small ? 0.76 : 0.92 + "rem", color: "#fff" } }, name[0])), /* @__PURE__ */ React.createElement("span", { style: { fontSize: small ? 0.58 : 0.65 + "rem", fontWeight: 700, color: small ? "#78350f" : "#78350f", whiteSpace: "nowrap" } }, name));
  }
  function VoteBar({ suitor, count, total, animate, rank }) {
    const pct = total > 0 ? Math.round(count / total * 100) : 0;
    const rankEmoji = ["\u{1F947}", "\u{1F948}", "\u{1F949}"][rank] || "";
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, rankEmoji && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.3rem" } }, rankEmoji), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.5rem" } }, suitor.monogram), /* @__PURE__ */ React.createElement("span", { className: "serif", style: { fontWeight: 600, fontSize: "1.3rem", color: "#1c0a00" } }, suitor.name)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { className: "display", style: { fontSize: "2rem", fontWeight: 700, color: suitor.accent } }, pct, "%"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: ".8rem", fontWeight: 800, color: "#78350f" } }, count, " voted"))), /* @__PURE__ */ React.createElement("div", { style: { height: 16, borderRadius: 999, background: "#fef3c7", overflow: "hidden", boxShadow: "inset 0 1px 3px rgba(0,0,0,.09)" } }, /* @__PURE__ */ React.createElement("div", { className: "grow-bar", style: {
      height: "100%",
      borderRadius: 999,
      width: animate ? pct + "%" : "0%",
      background: `linear-gradient(90deg,${suitor.accent},${suitor.accentLt})`,
      boxShadow: `0 2px 8px ${suitor.accent}66`
    } })));
  }
  function CountdownRing({ secondsLeft, total = 20, size = 90 }) {
    const r = (size - 10) / 2;
    const circ = 2 * Math.PI * r;
    const pct = Math.max(0, secondsLeft / total);
    const dash = circ * (1 - pct);
    const color = secondsLeft > 10 ? "#fbbf24" : secondsLeft > 5 ? "#fb923c" : "#ef4444";
    return /* @__PURE__ */ React.createElement("svg", { width: size, height: size, style: { display: "block" } }, /* @__PURE__ */ React.createElement("circle", { cx: size / 2, cy: size / 2, r, fill: "none", stroke: "rgba(255,255,255,.15)", strokeWidth: 8 }), /* @__PURE__ */ React.createElement(
      "circle",
      {
        className: "timer-ring",
        cx: size / 2,
        cy: size / 2,
        r,
        fill: "none",
        stroke: color,
        strokeWidth: 8,
        strokeLinecap: "round",
        strokeDasharray: circ,
        strokeDashoffset: dash,
        style: { transform: "rotate(-90deg)", transformOrigin: `${size / 2}px ${size / 2}px`, transition: "stroke-dashoffset .9s linear,stroke .3s ease" }
      }
    ), /* @__PURE__ */ React.createElement(
      "text",
      {
        x: size / 2,
        y: size / 2 + 1,
        textAnchor: "middle",
        dominantBaseline: "middle",
        style: { fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: size * 0.28 + "px", fill: color }
      },
      Math.ceil(secondsLeft)
    ));
  }
  function triggerConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const COLORS = ["#e11d48", "#d97706", "#fbbf24", "#0f766e", "#6b21a8", "#be185d", "#c2410c", "#fde68a"];
    const pieces = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      r: 4 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: (Math.random() - 0.5) * 6,
      vy: 3 + Math.random() * 5,
      spin: (Math.random() - 0.5) * 0.3,
      angle: Math.random() * Math.PI * 2,
      shape: Math.random() > 0.5 ? "rect" : "circle"
    }));
    let frame, t = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.r * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      t++;
      if (t < 220) frame = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (frame) cancelAnimationFrame(frame);
    draw();
  }
  window.triggerConfetti = triggerConfetti;
  function Petals() {
    return /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 } }, Array.from({ length: 14 }, (_, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
      position: "absolute",
      left: i * 7.3 + Math.sin(i * 1.9) * 4 + "%",
      top: "-8%",
      fontSize: ["1rem", "1.4rem", ".7rem", "1.2rem"][i % 4],
      opacity: 0.3,
      animation: `petalFall ${5 + i % 4 * 1.5}s linear ${i * 0.55}s infinite`
    } }, ["\u{1F338}", "\u{1F33A}", "\u2740", "\u{1F339}"][i % 4])), /* @__PURE__ */ React.createElement("style", null, `@keyframes petalFall{from{transform:translateY(-5vh) rotate(0deg);opacity:.4}to{transform:translateY(110vh) rotate(720deg);opacity:0}}`));
  }
  function SuitorDetailCard({ suitor, compact, style }) {
    return /* @__PURE__ */ React.createElement("div", { style: {
      position: "relative",
      borderRadius: 18,
      overflow: "hidden",
      background: suitor.cardBg,
      color: "#fff",
      boxShadow: "0 12px 40px rgba(0,0,0,.4)",
      border: "1.5px solid rgba(255,255,255,.15)",
      display: "flex",
      ...style
    } }, suitor.portrait && /* @__PURE__ */ React.createElement("div", { style: {
      flexShrink: 0,
      width: compact ? 108 : 162,
      position: "relative",
      overflow: "hidden",
      minHeight: compact ? 220 : 300
    } }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: suitor.portrait,
        alt: suitor.name,
        style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 0, right: 0, width: 48, height: "100%", background: "linear-gradient(90deg,transparent,rgba(0,0,0,.75))", pointerEvents: "none" } })), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: compact ? "14px 15px" : "20px 22px 20px", minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${suitor.accent}00,${suitor.accent},${suitor.accent}00)` } }), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { className: "serif", style: { fontWeight: 700, fontSize: compact ? "1rem" : "1.4rem", color: "#fff", lineHeight: 1.1 } }, suitor.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: compact ? ".74rem" : ".92rem", color: suitor.accentLt, fontStyle: "italic", marginTop: 3 } }, suitor.aka), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 7, marginTop: 7, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: compact ? ".64rem" : ".78rem", fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: suitor.accent + "44", border: `1px solid ${suitor.accent}88`, color: suitor.accentLt } }, "\u{1F4C8} ", suitor.returnLabel), /* @__PURE__ */ React.createElement("span", { style: { fontSize: compact ? ".64rem" : ".78rem", fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.22)", color: "rgba(255,255,255,.82)" } }, "\u26A1 ", suitor.riskLabel))), /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: { fontSize: compact ? ".86rem" : "1.12rem", color: "rgba(255,255,255,.92)", lineHeight: 1.4, marginBottom: 10, borderLeft: `3px solid ${suitor.accent}`, paddingLeft: 10 } }, '"', suitor.tagline, '"'), /* @__PURE__ */ React.createElement("p", { style: { fontSize: compact ? ".77rem" : "1.02rem", color: "rgba(255,255,255,.76)", lineHeight: 1.52, fontWeight: 600, marginBottom: compact ? 0 : 14 } }, suitor.bio), !compact && /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".56rem", color: "#86efac", marginBottom: 6 } }, "Green flags \u2665"), suitor.greenFlags.map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 5 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#4ade80", fontWeight: 900, fontSize: ".9rem", flexShrink: 0 } }, "\u2726"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: ".9rem", fontWeight: 700, color: "rgba(255,255,255,.85)", lineHeight: 1.3 } }, f)))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".56rem", color: "#fca5a5", marginBottom: 6 } }, "Red flags \u2726"), suitor.redFlags.map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 5 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#f87171", fontWeight: 900, fontSize: ".9rem", flexShrink: 0 } }, "\u2726"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: ".9rem", fontWeight: 700, color: "rgba(255,255,255,.85)", lineHeight: 1.3 } }, f)))))));
  }
  function SuitorBioCard({ suitor, variant = "both", style }) {
    const bc = suitor.bioCard || {};
    const both = variant === "both";
    const accent = suitor.accent || "#7c1d1d";
    const big = both;
    const F = (b, s) => big ? b : s;
    const _panelRef = useRef(null);
    const _contentRef = useRef(null);
    const [bioScale, setBioScale] = useState(1);
    React.useLayoutEffect(() => {
      const panel = _panelRef.current, content = _contentRef.current;
      if (!panel || !content) return;
      const maxS = both ? 2.4 : 1.04;
      const origin = both ? "center center" : "top center";
      const fit = () => {
        const avail = panel.clientHeight - 4;
        content.style.width = "100%";
        let nat = content.scrollHeight;
        if (!nat) return;
        let s = Math.max(0.55, Math.min(avail / nat, maxS));
        content.style.width = 100 / s + "%";
        nat = content.scrollHeight;
        s = Math.max(0.55, Math.min(avail / nat, maxS));
        content.style.width = 100 / s + "%";
        content.style.transform = "scale(" + s + ")";
        content.style.transformOrigin = origin;
        setBioScale(s);
      };
      fit();
      window.addEventListener("resize", fit);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
      return () => window.removeEventListener("resize", fit);
    }, [both, suitor]);
    const PANEL = "#f6ecd6";
    const INK = "#3a1d10";
    const MAROON = "#8a1c1c";
    const GOLD = "#a9761f";
    const FRAME = "linear-gradient(160deg,#350909,#4a0d0d)";
    function PortraitPanel({ v }) {
      const src = v === "f" ? suitor.portraitF : suitor.portraitM;
      const label = v === "f" ? "Female Suitor" : "Male Suitor";
      const name = v === "f" ? suitor.nameF : suitor.nameM;
      return /* @__PURE__ */ React.createElement("div", { style: {
        position: "relative",
        background: "#160303",
        flex: both ? "0 0 27%" : "0 0 auto",
        height: both ? "auto" : "44%",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        ...both ? v === "m" ? { borderRight: `3px solid ${GOLD}` } : { borderLeft: `3px solid ${GOLD}` } : {}
      } }, /* @__PURE__ */ React.createElement("div", { className: "caps", style: {
        flex: "0 0 auto",
        textAlign: "center",
        padding: "6px 4px",
        fontSize: F(".66rem", ".5rem"),
        fontWeight: 800,
        letterSpacing: ".18em",
        color: "#fcd34d",
        background: "rgba(0,0,0,.35)",
        borderBottom: `1px solid ${accent}66`
      } }, "\u2605 ", label, " \u2605"), /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 auto", position: "relative", overflow: "hidden", minHeight: 0 } }, /* @__PURE__ */ React.createElement(
        "img",
        {
          src,
          alt: name,
          style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: both ? "top center" : "center 22%", display: "block" }
        }
      ), bc.badge && /* @__PURE__ */ React.createElement("div", { style: {
        position: "absolute",
        top: 8,
        right: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "5px 8px",
        borderRadius: 9,
        background: "linear-gradient(145deg,#7f1d1d,#450a0a)",
        border: "1px solid rgba(252,211,77,.55)",
        boxShadow: "0 3px 10px rgba(0,0,0,.5)"
      } }, /* @__PURE__ */ React.createElement("span", { className: "caps", style: { fontSize: ".4rem", fontWeight: 800, color: "#fde68a", letterSpacing: ".06em", lineHeight: 1.15, textAlign: "center" } }, bc.badge.l1, /* @__PURE__ */ React.createElement("br", null), bc.badge.l2), /* @__PURE__ */ React.createElement("span", { style: {
        fontSize: ".52rem",
        fontWeight: 900,
        color: "#052e16",
        background: "#34d399",
        borderRadius: 999,
        padding: "1px 7px",
        marginTop: 1
      } }, bc.badge.tag))), /* @__PURE__ */ React.createElement("div", { style: {
        flex: "0 0 auto",
        textAlign: "center",
        padding: "8px 6px",
        background: "linear-gradient(0deg,#160303,rgba(22,3,3,.85))",
        borderTop: `1px solid ${accent}66`
      } }, /* @__PURE__ */ React.createElement("div", { className: "display", style: { fontSize: F("1.18rem", ".92rem"), color: "#fde68a", lineHeight: 1.1 } }, name), /* @__PURE__ */ React.createElement("div", { className: "serif ital", style: { fontSize: F(".78rem", ".62rem"), color: "rgba(253,230,138,.7)", marginTop: 2 } }, "\u201C", bc.tagline, "\u201D")));
    }
    const Section = ({ icon, title, children, flush }) => /* @__PURE__ */ React.createElement("div", { style: { marginBottom: flush ? 0 : F(3, 6) } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 7, marginBottom: F(3, 3) } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: F("clamp(.8rem,1.95vh,1.12rem)", ".92rem") } }, icon), /* @__PURE__ */ React.createElement("span", { className: "caps", style: { fontSize: F("clamp(.54rem,1.35vh,.8rem)", ".56rem"), fontWeight: 800, color: MAROON, letterSpacing: ".08em" } }, title)), children);
    const Divider = () => /* @__PURE__ */ React.createElement("div", { style: { height: 1, background: `linear-gradient(90deg,transparent,${GOLD}66,transparent)`, margin: F("3px 0", "6px 0") } });
    const FlagList = ({ items, ok }) => /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: F(6, 3) } }, (items || []).map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: F(8, 6), alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("span", { style: { flexShrink: 0, fontWeight: 900, fontSize: F("clamp(.84rem,2.05vh,1.28rem)", ".78rem"), color: ok ? "#15803d" : "#b91c1c", lineHeight: 1.25 } }, ok ? "\u2714" : "\u2718"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: F("clamp(.8rem,1.95vh,1.22rem)", ".74rem"), fontWeight: 700, color: INK, lineHeight: 1.25 } }, f))));
    return /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      flexDirection: both ? "row" : "column",
      height: "100%",
      width: both ? "100%" : void 0,
      maxWidth: "100%",
      borderRadius: 16,
      overflow: "hidden",
      background: FRAME,
      border: `2px solid ${accent}`,
      boxShadow: "0 12px 44px rgba(0,0,0,.45)",
      ...style
    } }, (both || variant === "m") && /* @__PURE__ */ React.createElement(PortraitPanel, { v: "m" }), /* @__PURE__ */ React.createElement("div", { ref: _panelRef, className: "scroll", style: {
      flex: "1 1 auto",
      minWidth: 0,
      minHeight: 0,
      overflow: "hidden",
      background: PANEL,
      color: INK,
      padding: both ? "8px 22px" : "12px 14px",
      display: "flex",
      flexDirection: "column",
      justifyContent: both ? "center" : "flex-start",
      alignItems: "center"
    } }, /* @__PURE__ */ React.createElement("div", { ref: _contentRef, style: {
      width: 100 / bioScale + "%",
      transform: `scale(${bioScale})`,
      transformOrigin: both ? "center center" : "top center"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      textAlign: "center",
      marginBottom: F(5, 7),
      padding: F("6px 12px", "7px 10px"),
      borderRadius: 12,
      background: "linear-gradient(145deg,#5a0e0e,#3a0808)",
      border: `1px solid ${GOLD}`,
      boxShadow: both ? "0 5px 20px rgba(0,0,0,.4)" : "none"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: F("clamp(.66rem,1.5vh,.85rem)", ".66rem"), marginBottom: 1 } }, "\u{1F338} \u2740 \u{1F338}"), /* @__PURE__ */ React.createElement("div", { className: "display", style: { fontSize: F("clamp(.96rem,2.7vh,1.62rem)", "1.28rem"), color: "#fde68a", lineHeight: 1.05 } }, both ? `Mr. / Miss ${suitor.nameNeutral}` : variant === "f" ? suitor.nameF : suitor.nameM), /* @__PURE__ */ React.createElement("div", { className: "serif ital", style: { fontSize: F("clamp(.68rem,1.6vh,1.0rem)", ".78rem"), color: "rgba(253,230,138,.82)", marginTop: 2 } }, "\u201C", bc.tagline, "\u201D")), /* @__PURE__ */ React.createElement(Section, { icon: "\u{1F9D1}\u200D\u{1F4BC}", title: "Occupation" }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: F("clamp(.68rem,1.7vh,1.05rem)", ".82rem"), fontWeight: 700, color: INK, paddingLeft: 2 } }, bc.occupation)), /* @__PURE__ */ React.createElement(Divider, null), /* @__PURE__ */ React.createElement(Section, { icon: suitor.monogram, title: "Bio" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: F(2, 1), paddingLeft: 2 } }, (bc.bio || []).map((line, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: F("clamp(.64rem,1.5vh,1.0rem)", ".8rem"), fontWeight: 600, color: INK, lineHeight: 1.24 } }, line)))), /* @__PURE__ */ React.createElement(Divider, null), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: F(14, 14) } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: "rgba(21,128,61,.09)",
      border: "1px solid rgba(21,128,61,.3)",
      borderLeft: "5px solid #15803d",
      borderRadius: 11,
      padding: F("7px 12px", "8px 10px")
    } }, /* @__PURE__ */ React.createElement(Section, { icon: "\u{1F49A}", title: "Green Flags", flush: true }, /* @__PURE__ */ React.createElement(FlagList, { items: bc.strengths, ok: true }))), /* @__PURE__ */ React.createElement("div", { style: {
      background: "rgba(185,28,28,.09)",
      border: "1px solid rgba(185,28,28,.3)",
      borderLeft: "5px solid #b91c1c",
      borderRadius: 11,
      padding: F("7px 12px", "8px 10px")
    } }, /* @__PURE__ */ React.createElement(Section, { icon: "\u{1F6A9}", title: "Red Flags", flush: true }, /* @__PURE__ */ React.createElement(FlagList, { items: bc.redFlags })))), /* @__PURE__ */ React.createElement(Divider, null), /* @__PURE__ */ React.createElement(Section, { icon: "\u{1F4AC}", title: "Friends Say" }, /* @__PURE__ */ React.createElement("div", { className: "serif ital", style: { fontSize: F("clamp(.7rem,1.65vh,1.04rem)", ".82rem"), color: MAROON, lineHeight: 1.32, paddingLeft: 2 } }, "\u201C", bc.friendsSay, "\u201D")), /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: F(5, 7),
      padding: F("6px 12px", "7px 12px"),
      borderRadius: 11,
      textAlign: "center",
      background: "linear-gradient(145deg,#3a0808,#5a0e0e)",
      border: `1px solid ${GOLD}`,
      boxShadow: both ? "0 5px 20px rgba(0,0,0,.4)" : "none"
    } }, /* @__PURE__ */ React.createElement("span", { className: "caps", style: { fontSize: F(".56rem", ".46rem"), fontWeight: 800, color: "rgba(253,230,138,.7)", letterSpacing: ".14em" } }, "What this represents"), /* @__PURE__ */ React.createElement("div", { className: "display", style: { fontSize: F("clamp(.86rem,2.1vh,1.32rem)", "1.05rem"), color: "#fde68a", marginTop: 1 } }, suitor.monogram, " ", bc.represents)))), (both || variant === "f") && /* @__PURE__ */ React.createElement(PortraitPanel, { v: "f" }));
  }
  function LockOverlay({ roundId, onReveal }) {
    const revealBtn = /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn-wedding",
        onClick: onReveal,
        style: { marginTop: 32, fontSize: "1rem", padding: "14px 44px" }
      },
      "Reveal Results \u2192"
    );
    if (roundId === "marry") return /* @__PURE__ */ React.createElement("div", { className: "lock-overlay lock-wedding" }, /* @__PURE__ */ React.createElement(Petals, null), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", zIndex: 1, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { className: "bell" }, "\u{1F514}"), /* @__PURE__ */ React.createElement("h2", { className: "display", style: { color: "#fff", fontSize: "3rem", marginTop: 16 } }, "Votes Sealed!"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "3rem", marginTop: 8 } }, "\u{1F48D}"), /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: { color: "rgba(253,230,138,.9)", fontSize: "1.2rem", marginTop: 10 } }, "The rishtas have been considered\u2026"), revealBtn));
    if (roundId === "date") return /* @__PURE__ */ React.createElement("div", { className: "lock-overlay lock-hearts", style: { overflow: "hidden" } }, Array.from({ length: 16 }, (_, i) => /* @__PURE__ */ React.createElement("span", { key: i, className: "heart-float", style: {
      left: 5 + i * 6.2 + "%",
      animationDuration: 0.9 + Math.random() * 1.4 + "s",
      animationDelay: Math.random() * 1.2 + "s",
      fontSize: 1.5 + Math.random() * 2 + "rem"
    } }, "\u2764\uFE0F")), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", zIndex: 1, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "5rem" } }, "\u2764\uFE0F"), /* @__PURE__ */ React.createElement("h2", { className: "display", style: { color: "#fff", fontSize: "3rem", marginTop: 14 } }, "Votes Sealed!"), /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: { color: "rgba(255,200,220,.9)", fontSize: "1.2rem", marginTop: 10 } }, "See who stole the most hearts\u2026"), revealBtn));
    if (roundId === "mum") return /* @__PURE__ */ React.createElement("div", { className: "lock-overlay lock-whatsapp" }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { className: "notif-bar", style: { marginBottom: 20, display: "inline-block" } }, `\u{1F4F1} Mum: "Beta, I've found someone perfect for your money!"`), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { className: "stamp", style: { fontSize: "4rem", border: "6px solid #22c55e", borderRadius: 12, padding: "8px 20px", display: "inline-block", color: "#22c55e", fontWeight: 900, letterSpacing: ".1em", fontFamily: "Nunito,sans-serif" } }, "APPROVED \u2713"), /* @__PURE__ */ React.createElement("h2", { className: "display", style: { color: "#fff", fontSize: "2.6rem", marginTop: 20 } }, "Votes Sealed!"), /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: { color: "rgba(200,255,200,.85)", fontSize: "1.1rem", marginTop: 8 } }, "Mother knows best (apparently)."), revealBtn));
    if (roundId === "emergency") return /* @__PURE__ */ React.createElement("div", { className: "lock-overlay lock-phone" }, /* @__PURE__ */ React.createElement("div", { style: { position: "relative", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 140, height: 140 } }, /* @__PURE__ */ React.createElement("div", { className: "call-pulse" }), /* @__PURE__ */ React.createElement("div", { className: "call-pulse" }), /* @__PURE__ */ React.createElement("div", { className: "call-pulse" }), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", zIndex: 1, width: 90, height: 90, borderRadius: "50%", background: "#1c3f6e", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("span", { className: "phone-ring", style: { fontSize: "2.5rem" } }, "\u{1F4DE}"))), /* @__PURE__ */ React.createElement("h2", { className: "display", style: { color: "#fff", fontSize: "2.8rem", marginTop: 20 } }, "Votes Sealed!"), /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: { color: "rgba(150,200,255,.9)", fontSize: "1.1rem", marginTop: 10 } }, "Connecting your emergency contact\u2026"), revealBtn));
    return null;
  }
  Object.assign(window, {
    Ornament,
    QRCode,
    RoomBadge,
    MumChip,
    VoteBar,
    CountdownRing,
    Petals,
    SuitorDetailCard,
    SuitorBioCard,
    LockOverlay
  });
})();
