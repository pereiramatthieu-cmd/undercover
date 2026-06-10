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
