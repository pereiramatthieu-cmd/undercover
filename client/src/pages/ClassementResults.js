import React from "react";
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

export default function ClassementResults({ classementState, myId }) {
  if (!classementState) return null;

  const {
    players = [],
    correctOrder = [],
    answers = {},
    roundScores = {},
    currentRound,
    totalRounds,
    theme,
    currentQuestion,
    state,
  } = classementState;

  const isHost = players.find((p) => p.id === myId)?.isHost;
  const isLastRound = currentRound >= totalRounds;
  const isGameOver = state === "gameover";

  const handleNextRound = () => socket.emit("classement:next_round", {});

  // Players in correct order (lowest secret number first)
  const rankedPlayers = correctOrder
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean);

  const sortedByScore = [...players].sort((a, b) => b.score - a.score);
  const maxScore = Math.max(sortedByScore[0]?.score || 0, 1);

  // Points a player could earn this round = number of other players
  const maxPossible = players.length - 1;

  return (
    <div className="page">
      <div className="page-inner gap-24 fade-in">

        {/* Header */}
        <div className="text-center gap-8">
          <span className="badge badge-accent">
            Manche {currentRound} / {totalRounds} — {THEMES[theme] || theme}
          </span>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.4rem", fontWeight: 800 }}>
            {isGameOver || isLastRound ? "Partie terminée !" : "Résultats de la manche"}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Question : <em style={{ color: "var(--text)" }}>{currentQuestion}</em>
          </p>
        </div>

        {/* Correct ranking with secret numbers and answers */}
        <div>
          <p className="section-label">Vrai classement — du plus petit au plus grand</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rankedPlayers.map((p, i) => {
              const isMe = p.id === myId;
              const pts = roundScores[p.id] ?? 0;
              const isFirst = i === 0;
              const isLast = i === rankedPlayers.length - 1;

              return (
                <div
                  key={p.id}
                  style={{
                    background: "var(--surface2)",
                    border: `1px solid ${isMe ? "rgba(124,106,247,0.45)" : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {/* Position */}
                  <span style={{
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 800,
                    fontSize: "1rem",
                    color: "var(--text-muted)",
                    minWidth: 26,
                    opacity: 0.7,
                  }}>
                    #{i + 1}
                  </span>

                  {/* Secret number bubble */}
                  <div style={{
                    fontFamily: "Syne, sans-serif",
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: "var(--accent2)",
                    background: "rgba(240,98,146,0.12)",
                    borderRadius: 8,
                    padding: "2px 10px",
                    minWidth: 48,
                    textAlign: "center",
                    flexShrink: 0,
                  }}>
                    {p.secretNumber}
                  </div>

                  {/* Name + answer */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                      {p.name}
                      {isMe && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: 6 }}>
                          (toi)
                        </span>
                      )}
                    </div>
                    {answers[p.id] && (
                      <div style={{
                        color: "var(--text-muted)",
                        fontSize: "0.82rem",
                        marginTop: 2,
                        fontStyle: "italic",
                      }}>
                        « {answers[p.id]} »
                      </div>
                    )}
                  </div>

                  {/* Points earned this round */}
                  {pts > 0 && (
                    <span className="badge badge-accent" style={{ flexShrink: 0 }}>
                      +{pts} pt{pts > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {maxPossible > 0 && (
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 8, textAlign: "right" }}>
              {maxPossible} pt{maxPossible > 1 ? "s" : ""} max par joueur cette manche
            </p>
          )}
        </div>

        {/* Cumulative leaderboard */}
        <div>
          <p className="section-label">Classement général</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sortedByScore.map((p, i) => {
              const pct = (p.score / maxScore) * 100;
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
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                        minWidth: 22,
                        fontWeight: 600,
                      }}>
                        #{i + 1}
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        {p.name}
                        {p.id === myId && (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: 4 }}>
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
