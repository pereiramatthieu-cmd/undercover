import React from "react";
import socket from "../socket";

export default function NoteResults({ noteState, myId }) {
  if (!noteState) return null;

  const { players = [], secretNote, guesses = {}, roundWinners = [], currentRound, totalRounds, maitre } = noteState;
  const isHost = players.find((p) => p.id === myId)?.isHost;
  const isLastRound = currentRound >= totalRounds;
  const maitrePlayer = players.find((p) => p.id === maitre);
  const isGameOver = noteState.state === "gameover";

  const handleNextRound = () => {
    socket.emit("note:next_round", {});
  };

  const guessers = players.filter((p) => p.id !== maitre);
  const sortedGuessers = [...guessers].sort((a, b) => {
    const da = guesses[a.id] !== undefined ? Math.abs(guesses[a.id] - secretNote) : Infinity;
    const db = guesses[b.id] !== undefined ? Math.abs(guesses[b.id] - secretNote) : Infinity;
    return da - db;
  });

  const sortedByScore = [...players].sort((a, b) => b.score - a.score);
  const maxScore = sortedByScore[0]?.score || 0;

  return (
    <div className="page">
      <div className="page-inner gap-24 fade-in">

        {/* Header */}
        <div className="text-center gap-8">
          <span className="badge badge-accent">
            Manche {currentRound} / {totalRounds}
          </span>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.5rem", fontWeight: 800 }}>
            {isGameOver || isLastRound ? "Partie terminée !" : "Résultats de la manche"}
          </h2>
        </div>

        {/* Note secrète */}
        <div className="card" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
          <p className="section-label">
            La note secrète de {maitrePlayer?.name}
          </p>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: "5rem", fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>
            {secretNote}
          </div>
        </div>

        {/* Propositions */}
        <div>
          <p className="section-label">Propositions</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sortedGuessers.map((p) => {
              const playerGuess = guesses[p.id];
              const diff = playerGuess !== undefined ? Math.abs(playerGuess - secretNote) : null;
              const isWinner = roundWinners.includes(p.id);
              const isExact = diff === 0;

              return (
                <div
                  key={p.id}
                  style={{
                    background: "var(--surface2)",
                    border: `1px solid ${isWinner ? "rgba(124,106,247,0.5)" : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {isWinner && <span className="badge badge-accent">+1 pt</span>}
                    <span style={{ fontWeight: 600 }}>
                      {p.name}
                      {p.id === myId && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}> (toi)</span>
                      )}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: "0.82rem", color: isExact ? "var(--citizen)" : "var(--text-muted)" }}>
                      {diff === null ? "—" : isExact ? "Exact !" : `écart : ${diff}`}
                    </span>
                    <span style={{
                      fontFamily: "Syne, sans-serif",
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      color: isWinner ? "var(--accent)" : "var(--text)",
                      minWidth: 28,
                      textAlign: "right",
                    }}>
                      {playerGuess ?? "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Classement cumulé */}
        <div>
          <p className="section-label">Classement général</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sortedByScore.map((p, i) => {
              const pct = maxScore > 0 ? (p.score / maxScore) * 100 : 0;
              const isLeader = i === 0 && p.score > 0;
              return (
                <div
                  key={p.id}
                  style={{
                    background: "var(--surface2)",
                    border: `1px solid ${isLeader ? "rgba(124,106,247,0.3)" : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    padding: "12px 16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", minWidth: 22, fontWeight: 600 }}>
                        #{i + 1}
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        {p.name}
                        {p.id === myId && (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}> (toi)</span>
                        )}
                      </span>
                    </div>
                    <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: "var(--accent)" }}>
                      {p.score} pt{p.score !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="tally-bar-wrap">
                    <div className="tally-bar" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action */}
        {isGameOver || isLastRound ? (
          <div className="card text-center gap-8">
            <p style={{ fontFamily: "Syne, sans-serif", fontSize: "1.2rem", fontWeight: 800 }}>
              Bravo à {sortedByScore[0]?.name} !
            </p>
            <p className="text-muted" style={{ fontSize: "0.88rem" }}>
              {sortedByScore[0]?.score} point{sortedByScore[0]?.score !== 1 ? "s" : ""} au total
            </p>
          </div>
        ) : isHost ? (
          <button className="btn btn-primary btn-full" onClick={handleNextRound}>
            Manche suivante →
          </button>
        ) : (
          <p className="text-center text-muted pulse">
            En attente de l'hôte pour la manche suivante...
          </p>
        )}

      </div>
    </div>
  );
}
