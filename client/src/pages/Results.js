import React from "react";
import socket from "../socket";

export default function Results({ gameState, results, myId, onRestart }) {
  if (!results || !gameState) {
    return (
      <div className="page">
        <div className="text-center text-muted pulse">Chargement des résultats...</div>
      </div>
    );
  }

  const { winner, tally, undercoverId, undercoverName, undercoverWord, citizenWord, players, votes } = results;
  const isCitizensWin = winner === "citizens";
  const isHost = gameState.players?.find((p) => p.id === myId)?.isHost;
  const maxVotes = Math.max(...Object.values(tally || {}));

  const handleRestart = () => {
    onRestart();
    socket.emit("game:restart");
  };

  return (
    <div className="page">
      <div className="page-inner gap-24 fade-in">
        {/* Winner */}
        <div className="text-center gap-8">
          <div style={{ fontSize: "3rem" }}>{isCitizensWin ? "🎉" : "🕵️"}</div>
          <div className={`results-winner ${isCitizensWin ? "citizens" : "undercover"}`}>
            {isCitizensWin ? "Les citoyens gagnent !" : "L'undercover gagne !"}
          </div>
          <p className="text-muted">
            {isCitizensWin
              ? `Vous avez démasqué ${undercoverName} !`
              : `${undercoverName} est passé entre les mailles...`}
          </p>
        </div>

        {/* Words reveal */}
        <div className="card gap-16">
          <p className="section-label">Les mots</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "var(--surface2)", borderRadius: "var(--radius)", padding: 16, textAlign: "center", border: "1px solid rgba(74,222,128,0.2)" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--citizen)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
                Citoyens
              </p>
              <p style={{ fontFamily: "Syne", fontSize: "1.3rem", fontWeight: 700 }}>{citizenWord}</p>
            </div>
            <div style={{ background: "var(--surface2)", borderRadius: "var(--radius)", padding: 16, textAlign: "center", border: "1px solid rgba(240,98,146,0.2)" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--undercover)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
                Undercover
              </p>
              <p style={{ fontFamily: "Syne", fontSize: "1.3rem", fontWeight: 700 }}>{undercoverWord}</p>
            </div>
          </div>
        </div>

        {/* Vote tally */}
        <div>
          <p className="section-label">Résultats du vote</p>
          <div className="gap-8">
            {players?.sort((a, b) => (tally[b.id] || 0) - (tally[a.id] || 0)).map((p) => {
              const count = tally[p.id] || 0;
              const pct = maxVotes > 0 ? (count / maxVotes) * 100 : 0;
              const isUndercover = p.id === undercoverId;

              return (
                <div key={p.id} style={{
                  background: "var(--surface2)",
                  border: `1px solid ${isUndercover ? "rgba(240,98,146,0.3)" : "var(--border)"}`,
                  borderRadius: "var(--radius)",
                  padding: "12px 16px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      {p.id === myId && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(toi)</span>}
                      {isUndercover && <span className="badge badge-undercover">Undercover</span>}
                    </div>
                    <span className="tally-count">{count} vote{count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="tally-bar-wrap">
                    <div className="tally-bar" style={{
                      width: `${pct}%`,
                      background: isUndercover ? "var(--accent2)" : "var(--accent)"
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Who voted who */}
        {votes && (
          <div>
            <p className="section-label">Qui a voté qui</p>
            <div className="gap-8">
              {players?.map((p) => {
                const target = players.find((t) => t.id === votes[p.id]);
                return (
                  <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.88rem", color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>{p.name}</span>
                    <span>→</span>
                    <span style={{ color: target ? "var(--text)" : "var(--text-muted)" }}>
                      {target ? target.name : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        {isHost ? (
          <button className="btn btn-primary btn-full" onClick={handleRestart}>
            Rejouer
          </button>
        ) : (
          <p className="text-center text-muted text-sm">
            En attente de l'hôte pour rejouer...
          </p>
        )}
      </div>
    </div>
  );
}
