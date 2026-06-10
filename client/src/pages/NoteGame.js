import React, { useState, useEffect } from "react";
import socket from "../socket";

export default function NoteGame({ noteState, myId, secretNote }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [guess, setGuess] = useState(5);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [guessSubmitted, setGuessSubmitted] = useState(false);

  const isMaitre = noteState?.maitre === myId;
  const phase = noteState?.phase;
  const askers = noteState?.askers || [];
  const currentAsker = askers[noteState?.currentAskerIndex];
  const isMyTurn = currentAsker === myId;

  // Reset question state when the turn advances
  useEffect(() => {
    setQuestionSubmitted(false);
    setQuestion("");
  }, [noteState?.currentAskerIndex, noteState?.currentTour]);

  // Reset answer state when awaitingAnswer cycles
  useEffect(() => {
    setAnswerSubmitted(false);
    setAnswer("");
  }, [noteState?.awaitingAnswer]);

  // Reset guess state on new round
  useEffect(() => {
    setGuessSubmitted(false);
    setGuess(5);
  }, [noteState?.currentRound]);

  const handleQuestion = () => {
    if (!question.trim()) return;
    setQuestionSubmitted(true);
    socket.emit("note:question", { question });
  };

  const handleAnswer = () => {
    if (!answer.trim()) return;
    setAnswerSubmitted(true);
    socket.emit("note:answer", { answer });
  };

  const handleGuess = () => {
    setGuessSubmitted(true);
    socket.emit("note:guess", { guess });
  };

  if (!noteState) return null;

  const players = noteState.players || [];
  const questions = noteState.questions || [];
  const maitrePlayer = players.find((p) => p.id === noteState.maitre);
  const currentAskerPlayer = players.find((p) => p.id === currentAsker);
  const tour1 = questions.filter((q) => q.tour === 1);
  const tour2 = questions.filter((q) => q.tour === 2);

  return (
    <div className="page">
      <div className="page-inner gap-16 fade-in">

        {/* Round + role badges */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="badge badge-accent">
            Manche {noteState.currentRound} / {noteState.totalRounds}
          </span>
          {isMaitre ? (
            <span className="badge" style={{ background: "rgba(240,98,146,0.15)", color: "var(--accent2)" }}>
              Maître
            </span>
          ) : (
            <span className="badge badge-citizen">Joueur</span>
          )}
        </div>

        {/* Maître card */}
        <div className="card" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
          <p className="section-label">Le Maître de cette manche</p>
          <p style={{ fontFamily: "Syne, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: isMaitre ? "var(--accent2)" : "var(--text)" }}>
            {maitrePlayer?.name || "..."}
            {isMaitre && " (toi)"}
          </p>
          {isMaitre && secretNote !== null && secretNote !== undefined && (
            <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <p className="section-label">Ta note secrète</p>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: "4rem", fontWeight: 800, color: "var(--accent)", lineHeight: 1.1 }}>
                {secretNote}
              </div>
              <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: 6 }}>
                Réponds aux questions sans la révéler directement
              </p>
            </div>
          )}
        </div>

        {/* Questions log */}
        {questions.length > 0 && (
          <div className="gap-12" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2].map((t) => {
              const qs = t === 1 ? tour1 : tour2;
              if (!qs.length) return null;
              return (
                <div key={t}>
                  <p className="section-label">Questions — Tour {t}</p>
                  <div className="hint-list">
                    {qs.map((q, i) => (
                      <div key={i} className={`hint-item${q.playerId === myId ? " mine" : ""}`}>
                        <span className="hint-author">{q.playerName}</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span className="hint-text">{q.question}</span>
                          {q.answer ? (
                            <span style={{ fontSize: "0.83rem", color: "var(--accent)", fontStyle: "italic" }}>
                              → {q.answer}
                            </span>
                          ) : (
                            <span className="pulse" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                              En attente de réponse...
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Phase questions ── */}
        {phase === "questions" && (
          <>
            {/* Maître : répondre */}
            {isMaitre && noteState.awaitingAnswer && !answerSubmitted && (
              <div className="card gap-8">
                <p className="turn-label" style={{ textAlign: "left" }}>Une question t'a été posée !</p>
                <input
                  className="input"
                  placeholder="Ta réponse..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnswer()}
                  maxLength={200}
                  autoFocus
                />
                <button className="btn btn-primary btn-full" onClick={handleAnswer} disabled={!answer.trim()}>
                  Répondre
                </button>
              </div>
            )}
            {isMaitre && answerSubmitted && (
              <div className="card text-center" style={{ color: "var(--accent)", fontWeight: 600 }}>
                ✓ Réponse envoyée
              </div>
            )}
            {isMaitre && !noteState.awaitingAnswer && !answerSubmitted && (
              <div className="card text-center text-muted pulse">
                En attente d'une question...
              </div>
            )}

            {/* Joueur courant : poser une question */}
            {!isMaitre && isMyTurn && !noteState.awaitingAnswer && !questionSubmitted && (
              <div className="card gap-8">
                <p className="turn-label" style={{ textAlign: "left" }}>
                  Tour {noteState.currentTour} — C'est ton tour !
                </p>
                <input
                  className="input"
                  placeholder="Ta question pour le Maître..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuestion()}
                  maxLength={200}
                  autoFocus
                />
                <button className="btn btn-primary btn-full" onClick={handleQuestion} disabled={!question.trim()}>
                  Poser la question
                </button>
              </div>
            )}
            {!isMaitre && isMyTurn && noteState.awaitingAnswer && (
              <div className="card text-center gap-8">
                <p style={{ color: "var(--accent)", fontWeight: 600 }}>✓ Question posée</p>
                <p className="text-muted pulse" style={{ fontSize: "0.85rem" }}>
                  En attente de la réponse du Maître...
                </p>
              </div>
            )}
            {!isMaitre && isMyTurn && questionSubmitted && !noteState.awaitingAnswer && (
              <div className="card text-center text-muted">
                ✓ Question posée
              </div>
            )}

            {/* Autres joueurs : attente */}
            {!isMaitre && !isMyTurn && (
              <div className="card text-center text-muted pulse">
                {noteState.awaitingAnswer
                  ? `En attente de la réponse du Maître...`
                  : `${currentAskerPlayer?.name || "..."} pose sa question...`}
              </div>
            )}
          </>
        )}

        {/* ── Phase guessing ── */}
        {phase === "guessing" && (
          <>
            {isMaitre && (
              <div className="card text-center gap-8">
                <p style={{ fontWeight: 600, fontFamily: "Syne, sans-serif" }}>
                  Les joueurs devinent ta note !
                </p>
                <p className="text-muted pulse">
                  {noteState.guessCount} / {noteState.totalGuessers} réponses reçues
                </p>
              </div>
            )}

            {!isMaitre && guessSubmitted && (
              <div className="card text-center gap-8">
                <p style={{ color: "var(--accent)", fontWeight: 600 }}>✓ Proposition envoyée !</p>
                <p className="text-muted pulse">
                  {noteState.guessCount} / {noteState.totalGuessers} joueurs ont répondu
                </p>
              </div>
            )}

            {!isMaitre && !guessSubmitted && (
              <div className="card gap-16">
                <div className="text-center gap-8">
                  <p style={{ fontFamily: "Syne, sans-serif", fontSize: "1.1rem", fontWeight: 700 }}>
                    Quelle est la note secrète ?
                  </p>
                  <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                    Propose un nombre entre 1 et 10
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "10px 22px", fontSize: "1.4rem", lineHeight: 1 }}
                    onClick={() => setGuess((g) => Math.max(1, g - 1))}
                  >
                    −
                  </button>
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: "4rem", fontWeight: 800, color: "var(--accent)", minWidth: 64, textAlign: "center", lineHeight: 1 }}>
                    {guess}
                  </span>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "10px 22px", fontSize: "1.4rem", lineHeight: 1 }}
                    onClick={() => setGuess((g) => Math.min(10, g + 1))}
                  >
                    +
                  </button>
                </div>
                <button className="btn btn-primary btn-full" onClick={handleGuess}>
                  Confirmer ma note
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
