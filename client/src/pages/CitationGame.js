import React, { useState, useEffect, useRef } from "react";
import socket from "../socket";

const CATEGORIES = {
  aleatoire: "Aléatoire",
  shonen: "Shōnen",
  shojo: "Shōjo",
  seinen: "Seinen",
};

const PHASE1_DURATION = 15000;
const PHASE2_DURATION = 15000;

function TimerBar({ startTime, duration, phase }) {
  const [pct, setPct] = useState(100);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!startTime) { setPct(0); return; }

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setPct((remaining / duration) * 100);
      if (remaining > 0) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [startTime, duration, phase]);

  const isUrgent = pct < 30;

  return (
    <div style={{
      height: 4,
      background: "var(--border)",
      borderRadius: 4,
      overflow: "hidden",
    }}>
      <div style={{
        height: "100%",
        width: `${pct}%`,
        background: isUrgent ? "var(--accent2)" : "var(--accent)",
        transition: "background 0.3s",
        borderRadius: 4,
      }} />
    </div>
  );
}

function CountdownLabel({ startTime, duration }) {
  const [secs, setSecs] = useState(Math.ceil(duration / 1000));
  const rafRef = useRef(null);

  useEffect(() => {
    if (!startTime) return;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setSecs(remaining);
      if (remaining > 0) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [startTime, duration]);

  return (
    <span style={{
      fontFamily: "Syne, sans-serif",
      fontWeight: 800,
      color: secs <= 5 ? "var(--accent2)" : "var(--accent)",
      fontSize: "1.1rem",
      minWidth: 28,
      textAlign: "right",
      transition: "color 0.3s",
    }}>
      {secs}s
    </span>
  );
}

export default function CitationGame({ citationState, myId }) {
  const [freeAnswer, setFreeAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);

  const phase = citationState?.phase;
  const answeredPlayerIds = citationState?.answeredPlayerIds || [];
  const hasAnswered = answeredPlayerIds.includes(myId);
  const isHost = (citationState?.players || []).find((p) => p.id === myId)?.isHost;

  // Reset on new round
  useEffect(() => {
    setFreeAnswer("");
    setSubmitted(false);
    setSelectedChoice(null);
  }, [citationState?.currentRound]);

  const handleFreeSubmit = () => {
    if (!freeAnswer.trim() || submitted) return;
    setSubmitted(true);
    socket.emit("citation:answer_free", { answer: freeAnswer.trim() }, (res) => {
      if (res && !res.success) setSubmitted(false);
    });
  };

  const handleChoice = (idx) => {
    if (hasAnswered) return;
    setSelectedChoice(idx);
    socket.emit("citation:answer_choice", { choiceIndex: idx });
  };

  if (!citationState) return null;

  const players = citationState.players || [];
  const options = citationState.options || [];
  const answers = citationState.answers || {};
  const roundScores = citationState.roundScores || {};
  const citation = citationState.currentCitation;
  const isReveal = phase === "reveal";
  const myAnswer = answers[myId];

  return (
    <div className="page">
      <div className="page-inner gap-16 fade-in">

        {/* Badges */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="badge badge-accent">
            Manche {citationState.currentRound} / {citationState.totalRounds}
          </span>
          <span className="badge" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
            {CATEGORIES[citationState.category] || citationState.category}
          </span>
        </div>

        {/* Citation card */}
        {citation && (
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}>
            <p style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "1.35rem",
              fontWeight: 800,
              lineHeight: 1.45,
              color: "var(--text)",
              fontStyle: "italic",
            }}>
              « {citation.quote} »
            </p>
            {isReveal && (
              <div style={{
                paddingTop: 12,
                borderTop: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}>
                <p style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--accent)" }}>
                  — {citation.character}
                </p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {citation.manga}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Phase 1 ── */}
        {phase === "phase1" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Timer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Phase 1 — Réponse libre
              </span>
              <CountdownLabel startTime={citationState.phase1StartTime} duration={PHASE1_DURATION} />
            </div>
            <TimerBar startTime={citationState.phase1StartTime} duration={PHASE1_DURATION} phase="phase1" />

            {/* Answer progress */}
            <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "flex-end" }}>
              {players.map((p) => (
                <div key={p.id} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: answeredPlayerIds.includes(p.id) ? "var(--accent)" : "var(--border)",
                  transition: "background 0.2s",
                }} />
              ))}
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: 4 }}>
                {citationState.answerCount}/{citationState.totalPlayers}
              </span>
            </div>

            {/* Input */}
            {!hasAnswered ? (
              <div className="card gap-10">
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center" }}>
                  Qui a dit cette citation ? (prénom seul accepté)
                </p>
                <input
                  className="input"
                  placeholder="Ex: Naruto, Luffy, Goku..."
                  value={freeAnswer}
                  onChange={(e) => setFreeAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFreeSubmit()}
                  maxLength={100}
                  autoFocus
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    +600 à +1000 pts · Phase 2 si tu ne sais pas
                  </span>
                  <button
                    className="btn btn-primary"
                    onClick={handleFreeSubmit}
                    disabled={!freeAnswer.trim() || submitted}
                  >
                    Valider →
                  </button>
                </div>
              </div>
            ) : (
              <div className="card text-center gap-6">
                <p style={{ color: "var(--accent)", fontWeight: 700 }}>✓ Réponse envoyée !</p>
                <p className="text-muted pulse" style={{ fontSize: "0.82rem" }}>
                  En attente des autres joueurs...
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Phase 2 ── */}
        {phase === "phase2" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Timer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Phase 2 — Propositions
              </span>
              <CountdownLabel startTime={citationState.phase2StartTime} duration={PHASE2_DURATION} />
            </div>
            <TimerBar startTime={citationState.phase2StartTime} duration={PHASE2_DURATION} phase="phase2" />

            {/* Answer progress */}
            <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "flex-end" }}>
              {players.map((p) => (
                <div key={p.id} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: answeredPlayerIds.includes(p.id) ? "var(--accent)" : "var(--border)",
                  transition: "background 0.2s",
                }} />
              ))}
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: 4 }}>
                {citationState.answerCount}/{citationState.totalPlayers}
              </span>
            </div>

            {/* Already answered in phase 1 */}
            {answeredPlayerIds.includes(myId) && selectedChoice === null ? (
              <div className="card text-center gap-6">
                <p style={{ color: "var(--accent)", fontWeight: 700 }}>✓ Réponse soumise en phase 1</p>
                <p className="text-muted pulse" style={{ fontSize: "0.82rem" }}>
                  En attente des autres joueurs...
                </p>
              </div>
            ) : selectedChoice !== null ? (
              <div className="card text-center gap-6">
                <p style={{ color: "var(--accent)", fontWeight: 700 }}>
                  ✓ Tu as choisi : « {options[selectedChoice]?.character} »
                </p>
                <p className="text-muted pulse" style={{ fontSize: "0.82rem" }}>
                  En attente des autres joueurs...
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center" }}>
                  Choisissez parmi les propositions · +200 à +400 pts
                </p>
                {options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChoice(idx)}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      padding: "14px 18px",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      transition: "all 0.15s",
                      fontFamily: "Inter, sans-serif",
                      color: "var(--text)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(124,106,247,0.5)";
                      e.currentTarget.style.background = "var(--surface2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "var(--surface)";
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>{opt.character}</span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{opt.manga}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Reveal ── */}
        {isReveal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* My result highlight */}
            {myAnswer && (
              <div style={{
                background: myAnswer.correct ? "rgba(74,222,128,0.08)" : myAnswer.points === 0 ? "var(--surface)" : "rgba(240,98,146,0.08)",
                border: `1px solid ${myAnswer.correct ? "rgba(74,222,128,0.4)" : myAnswer.points === 0 ? "var(--border)" : "rgba(240,98,146,0.35)"}`,
                borderRadius: "var(--radius)",
                padding: "14px 18px",
                textAlign: "center",
              }}>
                <p style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 800,
                  fontSize: "1.5rem",
                  color: myAnswer.correct ? "var(--citizen)" : myAnswer.points === 0 ? "var(--text-muted)" : "var(--accent2)",
                }}>
                  {myAnswer.points > 0 ? `+${myAnswer.points}` : myAnswer.points === 0 ? "0" : myAnswer.points} pts
                </p>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {myAnswer.correct ? `Bonne réponse en phase ${myAnswer.phase === "phase1" ? "1" : "2"} !`
                    : myAnswer.phase === null ? "Pas de réponse" : "Mauvaise réponse"}
                </p>
              </div>
            )}

            {/* All answers */}
            <div>
              <p className="section-label">Réponses de tous</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {players.map((p) => {
                  const ans = answers[p.id];
                  const pts = roundScores[p.id] ?? 0;
                  const isMe = p.id === myId;

                  let displayAnswer = "—";
                  if (ans) {
                    if (ans.phase === "phase1") {
                      displayAnswer = ans.answer || "—";
                    } else if (ans.phase === "phase2") {
                      const opt = options[ans.choiceIndex];
                      displayAnswer = opt ? opt.character : "—";
                    }
                  }

                  return (
                    <div
                      key={p.id}
                      style={{
                        background: "var(--surface2)",
                        border: `1px solid ${isMe ? "rgba(124,106,247,0.35)" : "var(--border)"}`,
                        borderRadius: "var(--radius)",
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      {/* Correct/wrong indicator */}
                      <span style={{
                        fontSize: "1rem",
                        minWidth: 20,
                        textAlign: "center",
                        flexShrink: 0,
                      }}>
                        {ans?.correct ? "✓" : ans?.phase === null ? "—" : "✗"}
                      </span>

                      {/* Name + answer */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                          {p.name}
                          {isMe && <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginLeft: 5 }}>(toi)</span>}
                          {ans?.phase === "phase1" && (
                            <span style={{ marginLeft: 6, fontSize: "0.72rem", color: "var(--accent)", fontWeight: 700 }}>P1</span>
                          )}
                          {ans?.phase === "phase2" && (
                            <span style={{ marginLeft: 6, fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>P2</span>
                          )}
                        </span>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {displayAnswer}
                        </div>
                      </div>

                      {/* Points */}
                      <span style={{
                        fontFamily: "Syne, sans-serif",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        color: pts > 0 ? "var(--accent)" : pts < 0 ? "var(--accent2)" : "var(--text-muted)",
                        flexShrink: 0,
                      }}>
                        {pts > 0 ? `+${pts}` : pts}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leaderboard */}
            <div>
              <p className="section-label">Classement</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...players].sort((a, b) => b.score - a.score).map((p, i) => {
                  const maxScore = Math.max(...players.map((pl) => pl.score), 1);
                  const pct = (p.score / maxScore) * 100;
                  return (
                    <div
                      key={p.id}
                      style={{
                        background: "var(--surface2)",
                        border: `1px solid ${i === 0 && p.score > 0 ? "rgba(124,106,247,0.3)" : "var(--border)"}`,
                        borderRadius: "var(--radius)",
                        padding: "10px 14px",
                      }}
                    >
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

            {/* Next round */}
            {isHost ? (
              <button
                className="btn btn-primary btn-full"
                onClick={() => socket.emit("citation:next_round", {})}
              >
                {citationState.currentRound >= citationState.totalRounds ? "Voir les résultats" : "Manche suivante →"}
              </button>
            ) : (
              <p className="text-center text-muted pulse" style={{ fontSize: "0.88rem" }}>
                En attente de l'hôte...
              </p>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
