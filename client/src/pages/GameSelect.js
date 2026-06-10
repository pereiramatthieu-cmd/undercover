import React from "react";

const GAMES = [
  {
    id: "undercover",
    title: "Undercover",
    description: "Un joueur reçoit un mot différent. Trouvez l'imposteur avant qu'il ne passe inaperçu.",
    available: true,
  },
  {
    id: "lanote",
    title: "La Note",
    description: "Chaque joueur note un concept de 0 à 10. Le plus proche de la moyenne du groupe gagne la manche.",
    available: true,
  },
  {
    id: "classement",
    title: "Le Classement",
    description: "Classez des éléments dans le bon ordre et défiez vos amis sur votre culture générale.",
    available: false,
  },
];

export default function GameSelect({ onSelectGame }) {
  return (
    <div className="page">
      <div className="page-inner gap-24 fade-in">
        <div className="text-center gap-8">
          <div className="logo">party<span>.</span></div>
          <p className="text-muted">Choisis un jeu pour commencer</p>
        </div>

        <div className="gap-16">
          {GAMES.map((game) => (
            <div
              key={game.id}
              className="card"
              style={{
                opacity: game.available ? 1 : 0.45,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.3rem", fontWeight: 800 }}>
                  {game.title}
                </h2>
                {!game.available && (
                  <span className="badge badge-accent">Bientôt</span>
                )}
              </div>

              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                {game.description}
              </p>

              <button
                className="btn btn-primary btn-full"
                onClick={() => onSelectGame(game.id)}
                disabled={!game.available}
              >
                Jouer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
