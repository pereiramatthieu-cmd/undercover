import React, { useState, useEffect, useRef } from "react";
import socket from "../socket";

function TimerBar({ seconds, total = 20 }) {
  const pct = Math.max(0, (seconds / total) * 100);
  return (
    <div className="timer-bar-wrap">
      <div className="timer-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Game({ gameState, myWord, myRole, myId, playerName, onGoHome }) {
  const [hint, setHint] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [votedFor, setVotedFor] = useState(null);
  const [voteCount, setVoteCount] = useState({ count: 0, total: 0 });
  const [showWord, setShowWord] = useState(true);
  const timerRef = useRef(null);

  const isMyTurn = gameState?.currentTurn === myId;
  const isVoting = gameState?.state === "voting";

  // Timer countdown when it's my turn
  useEffect(() => {
    if (isMyTurn && !submitted && gameState?.state === "playing") {
      setTimeLeft(45);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { clearInterval(timerRef.current); return 0; }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isMyTurn, gameState?.currentTurn, submitted, gameState?.state]);

  // Reset submitted when turn changes
  useEffect(() => {
    setSubmitted(false);
    setHint("");
    setTimeLeft(45);
  }, [gameState?.currentTurn, gameState?.round]);

  useEffect(() => {
    socket.on("game:votes_count", (data) => setVoteCount(data));
    return () => socket.off("game:votes_count");
  }, []);

  const handleSubmitHint = () => {
    if (!hint.trim()) return;
    setSubmitted(true);
    socket.emit("game:hint", { hint });
  };

  const handleVote = (targetId) => {
    if (votedFor) return;
    setVotedFor(targetId);
    socket.emit("game:vote", { targetId });
  };

  if (!gameState) return null;

  const players = gameState.players || [];
  const hints = gameState.hints || [];
  const round = gameState.round || 1;
  const currentPlayer = players.find((p) => p.id === gameState.currentTurn);

  const round1Hints = hints.filter((h) => h.round === 1);
  const round2Hints = hints.filter((h) => h.round === 2);

  // ── VOTING PHASE ──
  if (isVoting) {
    return (
      <div className="page" style={{ position: "relative" }}>
        <button
          className="btn btn-ghost"
          onClick={onGoHome}
          style={{ position: "absolute", top: 16, left: 16, fontSize: "0.82rem", padding: "6px 12px" }}
        >
          ← Menu
        </button>
        <div className="page-inner gap-24 fade-in">
          <div className="text-center gap-8">
            <span className="badge badge-accent">Phase de vote</span>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.5rem" }}>
              Qui est l'undercover ?
            </h2>
            <p className="text-muted">Vote pour le joueur que tu soupçonnes</p>
          </div>

          {/* Recap hints */}
          {[1, 2].map((r) => {
            const rHints = hints.filter((h) => h.round === r);
            if (!rHints.length) return null;
            return (
              <div key={r}>
                <p className="section-label">Tour {r}</p>
                <div className="hint-list">
                  {rHints.map((h, i) => (
                    <div key={i} className={`hint-item${h.playerId === myId ? " mine" : ""}`}>
                      <span className="hint-author">{h.playerName}</span>
                      <span className="hint-text">{h.hint}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="divider" />

          {/* Vote grid */}
          {!votedFor ? (
            <div>
              <p className="section-label">Ton vote</p>
              <div className="vote-grid">
                {players.filter((p) => p.id !== myId).map((p) => (
                  <button
                    key={p.id}
                    className={`vote-card${votedFor === p.id ? " selected" : ""}`}
                    onClick={() => handleVote(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="card text-center gap-8">
              <p style={{ color: "var(--accent)", fontWeight: 600 }}>
                Vote envoyé pour <strong>{players.find((p) => p.id === votedFor)?.name}</strong>
              </p>
              <p className="text-muted pulse">
                En attente des autres votes... ({voteCount.count}/{voteCount.total})
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PLAYING PHASE ──
  return (
    <div className="page" style={{ position: "relative" }}>
      <button
        className="btn btn-ghost"
        onClick={onGoHome}
        style={{ position: "absolute", top: 16, left: 16, fontSize: "0.82rem", padding: "6px 12px" }}
      >
        ← Menu
      </button>
      <div className="page-inner gap-16 fade-in">
        {/* Round + word */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="badge badge-accent">Tour {round} / 2</span>
          {myRole && (
            <span className={`badge badge-${myRole}`}>
              {myRole === "citizen" ? "Citoyen" : "Undercover"}
            </span>
          )}
        </div>

        {/* Word reveal */}
        {myWord && showWord && (
          <div className="word-reveal fade-in">
            <p className="section-label">Ton mot secret</p>
            <div className="word-big">{myWord}</div>
            <button className="btn btn-ghost mt-8" style={{ fontSize: "0.82rem", padding: "8px 16px" }} onClick={() => setShowWord(false)}>
              Masquer
            </button>
          </div>
        )}
        {myWord && !showWord && (
          <button className="btn btn-ghost" onClick={() => setShowWord(true)} style={{ alignSelf: "flex-start", fontSize: "0.82rem" }}>
            👁 Voir mon mot
          </button>
        )}

        {/* Current turn */}
        <div className="card">
          {isMyTurn ? (
            <div className="gap-16">
              <div>
                <p className="turn-label">C'est ton tour !</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Temps restant</span>
                  <span style={{ fontFamily: "Syne", fontWeight: 700, color: timeLeft <= 5 ? "var(--accent2)" : "var(--accent)", fontSize: "1.1rem" }}>
                    {timeLeft}s
                  </span>
                </div>
                <div className="mt-8">
                  <TimerBar seconds={timeLeft} total={45} />
                </div>
              </div>

              {!submitted ? (
                <div className="gap-8">
                  <input
                    className="input"
                    placeholder="Donne un indice sur ton mot..."
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitHint()}
                    maxLength={80}
                    autoFocus
                  />
                  <button className="btn btn-primary btn-full" onClick={handleSubmitHint} disabled={!hint.trim()}>
                    Envoyer mon indice
                  </button>
                </div>
              ) : (
                <p style={{ textAlign: "center", color: "var(--accent)", fontWeight: 600 }}>
                  ✓ Indice envoyé !
                </p>
              )}
            </div>
          ) : (
            <div className="text-center gap-8">
              <p className="turn-label">En train de répondre</p>
              <p className="turn-name">{currentPlayer?.name || "..."}</p>
              <div className="mt-8">
                <div className="timer-bar-wrap">
                  <div className="timer-bar pulse" style={{ width: "60%" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hints so far */}
        {(round1Hints.length > 0 || round2Hints.length > 0) && (
          <div className="gap-16">
            {round1Hints.length > 0 && (
              <div>
                <p className="section-label">Indices — Tour 1</p>
                <div className="hint-list">
                  {round1Hints.map((h, i) => (
                    <div key={i} className={`hint-item${h.playerId === myId ? " mine" : ""}`}>
                      <span className="hint-author">{h.playerName}</span>
                      <span className="hint-text">{h.hint}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {round2Hints.length > 0 && (
              <div>
                <p className="section-label">Indices — Tour 2</p>
                <div className="hint-list">
                  {round2Hints.map((h, i) => (
                    <div key={i} className={`hint-item${h.playerId === myId ? " mine" : ""}`}>
                      <span className="hint-author">{h.playerName}</span>
                      <span className="hint-text">{h.hint}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
