import React, { useState, useEffect, useRef } from "react";
import socket from "../socket";

const COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#3b82f6", "#a855f7",
  "#ec4899", "#92400e",
];

const CANVAS_W = 600;
const CANVAS_H = 450;

function TimerArc({ startTime, duration }) {
  const [pct, setPct] = useState(1);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!startTime) return;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setPct(remaining / duration);
      if (remaining > 0) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [startTime, duration]);

  const secs = Math.ceil(pct * (duration / 1000));
  const isUrgent = secs <= 15;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        height: 6, flex: 1, background: "var(--border)", borderRadius: 4, overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${pct * 100}%`,
          background: isUrgent ? "var(--accent2)" : "var(--accent)",
          transition: "background 0.3s",
          borderRadius: 4,
        }} />
      </div>
      <span style={{
        fontFamily: "Syne, sans-serif", fontWeight: 800, minWidth: 36,
        color: isUrgent ? "var(--accent2)" : "var(--accent)",
        fontSize: "1rem", textAlign: "right",
      }}>
        {secs}s
      </span>
    </div>
  );
}

export default function DessinGame({ dessinState, myId, secretCharacter }) {
  const canvasRef = useRef(null);
  const lastPointRef = useRef(null);
  const lastEmitRef = useRef(0);

  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(4);
  const [guess, setGuess] = useState("");
  const [guessError, setGuessError] = useState("");
  const [found, setFound] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  const phase = dessinState?.phase;
  const isDrawer = dessinState?.drawerId === myId;

  // Init canvas white on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }, []);

  // Clear canvas + reset guess state on new round
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    lastPointRef.current = null;
    setGuess("");
    setGuessError("");
    setFound(false);
    setAttemptsLeft(3);
  }, [dessinState?.currentRound]);

  // Receive strokes from drawer (non-drawers)
  useEffect(() => {
    const handleStroke = (data) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      if (data.type === "clear") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        lastPointRef.current = null;
        return;
      }

      const x = data.x * CANVAS_W;
      const y = data.y * CANVAS_H;

      if (data.type === "start") {
        ctx.strokeStyle = data.tool === "eraser" ? "#ffffff" : data.color;
        ctx.lineWidth = data.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        lastPointRef.current = { x, y };
      } else if (data.type === "move" && lastPointRef.current) {
        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        lastPointRef.current = { x, y };
      } else if (data.type === "end") {
        lastPointRef.current = null;
      }
    };
    socket.on("dessin:stroke", handleStroke);
    return () => socket.off("dessin:stroke", handleStroke);
  }, []);

  // ── Drawing handlers (drawer only) ─────────────────────────────────

  const getCanvasPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      nx: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      ny: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const startDraw = (e) => {
    if (!isDrawer || phase !== "drawing") return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const { nx, ny } = getCanvasPos(e, canvas);
    const ctx = canvas.getContext("2d");
    const actualColor = tool === "eraser" ? "#ffffff" : color;
    const actualSize = tool === "eraser" ? size * 4 : size;
    ctx.strokeStyle = actualColor;
    ctx.lineWidth = actualSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    lastPointRef.current = { x: nx * CANVAS_W, y: ny * CANVAS_H };
    setIsDrawing(true);
    socket.emit("dessin:draw", { type: "start", x: nx, y: ny, color, size: actualSize, tool });
  };

  const doDraw = (e) => {
    if (!isDrawing || !isDrawer || phase !== "drawing") return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const { nx, ny } = getCanvasPos(e, canvas);
    const x = nx * CANVAS_W;
    const y = ny * CANVAS_H;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPointRef.current = { x, y };
    const now = Date.now();
    if (now - lastEmitRef.current >= 16) {
      socket.emit("dessin:draw", { type: "move", x: nx, y: ny });
      lastEmitRef.current = now;
    }
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;
    socket.emit("dessin:draw", { type: "end" });
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    socket.emit("dessin:clear");
  };

  // ── Guess handler (non-drawers) ─────────────────────────────────────

  const handleGuess = () => {
    if (!guess.trim() || found || attemptsLeft <= 0) return;
    setGuessError("");
    socket.emit("dessin:guess", { guess: guess.trim() }, (res) => {
      if (!res) return;
      if (res.correct) {
        setFound(true);
        setGuess("");
      } else {
        const left = res.attemptsLeft ?? attemptsLeft - 1;
        setAttemptsLeft(left);
        if (left <= 0) setGuessError("Plus de tentatives disponibles.");
        else setGuessError(`Mauvaise réponse — ${left} tentative${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""}`);
        setGuess("");
      }
    });
  };

  if (!dessinState) return null;

  const players = dessinState.players || [];
  const foundIds = dessinState.foundPlayerIds || [];
  const foundNames = dessinState.foundPlayerNames || [];
  const isReveal = phase === "reveal";
  const char = dessinState.currentCharacter;
  const alreadyFoundInState = foundIds.includes(myId);

  return (
    <div className="page">
      <div className="page-inner gap-12 fade-in" style={{ maxWidth: 640 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span className="badge badge-accent">
            Manche {dessinState.currentRound} / {dessinState.totalRounds}
          </span>
          <span style={{ fontSize: "0.88rem", color: "var(--text-muted)", fontWeight: 600 }}>
            {isDrawer ? "Tu dessines !" : (
              <span>
                <span style={{ color: "var(--accent)", fontWeight: 700 }}>{dessinState.drawerName}</span>
                {" dessine..."}
              </span>
            )}
          </span>
        </div>

        {/* Timer */}
        {phase === "drawing" && (
          <TimerArc startTime={dessinState.roundStartTime} duration={60000} />
        )}

        {/* Secret character for drawer */}
        {isDrawer && phase === "drawing" && secretCharacter && (
          <div style={{
            background: "rgba(124,106,247,0.08)", border: "1px solid rgba(124,106,247,0.4)",
            borderRadius: "var(--radius)", padding: "12px 16px", textAlign: "center",
          }}>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>Personnage à dessiner</p>
            <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.3rem", color: "var(--accent)" }}>
              {secretCharacter.character}
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{secretCharacter.manga}</p>
          </div>
        )}

        {/* Canvas */}
        <div style={{ position: "relative", width: "100%", userSelect: "none" }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{
              width: "100%",
              display: "block",
              borderRadius: "var(--radius)",
              border: `2px solid ${isDrawer && phase === "drawing" ? "rgba(124,106,247,0.5)" : "var(--border)"}`,
              cursor: isDrawer && phase === "drawing" ? (tool === "eraser" ? "cell" : "crosshair") : "default",
              touchAction: "none",
              background: "#ffffff",
            }}
            onMouseDown={startDraw}
            onMouseMove={doDraw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={doDraw}
            onTouchEnd={endDraw}
          />
          {/* Reveal overlay */}
          {isReveal && char && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "rgba(0,0,0,0.72)",
              borderRadius: "0 0 var(--radius) var(--radius)",
              padding: "16px", textAlign: "center",
            }}>
              <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.2rem", color: "#ffffff" }}>
                {char.character}
              </p>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{char.manga}</p>
            </div>
          )}
        </div>

        {/* Drawing tools (drawer + drawing phase) */}
        {isDrawer && phase === "drawing" && (
          <div className="card gap-12">
            {/* Color palette */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setTool("pencil"); }}
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: c,
                    border: color === c && tool === "pencil" ? "3px solid var(--accent)" : "2px solid var(--border)",
                    cursor: "pointer", padding: 0, flexShrink: 0,
                    boxShadow: c === "#ffffff" ? "inset 0 0 0 1px rgba(0,0,0,0.15)" : "none",
                  }}
                />
              ))}
            </div>
            {/* Size + tools */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {[2, 4, 8].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`btn ${size === s ? "btn-primary" : "btn-ghost"}`}
                    style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                  >
                    {s === 2 ? "Fin" : s === 4 ? "Moyen" : "Épais"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setTool(tool === "eraser" ? "pencil" : "eraser")}
                className={`btn ${tool === "eraser" ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
              >
                {tool === "eraser" ? "✕ Gomme" : "Gomme"}
              </button>
              <button
                onClick={handleClear}
                className="btn btn-ghost"
                style={{ padding: "6px 12px", fontSize: "0.8rem", color: "var(--accent2)" }}
              >
                Effacer tout
              </button>
            </div>
          </div>
        )}

        {/* Guess input (non-drawer + drawing phase) */}
        {!isDrawer && phase === "drawing" && (
          <div className="card gap-10">
            {found || alreadyFoundInState ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "var(--citizen)", fontWeight: 700, fontSize: "1rem" }}>✓ Tu as trouvé !</p>
                <p className="text-muted pulse" style={{ fontSize: "0.82rem", marginTop: 4 }}>En attente des autres...</p>
              </div>
            ) : attemptsLeft <= 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                Plus de tentatives — attends la fin du round.
              </p>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input"
                    placeholder="Qui est ce personnage ?"
                    value={guess}
                    onChange={(e) => { setGuess(e.target.value); setGuessError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleGuess()}
                    maxLength={60}
                    autoComplete="off"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleGuess}
                    disabled={!guess.trim()}
                  >
                    →
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {guessError
                    ? <p style={{ color: "var(--accent2)", fontSize: "0.8rem" }}>{guessError}</p>
                    : <span />
                  }
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {attemptsLeft}/3 tentatives
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Found players */}
        {phase === "drawing" && foundNames.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {foundNames.map((name, i) => (
              <span key={i} style={{
                background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.35)",
                borderRadius: "var(--radius)", padding: "4px 10px",
                fontSize: "0.82rem", color: "var(--citizen)", fontWeight: 600,
              }}>
                ✓ {name} a trouvé !
              </span>
            ))}
          </div>
        )}

        {/* Reveal: scores */}
        {isReveal && (
          <div>
            <p className="section-label">Points de la manche</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {players.map((p) => {
                const scores = dessinState.roundScores || {};
                const pts = scores[p.id] ?? 0;
                const isMe = p.id === myId;
                const isDrawerP = p.id === dessinState.drawerId;
                return (
                  <div key={p.id} style={{
                    background: "var(--surface2)",
                    border: `1px solid ${isMe ? "rgba(124,106,247,0.35)" : "var(--border)"}`,
                    borderRadius: "var(--radius)", padding: "10px 14px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontWeight: 700 }}>
                        {p.name}
                        {isMe && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: 6 }}>(toi)</span>}
                      </span>
                      {isDrawerP && (
                        <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 700,
                          background: "rgba(124,106,247,0.12)", borderRadius: 4, padding: "1px 6px" }}>
                          dessinateur
                        </span>
                      )}
                      {!isDrawerP && foundIds.includes(p.id) && (
                        <span style={{ fontSize: "0.72rem", color: "var(--citizen)" }}>✓ trouvé</span>
                      )}
                    </div>
                    <span style={{
                      fontFamily: "Syne, sans-serif", fontWeight: 800,
                      color: pts > 0 ? "var(--accent)" : "var(--text-muted)", fontSize: "0.95rem",
                    }}>
                      {pts > 0 ? `+${pts}` : "0"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leaderboard in reveal */}
        {isReveal && (
          <div>
            <p className="section-label">Classement</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...players].sort((a, b) => b.score - a.score).map((p, i) => {
                const maxScore = Math.max(...players.map((pl) => pl.score), 1);
                const pct = (p.score / maxScore) * 100;
                return (
                  <div key={p.id} style={{
                    background: "var(--surface2)",
                    border: `1px solid ${i === 0 && p.score > 0 ? "rgba(124,106,247,0.3)" : "var(--border)"}`,
                    borderRadius: "var(--radius)", padding: "10px 14px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.82rem", minWidth: 22, fontWeight: 600 }}>
                          #{i + 1}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                          {p.name}
                          {p.id === myId && <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginLeft: 4 }}>(toi)</span>}
                        </span>
                      </div>
                      <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: "var(--accent)", fontSize: "0.95rem" }}>
                        {p.score} pts
                      </span>
                    </div>
                    <div className="tally-bar-wrap">
                      <div className="tally-bar" style={{ width: `${Math.max(0, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next round button */}
        {isReveal && (() => {
          const isHost = players.find((p) => p.id === myId)?.isHost;
          return isHost ? (
            <button
              className="btn btn-primary btn-full"
              onClick={() => socket.emit("dessin:next_round", {})}
            >
              {dessinState.currentRound >= dessinState.totalRounds ? "Voir les résultats" : "Manche suivante →"}
            </button>
          ) : (
            <p className="text-center text-muted pulse" style={{ fontSize: "0.88rem" }}>
              En attente de l'hôte...
            </p>
          );
        })()}

      </div>
    </div>
  );
}
