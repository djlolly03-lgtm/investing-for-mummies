(() => {
  // host-view.jsx
  var { useState: uS, useEffect: uE, useRef: uR } = React;
  var VOTE_WISECRACKS = [
    "has made her decision \u{1F485}",
    "voted. Will not elaborate. \u{1F910}",
    "has sealed her fate \u{1F48C}",
    "voted faster than expected \u{1F440}",
    "has chosen\u2026 but isn't telling \u{1F92B}",
    "has given her verdict \u2696\uFE0F",
    "maan gayi! \u{1F38A}",
    "se bol diya \u{1F5F3}\uFE0F",
    "filed her biodata preference \u{1F4DC}",
    "is ready to commit \u{1F48D}",
    "has consulted the stars \u2B50",
    "ne soch liya \u{1F9E0}"
  ];
  function HostCover({ onOpen }) {
    return /* @__PURE__ */ React.createElement("div", { className: "screen bg-bfiw-dark bfiw-screen fade", style: { alignItems: "center", justifyContent: "center", padding: "4vh 4vw", position: "relative", overflow: "hidden" } }, /* @__PURE__ */ React.createElement(Petals, null), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(155,28,28,.35) 0%,transparent 70%)", pointerEvents: "none" } }), /* @__PURE__ */ React.createElement("div", { className: "invite invite-bfiw fade", style: {
      position: "relative",
      zIndex: 1,
      textAlign: "center",
      background: "linear-gradient(160deg,rgba(100,0,28,.55),rgba(8,0,0,.78))",
      backdropFilter: "blur(16px)",
      padding: "clamp(44px,7vh,90px) clamp(44px,9vw,130px)",
      maxWidth: 1020,
      width: "100%"
    } }, /* @__PURE__ */ React.createElement("span", { className: "corner tl", style: { fontSize: "1.4rem" } }, "\u2766"), /* @__PURE__ */ React.createElement("span", { className: "corner tr", style: { fontSize: "1.4rem" } }, "\u2766"), /* @__PURE__ */ React.createElement("span", { className: "corner bl", style: { fontSize: "1.4rem" } }, "\u2766"), /* @__PURE__ */ React.createElement("span", { className: "corner br", style: { fontSize: "1.4rem" } }, "\u2766"), /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".65rem", color: "#fbbf24", marginBottom: 28, letterSpacing: ".4em" } }, "Investing for Mummies \xB7 cordially presents"), /* @__PURE__ */ React.createElement("h1", { className: "display", style: { color: "#fbbf24", fontSize: "clamp(3.4rem,9vw,7rem)", fontWeight: 700, lineHeight: 0.92, textShadow: "0 4px 40px rgba(155,28,28,.6)" } }, "Swayamvar"), /* @__PURE__ */ React.createElement("div", { className: "display ital", style: { color: "#fde68a", fontSize: "clamp(2rem,4.5vw,3.6rem)", marginTop: 6 } }, "for your Money"), /* @__PURE__ */ React.createElement(Ornament, { word: "est. 1995", style: { margin: "32px auto 28px", maxWidth: 520 } }), /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: { color: "rgba(253,230,138,.92)", fontSize: "clamp(1.1rem,2.2vw,1.65rem)", fontWeight: 500, lineHeight: 1.45 } }, "Six prospects. Four questions. One portfolio."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "clamp(1rem,2vw,1.5rem)", letterSpacing: "0.22em", margin: "22px 0 4px", opacity: 0.9 } }, "\u{1F338}\u{1FA94}\u{1F33C}\u{1FA94}\u{1F338}\u{1FA94}\u{1F33C}\u{1FA94}\u{1F338}\u{1FA94}\u{1F33C}\u{1FA94}\u{1F338}"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, justifyContent: "center", marginTop: 20 } }, /* @__PURE__ */ React.createElement("button", { className: "btn-wedding", style: { fontSize: "1.1rem", padding: "18px 56px" }, onClick: onOpen }, "Open the Swayamvar \xA0\u{1F48D}"))));
  }
  function HostLobby({ state, onContinue }) {
    const players = Object.values(state.players || {});
    const enough = players.length >= 1;
    return /* @__PURE__ */ React.createElement("div", { className: "screen bg-bfiw-ivory bfiw-screen fade", style: { padding: "4vh 4vw" } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", flex: "0 0 auto" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "clamp(.8rem,1.5vw,1.1rem)", letterSpacing: "0.2em", marginBottom: 4, opacity: 0.85 } }, "\u{1F33C}\u{1FA94}\u{1F338}\u{1FA94}\u{1F33C}\u{1FA94}\u{1F338}\u{1FA94}\u{1F33C}\u{1FA94}\u{1F338}\u{1FA94}\u{1F33C}"), /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".6rem", color: "#b45309" } }, "The Workshop \xB7 Matchmaking Round"), /* @__PURE__ */ React.createElement("h2", { className: "display", style: { fontSize: "clamp(3.2rem,6vw,5.2rem)", color: "#9b1c1c", marginTop: 4, textShadow: "0 2px 12px rgba(155,28,28,.25)" } }, "The Swayamvar is Open"), /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: { color: "#78350f", fontSize: "clamp(1rem,2vw,1.4rem)", marginTop: 4 } }, "Scan the card \u2014 we'll wait for everyone to be seated.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 40, alignItems: "stretch", justifyContent: "center", flex: "1 1 auto", flexWrap: "nowrap", marginTop: 28, minHeight: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "invite", style: { background: "#fff", padding: "30px 34px", textAlign: "center", boxShadow: "0 16px 50px rgba(28,10,0,.12)", flex: "0 0 auto", alignSelf: "center" } }, /* @__PURE__ */ React.createElement("span", { className: "corner tl", style: { fontSize: "1rem", color: "#e11d48" } }, "\u2766"), /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".55rem", color: "#b45309", marginBottom: 16 } }, "Scan to take your seat"), /* @__PURE__ */ React.createElement("div", { className: "qr-wrap", style: { display: "inline-block" } }, /* @__PURE__ */ React.createElement(QRCode, { size: 333 })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 16 } }, /* @__PURE__ */ React.createElement("div", { className: "serif", style: { fontSize: "1.1rem", color: "#9b1c1c", fontWeight: 600 } }, window.SHAADI_CONFIG.joinUrl))), /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 420px", maxWidth: 680, alignSelf: "stretch", display: "flex", flexDirection: "column", minHeight: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16 } }, /* @__PURE__ */ React.createElement("span", { className: "display", style: { fontSize: "3.2rem", fontWeight: 700, color: "#9b1c1c" } }, players.length), /* @__PURE__ */ React.createElement("span", { className: "serif", style: { fontSize: "1.2rem", color: "#78350f" } }, players.length === 1 ? "guest" : "guests", " seated"), /* @__PURE__ */ React.createElement("span", { className: "pulse-dot", style: { marginLeft: "auto", fontSize: ".78rem", fontWeight: 800, color: "#b45309" } }, "\u25CF welcoming\u2026")), players.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".75rem", color: "#78350f", fontStyle: "italic", marginBottom: 8, fontWeight: 600 } }, players[players.length - 1].titleEmoji, " ", players[players.length - 1].displayName || players[players.length - 1].name, " ", players[players.length - 1].titleAction), /* @__PURE__ */ React.createElement("div", { className: "scroll", style: { display: "flex", flexDirection: "column", gap: 8, flex: "1 1 auto", minHeight: 0, overflowY: "auto", paddingRight: 4 } }, players.map((p) => /* @__PURE__ */ React.createElement("div", { key: p.id, className: "chip-pop", style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 18px 10px 10px",
      borderRadius: 14,
      background: "#fff",
      border: `2px solid ${p.color}`,
      boxShadow: `0 2px 12px ${p.color}40`
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 40,
      height: 40,
      borderRadius: "50%",
      flexShrink: 0,
      overflow: "hidden",
      background: p.color,
      border: `2px solid ${p.color}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    } }, p.titleImg ? /* @__PURE__ */ React.createElement("img", { src: p.titleImg, alt: "", style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" } }) : /* @__PURE__ */ React.createElement("span", { style: { color: "#fff", fontSize: ".85rem", fontWeight: 900 } }, (p.name || "?")[0].toUpperCase())), /* @__PURE__ */ React.createElement("div", { style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".78rem", color: "#a16207", fontWeight: 700, letterSpacing: ".04em", marginBottom: 1 } }, p.name), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 7 } }, p.titleEmoji && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.25rem" } }, p.titleEmoji), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: "1.08rem", color: "#1c0a00", whiteSpace: "nowrap" } }, p.displayName || p.name)), p.titleAction && /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".85rem", color: "#78350f", fontStyle: "italic", marginTop: 1 } }, p.titleAction)))), !players.length && /* @__PURE__ */ React.createElement("span", { className: "serif ital", style: { color: "#a16207", opacity: 0.6 } }, "The hall is still empty\u2026")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 22, padding: "14px 18px", background: "rgba(155,28,28,.06)", borderRadius: 12, border: "1px solid rgba(155,28,28,.14)" } }, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".48rem", color: "#b45309", marginBottom: 8 } }, "Tonight's game"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".88rem", fontWeight: 700, color: "#78350f", lineHeight: 1.5 } }, "6 prospects \xB7 4 rounds \xB7 Grand finale bucket reveal")))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", flex: "0 0 auto", marginTop: 12 } }, /* @__PURE__ */ React.createElement("button", { className: "btn-wedding", disabled: !enough, onClick: enough ? onContinue : void 0, style: { fontSize: "1.05rem", padding: "16px 52px" } }, "Meet the Suitors \xA0\u2192"), !enough && /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".75rem", color: "#78350f", marginTop: 8, fontWeight: 700 } }, "Waiting for at least 1 guest to join\u2026")));
  }
  function HostGallery({ state, onBegin }) {
    const idx = state?.galleryIndex || 0;
    const suitor = window.SUITORS[idx];
    const isLast = idx >= window.SUITORS.length - 1;
    return /* @__PURE__ */ React.createElement("div", { className: "screen bg-bfiw-ivory bfiw-screen fade", style: { padding: "2.5vh 3vw", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".58rem", color: "#b45309" } }, "Speed Dating \xB7 The Biodata Folder"), /* @__PURE__ */ React.createElement("h2", { className: "display", style: { fontSize: "clamp(2rem,4vw,3.2rem)", color: "#9b1c1c", marginTop: 2 } }, "Meet the Suitors")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".52rem", color: "#9b1c1c", fontWeight: 800 } }, idx + 1, " of ", window.SUITORS.length), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, window.SUITORS.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: s.id, style: {
      width: i === idx ? 28 : 9,
      height: 9,
      borderRadius: 999,
      background: i < idx ? "#0f766e" : i === idx ? s.accent : "rgba(28,10,0,.15)",
      transition: "all .35s ease",
      boxShadow: i === idx ? `0 2px 8px ${s.accent}88` : "none"
    } }))))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 20, flex: "1 1 auto", minHeight: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minHeight: 0, display: "flex", alignItems: "stretch", justifyContent: "center" } }, /* @__PURE__ */ React.createElement(window.SuitorBioCard, { suitor, variant: "both", style: { maxWidth: 1480 } })), /* @__PURE__ */ React.createElement("div", { style: { flex: "0 0 186px", display: "flex", flexDirection: "column", gap: 7, overflowY: "auto", minHeight: 0 } }, idx > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".43rem", color: "#0f766e", marginBottom: 1 } }, "\u2713 Introduced"), window.SUITORS.slice(0, idx).map((s) => /* @__PURE__ */ React.createElement("div", { key: s.id, style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "9px 11px",
      borderRadius: 11,
      background: s.cardBg,
      border: `1px solid ${s.accent}55`,
      opacity: 0.75
    } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.2rem" } }, s.monogram), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700, fontSize: ".78rem", color: "#fff", lineHeight: 1.2 } }, s.nameNeutral))), /* @__PURE__ */ React.createElement("div", { style: { height: 1, background: "rgba(28,10,0,.12)", margin: "3px 0" } })), !isLast && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".43rem", color: "#b45309", marginBottom: 1 } }, "Up next"), window.SUITORS.slice(idx + 1).map((s) => /* @__PURE__ */ React.createElement("div", { key: s.id, style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "9px 11px",
      borderRadius: 11,
      background: "rgba(28,10,0,.05)",
      border: "1px solid rgba(28,10,0,.1)",
      opacity: 0.5
    } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.2rem", filter: "grayscale(1)" } }, s.monogram), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700, fontSize: ".78rem", color: "#78350f", lineHeight: 1.2 } }, s.nameNeutral)))), isLast && /* @__PURE__ */ React.createElement("div", { style: {
      padding: "14px 12px",
      borderRadius: 12,
      textAlign: "center",
      background: "rgba(155,28,28,.08)",
      border: "1px solid rgba(155,28,28,.25)"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "1.6rem", marginBottom: 6 } }, "\u{1F38A}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".75rem", fontWeight: 800, color: "#9b1c1c", lineHeight: 1.3 } }, "All suitors introduced!"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".65rem", color: "#78350f", marginTop: 4 } }, "Ready to begin.")))), /* @__PURE__ */ React.createElement("div", { style: { flex: "0 0 auto", textAlign: "center", marginTop: 14, display: "flex", gap: 12, justifyContent: "center", alignItems: "center" } }, !isLast ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "btn-wedding", onClick: () => window.Shaadi.advanceGallery(), style: { fontSize: "1.05rem", padding: "16px 48px" } }, "Next Suitor \xA0\u2192"), /* @__PURE__ */ React.createElement("button", { onClick: onBegin, style: { fontSize: ".82rem", padding: "10px 24px", background: "transparent", color: "rgba(120,53,15,.65)", border: "1.5px solid rgba(120,53,15,.3)", borderRadius: 10, fontWeight: 700, cursor: "pointer", letterSpacing: ".02em" } }, "Skip \u2014 Begin Voting")) : /* @__PURE__ */ React.createElement("button", { className: "btn-wedding", onClick: onBegin, style: { fontSize: "1.1rem", padding: "16px 60px" } }, "Begin the Matchmaking \xA0\u{1F48D}")));
  }
  function HostRoundIntro({ state, onOpenVoting }) {
    const round = window.ROUNDS[state.roundIndex];
    const players = Object.values(state.players || {});
    return /* @__PURE__ */ React.createElement("div", { className: "screen bg-bfiw-dark bfiw-screen fade", style: { padding: "2vh 4vw", overflow: "hidden" } }, /* @__PURE__ */ React.createElement(Petals, null), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", flex: "0 0 auto", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "5px 14px", borderRadius: 999, background: "rgba(251,191,36,.18)", border: "1px solid rgba(251,191,36,.4)" } }, /* @__PURE__ */ React.createElement("span", { className: "caps", style: { fontSize: ".7rem", color: "#fbbf24" } }, "Round ", round.number, " of ", window.ROUNDS.length)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4 } }, window.ROUNDS.map((_, i) => /* @__PURE__ */ React.createElement("span", { key: i, className: "progress-dot", style: {
      width: i === state.roundIndex ? 24 : 8,
      background: i < state.roundIndex ? "#0f766e" : i === state.roundIndex ? "#fbbf24" : "rgba(251,191,36,.25)"
    } })))), /* @__PURE__ */ React.createElement(RoomBadge, { dark: true, compact: true })), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", zIndex: 1, textAlign: "center", flex: "0 0 auto", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "clamp(.75rem,1.4vw,1rem)", letterSpacing: "0.18em", marginBottom: 6, opacity: 0.7 } }, "\u{1F338}\u{1FA94}\u{1F33C}\u{1FA94}\u{1F338}\u{1FA94}\u{1F33C}\u{1FA94}\u{1F338}\u{1FA94}\u{1F33C}\u{1FA94}\u{1F338}\u{1FA94}\u{1F33C}\u{1FA94}\u{1F338}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "clamp(2.2rem,5vw,4rem)", marginBottom: 6, filter: "drop-shadow(0 4px 20px rgba(255,255,255,.2))" } }, round.emoji), /* @__PURE__ */ React.createElement("h2", { className: "display", style: { color: "#fff", fontSize: "clamp(2.2rem,5vw,4rem)", fontWeight: 700, lineHeight: 0.95, textShadow: "0 4px 40px rgba(0,0,0,.5)" } }, round.question), /* @__PURE__ */ React.createElement("div", { style: { margin: "8px auto 0", maxWidth: 620 } }, round.subtitle.split("\n").map((line, i) => /* @__PURE__ */ React.createElement("p", { key: i, className: "serif ital", style: { color: "rgba(253,230,138,.9)", fontSize: "clamp(1.1rem,2vw,1.6rem)", lineHeight: 1.35, fontWeight: 500 } }, line))), /* @__PURE__ */ React.createElement(Ornament, { style: { maxWidth: 360, margin: "6px auto 0" } })), /* @__PURE__ */ React.createElement("div", { className: "scroll", style: {
      position: "relative",
      zIndex: 1,
      flex: "1 1 auto",
      minHeight: 0,
      maxWidth: 1040,
      width: "100%",
      margin: "0 auto",
      borderRadius: 14,
      overflowY: "auto",
      boxShadow: "0 8px 48px rgba(0,0,0,.55)",
      border: "1.5px solid rgba(251,191,36,.25)",
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 8,
      padding: 10,
      background: "rgba(0,0,0,.25)"
    } }, window.SUITORS.map((s) => /* @__PURE__ */ React.createElement("div", { key: "m" + s.id, style: { borderRadius: 8, overflow: "hidden", border: "1.5px solid rgba(125,211,252,.3)" } }, /* @__PURE__ */ React.createElement("img", { src: s.cardM, alt: s.nameNeutral, style: { width: "100%", height: "auto", display: "block" } }))), window.SUITORS.map((s) => /* @__PURE__ */ React.createElement("div", { key: "f" + s.id, style: { borderRadius: 8, overflow: "hidden", border: "1.5px solid rgba(249,168,212,.3)" } }, /* @__PURE__ */ React.createElement("img", { src: s.cardF, alt: s.nameNeutral, style: { width: "100%", height: "auto", display: "block" } })))), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", zIndex: 1, flex: "0 0 auto", textAlign: "center", paddingTop: 10 } }, /* @__PURE__ */ React.createElement("button", { className: "btn-gold", style: { fontSize: "1.1rem", padding: "16px 56px" }, onClick: onOpenVoting }, "Open Voting \xA0\u{1F5F3}\uFE0F"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, fontSize: ".72rem", color: "rgba(253,230,138,.5)", fontWeight: 700 } }, players.length, " guest", players.length !== 1 ? "s" : "", " ready to vote")));
  }
  function VoteSuitorTile({ suitor, variant, accent }) {
    const port = variant === "m" ? suitor.portraitM : suitor.portraitF;
    const honorific = variant === "m" ? "Mr." : "Miss";
    const tag = suitor.bioCard && suitor.bioCard.tagline || suitor.tagline || "";
    return /* @__PURE__ */ React.createElement("div", { style: {
      borderRadius: 10,
      overflow: "hidden",
      border: `1.5px solid ${accent}59`,
      boxShadow: "0 3px 14px rgba(0,0,0,.45)",
      background: "linear-gradient(165deg,rgba(60,0,16,.5),rgba(8,0,0,.7))",
      display: "flex",
      flexDirection: "column",
      minHeight: 0
    } }, /* @__PURE__ */ React.createElement("div", { style: { width: "100%", aspectRatio: "1 / 1", overflow: "hidden", background: "#1a0606" } }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: port,
        alt: suitor.nameNeutral,
        style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 24%", display: "block" }
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { padding: "6px 8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { className: "display", style: { fontSize: ".92rem", color: "#fde68a", lineHeight: 1.05 } }, honorific, " ", suitor.nameNeutral), tag && /* @__PURE__ */ React.createElement("div", { className: "serif ital", style: { fontSize: ".62rem", color: `${accent}cc`, lineHeight: 1.2, marginTop: 2 } }, tag)));
  }
  function HostVoting({ state, onForceClose }) {
    const round = window.ROUNDS[state.roundIndex];
    const players = Object.values(state.players || {});
    const roundVotes = (state.votes || {})[round.id] || {};
    const votedCount = Object.keys(roundVotes).length;
    const allVoted = players.length > 0 && votedCount >= players.length;
    const [votePopup, setVotePopup] = uS(null);
    const popupTimer = uR(null);
    const prevVotes = uR(null);
    uE(() => {
      if (prevVotes.current === null) {
        prevVotes.current = { ...roundVotes };
        return;
      }
      const newcomer = players.find((p) => roundVotes[p.id] && !prevVotes.current[p.id]);
      if (newcomer) {
        setVotePopup(newcomer);
        clearTimeout(popupTimer.current);
        popupTimer.current = setTimeout(() => setVotePopup(null), 3e3);
      }
      prevVotes.current = { ...roundVotes };
    }, [votedCount]);
    const popupLine = (p) => {
      const suitor = window.SUITORS.find((s) => s.id === roundVotes[p.id]);
      const pick = suitor ? suitor.nameNeutral : "someone";
      const verb = {
        marry: `said "I do" to ${pick}`,
        date: `is swiping right on ${pick}`,
        mum: `gives ${pick} the family seal`,
        emergency: `is calling ${pick} at 2 AM`
      }[round.id] || `has chosen ${pick}`;
      const emoji = { marry: "\u{1F48D}", date: "\u2764\uFE0F", mum: "\u{1F4F2}", emergency: "\u{1F4DE}" }[round.id] || "\u{1F38A}";
      return `${verb} ${emoji}`;
    };
    return /* @__PURE__ */ React.createElement("div", { className: "screen bg-bfiw-dark bfiw-screen fade", style: { padding: "2.5vh 3vw", overflow: "hidden" } }, votePopup && /* @__PURE__ */ React.createElement("div", { key: votedCount, style: {
      position: "absolute",
      top: "9vh",
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      zIndex: 999,
      pointerEvents: "none"
    } }, /* @__PURE__ */ React.createElement("style", null, `@keyframes votePopIn{from{opacity:0;transform:scale(.72) translateY(-18px)}to{opacity:1;transform:scale(1) translateY(0)}}`), /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 34,
      background: "linear-gradient(135deg,rgba(80,0,22,.97),rgba(6,0,0,.98))",
      border: "3.5px solid rgba(251,191,36,.8)",
      borderRadius: 34,
      padding: "34px 48px",
      minWidth: 560,
      maxWidth: 780,
      boxShadow: "0 32px 110px rgba(0,0,0,.9),0 0 0 1px rgba(251,191,36,.14)",
      animation: "votePopIn .38s cubic-bezier(.34,1.56,.64,1) both",
      pointerEvents: "auto"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 160,
      height: 160,
      borderRadius: "50%",
      overflow: "hidden",
      flexShrink: 0,
      border: `5px solid ${votePopup.color}`,
      boxShadow: `0 0 56px ${votePopup.color}88`
    } }, votePopup.titleImg ? /* @__PURE__ */ React.createElement("img", { src: votePopup.titleImg, alt: "", style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" } }) : /* @__PURE__ */ React.createElement("div", { style: { width: "100%", height: "100%", background: votePopup.color, display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#fff", fontWeight: 900, fontSize: "3.6rem" } }, (votePopup.name || "?")[0]))), /* @__PURE__ */ React.createElement("div", { style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { color: "rgba(251,191,36,.6)", fontSize: ".7rem", letterSpacing: ".22em", marginBottom: 6 } }, votePopup.name), /* @__PURE__ */ React.createElement("div", { className: "display", style: { color: "#fde68a", fontSize: "2.5rem", fontWeight: 700, lineHeight: 1.1 } }, votePopup.titleEmoji, " ", votePopup.displayName || votePopup.name), /* @__PURE__ */ React.createElement("div", { className: "serif ital", style: { color: "rgba(251,191,36,.9)", fontSize: "1.45rem", marginTop: 10, lineHeight: 1.3 } }, popupLine(votePopup))))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: "0 0 auto", gap: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".72rem", color: "#fbbf24" } }, "Round ", round.number, " \xB7 Voting Open"), /* @__PURE__ */ React.createElement("h2", { className: "display", style: { fontSize: "clamp(2rem,3.5vw,3rem)", color: "#fff", lineHeight: 1, marginTop: 2 } }, round.emoji, " ", round.question)), /* @__PURE__ */ React.createElement(RoomBadge, { dark: true, compact: true })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, flex: "1 1 auto", marginTop: 14, minHeight: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: 6 } }, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".55rem", color: "#7dd3fc", textAlign: "center", letterSpacing: ".12em" } }, "\u{1F935} The Gentlemen"), /* @__PURE__ */ React.createElement("div", { className: "scroll", style: {
      flex: "1 1 auto",
      minHeight: 0,
      overflowY: "auto",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      padding: 4
    } }, window.SUITORS.map((s) => /* @__PURE__ */ React.createElement(VoteSuitorTile, { key: "m" + s.id, suitor: s, variant: "m", accent: "#7dd3fc" })))), /* @__PURE__ */ React.createElement("div", { className: "scroll", style: {
      flex: "0 0 290px",
      minHeight: 0,
      overflowY: "auto",
      padding: "20px 16px",
      borderRadius: 20,
      background: "linear-gradient(165deg,rgba(90,0,24,.62),rgba(8,0,0,.82))",
      border: "1.5px solid rgba(251,191,36,.42)",
      boxShadow: "0 10px 44px rgba(0,0,0,.55),inset 0 1px 0 rgba(251,191,36,.14)"
    } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { className: "display", style: { fontSize: "1.15rem", color: "#fde68a", lineHeight: 1.1 } }, "The Verdicts Roll In"), /* @__PURE__ */ React.createElement("div", { style: {
      display: "inline-flex",
      alignItems: "baseline",
      gap: 6,
      marginTop: 8,
      padding: "4px 14px",
      borderRadius: 999,
      background: "rgba(251,191,36,.16)",
      border: "1px solid rgba(251,191,36,.4)"
    } }, /* @__PURE__ */ React.createElement("span", { className: "display", style: { fontSize: "1.05rem", fontWeight: 700, color: "#fbbf24" } }, votedCount), /* @__PURE__ */ React.createElement("span", { className: "caps", style: { fontSize: ".46rem", color: "rgba(253,230,138,.7)", letterSpacing: ".12em" } }, "of ", players.length, " voted"))), votedCount === 0 && /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: { color: "rgba(253,230,138,.5)", fontSize: ".9rem", lineHeight: 1.5, textAlign: "center", marginTop: 8 } }, "Votes will appear here as they come in\u2026"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, players.filter((p) => !!roundVotes[p.id]).map((p, i) => /* @__PURE__ */ React.createElement("div", { key: p.id, className: "chip-pop", style: {
      display: "flex",
      alignItems: "center",
      gap: 13,
      padding: "12px 15px",
      borderRadius: 14,
      background: `linear-gradient(135deg,${p.color}26,rgba(255,255,255,.04))`,
      border: `1.5px solid ${p.color}88`,
      boxShadow: `0 2px 14px ${p.color}33`
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 52,
      height: 52,
      borderRadius: "50%",
      overflow: "hidden",
      flexShrink: 0,
      border: `2.5px solid ${p.color}`,
      background: p.color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 0 16px ${p.color}66`
    } }, p.titleImg ? /* @__PURE__ */ React.createElement("img", { src: p.titleImg, alt: "", style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" } }) : /* @__PURE__ */ React.createElement("span", { style: { color: "#fff", fontWeight: 900, fontSize: ".95rem" } }, (p.name || "?")[0])), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 5, minWidth: 0 } }, p.titleEmoji && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1rem", flexShrink: 0 } }, p.titleEmoji), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: ".95rem", color: "#fde68a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, p.displayName || p.name)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".75rem", color: "rgba(253,230,138,.62)", fontStyle: "italic", lineHeight: 1.3, marginTop: 2 } }, VOTE_WISECRACKS[i % VOTE_WISECRACKS.length])))))), /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: 6 } }, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".55rem", color: "#f9a8d4", textAlign: "center", letterSpacing: ".12em" } }, "\u{1F470} The Ladies"), /* @__PURE__ */ React.createElement("div", { className: "scroll", style: {
      flex: "1 1 auto",
      minHeight: 0,
      overflowY: "auto",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      padding: 4
    } }, window.SUITORS.map((s) => /* @__PURE__ */ React.createElement(VoteSuitorTile, { key: "f" + s.id, suitor: s, variant: "f", accent: "#f9a8d4" }))))), /* @__PURE__ */ React.createElement("div", { style: { flex: "0 0 auto", marginTop: 12 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn-wedding",
        onClick: onForceClose,
        style: { width: "100%", padding: "14px 16px", fontSize: ".95rem" }
      },
      allVoted ? "\u{1F38A} Close & Reveal" : "Close Voting"
    )));
  }
  function HostResults({ state, onNext }) {
    const round = window.ROUNDS[state.roundIndex];
    const players = Object.values(state.players || {});
    const roundVotes = (state.votes || {})[round.id] || {};
    const isLast = state.roundIndex >= window.ROUNDS.length - 1;
    uE(() => {
      setTimeout(() => window.triggerConfetti && window.triggerConfetti(), 400);
    }, []);
    return /* @__PURE__ */ React.createElement("div", { className: "screen bg-bfiw-ivory bfiw-screen fade", style: { padding: "2.5vh 3vw" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: "0 0 auto", gap: 16, marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "caps", style: { fontSize: ".72rem", color: "#b45309" } }, round.emoji, " ", round.question), /* @__PURE__ */ React.createElement("h2", { className: "display", style: { fontSize: "clamp(2rem,3.2vw,2.8rem)", color: "#9b1c1c", lineHeight: 1, marginTop: 2 } }, "The Verdict")), /* @__PURE__ */ React.createElement(RoomBadge, { compact: true })), /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 auto", display: "flex", gap: 18, minHeight: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "scroll", style: { flex: "1 1 auto" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 9 } }, players.map((p, i) => {
      const vid = roundVotes[p.id];
      const suitor = window.SUITORS.find((s) => s.id === vid);
      return /* @__PURE__ */ React.createElement("div", { key: p.id, className: "float-in", style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "5px 16px",
        borderRadius: 16,
        background: "#fff",
        border: `2px solid ${p.color}22`,
        boxShadow: `0 2px 10px ${p.color}15`,
        animationDelay: `${i * 0.07}s`
      } }, /* @__PURE__ */ React.createElement("div", { style: {
        width: 76,
        height: 76,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        border: `3px solid ${p.color}`,
        background: p.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      } }, p.titleImg ? /* @__PURE__ */ React.createElement("img", { src: p.titleImg, alt: "", style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" } }) : /* @__PURE__ */ React.createElement("span", { style: { color: "#fff", fontWeight: 900, fontSize: "1.6rem" } }, (p.name || "?")[0])), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 800, fontSize: "1.3rem", color: "#1c0a00", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, p.name), p.displayName && p.displayName !== p.name && /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".82rem", color: "#78350f", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, p.titleEmoji, " ", p.displayName)), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1rem", color: "#9b1c1c", flexShrink: 0, fontWeight: 700 } }, "chose"), suitor ? (() => {
        const idx = window.SUITORS.indexOf(suitor);
        const variant = window.suitorVariant(p.gender, idx);
        const votePhoto = window.suitorPortrait(suitor, variant);
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 11, flexShrink: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 800, fontSize: "1.05rem", color: suitor.accent, whiteSpace: "nowrap" } }, suitor.nameNeutral), /* @__PURE__ */ React.createElement("div", { style: {
          width: 76,
          height: 76,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          border: `3px solid ${suitor.accent}`,
          boxShadow: `0 2px 12px ${suitor.accent}55`
        } }, /* @__PURE__ */ React.createElement(
          "img",
          {
            src: votePhoto,
            alt: suitor.nameNeutral,
            style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }
          }
        )));
      })() : /* @__PURE__ */ React.createElement("span", { style: { fontSize: ".8rem", color: "#a16207", fontStyle: "italic", flexShrink: 0 } }, "No vote yet"));
    }))), /* @__PURE__ */ React.createElement("div", { className: "invite", style: {
      flex: "0 0 clamp(240px,35%,380px)",
      alignSelf: "flex-start",
      background: "linear-gradient(160deg,rgba(90,0,0,.5),rgba(10,0,0,.75))",
      backdropFilter: "blur(12px)",
      padding: "22px 24px"
    } }, /* @__PURE__ */ React.createElement("span", { className: "corner tl", style: { fontSize: ".9rem" } }, "\u2766"), /* @__PURE__ */ React.createElement("span", { className: "corner br", style: { fontSize: ".9rem" } }, "\u2766"), /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".64rem", color: "#fbbf24", marginBottom: 6 } }, "\u{1F4AC} Discussion"), /* @__PURE__ */ React.createElement("h3", { className: "display", style: { color: "#fff", fontSize: "1.45rem", fontWeight: 600, lineHeight: 1.1, marginBottom: 12 } }, round.discussTitle), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 9 } }, round.discuss.map((pt, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 9, alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24", fontWeight: 900, fontSize: ".95rem", flexShrink: 0, marginTop: 1 } }, "\u2756"), /* @__PURE__ */ React.createElement("p", { className: "serif", style: { fontSize: "1.02rem", color: "rgba(253,230,138,.9)", lineHeight: 1.5, fontWeight: 500 } }, pt)))))), /* @__PURE__ */ React.createElement("div", { style: { flex: "0 0 auto", textAlign: "center", marginTop: 14 } }, /* @__PURE__ */ React.createElement("button", { className: "btn-wedding", onClick: onNext, style: { fontSize: "1.1rem", padding: "16px 56px" } }, isLast ? "\u{1F38A} Grand Finale" : "Next Question \u2192")));
  }
  function HostFinale({ state, onReplay }) {
    const [step, setStep] = uS(0);
    uE(() => {
      if (step === 0) setTimeout(() => window.triggerConfetti && window.triggerConfetti(), 600);
    }, []);
    const votes = state.votes || {};
    const players = Object.values(state.players || {});
    if (step === 4) return /* @__PURE__ */ React.createElement("div", { className: "screen bg-bfiw-dark bfiw-screen fade", style: { alignItems: "center", justifyContent: "center", padding: "4vh 4vw", position: "relative", overflow: "hidden" } }, /* @__PURE__ */ React.createElement(Petals, null), /* @__PURE__ */ React.createElement("div", { className: "invite fade", style: {
      position: "relative",
      zIndex: 1,
      textAlign: "center",
      background: "linear-gradient(160deg,rgba(90,0,0,.5),rgba(10,0,0,.75))",
      backdropFilter: "blur(12px)",
      padding: "clamp(40px,6vh,80px) clamp(40px,8vw,100px)",
      maxWidth: 960,
      width: "100%"
    } }, /* @__PURE__ */ React.createElement("span", { className: "corner tl", style: { fontSize: "1.4rem" } }, "\u2766"), /* @__PURE__ */ React.createElement("span", { className: "corner tr", style: { fontSize: "1.4rem" } }, "\u2766"), /* @__PURE__ */ React.createElement("span", { className: "corner bl", style: { fontSize: "1.4rem" } }, "\u2766"), /* @__PURE__ */ React.createElement("span", { className: "corner br", style: { fontSize: "1.4rem" } }, "\u2766"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "3.5rem", marginBottom: 12 } }, "\u2764\uFE0F"), /* @__PURE__ */ React.createElement("h2", { className: "display", style: { color: "#fff", fontSize: "clamp(2.2rem,5vw,4rem)", lineHeight: 0.95 } }, "The secret to wealth isn't finding The One."), /* @__PURE__ */ React.createElement(Ornament, { style: { margin: "22px auto", maxWidth: 420 } }), /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: { color: "rgba(253,230,138,.9)", fontSize: "clamp(1.1rem,2.2vw,1.6rem)", lineHeight: 1.5, maxWidth: 720, margin: "0 auto" } }, "It's building a portfolio where every personality knows its role."), /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: 30,
      padding: "20px 28px",
      background: "rgba(255,255,255,.08)",
      borderRadius: 16,
      border: "1.5px solid rgba(251,191,36,.4)",
      display: "inline-block"
    } }, /* @__PURE__ */ React.createElement("div", { className: "display", style: { color: "#fbbf24", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 700 } }, "Welcome to Asset Allocation.")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 32, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { className: "btn-gold", onClick: onReplay, style: { fontSize: "1rem", padding: "14px 40px" } }, "Play Again \u{1F48D}")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 18, fontSize: ".66rem", color: "rgba(253,230,138,.35)", fontWeight: 700, letterSpacing: ".05em" } }, "Investing for Mummies \xB7 Finding the Perfect Match Since 1995")));
    return /* @__PURE__ */ React.createElement("div", { className: "screen bg-bfiw-dark bfiw-screen fade", style: { padding: "2.5vh 3vw" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: "0 0 auto", textAlign: "center", marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".62rem", color: "#fbbf24", letterSpacing: ".35em" } }, "Grand Finale"), step === 0 && /* @__PURE__ */ React.createElement("h2", { className: "display", style: { color: "#fff", fontSize: "clamp(2.2rem,4.5vw,3.6rem)", lineHeight: 0.95, marginTop: 4 } }, "Who did everyone choose?"), step > 0 && step < 4 && /* @__PURE__ */ React.createElement("h2", { className: "display", style: { color: "#fff", fontSize: "clamp(2rem,4vw,3.2rem)", lineHeight: 0.95, marginTop: 4 } }, "Now \u2014 everyone finds their bucket."), /* @__PURE__ */ React.createElement(Ornament, { style: { margin: "14px auto 0", maxWidth: 400 } })), step === 0 && /* @__PURE__ */ React.createElement("div", { className: "scroll", style: { flex: "1 1 auto", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 } }, players.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: { color: "rgba(253,230,138,.6)", textAlign: "center", marginTop: 30, fontSize: "1.1rem" } }, "No guests played this round."), players.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "minmax(170px,1.4fr) repeat(4,1fr)", gap: 8, minWidth: 820, position: "sticky", top: 0, zIndex: 2 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", padding: "9px 14px", borderRadius: 12, background: "rgba(8,0,0,.78)", border: "1px solid rgba(251,191,36,.28)" } }, /* @__PURE__ */ React.createElement("span", { className: "caps", style: { fontSize: ".58rem", color: "#fbbf24", letterSpacing: ".14em" } }, "Guest")), window.ROUNDS.map((r) => /* @__PURE__ */ React.createElement("div", { key: r.id, style: { textAlign: "center", padding: "8px 6px", borderRadius: 12, background: "rgba(251,191,36,.13)", border: "1px solid rgba(251,191,36,.34)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "1.3rem", lineHeight: 1 } }, r.emoji), /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".46rem", color: "#fde68a", marginTop: 4, lineHeight: 1.25 } }, r.question)))), players.map((p, pi) => /* @__PURE__ */ React.createElement("div", { key: p.id, className: "float-in", style: {
      display: "grid",
      gridTemplateColumns: "minmax(170px,1.4fr) repeat(4,1fr)",
      gap: 8,
      minWidth: 820,
      animationDelay: `${pi * 0.05}s`
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 11, padding: "8px 14px", borderRadius: 12, background: "rgba(255,255,255,.05)", border: `1px solid ${p.color}66` } }, /* @__PURE__ */ React.createElement("div", { style: { width: 42, height: 42, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: `2px solid ${p.color}`, background: p.color, display: "flex", alignItems: "center", justifyContent: "center" } }, p.titleImg ? /* @__PURE__ */ React.createElement("img", { src: p.titleImg, alt: "", style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" } }) : /* @__PURE__ */ React.createElement("span", { style: { color: "#fff", fontWeight: 900, fontSize: ".95rem" } }, (p.name || "?")[0])), /* @__PURE__ */ React.createElement("div", { style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 800, fontSize: ".88rem", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, p.name), p.displayName && p.displayName !== p.name && /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".6rem", color: "rgba(253,230,138,.6)", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, p.titleEmoji, " ", p.displayName))), window.ROUNDS.map((r) => {
      const vid = (votes[r.id] || {})[p.id];
      const suitor = window.SUITORS.find((s) => s.id === vid);
      if (!suitor) return /* @__PURE__ */ React.createElement("div", { key: r.id, style: { display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px dashed rgba(255,255,255,.14)", minHeight: 62 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "rgba(255,255,255,.3)", fontSize: "1.1rem" } }, "\u2014"));
      const sidx = window.SUITORS.indexOf(suitor);
      const variant = window.suitorVariant(p.gender, sidx);
      const photo = window.suitorPortrait(suitor, variant);
      return /* @__PURE__ */ React.createElement("div", { key: r.id, style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px 4px", borderRadius: 12, background: suitor.cardBg, border: `1px solid ${suitor.accent}66` } }, /* @__PURE__ */ React.createElement("div", { style: { width: 42, height: 42, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: `2px solid ${suitor.accent}` } }, /* @__PURE__ */ React.createElement("img", { src: photo, alt: suitor.nameNeutral, style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" } })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".58rem", fontWeight: 800, color: "#fff", textAlign: "center", lineHeight: 1.1 } }, suitor.nameNeutral));
    }))))), step > 0 && step < 4 && /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 auto", display: "flex", gap: 16, minHeight: 0 } }, window.BUCKETS.map((bucket, bi) => {
      const show = bi < step;
      const suitors = window.SUITORS.filter((s) => bucket.suitorIds.includes(s.id));
      return /* @__PURE__ */ React.createElement("div", { key: bucket.id, className: "bucket-col", style: {
        background: show ? bucket.bg : "rgba(255,255,255,.04)",
        border: show ? `1.5px solid ${bucket.colorLt}44` : "1px solid rgba(255,255,255,.1)",
        opacity: show ? 1 : 0.4,
        transition: "opacity .4s ease,background .4s ease",
        animationDelay: `${bi * 0.1}s`
      } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "2.5rem" } }, bucket.emoji), /* @__PURE__ */ React.createElement("h3", { className: "serif", style: { fontWeight: 600, fontSize: "1.3rem", color: show ? "#fff" : "rgba(255,255,255,.4)", marginTop: 4 } }, bucket.name), /* @__PURE__ */ React.createElement("p", { style: { fontSize: ".75rem", color: show ? bucket.colorLt : "rgba(255,255,255,.3)", fontWeight: 700, marginTop: 4, lineHeight: 1.3 } }, bucket.purpose)), /* @__PURE__ */ React.createElement("div", { className: "rule", style: { background: `linear-gradient(90deg,transparent,${bucket.colorLt},transparent)`, opacity: 0.4 } }), show && suitors.map((s, si) => /* @__PURE__ */ React.createElement("div", { key: s.id, className: "bucket-suitor-chip", style: { animationDelay: `${si * 0.12}s` } }, /* @__PURE__ */ React.createElement("div", { style: {
        width: 48,
        height: 48,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        border: `2px solid ${bucket.colorLt}66`,
        background: "rgba(0,0,0,.35)"
      } }, /* @__PURE__ */ React.createElement("img", { src: s.portrait, alt: s.name, style: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "top center"
      } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 800, fontSize: ".88rem", color: "#fff" } }, s.nameNeutral), /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".68rem", color: bucket.colorLt, fontWeight: 700 } }, s.returnLabel, " returns \xB7 ", s.riskLabel, " risk")))), show && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "auto", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.08)", border: `1px solid ${bucket.colorLt}33` } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: ".72rem", fontWeight: 800, color: bucket.colorLt } }, "Rule: "), /* @__PURE__ */ React.createElement("span", { style: { fontSize: ".72rem", color: "rgba(255,255,255,.8)", fontWeight: 700 } }, bucket.rule)));
    })), /* @__PURE__ */ React.createElement("div", { style: { flex: "0 0 auto", textAlign: "center", marginTop: 16, display: "flex", gap: 14, justifyContent: "center", alignItems: "center" } }, step === 0 && /* @__PURE__ */ React.createElement("button", { className: "btn-wedding", onClick: () => setStep(1), style: { fontSize: "1.05rem", padding: "16px 52px" } }, "Reveal Their Role \xA0\u{1F38A}"), step === 1 && /* @__PURE__ */ React.createElement("button", { className: "btn-wedding", onClick: () => setStep(2) }, "Stability Bucket \u2192"), step === 2 && /* @__PURE__ */ React.createElement("button", { className: "btn-wedding", onClick: () => setStep(3) }, "Growth Bucket \u2192"), step === 3 && /* @__PURE__ */ React.createElement("button", { className: "btn-gold", onClick: () => setStep(4), style: { padding: "16px 52px" } }, "Final Message \xA0\u2764\uFE0F")));
  }
  function HostApp() {
    const [uiPhase, setUiPhase] = uS("cover");
    const [gameState, setGameState] = uS(null);
    const [confirmReset, setConfirmReset] = uS(false);
    uE(() => {
      window.Shaadi.ready.then(() => {
        const s = window.Shaadi.getState();
        setGameState(s);
        if (s.phase === "lobby") setUiPhase("lobby");
        else if (s.phase === "gallery") setUiPhase("gallery");
        else if (s.phase && s.phase !== "lobby") setUiPhase("game");
      });
      return window.Shaadi.subscribe((s) => setGameState(s));
    }, []);
    const open = async () => {
      const cur = window.Shaadi.getState().phase;
      const active = ["roundIntro", "voting", "lock", "results", "finale"];
      if (!active.includes(cur)) await window.Shaadi.startFresh();
      setUiPhase("lobby");
    };
    const goGallery = async () => {
      await window.Shaadi.showGallery();
      setUiPhase("gallery");
    };
    const beginGame = async () => {
      await window.Shaadi.startRound(0);
      setUiPhase("game");
    };
    const openVoting = async () => {
      await window.Shaadi.openVoting();
    };
    const forceClose = async () => {
      await window.Shaadi.closeVoting();
    };
    const goNext = async () => {
      await window.Shaadi.nextRound();
    };
    const onReplay = async () => {
      await window.Shaadi.resetToLobby();
      setUiPhase("lobby");
    };
    const doReset = async () => {
      setConfirmReset(false);
      await window.Shaadi.resetToLobby();
      setUiPhase("lobby");
    };
    if (!gameState && uiPhase !== "cover") {
      return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#1a0505", color: "#fbbf24", fontWeight: 800 } }, "Loading\u2026");
    }
    const phase = gameState?.phase || "lobby";
    let content;
    if (uiPhase === "cover") content = /* @__PURE__ */ React.createElement(HostCover, { onOpen: open });
    else if (uiPhase === "lobby") content = /* @__PURE__ */ React.createElement(HostLobby, { state: gameState, onContinue: goGallery });
    else if (uiPhase === "gallery") content = /* @__PURE__ */ React.createElement(HostGallery, { state: gameState, onBegin: beginGame });
    else if (phase === "roundIntro") content = /* @__PURE__ */ React.createElement(HostRoundIntro, { state: gameState, onOpenVoting: openVoting });
    else if (phase === "voting") content = /* @__PURE__ */ React.createElement(HostVoting, { state: gameState, onForceClose: forceClose });
    else if (phase === "lock" || phase === "results") content = /* @__PURE__ */ React.createElement(HostResults, { state: gameState, onNext: goNext });
    else if (phase === "finale") content = /* @__PURE__ */ React.createElement(HostFinale, { state: gameState, onReplay });
    else content = /* @__PURE__ */ React.createElement(HostCover, { onOpen: open });
    return /* @__PURE__ */ React.createElement("div", { className: "stage", style: { position: "relative" } }, content, uiPhase !== "cover" && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", bottom: 20, right: 20, zIndex: 9999 } }, confirmReset ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", background: "rgba(10,0,0,.92)", border: "1px solid #ef4444", borderRadius: 12, padding: "10px 16px", boxShadow: "0 4px 24px rgba(0,0,0,.6)" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#fca5a5", fontSize: ".8rem", fontWeight: 700, marginRight: 4 } }, "Reset entire game?"), /* @__PURE__ */ React.createElement("button", { onClick: doReset, style: { background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 800, fontSize: ".75rem", cursor: "pointer" } }, "Yes, reset"), /* @__PURE__ */ React.createElement("button", { onClick: () => setConfirmReset(false), style: { background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, padding: "7px 12px", fontWeight: 800, fontSize: ".75rem", cursor: "pointer" } }, "Cancel")) : /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setConfirmReset(true),
        style: { background: "rgba(0,0,0,.55)", color: "rgba(255,255,255,.4)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, padding: "8px 14px", fontSize: ".72rem", fontWeight: 700, cursor: "pointer", backdropFilter: "blur(8px)", transition: "all .2s" },
        onMouseEnter: (e) => {
          e.currentTarget.style.color = "rgba(255,255,255,.8)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,.35)";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.color = "rgba(255,255,255,.4)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,.15)";
        }
      },
      "\u21A9 Reset game"
    )));
  }
  window.HostApp = HostApp;
})();
