(() => {
  // player-view.jsx
  var { useState, useEffect, useRef } = React;
  var JOIN_COLORS = [
    "#dc2626",
    "#ea580c",
    "#d97706",
    "#16a34a",
    "#0891b2",
    "#7c3aed",
    "#be185d",
    "#0f766e"
  ];
  var _ROOM = window.SHAADI_CONFIG?.roomCode || "1995";
  function PlayerJoin({ onJoin }) {
    const [name, setName] = useState("");
    const [gender, setGender] = useState(null);
    const [step, setStep] = useState("form");
    const [avatar, setAvatar] = useState(null);
    const [joining, setJoining] = useState(false);
    const [reveal, setReveal] = useState(null);
    const pool = gender === "M" ? window.PARTICIPANTS_M : gender === "F" ? window.PARTICIPANTS_F : window.PARTICIPANTS_M.concat(window.PARTICIPANTS_F);
    function goToAvatar() {
      if (!name.trim() || !gender) return;
      setAvatar(window.pickAvatar(gender));
      setStep("avatar");
    }
    async function handleJoin() {
      const n = name.trim();
      if (!n || !gender || joining) return;
      setJoining(true);
      const color = JOIN_COLORS[Math.floor(Math.random() * JOIN_COLORS.length)];
      const char = avatar || window.pickAvatar(gender);
      const displayName = char ? char.title : n;
      const revealData = { ...char, displayName, baseName: n, color, gender };
      setReveal(revealData);
      await window.Shaadi.join(n, color, char, gender);
      setTimeout(() => onJoin(displayName, revealData, gender), 1500);
    }
    if (reveal) {
      return /* @__PURE__ */ React.createElement("div", { className: "player-bg screen", style: { padding: 0 } }, reveal.img && /* @__PURE__ */ React.createElement(
        "img",
        {
          src: reveal.img,
          alt: reveal.title,
          style: {
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            display: "block"
          }
        }
      ), /* @__PURE__ */ React.createElement("div", { style: {
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to bottom, transparent 35%, rgba(8,0,10,.88) 68%, #08000a 90%)"
      } }), /* @__PURE__ */ React.createElement("div", { className: "float-in", style: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "14px 24px 44px",
        textAlign: "center"
      } }, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".5rem", color: "rgba(253,230,138,.85)", letterSpacing: ".3em", marginBottom: 3 } }, reveal.baseName, " \xB7 you are"), /* @__PURE__ */ React.createElement("h2", { className: "display", style: {
        fontSize: "clamp(1.6rem,7vw,2.1rem)",
        color: "#fde68a",
        lineHeight: 1.1,
        marginBottom: 5,
        textShadow: "0 2px 20px rgba(0,0,0,.8)"
      } }, reveal.emoji, " ", reveal.title), /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: {
        fontSize: ".9rem",
        color: "rgba(253,230,138,.9)",
        marginBottom: 14,
        textShadow: "0 1px 8px rgba(0,0,0,.9)"
      } }, reveal.action), /* @__PURE__ */ React.createElement("div", { style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 18px",
        borderRadius: 999,
        background: "rgba(251,191,36,.12)",
        border: "1px solid rgba(251,191,36,.35)"
      } }, /* @__PURE__ */ React.createElement("div", { style: { width: 8, height: 8, borderRadius: "50%", background: reveal.color } }), /* @__PURE__ */ React.createElement("span", { className: "caps", style: { fontSize: ".5rem", color: "rgba(253,230,138,.82)", letterSpacing: ".2em" } }, "Entering the Swayamvar\u2026"))));
    }
    if (step === "avatar") {
      return /* @__PURE__ */ React.createElement("div", { className: "player-bg screen", style: { alignItems: "center", padding: "20px 16px", overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 16, margin: "auto 0" } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("h1", { className: "display", style: { fontSize: "1.9rem", color: "#fde68a", lineHeight: 1.1 } }, "Choose your character"), /* @__PURE__ */ React.createElement("p", { className: "caps", style: { fontSize: ".5rem", color: "rgba(253,230,138,.85)", marginTop: 6, letterSpacing: ".25em" } }, "Pick the avatar that's most you")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 } }, pool.map((a) => {
        const on = avatar && avatar.title === a.title;
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: a.title,
            type: "button",
            onClick: () => setAvatar(a),
            style: {
              position: "relative",
              padding: 0,
              borderRadius: 14,
              overflow: "hidden",
              border: `2px solid ${on ? "#fbbf24" : "rgba(251,191,36,.25)"}`,
              background: "rgba(10,0,0,.5)",
              cursor: "pointer",
              boxShadow: on ? "0 0 0 3px rgba(251,191,36,.25)" : "none",
              transition: "all .15s"
            }
          },
          /* @__PURE__ */ React.createElement("div", { style: { position: "relative", width: "100%", aspectRatio: "3/4", background: "#1a0505" } }, /* @__PURE__ */ React.createElement(
            "img",
            {
              src: a.img,
              alt: a.title,
              loading: "lazy",
              style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block", opacity: on ? 1 : 0.82 }
            }
          ), on && /* @__PURE__ */ React.createElement("div", { style: {
            position: "absolute",
            top: 5,
            right: 5,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fbbf24",
            color: "#3a0a0a",
            fontSize: ".7rem",
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          } }, "\u2713")),
          /* @__PURE__ */ React.createElement("div", { style: { padding: "5px 4px 7px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".92rem", lineHeight: 1 } }, a.emoji), /* @__PURE__ */ React.createElement("div", { className: "serif", style: { fontSize: ".56rem", color: "#fde68a", lineHeight: 1.15, marginTop: 3, fontWeight: 600 } }, a.title))
        );
      })), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setAvatar(window.pickAvatar(gender)),
          style: {
            alignSelf: "center",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 18px",
            borderRadius: 999,
            border: "1px solid rgba(251,191,36,.4)",
            background: "rgba(251,191,36,.08)",
            color: "#fde68a",
            cursor: "pointer",
            fontFamily: "Nunito,sans-serif",
            fontWeight: 700,
            fontSize: ".8rem"
          }
        },
        "\u{1F3B2} Surprise me"
      ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setStep("form"),
          style: {
            flex: "0 0 auto",
            padding: "14px 18px",
            borderRadius: 12,
            border: "1.5px solid rgba(251,191,36,.35)",
            background: "rgba(255,255,255,.06)",
            color: "#fde68a",
            cursor: "pointer",
            fontFamily: "Nunito,sans-serif",
            fontWeight: 700
          }
        },
        "\u2190 Back"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "btn-gold",
          onClick: handleJoin,
          disabled: !avatar || joining,
          style: { flex: 1 }
        },
        joining ? "Joining\u2026" : "Join the Party \u{1F48D}"
      ))));
    }
    const GENDERS = [
      { id: "M", emoji: "\u{1F935}", label: "Male" },
      { id: "F", emoji: "\u{1F470}", label: "Female" },
      { id: "P", emoji: "\u{1F642}", label: "Prefer not to say" }
    ];
    return /* @__PURE__ */ React.createElement("div", { className: "player-bg screen", style: { alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 28 } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "2.8rem", marginBottom: 8 } }, "\u{1F48D}"), /* @__PURE__ */ React.createElement("h1", { className: "display", style: { fontSize: "2.4rem", color: "#fde68a", lineHeight: 1.1 } }, "Swayamvar"), /* @__PURE__ */ React.createElement("p", { className: "caps", style: { fontSize: ".5rem", color: "rgba(253,230,138,.85)", marginTop: 8, letterSpacing: ".3em" } }, "Your invitation awaits")), /* @__PURE__ */ React.createElement("div", { className: "invite", style: { padding: "28px 24px", background: "rgba(10,0,0,.55)", backdropFilter: "blur(8px)" } }, /* @__PURE__ */ React.createElement("div", { className: "corner tl" }, "\u2726"), /* @__PURE__ */ React.createElement("div", { className: "corner tr" }, "\u2726"), /* @__PURE__ */ React.createElement("div", { className: "corner bl" }, "\u2726"), /* @__PURE__ */ React.createElement("div", { className: "corner br" }, "\u2726"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 18 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "caps", style: { fontSize: ".48rem", color: "rgba(253,230,138,.88)", display: "block", marginBottom: 8 } }, "Your name"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Enter your name\u2026",
        value: name,
        onChange: (e) => setName(e.target.value),
        onKeyDown: (e) => e.key === "Enter" && handleJoin(),
        maxLength: 24,
        autoFocus: true,
        style: {
          width: "100%",
          padding: "14px 18px",
          borderRadius: 12,
          border: "1.5px solid rgba(251,191,36,.4)",
          background: "rgba(255,255,255,.14)",
          color: "#fde68a",
          fontSize: "1rem",
          fontFamily: "Nunito,sans-serif",
          outline: "none",
          boxSizing: "border-box"
        }
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "caps", style: { fontSize: ".48rem", color: "rgba(253,230,138,.88)", display: "block", marginBottom: 8 } }, "You are"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, GENDERS.map((g) => {
      const on = gender === g.id;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: g.id,
          type: "button",
          onClick: () => setGender(g.id),
          style: {
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            padding: "12px 16px",
            borderRadius: 12,
            border: `1.5px solid ${on ? "rgba(251,191,36,.85)" : "rgba(251,191,36,.3)"}`,
            background: on ? "rgba(251,191,36,.24)" : "rgba(255,255,255,.1)",
            color: "#fde68a",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "Nunito,sans-serif",
            fontWeight: on ? 800 : 600,
            fontSize: ".95rem",
            transition: "all .15s"
          }
        },
        /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.3rem", lineHeight: 1 } }, g.emoji),
        /* @__PURE__ */ React.createElement("span", null, g.label),
        on && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "auto", color: "#fbbf24" } }, "\u2713")
      );
    }))), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn-gold",
        onClick: goToAvatar,
        disabled: !name.trim() || !gender,
        style: { width: "100%", marginTop: 4 }
      },
      "Choose your character \u2192"
    )))));
  }
  function PlayerWaiting({ phase, roundIndex, playerName }) {
    const round = window.ROUNDS[roundIndex];
    const msgs = {
      lobby: { emoji: "\u{1F48C}", text: "Waiting for the host to begin\u2026" },
      gallery: { emoji: "\u{1F440}", text: "Take a look at the suitors on the big screen!" },
      roundIntro: { emoji: round?.emoji || "\u{1F3AF}", text: `Round ${round?.number || ""} is starting\u2026` },
      lock: { emoji: "\u{1F512}", text: "Votes are locked! Watch the screen\u2026" },
      results: { emoji: "\u{1F4CA}", text: "Results coming up on screen\u2026" },
      finale: { emoji: "\u{1F38A}", text: "Grand Finale \u2014 watch the big screen!" },
      ended: { emoji: "\u{1F64F}", text: "Thanks for playing!" }
    };
    const m = msgs[phase] || { emoji: "\u23F3", text: "Stand by\u2026" };
    return /* @__PURE__ */ React.createElement("div", { className: "player-bg screen", style: { alignItems: "center", justifyContent: "center", padding: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "4rem" }, className: "pulse-dot" }, m.emoji), /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: { fontSize: "1.2rem", color: "#fde68a", maxWidth: 300 } }, m.text), playerName && /* @__PURE__ */ React.createElement("p", { className: "caps", style: { fontSize: ".46rem", color: "rgba(253,230,138,.78)", letterSpacing: ".28em" } }, "Playing as ", playerName)));
  }
  function PlayerGallery({ state, playerName, gender }) {
    const idx = state?.galleryIndex || 0;
    const suitor = window.SUITORS[idx] || window.SUITORS[0];
    const variant = window.suitorVariant(gender, idx);
    return /* @__PURE__ */ React.createElement("div", { className: "player-bg screen", style: { overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: {
      padding: "12px 16px 8px",
      borderBottom: "1px solid rgba(251,191,36,.2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0
    } }, /* @__PURE__ */ React.createElement("span", { className: "display", style: { fontSize: "1.1rem", color: "#fde68a" } }, "Meet the Suitors"), /* @__PURE__ */ React.createElement("span", { className: "caps", style: { fontSize: ".4rem", color: "rgba(253,230,138,.8)", letterSpacing: ".2em" } }, idx + 1, " / ", window.SUITORS.length)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, padding: "8px 14px", flexShrink: 0 } }, window.SUITORS.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: s.id, style: {
      flex: i === idx ? 3 : 1,
      height: 4,
      borderRadius: 999,
      background: i <= idx ? s.accent : "rgba(255,255,255,.15)",
      transition: "all .35s ease"
    } }))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minHeight: 0, padding: "8px 10px 12px", display: "flex" } }, /* @__PURE__ */ React.createElement(window.SuitorBioCard, { suitor, variant })), /* @__PURE__ */ React.createElement("div", { style: {
      padding: "8px 16px",
      textAlign: "center",
      borderTop: "1px solid rgba(251,191,36,.12)",
      flexShrink: 0
    } }, /* @__PURE__ */ React.createElement("p", { className: "caps", style: { fontSize: ".4rem", color: "rgba(253,230,138,.74)", letterSpacing: ".22em" } }, "Host presenting \xB7 voting opens soon \xB7 ", playerName)));
  }
  function PlayerVoting({ roundIndex, onVoted, gender }) {
    const round = window.ROUNDS[roundIndex];
    const [chosen, setChosen] = useState(null);
    const [locked, setLocked] = useState(false);
    const chosenSuitor = window.SUITORS.find((s) => s.id === chosen);
    const chosenVariant = window.suitorVariant(gender, window.SUITORS.findIndex((s) => s.id === chosen));
    async function castVote(suitorId) {
      if (locked) return;
      setChosen(suitorId);
      setLocked(true);
      onVoted(suitorId, round.id);
      await window.Shaadi.castVote(round.id, suitorId);
    }
    return /* @__PURE__ */ React.createElement("div", { className: "player-bg screen", style: { overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: {
      padding: "16px 16px 14px",
      flexShrink: 0,
      textAlign: "center",
      borderBottom: "1px solid rgba(251,191,36,.2)"
    } }, /* @__PURE__ */ React.createElement("span", { style: {
      display: "inline-block",
      marginBottom: 10,
      fontSize: ".5rem",
      fontWeight: 800,
      padding: "4px 14px",
      borderRadius: 999,
      background: "rgba(251,191,36,.18)",
      color: "#fbbf24",
      letterSpacing: ".14em"
    }, className: "caps" }, "Round ", round.number, " of ", window.ROUNDS.length), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "2.4rem", lineHeight: 1, marginBottom: 8 } }, round.emoji), /* @__PURE__ */ React.createElement("p", { className: "display", style: { fontSize: "clamp(1.8rem,9vw,2.8rem)", color: "#fde68a", lineHeight: 1.05 } }, round.question), /* @__PURE__ */ React.createElement("p", { className: "caps", style: { fontSize: ".52rem", color: "rgba(253,230,138,.82)", marginTop: 10, letterSpacing: ".12em" } }, round.cta)), /* @__PURE__ */ React.createElement("div", { className: "scroll", style: { flex: 1, padding: "12px" } }, locked ? /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 16,
      paddingTop: 24,
      textAlign: "center"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "5.5rem", lineHeight: 1 } }, "\u2705"), /* @__PURE__ */ React.createElement("p", { className: "display", style: { fontSize: "2.2rem", color: "#4ade80", textShadow: "0 0 28px rgba(74,222,128,.55)" } }, "Vote Cast!"), /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 20px",
      borderRadius: 14,
      background: "rgba(255,255,255,.12)",
      border: "1.5px solid rgba(251,191,36,.4)"
    } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "2rem" } }, chosenSuitor?.monogram), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "left" } }, /* @__PURE__ */ React.createElement("p", { style: { color: "rgba(253,230,138,.85)", fontSize: ".65rem" } }, "Your choice"), /* @__PURE__ */ React.createElement("p", { className: "serif", style: { color: "#fde68a", fontWeight: 600 } }, chosenSuitor && window.suitorName(chosenSuitor, chosenVariant)))), /* @__PURE__ */ React.createElement("p", { className: "caps", style: { fontSize: ".42rem", color: "rgba(253,230,138,.74)", letterSpacing: ".22em" } }, "Waiting for others\u2026")) : /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 } }, window.SUITORS.map((s, i) => {
      const variant = window.suitorVariant(gender, i);
      const portrait = window.suitorPortrait(s, variant);
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: s.id,
          onClick: () => castVote(s.id),
          disabled: locked,
          style: {
            background: s.cardBg,
            border: `2px solid ${s.accent}55`,
            borderRadius: 12,
            padding: 0,
            overflow: "hidden",
            cursor: "pointer",
            textAlign: "left",
            transition: "transform .12s, box-shadow .12s"
          },
          onTouchStart: (e) => e.currentTarget.style.transform = "scale(.97)",
          onTouchEnd: (e) => e.currentTarget.style.transform = "scale(1)"
        },
        /* @__PURE__ */ React.createElement("div", { style: { height: 104, overflow: "hidden", position: "relative" } }, portrait ? /* @__PURE__ */ React.createElement("img", { src: portrait, alt: s.nameNeutral, style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" } }) : /* @__PURE__ */ React.createElement("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.4rem" } }, s.monogram), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", bottom: 0, left: 0, right: 0, height: 36, background: "linear-gradient(transparent,rgba(0,0,0,.7))" } })),
        /* @__PURE__ */ React.createElement("div", { style: { padding: "7px 10px 9px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 800, fontSize: ".72rem", color: "#fde68a", lineHeight: 1.2 } }, (variant === "f" ? "Miss " : "Mr. ") + s.nameNeutral), /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".57rem", color: s.accentLt, fontWeight: 700, marginTop: 2 } }, s.returnLabel))
      );
    }))));
  }
  function PlayerFinale({ myVotes, playerName, gender }) {
    return /* @__PURE__ */ React.createElement("div", { className: "player-bg screen", style: { overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { className: "scroll", style: { flex: 1, padding: "24px 16px 32px" } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "2.4rem", marginBottom: 6 } }, "\u{1F38A}"), /* @__PURE__ */ React.createElement("h2", { className: "display", style: { fontSize: "1.9rem", color: "#fde68a", lineHeight: 1.1 } }, "Your Report Card"), /* @__PURE__ */ React.createElement("p", { className: "caps", style: { fontSize: ".44rem", color: "rgba(253,230,138,.8)", marginTop: 6, letterSpacing: ".24em" } }, playerName, "'s choices")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, window.ROUNDS.map((r) => {
      const chosenId = myVotes[r.id];
      const suitor = window.SUITORS.find((s) => s.id === chosenId);
      const variant = suitor ? window.suitorVariant(gender, window.SUITORS.indexOf(suitor)) : null;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: r.id,
          className: "float-in",
          style: {
            borderRadius: 14,
            padding: "13px 15px",
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(251,191,36,.22)",
            display: "flex",
            alignItems: "center",
            gap: 13
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: {
          width: 42,
          height: 42,
          borderRadius: 10,
          flexShrink: 0,
          background: suitor ? suitor.cardBg : "rgba(255,255,255,.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.4rem"
        } }, suitor?.monogram || "\u2014"),
        /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: ".6rem", color: "rgba(253,230,138,.8)", marginBottom: 2 } }, r.emoji, " ", r.question), /* @__PURE__ */ React.createElement("p", { className: "serif", style: { color: "#fde68a", fontWeight: 600, fontSize: ".88rem" } }, suitor ? window.suitorName(suitor, variant) : "No vote"), suitor && /* @__PURE__ */ React.createElement("p", { style: { fontSize: ".57rem", color: "rgba(253,230,138,.78)", fontStyle: "italic" } }, suitor.returnLabel, " \xB7 ", suitor.riskLabel))
      );
    })), /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: 28,
      padding: "20px 18px",
      borderRadius: 16,
      textAlign: "center",
      background: "rgba(251,191,36,.1)",
      border: "1.5px solid rgba(251,191,36,.35)"
    } }, /* @__PURE__ */ React.createElement("p", { className: "display ital", style: { fontSize: "1.25rem", color: "#fbbf24", lineHeight: 1.35 } }, `"The secret to wealth isn't finding The One.`, /* @__PURE__ */ React.createElement("br", null), "It's building a portfolio where every", /* @__PURE__ */ React.createElement("br", null), 'personality knows its role."'), /* @__PURE__ */ React.createElement("p", { className: "caps", style: { fontSize: ".43rem", color: "rgba(251,191,36,.65)", marginTop: 12, letterSpacing: ".22em" } }, "Welcome to Asset Allocation"))));
  }
  function PlayerCharacterWait({ charData }) {
    if (!charData) return /* @__PURE__ */ React.createElement(PlayerWaiting, { phase: "lobby", roundIndex: 0, playerName: "" });
    return /* @__PURE__ */ React.createElement("div", { className: "player-bg screen", style: { padding: 0 } }, charData.img && /* @__PURE__ */ React.createElement(
      "img",
      {
        src: charData.img,
        alt: charData.title,
        style: {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "top center",
          display: "block"
        }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: {
      position: "absolute",
      inset: 0,
      background: "linear-gradient(to bottom, transparent 35%, rgba(8,0,10,.88) 68%, #08000a 90%)"
    } }), /* @__PURE__ */ React.createElement("div", { style: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: "14px 24px 44px",
      textAlign: "center"
    } }, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: ".5rem", color: "rgba(253,230,138,.84)", letterSpacing: ".3em", marginBottom: 3 } }, charData.baseName), /* @__PURE__ */ React.createElement("h2", { className: "display", style: {
      fontSize: "clamp(1.6rem,7vw,2.1rem)",
      color: "#fde68a",
      lineHeight: 1.1,
      marginBottom: 4
    } }, charData.emoji, " ", charData.title), /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: {
      fontSize: ".88rem",
      color: "rgba(253,230,138,.86)",
      marginBottom: 14
    } }, charData.action), /* @__PURE__ */ React.createElement("div", { style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      padding: "7px 18px",
      borderRadius: 999,
      background: "rgba(251,191,36,.1)",
      border: "1px solid rgba(251,191,36,.28)"
    } }, /* @__PURE__ */ React.createElement("span", { style: { width: 7, height: 7, borderRadius: "50%", background: "#fbbf24", flexShrink: 0, display: "inline-block" } }), /* @__PURE__ */ React.createElement("span", { className: "caps", style: { fontSize: ".48rem", color: "rgba(253,230,138,.78)", letterSpacing: ".22em" } }, "Waiting for the Swayamvar to begin\u2026"))));
  }
  function PlayerResults({ state, roundIndex, gender, myVotes }) {
    const round = window.ROUNDS[roundIndex];
    const votes = state.votes && state.votes[round.id] || {};
    const counts = {};
    Object.values(votes).forEach((sid) => {
      counts[sid] = (counts[sid] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const myPick = myVotes[round.id];
    const ranked = window.SUITORS.map((s) => ({ s, n: counts[s.id] || 0, i: window.SUITORS.findIndex((x) => x.id === s.id) })).sort((a, b) => b.n - a.n);
    return /* @__PURE__ */ React.createElement("div", { className: "player-bg screen", style: { overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: {
      padding: "16px 16px 12px",
      flexShrink: 0,
      textAlign: "center",
      borderBottom: "1px solid rgba(251,191,36,.2)"
    } }, /* @__PURE__ */ React.createElement("span", { className: "caps", style: {
      display: "inline-block",
      marginBottom: 8,
      fontSize: ".5rem",
      fontWeight: 800,
      padding: "4px 14px",
      borderRadius: 999,
      background: "rgba(251,191,36,.18)",
      color: "#fbbf24",
      letterSpacing: ".14em"
    } }, "Round ", round.number, " \xB7 The Verdict"), /* @__PURE__ */ React.createElement("p", { className: "display", style: { fontSize: "clamp(1.3rem,6.5vw,2rem)", color: "#fde68a", lineHeight: 1.05 } }, round.question)), /* @__PURE__ */ React.createElement("div", { className: "scroll", style: { flex: 1, padding: "12px", display: "flex", flexDirection: "column", gap: 8 } }, ranked.map(({ s, n, i }, idx) => {
      const variant = window.suitorVariant(gender, i);
      const pct = total ? Math.round(n / total * 100) : 0;
      const mine = myPick === s.id;
      return /* @__PURE__ */ React.createElement("div", { key: s.id, style: {
        background: "rgba(255,255,255,.08)",
        borderRadius: 12,
        padding: "10px 12px",
        border: mine ? "2px solid #fbbf24" : "1.5px solid rgba(251,191,36,.22)"
      } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.25rem" } }, idx === 0 && n > 0 ? "\u{1F451}" : s.monogram), /* @__PURE__ */ React.createElement("span", { className: "serif", style: { flex: 1, color: "#fde68a", fontWeight: 600, fontSize: ".92rem", lineHeight: 1.15 } }, window.suitorName(s, variant), mine && /* @__PURE__ */ React.createElement("span", { style: { color: "#fbbf24", fontWeight: 800 } }, " \xB7 You")), /* @__PURE__ */ React.createElement("span", { className: "display", style: { color: "#fde68a", fontSize: "1.15rem" } }, n)), /* @__PURE__ */ React.createElement("div", { style: { height: 9, borderRadius: 999, background: "rgba(0,0,0,.28)", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: {
        height: "100%",
        width: pct + "%",
        borderRadius: 999,
        background: `linear-gradient(90deg,${s.accent},${s.accentLt || s.accent})`,
        transition: "width .6s ease"
      } })));
    }), /* @__PURE__ */ React.createElement("p", { className: "caps", style: {
      textAlign: "center",
      marginTop: 6,
      fontSize: ".44rem",
      color: "rgba(253,230,138,.72)",
      letterSpacing: ".2em"
    } }, total, " vote", total === 1 ? "" : "s", " so far \xB7 full reveal on the big screen")));
  }
  function PlayerApp() {
    const [state, setState] = useState(window.Shaadi.getState());
    const [joined, setJoined] = useState(() => !!localStorage.getItem(`sm-joined-${_ROOM}`));
    const [playerName, setPlayerName] = useState(() => localStorage.getItem(`sm-name-${_ROOM}`) || "");
    const [gender, setGender] = useState(() => localStorage.getItem(`sm-gender-${_ROOM}`) || "P");
    const [charData, setCharData] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem(`sm-char-${_ROOM}`) || "null");
      } catch {
        return null;
      }
    });
    const [myVotes, setMyVotes] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem(`sm-votes-${_ROOM}`) || "{}");
      } catch {
        return {};
      }
    });
    const [sessionId, setSessionId] = useState(() => localStorage.getItem(`sm-session-${_ROOM}`) || null);
    const [ready, setReady] = useState(false);
    useEffect(() => {
      const unsub = window.Shaadi.subscribe((s) => setState(s));
      window.Shaadi.ready.then(() => {
        setState(window.Shaadi.getState());
        setReady(true);
      });
      return unsub;
    }, []);
    function _clearSession() {
      ["joined", "name", "gender", "char", "votes", "session"].forEach((k) => {
        try {
          localStorage.removeItem(`sm-${k}-${_ROOM}`);
        } catch {
        }
      });
    }
    useEffect(() => {
      if (!ready || !joined) return;
      const liveSid = state && state.sessionId;
      if (liveSid && liveSid !== sessionId) {
        _clearSession();
        setJoined(false);
        setMyVotes({});
        setCharData(null);
        setPlayerName("");
        setSessionId(null);
      }
    }, [ready, state.sessionId, joined, sessionId]);
    useEffect(() => {
      if (!ready || !joined || !charData) return;
      if (!sessionId || !state.sessionId || state.sessionId !== sessionId) return;
      const myId = window.Shaadi.myId();
      if (state && state.players && !state.players[myId]) {
        const base = charData.baseName || playerName || "Guest";
        const col = charData.color || "#e11d48";
        window.Shaadi.join(base, col, charData, charData.gender || gender);
      }
    }, [ready, joined, charData, state.players, state.sessionId, sessionId]);
    function handleJoin(displayName, char, g) {
      setPlayerName(displayName);
      setJoined(true);
      if (char) setCharData(char);
      if (g) setGender(g);
      const sid = (window.Shaadi.getState() || {}).sessionId || null;
      setSessionId(sid);
      try {
        localStorage.setItem(`sm-joined-${_ROOM}`, "1");
        localStorage.setItem(`sm-name-${_ROOM}`, displayName);
        if (char) localStorage.setItem(`sm-char-${_ROOM}`, JSON.stringify(char));
        if (g) localStorage.setItem(`sm-gender-${_ROOM}`, g);
        if (sid) localStorage.setItem(`sm-session-${_ROOM}`, sid);
      } catch {
      }
    }
    function handleVoted(suitorId, roundId) {
      setMyVotes((v) => {
        const next = { ...v, [roundId]: suitorId };
        try {
          localStorage.setItem(`sm-votes-${_ROOM}`, JSON.stringify(next));
        } catch {
        }
        return next;
      });
    }
    if (!joined) {
      const { phase: _phase, roundIndex: _ri } = state;
      const canJoin = !_phase || _phase === "lobby" || _phase === "gallery" || _ri === 0 && (_phase === "roundIntro" || _phase === "voting");
      if (!canJoin) return /* @__PURE__ */ React.createElement("div", { className: "player-bg screen", style: { alignItems: "center", justifyContent: "center", padding: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "4rem", lineHeight: 1 } }, "\u{1F512}"), /* @__PURE__ */ React.createElement("p", { className: "display", style: { fontSize: "1.5rem", color: "#fde68a" } }, "Game in progress"), /* @__PURE__ */ React.createElement("p", { className: "caps", style: { fontSize: ".5rem", color: "rgba(253,230,138,.7)", letterSpacing: ".18em" } }, "Joining is closed")));
      return /* @__PURE__ */ React.createElement(PlayerJoin, { onJoin: handleJoin });
    }
    const { phase, roundIndex } = state;
    const round = window.ROUNDS[roundIndex];
    if (phase === "lobby") {
      return /* @__PURE__ */ React.createElement(PlayerCharacterWait, { charData });
    }
    if (phase === "gallery") {
      return /* @__PURE__ */ React.createElement(PlayerGallery, { state, playerName, gender });
    }
    if (phase === "roundIntro") {
      return /* @__PURE__ */ React.createElement(PlayerWaiting, { phase: "roundIntro", roundIndex, playerName });
    }
    if (phase === "voting") {
      if (round && myVotes[round.id]) {
        return /* @__PURE__ */ React.createElement(PlayerWaiting, { phase: "lock", roundIndex, playerName });
      }
      return /* @__PURE__ */ React.createElement(PlayerVoting, { roundIndex, onVoted: handleVoted, gender });
    }
    if (phase === "lock") {
      return /* @__PURE__ */ React.createElement(PlayerWaiting, { phase: "lock", roundIndex, playerName });
    }
    if (phase === "results") {
      return /* @__PURE__ */ React.createElement(PlayerResults, { state, roundIndex, gender, myVotes });
    }
    if (phase === "finale" || phase === "ended") {
      return /* @__PURE__ */ React.createElement(PlayerFinale, { myVotes, playerName, gender });
    }
    return /* @__PURE__ */ React.createElement(PlayerWaiting, { phase, roundIndex, playerName });
  }
  window.PlayerApp = PlayerApp;
})();
