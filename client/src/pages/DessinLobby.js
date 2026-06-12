import React, { useState } from "react";
import socket from "../socket";

const CATEGORIES = [
  { id: "aleatoire", label: "Aléatoire" },
  { id: "shonen", label: "Shōnen" },
  { id: "shojo", label: "Shōjo" },
  { id: "seinen", label: "Seinen" },
];

export default function DessinLobby({ dessinState, roomCode, playerName, myId }) {
  const [copied, setCopied] = useState(false);
  const [category, setCategory] = useState("aleatoire");
  const [totalRounds, setTotalRounds] = useState(10);
  const [error, setError] = useState("");

  if (!dessinState) return null;
  const { players = [] } = dessinState;
  const isHost = players.find((p) => p.id === myId)?.isHost;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    setError("");
    socket.emit("dessin:start", { category, totalRounds }, (res) => {
      if (res && !res.success) setError(res.error || "Erreur");
    });
  };

  return (
    <div className="page">
      <div className="page-inner gap-24 fade-in">

        <div className="text-center gap-8">
          <div className="logo">dessine <span>le</span></div>
          <p className="text-muted">Le jeu du dessin manga</p>
        </div>

        {/* Room code */}
        <div className="card gap-12">
          <p className="section-label">Code de la room</p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{
              flex: 1, background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "12px 16px",
              fontFamily: "Syne, sans-serif", fontWeight: 800,
              fontSize: "1.6rem", letterSpacing: "0.15em", textAlign: "center",
              color: "var(--accent)",
            }}>
              {roomCode}
            </div>
            <button className="btn btn-ghost" onClick={handleCopy} style={{ minWidth: 80 }}>
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
        </div>

        {/* Players */}
        <div className="card gap-10">
          <p className="section-label">Joueurs ({players.length}/8)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {players.map((p) => (
              <div key={p.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", background: "var(--bg)",
                borderRadius: "var(--radius)",
                border: `1px solid ${p.id === myId ? "rgba(124,106,247,0.4)" : "var(--border)"}`,
              }}>
                <span style={{ fontWeight: p.id === myId ? 700 : 400 }}>
                  {p.name} {p.id === myId && <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>(toi)</span>}
                </span>
                {p.isHost && <span className="badge badge-accent" style={{ fontSize: "0.7rem" }}>Hôte</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Config — host only */}
        {isHost && (
          <div className="card gap-16">
            <div className="gap-8">
              <p className="section-label">Catégorie</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`btn ${category === c.id ? "btn-primary" : "btn-ghost"}`}
                    style={{ flex: 1, minWidth: 80 }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="gap-8">
              <p className="section-label">Nombre de manches</p>
              <div style={{ display: "flex", gap: 8 }}>
                {[5, 10, 15].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTotalRounds(n)}
                    className={`btn ${totalRounds === n ? "btn-primary" : "btn-ghost"}`}
                    style={{ flex: 1 }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {error && <p style={{ color: "var(--accent2)", fontSize: "0.88rem", textAlign: "center" }}>{error}</p>}
            <button
              className="btn btn-primary btn-full"
              onClick={handleStart}
              disabled={players.length < 3}
            >
              {players.length < 3 ? `Encore ${3 - players.length} joueur(s)...` : "Lancer la partie →"}
            </button>
          </div>
        )}

        {!isHost && (
          <div className="card text-center">
            <p className="text-muted pulse" style={{ fontSize: "0.9rem" }}>En attente de l'hôte...</p>
          </div>
        )}

        {/* Rules */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
          <p className="section-label" style={{ marginBottom: 12 }}>Comment jouer</p>
          <div className="gap-8">
            {[
              "Le dessinateur reçoit un personnage manga secret à dessiner",
              "60 secondes pour dessiner, les autres devinent en temps réel",
              "3 tentatives max — plus tu trouves vite, plus tu marques de points",
              "Le dessinateur gagne 150 pts par bonne réponse trouvée",
            ].map((rule, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem", minWidth: 20 }}>{i + 1}.</span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
