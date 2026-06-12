import React, { useState } from "react";
import socket from "../socket";

const CATEGORIES = {
  aleatoire: "Aléatoire (tout)",
  shonen: "Shōnen",
  shojo: "Shōjo",
  seinen: "Seinen",
};

const ROUNDS_OPTIONS = [5, 10, 15];

export default function CitationLobby({ citationState, roomCode, playerName, myId }) {
  const [rounds, setRounds] = useState(10);
  const [category, setCategory] = useState("aleatoire");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  if (!citationState) {
    return (
      <div className="page">
        <div className="text-center text-muted pulse">Connexion en cours...</div>
      </div>
    );
  }

  const players = citationState.players || [];
  const isHost = players.find((p) => p.id === myId)?.isHost;
  const canStart = players.length >= 3;

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    setError("");
    socket.emit("citation:start", { category, totalRounds: rounds }, (res) => {
      if (res && !res.success) setError(res.error || "Impossible de démarrer.");
    });
  };

  return (
    <div className="page">
      <div className="page-inner gap-24 fade-in">

        {/* Header */}
        <div className="text-center gap-8">
          <div className="logo">citation <span>mystère</span></div>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(CATEGORIES).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setCategory(key)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "var(--radius)",
                      border: `1px solid ${category === key ? "var(--accent)" : "var(--border)"}`,
                      background: category === key ? "rgba(124,106,247,0.1)" : "var(--bg)",
                      color: category === key ? "var(--accent)" : "var(--text-muted)",
                      fontWeight: category === key ? 700 : 500,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="gap-8">
              <p className="section-label">Nombre de manches</p>
              <div style={{ display: "flex", gap: 10 }}>
                {ROUNDS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRounds(r)}
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: "var(--radius)",
                      border: `1px solid ${rounds === r ? "var(--accent)" : "var(--border)"}`,
                      background: rounds === r ? "rgba(124,106,247,0.1)" : "var(--bg)",
                      color: rounds === r ? "var(--accent)" : "var(--text-muted)",
                      fontFamily: "Syne, sans-serif",
                      fontSize: "1.4rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card gap-8" style={{ textAlign: "center" }}>
            <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "flex-start" }}>
              <div className="gap-4">
                <p className="section-label">Catégorie</p>
                <p style={{ fontWeight: 700, color: "var(--accent)", fontSize: "1rem", marginTop: 4 }}>
                  {CATEGORIES[citationState.category] || "—"}
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
                  {citationState.totalRounds || "—"}
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
              "Une citation manga s'affiche — à qui appartient-elle ?",
              "Phase 1 (15s) : écris librement le nom du personnage",
              "Phase 2 (15s) : 4 propositions apparaissent si tu n'as pas répondu",
              "Plus tu réponds vite, plus tu marques de points !",
            ].map((rule, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem", minWidth: 20 }}>{i + 1}.</span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ color: "var(--accent2)", fontSize: "0.88rem", textAlign: "center" }}>{error}</div>
        )}

        {isHost ? (
          <div className="gap-8">
            {!canStart && (
              <p className="text-muted text-center" style={{ fontSize: "0.85rem" }}>
                Il faut au moins 3 joueurs pour démarrer
              </p>
            )}
            <button className="btn btn-primary btn-full" onClick={handleStart} disabled={!canStart}>
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
