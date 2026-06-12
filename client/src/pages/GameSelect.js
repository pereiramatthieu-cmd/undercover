import React from "react";

// ── SVG illustrations ──────────────────────────────────────────────

function UndercoverIllustration() {
  return (
    <svg viewBox="0 0 80 118" width="80" height="118" aria-hidden="true" fill="none">
      {/* Head — circle with ? instead of face */}
      <circle cx="40" cy="22" r="19" fill="var(--accent)" fillOpacity="0.1" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1.5" />
      <text x="40" y="32" textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--accent)" fillOpacity="0.85" fontFamily="Syne, sans-serif">?</text>
      {/* Neck */}
      <rect x="35" y="41" width="10" height="7" rx="3" fill="var(--accent)" fillOpacity="0.22" />
      {/* Body */}
      <rect x="15" y="48" width="50" height="32" rx="9" fill="var(--accent)" fillOpacity="0.18" />
      {/* Left arm */}
      <rect x="1" y="50" width="14" height="9" rx="4.5" fill="var(--accent)" fillOpacity="0.18" />
      {/* Right arm */}
      <rect x="65" y="50" width="14" height="9" rx="4.5" fill="var(--accent)" fillOpacity="0.18" />
      {/* Left leg */}
      <rect x="18" y="79" width="17" height="39" rx="7" fill="var(--accent)" fillOpacity="0.18" />
      {/* Right leg */}
      <rect x="45" y="79" width="17" height="39" rx="7" fill="var(--accent)" fillOpacity="0.18" />
    </svg>
  );
}

function NoteIllustration() {
  // Gauge: semicircle over the top, center (60,68), radius 44
  // Values 1–10 spread over 180° (left=1, right=10)
  // Needle points to ~7
  const cx = 60, cy = 68, r = 44;
  const toRad = (deg) => (deg * Math.PI) / 180;
  // angle for value v: 180° at v=1, 0° at v=10
  const valAngle = (v) => toRad(180 - (v - 1) * 20);

  const needleAngle = valAngle(7);
  const arcEndX = (cx + r * Math.cos(needleAngle)).toFixed(2);
  const arcEndY = (cy - r * Math.sin(needleAngle)).toFixed(2);
  const needleX = (cx + 36 * Math.cos(needleAngle)).toFixed(2);
  const needleY = (cy - 36 * Math.sin(needleAngle)).toFixed(2);

  return (
    <svg viewBox="0 0 120 86" width="120" height="86" aria-hidden="true" fill="none">
      {/* Background arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        stroke="var(--accent)" strokeOpacity="0.12" strokeWidth="10" strokeLinecap="round"
      />
      {/* Active arc (1 → 7) */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${arcEndX} ${arcEndY}`}
        stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="10" strokeLinecap="round"
      />
      {/* Tick marks for each value */}
      {Array.from({ length: 10 }, (_, i) => {
        const v = i + 1;
        const a = valAngle(v);
        const ox = (cx + (r + 7) * Math.cos(a)).toFixed(2);
        const oy = (cy - (r + 7) * Math.sin(a)).toFixed(2);
        const ix = (cx + (r + 1) * Math.cos(a)).toFixed(2);
        const iy = (cy - (r + 1) * Math.sin(a)).toFixed(2);
        return (
          <line
            key={v}
            x1={ox} y1={oy} x2={ix} y2={iy}
            stroke="var(--accent)"
            strokeOpacity={v <= 7 ? "0.75" : "0.25"}
            strokeWidth={v === 1 || v === 5 || v === 10 ? "2" : "1.5"}
            strokeLinecap="round"
          />
        );
      })}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY}
        stroke="var(--accent2)" strokeOpacity="0.9" strokeWidth="2.5" strokeLinecap="round" />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="5" fill="var(--accent)" fillOpacity="0.6" />
      <circle cx={cx} cy={cy} r="2.5" fill="var(--accent)" />
      {/* Labels */}
      <text x={cx - r - 4} y={cy + 15} textAnchor="middle" fontSize="11" fontWeight="600"
        fill="var(--accent)" fillOpacity="0.55" fontFamily="Inter, sans-serif">1</text>
      <text x={cx + r + 4} y={cy + 15} textAnchor="middle" fontSize="11" fontWeight="600"
        fill="var(--accent)" fillOpacity="0.55" fontFamily="Inter, sans-serif">10</text>
    </svg>
  );
}

function ClassementIllustration() {
  return (
    <svg viewBox="0 0 110 115" width="110" height="115" aria-hidden="true" fill="none">
      {/* 2nd place block (left) */}
      <rect x="2" y="53" width="33" height="57" rx="5" fill="var(--accent)" fillOpacity="0.2" />
      {/* 1st place block (center, tallest) */}
      <rect x="38" y="28" width="33" height="82" rx="5" fill="var(--accent)" fillOpacity="0.36" />
      {/* 3rd place block (right) */}
      <rect x="74" y="70" width="33" height="40" rx="5" fill="var(--accent)" fillOpacity="0.2" />
      {/* Abstract figure — 2nd */}
      <circle cx="18.5" cy="43" r="9" fill="var(--accent)" fillOpacity="0.42" />
      {/* Abstract figure — 1st */}
      <circle cx="54.5" cy="18" r="9" fill="var(--accent)" fillOpacity="0.68" />
      {/* Abstract figure — 3rd */}
      <circle cx="90.5" cy="60" r="9" fill="var(--accent)" fillOpacity="0.42" />
      {/* Numbers on blocks */}
      <text x="18.5" y="80" textAnchor="middle" fontSize="13" fontWeight="700"
        fill="var(--accent)" fillOpacity="0.7" fontFamily="Syne, sans-serif">2</text>
      <text x="54.5" y="66" textAnchor="middle" fontSize="13" fontWeight="700"
        fill="var(--accent)" fillOpacity="0.9" fontFamily="Syne, sans-serif">1</text>
      <text x="90.5" y="96" textAnchor="middle" fontSize="13" fontWeight="700"
        fill="var(--accent)" fillOpacity="0.7" fontFamily="Syne, sans-serif">3</text>
    </svg>
  );
}

function CitationIllustration() {
  return (
    <svg viewBox="0 0 110 110" width="110" height="110" aria-hidden="true" fill="none">
      {/* Main speech bubble */}
      <rect x="6" y="8" width="82" height="52" rx="12" fill="var(--accent)" fillOpacity="0.13" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1.5" />
      {/* Bubble tail */}
      <path d="M24 60 L14 78 L38 62" fill="var(--accent)" fillOpacity="0.13" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Quote marks */}
      <text x="18" y="36" fontSize="32" fontWeight="900" fill="var(--accent)" fillOpacity="0.55" fontFamily="Georgia, serif">"</text>
      {/* Text lines inside bubble */}
      <rect x="36" y="22" width="42" height="5" rx="2.5" fill="var(--accent)" fillOpacity="0.3" />
      <rect x="36" y="32" width="34" height="5" rx="2.5" fill="var(--accent)" fillOpacity="0.22" />
      <rect x="36" y="42" width="38" height="5" rx="2.5" fill="var(--accent)" fillOpacity="0.18" />
      {/* Question badge */}
      <circle cx="88" cy="14" r="16" fill="var(--accent2)" fillOpacity="0.15" stroke="var(--accent2)" strokeOpacity="0.4" strokeWidth="1.5" />
      <text x="88" y="20" textAnchor="middle" fontSize="18" fontWeight="900" fill="var(--accent2)" fillOpacity="0.85" fontFamily="Syne, sans-serif">?</text>
      {/* Answer bubbles below */}
      <rect x="6" y="82" width="46" height="22" rx="6" fill="var(--accent)" fillOpacity="0.1" stroke="var(--accent)" strokeOpacity="0.2" strokeWidth="1" />
      <rect x="58" y="82" width="46" height="22" rx="6" fill="var(--accent2)" fillOpacity="0.1" stroke="var(--accent2)" strokeOpacity="0.2" strokeWidth="1" />
      <rect x="12" y="88" width="34" height="4" rx="2" fill="var(--accent)" fillOpacity="0.25" />
      <rect x="64" y="88" width="34" height="4" rx="2" fill="var(--accent2)" fillOpacity="0.25" />
      <rect x="18" y="95" width="22" height="3" rx="1.5" fill="var(--accent)" fillOpacity="0.15" />
      <rect x="70" y="95" width="22" height="3" rx="1.5" fill="var(--accent2)" fillOpacity="0.15" />
    </svg>
  );
}

function DessinIllustration() {
  return (
    <svg viewBox="0 0 110 110" width="110" height="110" aria-hidden="true" fill="none">
      {/* Canvas / paper */}
      <rect x="10" y="10" width="72" height="58" rx="6" fill="var(--accent)" fillOpacity="0.1" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1.5" />
      {/* Drawing lines on canvas */}
      <path d="M22 44 Q34 28 46 38 Q58 48 68 30" stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="30" cy="52" r="6" fill="var(--accent)" fillOpacity="0.25" stroke="var(--accent)" strokeOpacity="0.4" strokeWidth="1.2" />
      {/* Pencil */}
      <rect x="74" y="6" width="9" height="38" rx="3" fill="var(--accent2)" fillOpacity="0.6" transform="rotate(22 74 6)" />
      <polygon points="74,44 83,44 78.5,54" fill="var(--accent2)" fillOpacity="0.45" transform="rotate(22 74 6)" />
      {/* Question mark badge */}
      <circle cx="86" cy="80" r="18" fill="var(--surface)" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1.5" />
      <text x="86" y="87" textAnchor="middle" fontSize="20" fontWeight="900" fill="var(--accent)" fillOpacity="0.85" fontFamily="Syne, sans-serif">?</text>
      {/* Chat bubbles */}
      <ellipse cx="18" cy="86" rx="13" ry="8" fill="var(--accent)" fillOpacity="0.08" stroke="var(--accent)" strokeOpacity="0.2" strokeWidth="1" />
      <rect x="10" y="82" width="16" height="3" rx="1.5" fill="var(--accent)" fillOpacity="0.25" />
      <rect x="12" y="88" width="10" height="2.5" rx="1.25" fill="var(--accent)" fillOpacity="0.15" />
    </svg>
  );
}

function QSJIllustration() {
  return (
    <svg viewBox="0 0 100 110" width="100" height="110" aria-hidden="true" fill="none">
      {/* Central head with ? */}
      <circle cx="50" cy="28" r="22" fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeOpacity="0.4" strokeWidth="1.5" />
      <text x="50" y="38" textAnchor="middle" fontSize="26" fontWeight="800" fill="var(--accent)" fillOpacity="0.9" fontFamily="Syne, sans-serif">?</text>
      {/* Thought bubble dots */}
      <circle cx="74" cy="18" r="4" fill="var(--accent2)" fillOpacity="0.5" />
      <circle cx="82" cy="10" r="3" fill="var(--accent2)" fillOpacity="0.35" />
      <circle cx="88" cy="4" r="2" fill="var(--accent2)" fillOpacity="0.2" />
      {/* Name tag */}
      <rect x="14" y="60" width="72" height="30" rx="6" fill="var(--accent)" fillOpacity="0.14" stroke="var(--accent)" strokeOpacity="0.3" strokeWidth="1.2" />
      <rect x="22" y="68" width="56" height="6" rx="3" fill="var(--accent)" fillOpacity="0.22" />
      <rect x="30" y="79" width="40" height="5" rx="2.5" fill="var(--accent)" fillOpacity="0.15" />
      {/* Speech bubbles left & right */}
      <ellipse cx="16" cy="40" rx="11" ry="7" fill="var(--accent)" fillOpacity="0.1" stroke="var(--accent)" strokeOpacity="0.25" strokeWidth="1" />
      <text x="16" y="44" textAnchor="middle" fontSize="9" fill="var(--accent)" fillOpacity="0.6" fontFamily="Inter, sans-serif">OUI</text>
      <ellipse cx="84" cy="40" rx="11" ry="7" fill="var(--accent2)" fillOpacity="0.1" stroke="var(--accent2)" strokeOpacity="0.25" strokeWidth="1" />
      <text x="84" y="44" textAnchor="middle" fontSize="9" fill="var(--accent2)" fillOpacity="0.6" fontFamily="Inter, sans-serif">NON</text>
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────

const GAMES = [
  {
    id: "undercover",
    title: "Undercover",
    description: "Un joueur reçoit un mot différent. Donnez des indices, trouvez l'imposteur avant qu'il ne passe inaperçu.",
    illustration: <UndercoverIllustration />,
    available: true,
  },
  {
    id: "lanote",
    title: "La Note",
    description: "Le Maître cache une note de 1 à 10. Posez-lui des questions, puis devinez le chiffre.",
    illustration: <NoteIllustration />,
    available: true,
  },
  {
    id: "classement",
    title: "Le Classement",
    description: "Chacun reçoit un numéro secret. Répondez aux questions et classez les autres joueurs du plus petit au plus grand.",
    illustration: <ClassementIllustration />,
    available: true,
  },
  {
    id: "citation",
    title: "Citation Mystère",
    description: "Une citation manga s'affiche. Qui l'a dite ? Réponds vite en phase libre, puis choisissez parmi 4 propositions.",
    illustration: <CitationIllustration />,
    available: true,
  },
  {
    id: "dessin",
    title: "Dessine le perso",
    description: "Un joueur dessine un personnage manga en secret. Les autres devinent en temps réel — plus vite tu trouves, plus tu scores !",
    illustration: <DessinIllustration />,
    available: true,
  },
  {
    id: "quisuisje",
    title: "Qui suis-je ?",
    description: "Chacun reçoit un personnage secret que les autres voient. Pose des questions, vote OUI/NON, et devine le premier !",
    illustration: <QSJIllustration />,
    available: true,
  },
];

export default function GameSelect({ onSelectGame }) {
  return (
    <div className="page" style={{ padding: "40px 20px" }}>
      <style>{`
        .gs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          width: 100%;
          max-width: 900px;
        }
        .gs-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 28px 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .gs-card.active {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: default;
        }
        .gs-card.active:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(124, 106, 247, 0.2);
          border-color: rgba(124, 106, 247, 0.4);
        }
        @media (max-width: 600px) {
          .gs-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ width: "100%", maxWidth: "900px", display: "flex", flexDirection: "column", gap: 36, alignItems: "center" }}>
        {/* Header */}
        <div className="text-center gap-8">
          <div className="logo">party<span>.</span></div>
          <p className="text-muted">Choisis un jeu pour commencer</p>
        </div>

        {/* Cards grid */}
        <div className="gs-grid">
          {GAMES.map((game) => (
            <div
              key={game.id}
              className={`gs-card${game.available ? " active" : ""}`}
              style={!game.available ? { opacity: 0.48 } : {}}
            >
              {/* Illustration */}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 120 }}>
                {game.illustration}
              </div>

              {/* Title + badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.3rem", fontWeight: 800, lineHeight: 1.2 }}>
                  {game.title}
                </h2>
                {!game.available && (
                  <span className="badge badge-accent">Bientôt</span>
                )}
              </div>

              {/* Description */}
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.6, flex: 1 }}>
                {game.description}
              </p>

              {/* Button */}
              <button
                className="btn btn-primary btn-full"
                onClick={() => onSelectGame(game.id)}
                disabled={!game.available}
              >
                {game.available ? "Jouer" : "Bientôt disponible"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
