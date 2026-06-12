import React, { useState } from "react";
import socket from "../socket";

const CATEGORIES = {
  manga: "Manga / Anime",
  celebrites: "Célébrités",
  cinema: "Cinéma",
  sport: "Sport",
  histoire: "Personnages historiques",
};

export default function QSJLobby({ qsjState, roomCode, playerName, myId }) {
  const [rounds, setRounds] = useState(3);
  const [category, setCategory] = useState("manga");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  if (!qsjState) {
    return (
      <div className="page">
        <div className="text-center text-muted pulse">Connexion en cours...</div>
      </div>
    );
  }

  const players = qsjState.players || [];
  const isHost = players.find((p) => p.id === myId)?.isHost;
  const canStart = players.length >= 2;

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    setError("");
    socket.emit("qsj:start", { category, totalRounds: rounds }, (res) => {
      if (res && !res.success) setError(res.error || "Impossible de démarrer.");
    });
  };

  return (
    <div className="page">
      <div className="page-inner gap-24 fade-in">

        {/* Header */}
        <div className="text-center gap-8">
          <div className="logo">qui <span>suis-je ?</span></div>
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

        {/* Settings */}
        {isHost ? (
          <div className="card gap-20">
            <div className="gap-8">
              <p className="section-label">Catégorie</p>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ cursor: "pointer" }}
              >
                {Object.entries(CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="gap-8">
              <p className="section-label">Tours par joueur</p>
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
                  onClick={() => setRounds((r) => Math.min(5, r + 1))}
                >
                  +
                </button>
              </div>
              <p className="text-muted text-center" style={{ fontSize: "0.8rem" }}>
                Chaque joueur aura {rounds} tour{rounds > 1 ? "s" : ""} pour poser des questions
              </p>
            </div>
          </div>
        ) : (
          <div className="card gap-8" style={{ textAlign: "center" }}>
            <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "flex-start" }}>
              <div className="gap-4">
                <p className="section-label">Catégorie</p>
                <p style={{ fontWeight: 700, color: "var(--accent)", fontSize: "1rem", marginTop: 4 }}>
                  {CATEGORIES[qsjState.category] || "—"}
                </p>
              </div>
              <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
              <div className="gap-4">
                <p className="section-label">Tours</p>
                <p style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 800,
                  color: "var(--accent)",
                  fontSize: "1.6rem",
                  lineHeight: 1,
                  marginTop: 4,
                }}>
                  {qsjState.totalRounds || "—"}
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

        {/* Rules */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "18px 20px" }}>
          <p className="section-label" style={{ marginBottom: 10 }}>Comment jouer</p>
          <div className="gap-8">
            {[
              "Chacun reçoit un personnage secret que les autres voient",
              "À tour de rôle, pose une question au groupe",
              "Le groupe vote OUI ou NON simultanément",
              "Tente de deviner ton personnage pour gagner !",
            ].map((rule, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem", minWidth: 20 }}>{i + 1}.</span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>

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
