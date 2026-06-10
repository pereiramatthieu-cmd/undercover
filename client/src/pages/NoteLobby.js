import React, { useState } from "react";
import socket from "../socket";

export default function NoteLobby({ noteState, roomCode, playerName, myId }) {
  const [rounds, setRounds] = useState(3);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  if (!noteState) {
    return (
      <div className="page">
        <div className="text-center text-muted pulse">Connexion en cours...</div>
      </div>
    );
  }

  const players = noteState.players || [];
  const isHost = players.find((p) => p.id === myId)?.isHost;
  const canStart = players.length >= 2;

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    setError("");
    socket.emit("note:start", { totalRounds: rounds }, (res) => {
      if (res && !res.success) setError(res.error || "Impossible de démarrer.");
    });
  };

  return (
    <div className="page">
      <div className="page-inner gap-24 fade-in">
        {/* Header */}
        <div className="text-center gap-8">
          <div className="logo">la <span>note</span></div>
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

        {/* Rounds selector */}
        <div className="card gap-8">
          <p className="section-label">Nombre de manches</p>
          {isHost ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
              <button
                className="btn btn-ghost"
                style={{ padding: "8px 20px", fontSize: "1.4rem", lineHeight: 1 }}
                onClick={() => setRounds((r) => Math.max(1, r - 1))}
              >
                −
              </button>
              <span style={{ fontFamily: "Syne, sans-serif", fontSize: "2.5rem", fontWeight: 800, color: "var(--accent)", minWidth: 48, textAlign: "center" }}>
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
          ) : (
            <div style={{ textAlign: "center" }}>
              <span style={{ fontFamily: "Syne, sans-serif", fontSize: "2.5rem", fontWeight: 800, color: "var(--accent)" }}>
                {noteState.totalRounds || "—"}
              </span>
              <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: 4 }}>Défini par l'hôte</p>
            </div>
          )}
        </div>

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

        {/* Start */}
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
