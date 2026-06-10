import React, { useState } from "react";
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

export default function ClassementLobby({ classementState, roomCode, playerName, myId }) {
  const [rounds, setRounds] = useState(3);
  const [theme, setTheme] = useState("manga");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  if (!classementState) {
    return (
      <div className="page">
        <div className="text-center text-muted pulse">Connexion en cours...</div>
      </div>
    );
  }

  const players = classementState.players || [];
  const isHost = players.find((p) => p.id === myId)?.isHost;
  const canStart = players.length >= 2;

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    setError("");
    socket.emit("classement:start", { theme, totalRounds: rounds }, (res) => {
      if (res && !res.success) setError(res.error || "Impossible de démarrer.");
    });
  };

  return (
    <div className="page">
      <div className="page-inner gap-24 fade-in">

        {/* Header */}
        <div className="text-center gap-8">
          <div className="logo">le <span>classement</span></div>
          <p className="text-muted">Salle d'attente</p>
        </div>

        {/* Room code */}
        <div className="card" style={{ textAlign: "center" }}>
          <p className="section-label">Code de la room</p>
          <div className="room-code" style={{ margin: "12px 0" }}>{roomCode}</div>
          <button className="btn btn-ghost" onClick={copyCode} style={{ margin: "0 auto" }}>
            {copied ? "✓ Copié !" : "Copier le code"}
          </button>
          <p className="text-muted mt-8" style={{ fontSize: "0.82rem" }}>
            Partage ce code à tes amis pour qu'ils rejoignent
          </p>
        </div>

        {/* Theme + rounds */}
        {isHost ? (
          <div className="card gap-20">
            <div className="gap-8">
              <p className="section-label">Thème</p>
              <select
                className="input"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                style={{ cursor: "pointer" }}
              >
                {Object.entries(THEMES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="gap-8">
              <p className="section-label">Nombre de manches</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
                <button
                  className="btn btn-ghost"
                  style={{ padding: "8px 20px", fontSize: "1.4rem", lineHeight: 1 }}
                  onClick={() => setRounds((r) => Math.max(1, r - 1))}
                >
                  −
                </button>
                <span style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  color: "var(--accent)",
                  minWidth: 48,
                  textAlign: "center",
                }}>
                  {rounds}
                </span>
                <button
                  className="btn btn-ghost"
                  style={{ padding: "8px 20px", fontSize: "1.4rem", lineHeight: 1 }}
                  onClick={() => setRounds((r) => Math.min(10, r + 1))}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card gap-8" style={{ textAlign: "center" }}>
            <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "flex-start" }}>
              <div className="gap-4">
                <p className="section-label">Thème</p>
                <p style={{ fontWeight: 700, color: "var(--accent)", fontSize: "1rem", marginTop: 4 }}>
                  {THEMES[classementState.theme] || "—"}
                </p>
              </div>
              <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
              <div className="gap-4">
                <p className="section-label">Manches</p>
                <p style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 800,
                  color: "var(--accent)",
                  fontSize: "1.6rem",
                  lineHeight: 1,
                  marginTop: 4,
                }}>
                  {classementState.totalRounds || "—"}
                </p>
              </div>
            </div>
            <p className="text-muted" style={{ fontSize: "0.82rem" }}>Défini par l'hôte</p>
          </div>
        )}

        {/* Players */}
        <div>
          <p className="section-label">{players.length} / 8 joueurs</p>
          <div className="player-list">
            {players.map((p) => (
              <div key={p.id} className="player-item">
                <div>
                  <span className="player-name">{p.name}</span>
                  {p.id === myId && <span className="player-you"> (toi)</span>}
                </div>
                {p.isHost && <span className="badge badge-accent">Hôte</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Error + start */}
        {error && (
          <div style={{ color: "var(--accent2)", fontSize: "0.88rem", textAlign: "center" }}>
            {error}
          </div>
        )}

        {isHost ? (
          <div className="gap-8">
            {!canStart && (
              <p className="text-muted text-center" style={{ fontSize: "0.85rem" }}>
                Il faut au moins 2 joueurs pour démarrer
              </p>
            )}
            <button
              className="btn btn-primary btn-full"
              onClick={handleStart}
              disabled={!canStart}
            >
              Lancer la partie →
            </button>
          </div>
        ) : (
          <p className="text-center text-muted pulse">
            En attente que l'hôte lance la partie...
          </p>
        )}

      </div>
    </div>
  );
}
