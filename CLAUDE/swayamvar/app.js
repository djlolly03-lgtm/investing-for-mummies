(() => {
  // app.jsx
  var { useState, useEffect } = React;
  function Landing({ onRole }) {
    return /* @__PURE__ */ React.createElement("div", { style: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
      textAlign: "center",
      background: "radial-gradient(ellipse 120% 80% at 50% -10%, #5a0000 0%, #2d0000 40%, #0e0000 100%)",
      position: "relative",
      overflow: "hidden"
    } }, /* @__PURE__ */ React.createElement(Petals, null), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", zIndex: 1, maxWidth: 560, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: "0.62rem", color: "#fbbf24", letterSpacing: "0.4em", marginBottom: 16 } }, "Investing for Mummies"), /* @__PURE__ */ React.createElement("h1", { className: "display", style: { color: "#fbbf24", fontSize: "clamp(2.6rem,8vw,5rem)", fontWeight: 700, lineHeight: 0.92 } }, "Swayamvar"), /* @__PURE__ */ React.createElement("div", { className: "display ital", style: { color: "#fde68a", fontSize: "clamp(1.5rem,4.5vw,2.5rem)", marginTop: 6 } }, "for your Money"), /* @__PURE__ */ React.createElement(Ornament, { word: "est. 1995", style: { margin: "24px auto", maxWidth: 380 } }), /* @__PURE__ */ React.createElement("p", { className: "serif ital", style: { color: "rgba(253,230,138,0.85)", fontSize: "1.1rem", lineHeight: 1.5, marginBottom: 36 } }, "Finding the Perfect Match for your savings since 1995."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { className: "role-btn host", onClick: () => onRole("host") }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "2.5rem", marginBottom: 10 } }, "\u{1F4FD}\uFE0F"), /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: "0.55rem", color: "#fde68a", marginBottom: 4 } }, "Teacher / Projector"), /* @__PURE__ */ React.createElement("div", { className: "serif", style: { fontSize: "1.3rem", color: "#fff", fontWeight: 600 } }, "I'm the Host"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.75rem", color: "rgba(253,230,138,0.65)", marginTop: 6, fontWeight: 700 } }, "Show suitors on the big screen")), /* @__PURE__ */ React.createElement("button", { className: "role-btn player", onClick: () => onRole("player") }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "2.5rem", marginBottom: 10 } }, "\u{1F4F1}"), /* @__PURE__ */ React.createElement("div", { className: "caps", style: { fontSize: "0.55rem", color: "#fde68a", marginBottom: 4 } }, "Student / Phone"), /* @__PURE__ */ React.createElement("div", { className: "serif", style: { fontSize: "1.3rem", color: "#fff", fontWeight: 600 } }, "I'm a Guest"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.75rem", color: "rgba(253,230,138,0.65)", marginTop: 6, fontWeight: 700 } }, "Vote from your phone")))));
  }
  function Root() {
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get("role");
    const [role, setRole] = useState(urlRole || "host");
    const pickRole = (r) => {
      setRole(r);
      const p = new URLSearchParams(window.location.search);
      p.set("role", r);
      window.history.replaceState(null, "", "?" + p.toString());
    };
    if (!role) return /* @__PURE__ */ React.createElement(Landing, { onRole: pickRole });
    if (role === "host") return /* @__PURE__ */ React.createElement(HostApp, null);
    if (role === "player") return /* @__PURE__ */ React.createElement(PlayerApp, null);
    return /* @__PURE__ */ React.createElement(Landing, { onRole: pickRole });
  }
  var root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(/* @__PURE__ */ React.createElement(Root, null));
})();
