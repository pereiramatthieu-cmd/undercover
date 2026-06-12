import React, { useState } from "react";
import socket from "../socket";

export default function Home({ onJoin, gameType, onGoHome }) {
  const [tab, setTab] = useState("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) return setError("Entre ton prénom !");
    setLoading(true);
    setError("");
    const createEvent = gameType === "lanote" ? "note:create" : gameType === "classement" ? "classement:create" : gameType === "quisuisje" ? "qsj:create" : gameType === "citation" ? "citation:create" : "room:create";
    socket.emit(createEvent, { playerName: name.trim() }, (res) => {
      setLoading(false);
      if (res.success) {
        onJoin(res.code, name.trim());
      } else {
        setError(res.error || "Erreur serveur.");
      }
    });
  };

  const handleJoin = () => {
    if (!name.trim()) return setError("Entre ton prénom !");
    if (!code.trim()) return setError("Entre le code de la room !");
    setLoading(true);
    setError("");
    const joinEvent = gameType === "lanote" ? "note:join" : gameType === "classement" ? "classement:join" : gameType === "quisuisje" ? "qsj:join" : gameType === "citation" ? "citation:join" : "room:join";
    socket.emit(joinEvent, { playerName: name.trim(), code: code.trim().toUpperCase() }, (res) => {
      setLoading(false);
      if (res.success) {
        onJoin(res.code, name.trim());
      } else {
        setError(res.error || "Erreur serveur.");
      }
    });
  };

  return (
    <div className="page" style={{ position: "relative" }}>
      <button
        className="btn btn-ghost"
        onClick={onGoHome}
        style={{ position: "absolute", top: 16, left: 16, fontSize: "0.82rem", padding: "6px 12px" }}
      >
        ← Menu
      </button>
      <div className="page-inner gap-24 fade-in">
        {/* Logo */}
        <div className="text-center">
          {gameType === "lanote" ? (
            <>
              <div className="logo">la <span>note</span></div>
              <p className="text-muted mt-8">Le jeu des notes secrètes</p>
            </>
          ) : gameType === "classement" ? (
            <>
              <div className="logo">le <span>classement</span></div>
              <p className="text-muted mt-8">Le jeu des numéros secrets</p>
            </>
          ) : gameType === "citation" ? (
            <>
              <div className="logo">citation <span>mystère</span></div>
              <p className="text-muted mt-8">Le jeu des citations manga</p>
            </>
          ) : gameType === "quisuisje" ? (
            <>
              <div className="logo">qui <span>suis-je ?</span></div>
              <p className="text-muted mt-8">Le jeu des personnages secrets</p>
            </>
          ) : (
            <>
              <div className="logo">under<span>cover</span></div>
              <p className="text-muted mt-8">Le jeu du mot caché</p>
            </>
          )}
        </div>

        {/* Card */}
        <div className="card gap-16">
          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, background: "var(--bg)", borderRadius: "var(--radius)", padding: 4 }}>
            {["create", "join"].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: tab === t ? "var(--surface2)" : "transparent",
                  color: tab === t ? "var(--text)" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  transition: "all 0.18s",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {t === "create" ? "Créer" : "Rejoindre"}
              </button>
            ))}
          </div>

          <div className="gap-16">
            <div className="gap-8">
              <label className="section-label">Ton prénom</label>
              <input
                className="input"
                placeholder="Ex: Matthieu"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && (tab === "create" ? handleCreate() : handleJoin())}
                maxLength={20}
              />
            </div>

            {tab === "join" && (
              <div className="gap-8">
                <label className="section-label">Code de la room</label>
                <input
                  className="input"
                  placeholder="Ex: AB3K7"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  maxLength={5}
                  style={{ textTransform: "uppercase", letterSpacing: "0.15em", fontSize: "1.2rem", fontWeight: 700 }}
                />
              </div>
            )}

            {error && (
              <div style={{ color: "var(--accent2)", fontSize: "0.88rem", textAlign: "center" }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary btn-full"
              onClick={tab === "create" ? handleCreate : handleJoin}
              disabled={loading}
            >
              {loading ? "Connexion..." : tab === "create" ? "Créer la room" : "Rejoindre"}
            </button>
          </div>
        </div>

        {/* Rules */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
          <p className="section-label" style={{ marginBottom: 12 }}>Comment jouer</p>
          <div className="gap-8">
            {(gameType === "citation" ? [
              "Une citation manga s'affiche pour tout le monde",
              "Phase 1 (15s) : écris librement le nom du personnage",
              "Phase 2 (15s) : choisissez parmi 4 propositions",
              "Plus tu réponds vite, plus tu marques de points !",
            ] : gameType === "quisuisje" ? [
              "Chacun reçoit un personnage secret que les autres voient",
              "À ton tour, pose une question au groupe",
              "Le groupe vote OUI ou NON simultanément",
              "Tente de deviner ton personnage pour gagner !",
            ] : gameType === "lanote" ? [
              "Un joueur est désigné Maître et reçoit une note secrète (1-10)",
              "Les autres posent des questions au Maître",
              "Le Maître répond librement sans révéler son chiffre",
              "Devinez la note — le plus proche marque un point !",
            ] : gameType === "classement" ? [
              "Chacun reçoit un numéro secret entre 1 et 100",
              "Répondez à la question de façon cohérente avec votre numéro",
              "Classez tous les joueurs du plus petit au plus grand numéro",
              "Un point par bonne position dans votre classement !",
            ] : [
              "Chaque joueur reçoit un mot secret",
              "Un joueur reçoit un mot similaire (l'undercover)",
              "2 tours pour donner des indices",
              "Vote pour désigner l'imposteur",
            ]).map((rule, i) => (
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
