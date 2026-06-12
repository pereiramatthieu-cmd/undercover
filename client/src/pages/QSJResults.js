import React from "react";
import socket from "../socket";

const CATEGORIES = {
  manga: "Manga / Anime",
  celebrites: "Célébrités",
  cinema: "Cinéma",
  sport: "Sport",
  histoire: "Personnages historiques",
};

export default function QSJResults({ qsjState, myId, onGoHome }) {
  if (!qsjState) return null;

  const { players = [], winner, winnerName, category } = qsjState;
  const isHost = players.find((p) => p.id === myId)?.isHost;
  const iWon = winner === myId;

  const handleRestart = () => socket.emit("qsj:restart", {});

  return (
    <div className="page">
      <div className="page-inner gap-24 fade-in">

        {/* Header */}
        <div className="text-center gap-8">
          <span className="badge badge-accent">
            {CATEGORIES[category] || category}
          </span>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.8rem", fontWeight: 800 }}>
            {winner ? (iWon ? "Tu as gagné !" : `${winnerName} a gagné !`) : "Fin de partie !"}
          </h2>
          {!winner && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Personne n'a trouvé son personnage cette fois
            </p>
          )}
        </div>

        {/* Winner highlight */}
        {winner && (
          <div style={{
            background: iWon ? "rgba(124,106,247,0.08)" : "var(--surface)",
            border: `2px solid ${iWon ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            textAlign: "center",
          }}>
            <div style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "3rem",
              fontWeight: 800,
              marginBottom: 8,
            }}>
              {iWon ? "🏆" : "🎉"}
            </div>
            <p style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: 4 }}>
              {winnerName}
              {iWon && <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 400, marginLeft: 8 }}>(toi)</span>}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
              a trouvé son personnage en premier
            </p>
          </div>
        )}

        {/* All characters revealed */}
        <div>
          <p className="section-label">Révélation des personnages</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {players.map((p) => {
              const isWinner = p.id === winner;
              const isMe = p.id === myId;
              return (
                <div
                  key={p.id}
                  style={{
                    background: "var(--surface2)",
                    border: `1px solid ${isWinner ? "rgba(124,106,247,0.45)" : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    {isWinner && (
                      <span style={{ color: "var(--accent)", fontSize: "1rem" }}>🏆</span>
                    )}
                    <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                      {p.name}
                      {isMe && (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 400, marginLeft: 6 }}>
                          (toi)
                        </span>
                      )}
                    </span>
                  </div>
                  <span style={{
                    fontWeight: isMe ? 700 : 600,
                    color: isMe ? "var(--accent)" : "var(--text-muted)",
                    fontSize: "0.9rem",
                    textAlign: "right",
                    maxWidth: "55%",
                  }}>
                    {p.character || "—"}
                  </span>
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
