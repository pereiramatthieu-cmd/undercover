import React from "react";
import socket from "../socket";

const CATEGORIES = {
  aleatoire: "Aléatoire",
  shonen: "Shōnen",
  shojo: "Shōjo",
  seinen: "Seinen",
};

export default function CitationResults({ citationState, myId, onGoHome }) {
  if (!citationState) return null;

  const { players = [], category, totalRounds, currentRound } = citationState;
  const isHost = players.find((p) => p.id === myId)?.isHost;

  const sortedByScore = [...players].sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...sortedByScore.map((p) => p.score), 1);
  const winner = sortedByScore[0];
  const iWon = winner?.id === myId;

  const handleRestart = () => socket.emit("citation:restart", {});

  return (
    <div className="page">
      <div className="page-inner gap-24 fade-in">

        {/* Header */}
        <div className="text-center gap-8">
          <span className="badge badge-accent">
            {totalRounds} manches · {CATEGORIES[category] || category}
          </span>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.8rem", fontWeight: 800 }}>
            Partie terminée !
          </h2>
        </div>

        {/* Winner */}
        {winner && winner.score > 0 && (
          <div style={{
            background: iWon ? "rgba(124,106,247,0.08)" : "var(--surface)",
            border: `2px solid ${iWon ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            textAlign: "center",
          }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: "3rem", fontWeight: 800, marginBottom: 8 }}>
              🏆
            </div>
            <p style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: 4 }}>
              {winner.name}
              {iWon && <span style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 400, marginLeft: 8 }}>(toi)</span>}
            </p>
            <p style={{ color: "var(--accent)", fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.5rem" }}>
              {winner.score} pts
            </p>
          </div>
        )}

        {/* Final leaderboard */}
        <div>
          <p className="section-label">Classement final</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sortedByScore.map((p, i) => {
              const pct = Math.max(0, (p.score / maxScore) * 100);
              const isLeader = i === 0 && p.score > 0;
              const isMe = p.id === myId;
              return (
                <div
                  key={p.id}
                  style={{
                    background: "var(--surface2)",
                    border: `1px solid ${isLeader ? "rgba(124,106,247,0.35)" : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    padding: "12px 16px",
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                        minWidth: 22,
                        fontWeight: 600,
                      }}>
                        #{i + 1}
                      </span>
                      <span style={{ fontWeight: 700 }}>
                        {p.name}
                        {isMe && (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>
                            (toi)
                          </span>
                        )}
                      </span>
                    </div>
                    <span style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 700,
                      color: "var(--accent)",
                    }}>
                      {p.score} pts
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

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {isHost ? (
            <button className="btn btn-primary btn-full" onClick={handleRestart}>
              Rejouer →
            </button>
          ) : (
            <p className="text-center text-muted pulse" style={{ fontSize: "0.88rem" }}>
              En attente de l'hôte...
            </p>
          )}
          <button className="btn btn-ghost btn-full" onClick={onGoHome}>
            ← Retour au menu
          </button>
        </div>

      </div>
    </div>
  );
}
