import React, { useState, useEffect, useRef } from "react";
import socket from "../socket";

const THEMES = {
  manga: "Manga / Anime",
  cinema: "Cinéma",
  geographie: "Géographie",
  personnalites: "Personnalités",
  histoire: "Histoire",
  jeuxvideo: "Jeux vidéo",
  gastronomie: "Gastronomie",
  musique: "Musique",
  sport: "Sport",
  science: "Science",
};

export default function ClassementGame({ classementState, myId, secretNumber }) {
  const [answer, setAnswer] = useState("");
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [ranking, setRanking] = useState([]);
  const [rankingSubmitted, setRankingSubmitted] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const rankingInitRef = useRef(false);

  const phase = classementState?.phase;
  const answers = classementState?.answers || {};

  // Reset everything on new round
  useEffect(() => {
    setAnswer("");
    setAnswerSubmitted(false);
    setRankingSubmitted(false);
    setRanking([]);
    rankingInitRef.current = false;
  }, [classementState?.currentRound]);

  // Init ranking order once when entering ranking phase
  useEffect(() => {
    if (phase === "ranking" && !rankingInitRef.current) {
      rankingInitRef.current = true;
      const players = classementState?.players || [];
      setRanking(players);
    }
  }, [phase, classementState?.players, myId]);

  const handleAnswer = () => {
    if (!answer.trim()) return;
    setAnswerSubmitted(true);
    socket.emit("classement:answer", { answer: answer.trim() });
  };

  const handleSubmitRanking = () => {
    setRankingSubmitted(true);
    socket.emit("classement:rank", { ranking: ranking.map((p) => p.id) });
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    setRanking((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx) => {
    if (idx === ranking.length - 1) return;
    setRanking((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  // HTML5 drag-and-drop reorder
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setRanking((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  if (!classementState) return null;

  return (
    <div className="page">
      <div className="page-inner gap-16 fade-in">

        {/* Round + theme badges */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="badge badge-accent">
            Manche {classementState.currentRound} / {classementState.totalRounds}
          </span>
          <span className="badge" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
            {THEMES[classementState.theme] || classementState.theme}
          </span>
        </div>

        {/* Question */}
        <div className="card" style={{ textAlign: "center", gap: 8, display: "flex", flexDirection: "column" }}>
          <p className="section-label">Question</p>
          <p style={{
            fontFamily: "Syne, sans-serif",
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "var(--text)",
            lineHeight: 1.25,
          }}>
            {classementState.currentQuestion?.question ?? classementState.currentQuestion}
          </p>
          {classementState.currentQuestion?.echelle && (
            <p style={{ fontSize: "0.82rem", color: "var(--accent)", fontStyle: "italic", marginTop: 2 }}>
              {classementState.currentQuestion.echelle}
            </p>
          )}
        </div>

        {/* Secret number */}
        {secretNumber !== null && secretNumber !== undefined && (
          <div className="card" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 4 }}>
            <p className="section-label">Ton numéro secret</p>
            <div style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "4.5rem",
              fontWeight: 800,
              color: "var(--accent)",
              lineHeight: 1,
            }}>
              {secretNumber}
            </div>
            <p className="text-muted" style={{ fontSize: "0.82rem" }}>
              Réponds à la question de façon cohérente avec ce numéro, sans le révéler
            </p>
          </div>
        )}

        {/* ── Phase answering ── */}
        {phase === "answering" && (
          answerSubmitted ? (
            <div className="card gap-8">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "1.1rem" }}>✓</span>
                <span style={{ fontWeight: 600 }}>Réponse envoyée : « {answer} »</span>
              </div>
              <p className="text-muted pulse" style={{ fontSize: "0.85rem" }}>
                {classementState.answerCount} / {classementState.totalPlayers} joueurs ont répondu...
              </p>
            </div>
          ) : (
            <div className="card gap-12">
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", textAlign: "center" }}>
                Choisis une réponse qui reflète ton numéro sans le révéler directement
              </p>
              <input
                className="input"
                placeholder="Ta réponse..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnswer()}
                maxLength={150}
                autoFocus
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {answer.length}/150
                </span>
                <button
                  className="btn btn-primary"
                  onClick={handleAnswer}
                  disabled={!answer.trim()}
                >
                  Valider →
                </button>
              </div>
            </div>
          )
        )}

        {/* ── Phase ranking ── */}
        {phase === "ranking" && (
          <>
            {rankingSubmitted ? (
              <div className="card text-center gap-8">
                <p style={{ color: "var(--accent)", fontWeight: 600 }}>✓ Classement envoyé !</p>
                <p className="text-muted pulse" style={{ fontSize: "0.85rem" }}>
                  {classementState.rankingCount} / {classementState.totalPlayers} joueurs ont classé...
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <p className="section-label">Classe tous les joueurs (toi inclus)</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "right", lineHeight: 1.4 }}>
                    ← plus petit<br />plus grand →
                  </p>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: -4 }}>
                  Glisse ou utilise ▲ ▼ pour ordonner du plus petit numéro au plus grand.
                </p>

                {/* Ranking list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Position labels */}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700, opacity: 0.7 }}>
                      #1 — plus petit
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700, opacity: 0.7 }}>
                      #{ranking.length} — plus grand
                    </span>
                  </div>

                  {ranking.map((p, idx) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: dragIdx === idx ? "var(--surface2)" : "var(--surface)",
                        border: `1px solid ${dragIdx === idx ? "rgba(124,106,247,0.5)" : "var(--border)"}`,
                        borderRadius: "var(--radius)",
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        cursor: "grab",
                        transition: "background 0.12s, border-color 0.12s, box-shadow 0.12s",
                        boxShadow: dragIdx === idx ? "0 4px 16px rgba(124,106,247,0.15)" : "none",
                        userSelect: "none",
                      }}
                    >
                      {/* Rank badge */}
                      <span style={{
                        fontFamily: "Syne, sans-serif",
                        fontWeight: 800,
                        fontSize: "0.9rem",
                        color: "var(--accent)",
                        opacity: 0.65,
                        minWidth: 26,
                      }}>
                        #{idx + 1}
                      </span>

                      {/* Name + answer */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {p.name}
                          {p.id === myId && (
                            <span style={{ fontSize: "0.75rem", color: "var(--accent)", marginLeft: 6, fontWeight: 600 }}>
                              (toi)
                            </span>
                          )}
                        </div>
                        {answers[p.id] && (
                          <div style={{
                            color: "var(--text-muted)",
                            fontSize: "0.82rem",
                            marginTop: 2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}>
                            « {answers[p.id]} »
                          </div>
                        )}
                      </div>

                      {/* Drag handle + up/down buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span style={{ color: "var(--text-muted)", opacity: 0.4, fontSize: "1rem", cursor: "grab" }}>⠿</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <button
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: idx === 0 ? "default" : "pointer",
                              padding: "2px 5px",
                              color: idx === 0 ? "var(--border)" : "var(--text-muted)",
                              fontSize: "0.85rem",
                              lineHeight: 1,
                              borderRadius: 4,
                              transition: "color 0.12s",
                            }}
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveDown(idx)}
                            disabled={idx === ranking.length - 1}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: idx === ranking.length - 1 ? "default" : "pointer",
                              padding: "2px 5px",
                              color: idx === ranking.length - 1 ? "var(--border)" : "var(--text-muted)",
                              fontSize: "0.85rem",
                              lineHeight: 1,
                              borderRadius: 4,
                              transition: "color 0.12s",
                            }}
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-primary btn-full"
                  onClick={handleSubmitRanking}
                  disabled={ranking.length === 0}
                >
                  Confirmer mon classement →
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
