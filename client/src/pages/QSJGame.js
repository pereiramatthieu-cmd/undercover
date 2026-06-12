import React, { useState, useEffect } from "react";
import socket from "../socket";

const CATEGORIES = {
  manga: "Manga / Anime",
  celebrites: "Célébrités",
  cinema: "Cinéma",
  sport: "Sport",
  histoire: "Personnages historiques",
};

export default function QSJGame({ qsjState, myId, othersCharacters }) {
  const [question, setQuestion] = useState("");
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [myVote, setMyVote] = useState(null);
  const [guessInput, setGuessInput] = useState("");

  const phase = qsjState?.phase;
  const players = qsjState?.players || [];
  const isMyTurn = qsjState?.currentTurnPlayerId === myId;
  const currentPlayer = players.find((p) => p.id === qsjState?.currentTurnPlayerId);
  const votedPlayerIds = qsjState?.votedPlayerIds || [];
  const votes = qsjState?.votes || {};
  const hasVoted = votedPlayerIds.includes(myId);
  const wrongGuess = qsjState?.wrongGuess;

  useEffect(() => {
    setQuestion("");
    setQuestionSubmitted(false);
    setMyVote(null);
    setGuessInput("");
  }, [qsjState?.currentTurnPlayerId, phase]);

  const handleAsk = () => {
    if (!question.trim()) return;
    setQuestionSubmitted(true);
    socket.emit("qsj:ask", { question: question.trim() }, (res) => {
      if (res && !res.success) setQuestionSubmitted(false);
    });
  };

  const handleVote = (vote) => {
    if (hasVoted) return;
    setMyVote(vote);
    socket.emit("qsj:vote", { vote });
  };

  const handleGuess = () => {
    if (!guessInput.trim()) return;
    socket.emit("qsj:guess", { guess: guessInput.trim() });
  };

  const handlePass = () => {
    socket.emit("qsj:pass", {});
  };

  if (!qsjState) return null;

  return (
    <div className="page">
      <div className="page-inner gap-16 fade-in">

        {/* Badges top */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="badge badge-accent">
            Tour {qsjState.currentRound} / {qsjState.totalRounds}
          </span>
          <span className="badge" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
            {CATEGORIES[qsjState.category] || qsjState.category}
          </span>
        </div>

        {/* Current turn banner */}
        <div className="card" style={{ textAlign: "center", padding: "14px 20px" }}>
          {isMyTurn ? (
            <p style={{ fontWeight: 700, color: "var(--accent)", fontSize: "1rem" }}>
              C'est ton tour !
            </p>
          ) : (
            <p style={{ fontSize: "0.95rem" }}>
              Tour de <strong>{currentPlayer?.name}</strong>
            </p>
          )}
        </div>

        {/* Character board */}
        <div>
          <p className="section-label">Personnages en jeu</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {players.map((p) => {
              const char = p.id === myId ? null : (othersCharacters[p.id] || "???");
              const isActive = p.id === qsjState.currentTurnPlayerId;
              return (
                <div
                  key={p.id}
                  style={{
                    background: isActive ? "var(--surface2)" : "var(--surface)",
                    border: `1px solid ${isActive ? "rgba(124,106,247,0.4)" : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}>
                    {isActive && (
                      <span style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 700 }}>▶</span>
                    )}
                    {p.name}
                    {p.id === myId && (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 400 }}>(toi)</span>
                    )}
                  </span>
                  <span style={{
                    fontWeight: p.id === myId ? 800 : 600,
                    color: p.id === myId ? "var(--accent)" : "var(--text)",
                    fontStyle: p.id === myId ? "italic" : "normal",
                    fontSize: p.id === myId ? "1.1rem" : "0.9rem",
                    letterSpacing: p.id === myId ? "0.05em" : "normal",
                  }}>
                    {p.id === myId ? "???" : char}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wrong guess banner (visible to all during 2s delay) */}
        {wrongGuess && (
          <div style={{
            background: "rgba(240,98,146,0.1)",
            border: "1px solid rgba(240,98,146,0.35)",
            borderRadius: "var(--radius)",
            padding: "14px 18px",
            textAlign: "center",
          }}>
            <p style={{ color: "var(--accent2)", fontWeight: 700, fontSize: "0.95rem" }}>
              ✗ {wrongGuess.playerName} a tenté : « {wrongGuess.guess} »
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 4 }}>
              Mauvaise réponse — tour suivant...
            </p>
          </div>
        )}

        {/* Phase: questioning */}
        {phase === "questioning" && !wrongGuess && (
          isMyTurn ? (
            questionSubmitted ? (
              <div className="card gap-8" style={{ textAlign: "center" }}>
                <p style={{ color: "var(--accent)", fontWeight: 600 }}>✓ Question envoyée</p>
                <p className="text-muted pulse" style={{ fontSize: "0.85rem" }}>
                  En attente des votes du groupe...
                </p>
              </div>
            ) : (
              <div className="card gap-12">
                <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", textAlign: "center" }}>
                  Pose une question pour obtenir des indices sur ton personnage.
                </p>
                <input
                  className="input"
                  placeholder="Ex : Suis-je un personnage réel ?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                  maxLength={200}
                  autoFocus
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {question.length}/200
                  </span>
                  <button
                    className="btn btn-primary"
                    onClick={handleAsk}
                    disabled={!question.trim()}
                  >
                    Poser →
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="card" style={{ textAlign: "center", padding: "20px" }}>
              <p className="text-muted pulse" style={{ fontSize: "0.88rem" }}>
                <strong>{currentPlayer?.name}</strong> réfléchit à sa question...
              </p>
            </div>
          )
        )}

        {/* Phase: voting */}
        {phase === "voting" && (
          <div className="card gap-14">
            {/* Question */}
            <div style={{ textAlign: "center" }}>
              <p className="section-label" style={{ marginBottom: 6 }}>
                Question de {qsjState.currentQuestion?.askerName}
              </p>
              <p style={{
                fontFamily: "Syne, sans-serif",
                fontSize: "1.25rem",
                fontWeight: 800,
                lineHeight: 1.3,
              }}>
                « {qsjState.currentQuestion?.text} »
              </p>
            </div>

            {/* Vote progress */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {players.filter(p => p.id !== qsjState.currentTurnPlayerId).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: votedPlayerIds.includes(p.id) ? "var(--accent)" : "var(--border)",
                      transition: "background 0.2s",
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                {qsjState.voteCount} / {qsjState.totalVoters} votes
              </span>
            </div>

            {/* Vote UI */}
            {isMyTurn ? (
              <p className="text-center text-muted pulse" style={{ fontSize: "0.88rem" }}>
                En attente des votes du groupe...
              </p>
            ) : hasVoted ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  ✓ Tu as voté <strong style={{ color: myVote === "oui" ? "var(--citizen)" : "var(--accent2)" }}>
                    {myVote === "oui" ? "OUI" : "NON"}
                  </strong>
                </p>
                <p className="text-muted pulse" style={{ fontSize: "0.82rem" }}>
                  En attente des autres joueurs...
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center" }}>
                  Le personnage de <strong>{currentPlayer?.name}</strong> peut-il répondre OUI ?
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    className="btn btn-primary btn-full"
                    onClick={() => handleVote("oui")}
                    style={{ fontSize: "1.15rem", fontWeight: 800, letterSpacing: "0.08em", padding: "14px" }}
                  >
                    OUI
                  </button>
                  <button
                    className="btn btn-ghost btn-full"
                    onClick={() => handleVote("non")}
                    style={{ fontSize: "1.15rem", fontWeight: 800, letterSpacing: "0.08em", padding: "14px" }}
                  >
                    NON
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase: vote_reveal */}
        {phase === "vote_reveal" && !wrongGuess && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Question recap */}
            <div className="card gap-10">
              <div style={{ textAlign: "center" }}>
                <p className="section-label" style={{ marginBottom: 6 }}>
                  Question de {qsjState.currentQuestion?.askerName}
                </p>
                <p style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  lineHeight: 1.3,
                }}>
                  « {qsjState.currentQuestion?.text} »
                </p>
              </div>

              {/* Vote results */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                {players.filter((p) => p.id !== qsjState.currentTurnPlayerId).map((p) => {
                  const vote = votes[p.id];
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "var(--bg)",
                        borderRadius: "var(--radius)",
                        padding: "8px 12px",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {p.name}
                        {p.id === myId && (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}> (toi)</span>
                        )}
                      </span>
                      {vote ? (
                        <span style={{
                          fontWeight: 800,
                          fontSize: "1rem",
                          color: vote === "oui" ? "var(--citizen)" : "var(--accent2)",
                          letterSpacing: "0.05em",
                        }}>
                          {vote.toUpperCase()}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>—</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Majority summary */}
              {(() => {
                const oui = Object.values(votes).filter((v) => v === "oui").length;
                const non = Object.values(votes).filter((v) => v === "non").length;
                const total = oui + non;
                if (total === 0) return null;
                return (
                  <div style={{
                    display: "flex",
                    gap: 12,
                    justifyContent: "center",
                    marginTop: 4,
                    padding: "10px 0",
                    borderTop: "1px solid var(--border)",
                  }}>
                    <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, color: "var(--citizen)", fontSize: "1.1rem" }}>
                      {oui} OUI
                    </span>
                    <span style={{ color: "var(--border)" }}>·</span>
                    <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, color: "var(--accent2)", fontSize: "1.1rem" }}>
                      {non} NON
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Guess section — current player only */}
            {isMyTurn ? (
              <div className="card gap-12">
                <p className="section-label" style={{ textAlign: "center" }}>
                  As-tu deviné ton personnage ?
                </p>
                <input
                  className="input"
                  placeholder="Tape le nom du personnage..."
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGuess()}
                  maxLength={100}
                  autoFocus
                />
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>
                  Le prénom seul suffit — la casse et les accents sont ignorés
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn btn-ghost btn-full"
                    onClick={handlePass}
                  >
                    Passer
                  </button>
                  <button
                    className="btn btn-primary btn-full"
                    onClick={handleGuess}
                    disabled={!guessInput.trim()}
                  >
                    Deviner !
                  </button>
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: "center", padding: "16px" }}>
                <p className="text-muted pulse" style={{ fontSize: "0.88rem" }}>
                  <strong>{currentPlayer?.name}</strong> tente de deviner son personnage...
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
