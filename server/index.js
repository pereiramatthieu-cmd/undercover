const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const wordPairs = require("./words");
const classementQuestions = require("./classement_questions");
const qsjCharacters = require("./qsj_characters");
const citationData = require("./citation_data");
const dessinData = require("./dessin_data");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// rooms[roomCode] = { players, state, wordPair, currentTurn, round, hints, votes }
const rooms = {};
const noteRooms = {};
const classementRooms = {};
const qsjRooms = {};
const citationRooms = {};
const dessinRooms = {};

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getRandomWordPair(category) {
  const pool =
    !category || category === "random"
      ? Object.values(wordPairs).flat()
      : wordPairs[category] || Object.values(wordPairs).flat();
  return pool[Math.floor(Math.random() * pool.length)];
}

function getRoomSummary(room) {
  return {
    code: room.code,
    category: room.category || "random",
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isReady: p.isReady,
    })),
    state: room.state,
    currentTurn: room.currentTurn,
    round: room.round,
    hints: room.hints,
    votes: room.state === "results" ? room.votes : {},
    winner: room.winner || null,
    undercoverName: room.state === "results" ? room.undercoverName : null,
    undercoverWord: room.state === "results" ? room.undercoverWord : null,
    citizenWord: room.state === "results" ? room.citizenWord : null,
  };
}

function getNextTurnIndex(room) {
  const current = room.players.findIndex((p) => p.id === room.currentTurn);
  return (current + 1) % room.players.length;
}

function advanceTurn(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.players.length === 0) return;

  // Si moins de 3 joueurs restants, on abandonne la partie
  if (room.players.length < 3) {
    room.state = "lobby";
    room.currentTurn = null;
    if (room.timer) clearTimeout(room.timer);
    io.to(roomCode).emit("game:state", getRoomSummary(room));
    io.to(roomCode).emit("game:aborted", { reason: "Trop peu de joueurs restants." });
    return;
  }

  // Si le joueur actuel n'est plus dans la room, on repart du premier
  if (!room.players.find((p) => p.id === room.currentTurn)) {
    room.currentTurn = room.players[0].id;
  }

  const nextIndex = getNextTurnIndex(room);
  const firstPlayerId = room.players[0].id;

  // If we've come back to the first player
  if (room.players[nextIndex].id === firstPlayerId) {
    if (room.round >= 2) {
      // Both rounds done -> go to vote
      room.state = "voting";
      room.currentTurn = null;
      if (room.timer) clearTimeout(room.timer);
      io.to(roomCode).emit("game:state", getRoomSummary(room));
    } else {
      // Start round 2
      room.round = 2;
      room.currentTurn = firstPlayerId;
      io.to(roomCode).emit("game:state", getRoomSummary(room));
      startTurnTimer(roomCode);
    }
  } else {
    room.currentTurn = room.players[nextIndex].id;
    io.to(roomCode).emit("game:state", getRoomSummary(room));
    startTurnTimer(roomCode);
  }
}

function startTurnTimer(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  const playerId = room.currentTurn;

  // Clear any existing timer
  if (room.timer) clearTimeout(room.timer);

  room.timer = setTimeout(() => {
    const r = rooms[roomCode];
    if (!r || r.currentTurn !== playerId) return;

    // Auto-submit empty hint if timer runs out
    if (!r.hints.find((h) => h.playerId === playerId && h.round === r.round)) {
      r.hints.push({ playerId, playerName: r.players.find((p) => p.id === playerId)?.name, hint: "...", round: r.round });
      io.to(roomCode).emit("game:state", getRoomSummary(r));
    }
    advanceTurn(roomCode);
  }, 47000); // 45s + 2s buffer
}

// ─── La Note helpers ───

function getNoteRoomSummary(room) {
  return {
    code: room.code,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      score: p.score,
    })),
    state: room.state,
    phase: room.phase,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    maitre: room.maitre,
    questions: room.questions,
    currentTour: room.currentTour,
    currentAskerIndex: room.currentAskerIndex,
    askers: room.askers,
    awaitingAnswer: room.awaitingAnswer,
    guessCount: Object.keys(room.guesses).length,
    totalGuessers: room.askers ? room.askers.length : 0,
    guesses: room.phase === "round_results" ? room.guesses : {},
    secretNote: room.phase === "round_results" ? room.secretNote : null,
    roundWinners: room.roundWinners || [],
  };
}

function startNoteRound(code) {
  const room = noteRooms[code];
  if (!room) return;

  room.currentRound += 1;
  const maitreIndex = Math.floor(Math.random() * room.players.length);
  room.maitre = room.players[maitreIndex].id;
  room.secretNote = Math.floor(Math.random() * 10) + 1;
  room.askers = room.players.filter((p) => p.id !== room.maitre).map((p) => p.id);
  room.currentAskerIndex = 0;
  room.currentTour = 1;
  room.awaitingAnswer = false;
  room.questions = [];
  room.guesses = {};
  room.roundWinners = [];
  room.phase = "questions";

  io.to(room.maitre).emit("note:secret", { note: room.secretNote });
  io.to(code).emit("note:state", getNoteRoomSummary(room));
}

// ─── Le Classement helpers ───

function getClassementRoomSummary(room) {
  const reveal = room.phase === "round_results" || room.state === "gameover";
  return {
    code: room.code,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      score: p.score,
      secretNumber: reveal ? p.secretNumber : null,
    })),
    state: room.state,
    phase: room.phase,
    theme: room.theme,
    totalRounds: room.totalRounds,
    currentRound: room.currentRound,
    currentQuestion: room.currentQuestion,
    answerCount: Object.keys(room.answers).length,
    totalPlayers: room.players.length,
    // Reveal answers only when ranking or showing results
    answers: room.phase === "ranking" || room.phase === "round_results" ? room.answers : {},
    rankingCount: Object.keys(room.rankings).length,
    roundScores: reveal ? room.roundScores : {},
    // Correct order revealed only at results
    correctOrder: reveal ? room.correctOrder : null,
  };
}

function startClassementRound(code) {
  const room = classementRooms[code];
  if (!room) return;

  room.currentRound += 1;

  // Assign unique secret numbers 1-100
  const used = new Set();
  room.players.forEach((p) => {
    let n;
    do { n = Math.floor(Math.random() * 100) + 1; } while (used.has(n));
    used.add(n);
    p.secretNumber = n;
  });

  // Correct order: players sorted by secretNumber ascending (lowest first)
  room.correctOrder = [...room.players]
    .sort((a, b) => a.secretNumber - b.secretNumber)
    .map((p) => p.id);

  // Random question from theme
  const pool = classementQuestions[room.theme];
  room.currentQuestion = pool[Math.floor(Math.random() * pool.length)];

  room.answers = {};
  room.rankings = {};
  room.roundScores = {};
  room.phase = "answering";

  // Send each player their private secret number
  room.players.forEach((p) => {
    io.to(p.id).emit("classement:secret", { number: p.secretNumber });
  });

  io.to(code).emit("classement:state", getClassementRoomSummary(room));
}

// ─── Citation Mystère helpers ───

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function normalizeCitation(s) {
  return s.toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ").trim();
}

function checkCitationAnswer(guess, citation) {
  const normGuess = normalizeCitation(guess);
  const targets = [citation.character, ...(citation.aliases || [])].map(normalizeCitation);

  for (const target of targets) {
    if (normGuess === target) return true;
    const words = target.split(" ").filter((w) => w.length >= 3);
    if (words.some((w) => normGuess === w)) return true;
    if (normGuess.length >= 4 && levenshtein(normGuess, target) <= 2) return true;
    if (words.some((w) => w.length >= 5 && levenshtein(normGuess, w) <= 1)) return true;
  }
  return false;
}

function generateCitationOptions(citation) {
  const correct = { character: citation.character, manga: citation.manga };
  const seenChars = new Set([citation.character]);
  const wrongPool = [];
  citationData.forEach((c) => {
    if (!seenChars.has(c.character)) {
      seenChars.add(c.character);
      wrongPool.push({ character: c.character, manga: c.manga });
    }
  });
  for (let i = wrongPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wrongPool[i], wrongPool[j]] = [wrongPool[j], wrongPool[i]];
  }
  const options = [...wrongPool.slice(0, 3), correct];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const correctIndex = options.findIndex((o) => o.character === correct.character);
  return { options, correctIndex };
}

function getCitationRoomSummary(room) {
  const isReveal = room.phase === "reveal" || room.state === "gameover";
  const citation = room.currentCitation;
  return {
    code: room.code,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      score: p.score,
    })),
    state: room.state,
    phase: room.phase,
    category: room.category,
    totalRounds: room.totalRounds,
    currentRound: room.currentRound,
    currentCitation: citation ? {
      quote: citation.quote,
      character: isReveal ? citation.character : null,
      manga: isReveal ? citation.manga : null,
      category: citation.category,
    } : null,
    options: room.options,
    correctOptionIndex: isReveal ? room.correctOptionIndex : null,
    answeredPlayerIds: Object.keys(room.answers),
    answers: isReveal ? room.answers : {},
    answerCount: Object.keys(room.answers).length,
    totalPlayers: room.players.length,
    phase1StartTime: room.phase1StartTime,
    phase2StartTime: room.phase2StartTime,
    roundScores: isReveal ? room.roundScores : {},
  };
}

function startCitationRound(code) {
  const room = citationRooms[code];
  if (!room) return;

  if (room.phaseTimer) { clearTimeout(room.phaseTimer); room.phaseTimer = null; }

  room.currentRound += 1;

  let pool = citationData.filter((c) =>
    (room.category === "aleatoire" || c.category === room.category) &&
    !room.usedCitationIds.includes(c.id)
  );
  if (pool.length === 0) {
    room.usedCitationIds = [];
    pool = citationData.filter((c) =>
      room.category === "aleatoire" || c.category === room.category
    );
  }
  const citation = pool[Math.floor(Math.random() * pool.length)];
  room.usedCitationIds.push(citation.id);
  room.currentCitation = citation;

  const { options, correctIndex } = generateCitationOptions(citation);
  room.options = options;
  room.correctOptionIndex = correctIndex;

  room.answers = {};
  room.roundScores = {};
  room.phase = "phase1";
  room.phase1StartTime = Date.now();
  room.phase2StartTime = null;

  room.phaseTimer = setTimeout(() => startCitationPhase2(code), 15000);
  io.to(code).emit("citation:state", getCitationRoomSummary(room));
}

function startCitationPhase2(code) {
  const room = citationRooms[code];
  if (!room || room.state !== "playing") return;

  if (room.phaseTimer) { clearTimeout(room.phaseTimer); room.phaseTimer = null; }

  const allAnswered = room.players.every((p) => room.answers[p.id] !== undefined);
  if (allAnswered) { revealCitationRound(code); return; }

  room.phase = "phase2";
  room.phase2StartTime = Date.now();

  room.phaseTimer = setTimeout(() => revealCitationRound(code), 15000);
  io.to(code).emit("citation:state", getCitationRoomSummary(room));
}

function revealCitationRound(code) {
  const room = citationRooms[code];
  if (!room || room.state !== "playing") return;

  if (room.phaseTimer) { clearTimeout(room.phaseTimer); room.phaseTimer = null; }

  room.players.forEach((p) => {
    const ans = room.answers[p.id];
    let pts = 0;
    if (ans) {
      let correct = false;
      if (ans.phase === "phase1") {
        correct = checkCitationAnswer(ans.answer, room.currentCitation);
        if (correct) {
          const elapsed = Math.min(ans.timestamp - room.phase1StartTime, 15000);
          pts = Math.round(1000 - (elapsed / 15000) * 400);
        } else {
          pts = -100;
        }
      } else {
        correct = ans.choiceIndex === room.correctOptionIndex;
        if (correct) {
          const elapsed = Math.min(ans.timestamp - room.phase2StartTime, 15000);
          pts = Math.round(400 - (elapsed / 15000) * 200);
        } else {
          pts = -100;
        }
      }
      room.answers[p.id].correct = correct;
      room.answers[p.id].points = pts;
    } else {
      room.answers[p.id] = { answer: null, choiceIndex: null, phase: null, timestamp: null, correct: false, points: 0 };
    }
    room.roundScores[p.id] = pts;
    p.score += pts;
  });

  room.phase = "reveal";
  io.to(code).emit("citation:state", getCitationRoomSummary(room));
}

// ─── Qui suis-je helpers ───

function normalizeGuess(s) {
  return s.toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ").trim();
}

function checkQSJGuess(guess, character) {
  const normGuess = normalizeGuess(guess);
  const normChar = normalizeGuess(character);
  if (normGuess === normChar) return true;
  const words = normChar.split(" ").filter((w) => w.length >= 4);
  return words.some((w) => normGuess === w);
}

function getQSJRoomSummary(room) {
  const isGameover = room.state === "gameover";
  return {
    code: room.code,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      character: isGameover ? p.character : null,
    })),
    state: room.state,
    phase: room.phase,
    category: room.category,
    totalRounds: room.totalRounds,
    currentRound: room.currentRound,
    currentTurnPlayerId: room.currentTurnPlayerId,
    currentQuestion: room.currentQuestion,
    votedPlayerIds: Object.keys(room.votes),
    votes: room.phase === "vote_reveal" ? room.votes : {},
    voteCount: Object.keys(room.votes).length,
    totalVoters: room.players.filter((p) => p.id !== room.currentTurnPlayerId).length,
    winner: room.winner,
    winnerName: room.winnerName,
    wrongGuess: room.wrongGuess || null,
  };
}

function advanceQSJTurn(code) {
  const room = qsjRooms[code];
  if (!room || room.state !== "playing") return;

  if (room.players.length < 2) {
    room.state = "gameover";
    room.phase = null;
    io.to(code).emit("qsj:state", getQSJRoomSummary(room));
    return;
  }

  const currentIdx = room.players.findIndex((p) => p.id === room.currentTurnPlayerId);
  const n = room.players.length;
  const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % n;

  if (nextIdx === 0 && currentIdx !== -1) {
    room.currentRound += 1;
    if (room.currentRound > room.totalRounds) {
      room.state = "gameover";
      room.phase = null;
      io.to(code).emit("qsj:state", getQSJRoomSummary(room));
      return;
    }
  }

  room.currentTurnPlayerId = room.players[nextIdx].id;
  room.currentQuestion = null;
  room.votes = {};
  room.wrongGuess = null;
  room.phase = "questioning";

  io.to(code).emit("qsj:state", getQSJRoomSummary(room));
}

function startQSJGame(code) {
  const room = qsjRooms[code];
  if (!room) return;

  const pool = [...(qsjCharacters[room.category] || Object.values(qsjCharacters).flat())];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  room.players.forEach((p, i) => { p.character = pool[i % pool.length]; });

  for (let i = room.players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [room.players[i], room.players[j]] = [room.players[j], room.players[i]];
  }

  room.state = "playing";
  room.phase = "questioning";
  room.currentRound = 1;
  room.currentTurnPlayerId = room.players[0].id;
  room.currentQuestion = null;
  room.votes = {};
  room.winner = null;
  room.winnerName = null;
  room.wrongGuess = null;

  room.players.forEach((p) => {
    const othersChars = {};
    room.players.forEach((other) => {
      if (other.id !== p.id) othersChars[other.id] = other.character;
    });
    io.to(p.id).emit("qsj:others_characters", { characters: othersChars });
  });

  io.to(code).emit("qsj:state", getQSJRoomSummary(room));
}

// ── Dessin helpers ──────────────────────────────────────────────────

function normalizeDessin(s) {
  return s.toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ").trim();
}

function checkDessinAnswer(guess, char) {
  const g = normalizeDessin(guess);
  const targets = [char.character, ...(char.aliases || [])].map(normalizeDessin);
  for (const t of targets) {
    if (g === t) return true;
    const words = t.split(" ").filter((w) => w.length >= 3);
    if (words.some((w) => g === w)) return true;
    if (g.length >= 4 && levenshtein(g, t) <= 2) return true;
    if (words.some((w) => w.length >= 5 && levenshtein(g, w) <= 1)) return true;
  }
  return false;
}

function calculateDessinScore(elapsedMs) {
  const e = Math.min(Math.max(0, elapsedMs), 60000);
  if (e <= 20000) return Math.round(1000 - (e / 20000) * 300);
  if (e <= 40000) return Math.round(700 - ((e - 20000) / 20000) * 300);
  return Math.round(400 - ((e - 40000) / 20000) * 200);
}

function getDessinRoomSummary(room) {
  const isReveal = room.phase === "reveal" || room.state === "gameover";
  return {
    code: room.code,
    players: room.players.map((p) => ({ id: p.id, name: p.name, isHost: p.isHost, score: p.score })),
    state: room.state,
    phase: room.phase,
    category: room.category,
    totalRounds: room.totalRounds,
    currentRound: room.currentRound,
    drawerId: room.drawerId,
    drawerName: room.players.find((p) => p.id === room.drawerId)?.name || "",
    currentCharacter: isReveal ? room.currentCharacter : null,
    foundPlayerIds: Object.entries(room.answers).filter(([, a]) => a?.found).map(([id]) => id),
    foundPlayerNames: Object.entries(room.answers)
      .filter(([, a]) => a?.found)
      .map(([id]) => room.players.find((p) => p.id === id)?.name || ""),
    attemptCounts: room.attempts,
    answers: isReveal ? room.answers : {},
    roundScores: isReveal ? room.roundScores : {},
    roundStartTime: room.roundStartTime,
    totalGuessers: room.players.filter((p) => p.id !== room.drawerId).length,
  };
}

function startDessinRound(code) {
  const room = dessinRooms[code];
  if (!room) return;
  if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }

  room.currentRound += 1;
  const drawerIndex = (room.currentRound - 1) % room.players.length;
  room.drawerId = room.players[drawerIndex].id;

  let pool = dessinData.filter((c) =>
    (room.category === "aleatoire" || c.category === room.category) &&
    !room.usedCharacterNames.includes(c.character)
  );
  if (pool.length === 0) {
    room.usedCharacterNames = [];
    pool = dessinData.filter((c) => room.category === "aleatoire" || c.category === room.category);
  }
  const char = pool[Math.floor(Math.random() * pool.length)];
  room.usedCharacterNames.push(char.character);
  room.currentCharacter = char;

  room.answers = {};
  room.attempts = {};
  room.roundScores = {};
  room.phase = "drawing";
  room.roundStartTime = Date.now();

  room.roundTimer = setTimeout(() => revealDessinRound(code), 60000);
  io.to(code).emit("dessin:state", getDessinRoomSummary(room));
  io.to(room.drawerId).emit("dessin:character", { character: char.character, manga: char.manga });
}

function revealDessinRound(code) {
  const room = dessinRooms[code];
  if (!room || room.state !== "playing") return;
  if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }

  const foundCount = Object.values(room.answers).filter((a) => a?.found).length;
  room.players.forEach((p) => {
    if (p.id === room.drawerId) {
      const pts = foundCount * 150;
      room.roundScores[p.id] = pts;
      p.score += pts;
    } else {
      const pts = room.roundScores[p.id] || 0;
      p.score += pts;
    }
  });

  room.phase = "reveal";
  io.to(code).emit("dessin:state", getDessinRoomSummary(room));
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // Create room
  socket.on("room:create", ({ playerName }, callback) => {
    let code;
    do { code = generateRoomCode(); } while (rooms[code]);

    rooms[code] = {
      code,
      players: [{ id: socket.id, name: playerName, isHost: true }],
      state: "lobby",
      category: "random",
      wordPair: null,
      currentTurn: null,
      round: 1,
      hints: [],
      votes: {},
      undercoverName: null,
      undercoverWord: null,
      citizenWord: null,
      timer: null,
    };

    socket.join(code);
    socket.roomCode = code;
    callback({ success: true, code });
    io.to(code).emit("game:state", getRoomSummary(rooms[code]));
  });

  // Join room
  socket.on("room:join", ({ playerName, code }, callback) => {
    const room = rooms[code];
    if (!room) return callback({ success: false, error: "Room introuvable." });
    if (room.state !== "lobby") return callback({ success: false, error: "La partie a déjà commencé." });
    if (room.players.length >= 8) return callback({ success: false, error: "La room est pleine (8 joueurs max)." });
    if (room.players.find((p) => p.name.toLowerCase() === playerName.toLowerCase()))
      return callback({ success: false, error: "Ce pseudo est déjà pris." });

    room.players.push({ id: socket.id, name: playerName, isHost: false });
    socket.join(code);
    socket.roomCode = code;
    callback({ success: true, code });
    io.to(code).emit("game:state", getRoomSummary(room));
  });

  // Start game
  socket.on("game:start", (_, callback) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room) return callback?.({ success: false });
    if (!room.players.find((p) => p.id === socket.id)?.isHost) return callback?.({ success: false, error: "Seul l'hôte peut lancer." });
    if (room.players.length < 3) return callback?.({ success: false, error: "Il faut au moins 3 joueurs." });

    const pair = getRandomWordPair(room.category);
    room.wordPair = pair;
    room.state = "playing";
    room.round = 1;
    room.hints = [];
    room.votes = {};

    // Assign undercover randomly
    const undercoverIndex = Math.floor(Math.random() * room.players.length);
    room.undercover = room.players[undercoverIndex].id;
    room.undercoverName = room.players[undercoverIndex].name;
    room.undercoverWord = pair.undercover;
    room.citizenWord = pair.citizens;

    // Mélanger l'ordre des joueurs
    for (let i = room.players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [room.players[i], room.players[j]] = [room.players[j], room.players[i]];
    }
    // Le premier joueur mélangé commence
    room.currentTurn = room.players[0].id;

    // Send each player their word privately
    room.players.forEach((p) => {
      const word = p.id === room.undercover ? pair.undercover : pair.citizens;
      io.to(p.id).emit("game:word", { word, role: p.id === room.undercover ? "undercover" : "citizen" });
    });

    io.to(code).emit("game:state", getRoomSummary(room));
    startTurnTimer(code);
    callback?.({ success: true });
  });

  // Set category
  socket.on("room:set_category", ({ category }, callback) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.state !== "lobby") return callback?.({ success: false });
    if (!room.players.find((p) => p.id === socket.id)?.isHost) return callback?.({ success: false });
    room.category = category;
    io.to(code).emit("game:state", getRoomSummary(room));
    callback?.({ success: true });
  });

  // Submit hint
  socket.on("game:hint", ({ hint }, callback) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.state !== "playing") return callback?.({ success: false });
    if (room.currentTurn !== socket.id) return callback?.({ success: false, error: "Ce n'est pas ton tour." });

    const player = room.players.find((p) => p.id === socket.id);
    const trimmed = hint.trim().slice(0, 100);
    if (!trimmed) return callback?.({ success: false, error: "L'indice ne peut pas être vide." });

    // Check not already submitted this round
    if (room.hints.find((h) => h.playerId === socket.id && h.round === room.round))
      return callback?.({ success: false });

    room.hints.push({ playerId: socket.id, playerName: player.name, hint: trimmed, round: room.round });

    if (room.timer) { clearTimeout(room.timer); room.timer = null; }
    callback?.({ success: true });

    advanceTurn(code);
  });

  // Submit vote
  socket.on("game:vote", ({ targetId }, callback) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.state !== "voting") return callback?.({ success: false });
    if (socket.id === targetId) return callback?.({ success: false, error: "Tu ne peux pas voter pour toi-même." });

    room.votes[socket.id] = targetId;
    // Ne compter que les votes des joueurs encore présents
    const activeVotes = Object.keys(room.votes).filter(id => room.players.find(p => p.id === id));
    io.to(code).emit("game:votes_count", { count: activeVotes.length, total: room.players.length });

    // All voted?
    if (activeVotes.length === room.players.length) {
      // Tally votes
      const tally = {};
      room.players.forEach((p) => (tally[p.id] = 0));
      Object.values(room.votes).forEach((id) => { if (tally[id] !== undefined) tally[id]++; });

      const maxVotes = Math.max(...Object.values(tally));
      const accused = Object.entries(tally).filter(([, v]) => v === maxVotes).map(([id]) => id);
      const isUndercoverCaught = accused.includes(room.undercover) && accused.length === 1;

      room.winner = isUndercoverCaught ? "citizens" : "undercover";
      room.state = "results";
      room.voteTally = tally;

      io.to(code).emit("game:state", getRoomSummary(room));
      // Also send full tally
      io.to(code).emit("game:results", {
        winner: room.winner,
        tally,
        undercoverId: room.undercover,
        undercoverName: room.undercoverName,
        undercoverWord: room.undercoverWord,
        citizenWord: room.citizenWord,
        votes: room.votes,
        players: room.players.map((p) => ({ id: p.id, name: p.name })),
      });
    }
    callback?.({ success: true });
  });

  // Restart game
  socket.on("game:restart", (_, callback) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room) return;
    if (!room.players.find((p) => p.id === socket.id)?.isHost) return;

    room.state = "lobby";
    room.wordPair = null;
    room.currentTurn = null;
    room.round = 1;
    room.hints = [];
    room.votes = {};
    room.winner = null;
    room.undercover = null;
    room.undercoverName = null;
    room.undercoverWord = null;
    room.citizenWord = null;
    if (room.timer) clearTimeout(room.timer);

    io.to(code).emit("game:state", getRoomSummary(room));
    callback?.({ success: true });
  });

  // ─── La Note events ───

  socket.on("note:create", ({ playerName }, callback) => {
    let code;
    do { code = generateRoomCode(); } while (noteRooms[code]);

    noteRooms[code] = {
      code,
      players: [{ id: socket.id, name: playerName, isHost: true, score: 0 }],
      state: "lobby",
      phase: null,
      totalRounds: null,
      currentRound: 0,
      maitre: null,
      secretNote: null,
      askers: [],
      currentAskerIndex: 0,
      currentTour: 1,
      awaitingAnswer: false,
      questions: [],
      guesses: {},
      roundWinners: [],
    };

    socket.join(code);
    socket.noteRoomCode = code;
    callback({ success: true, code });
    io.to(code).emit("note:state", getNoteRoomSummary(noteRooms[code]));
  });

  socket.on("note:join", ({ playerName, code }, callback) => {
    const room = noteRooms[code];
    if (!room) return callback({ success: false, error: "Room introuvable." });
    if (room.state !== "lobby") return callback({ success: false, error: "La partie a déjà commencé." });
    if (room.players.length >= 8) return callback({ success: false, error: "La room est pleine (8 joueurs max)." });
    if (room.players.find((p) => p.name.toLowerCase() === playerName.toLowerCase()))
      return callback({ success: false, error: "Ce pseudo est déjà pris." });

    room.players.push({ id: socket.id, name: playerName, isHost: false, score: 0 });
    socket.join(code);
    socket.noteRoomCode = code;
    callback({ success: true, code });
    io.to(code).emit("note:state", getNoteRoomSummary(room));
  });

  socket.on("note:start", ({ totalRounds }, callback) => {
    const code = socket.noteRoomCode;
    const room = noteRooms[code];
    if (!room) return callback?.({ success: false });
    if (!room.players.find((p) => p.id === socket.id)?.isHost)
      return callback?.({ success: false, error: "Seul l'hôte peut lancer." });
    if (room.players.length < 2)
      return callback?.({ success: false, error: "Il faut au moins 2 joueurs." });

    room.totalRounds = Math.min(10, Math.max(1, parseInt(totalRounds) || 3));
    room.state = "playing";
    startNoteRound(code);
    callback?.({ success: true });
  });

  socket.on("note:question", ({ question }, callback) => {
    const code = socket.noteRoomCode;
    const room = noteRooms[code];
    if (!room || room.phase !== "questions") return callback?.({ success: false });
    if (room.awaitingAnswer)
      return callback?.({ success: false, error: "En attente de la réponse du Maître." });
    if (room.askers[room.currentAskerIndex] !== socket.id)
      return callback?.({ success: false, error: "Ce n'est pas ton tour." });

    const player = room.players.find((p) => p.id === socket.id);
    const trimmed = question.trim().slice(0, 200);
    if (!trimmed) return callback?.({ success: false, error: "La question ne peut pas être vide." });

    room.questions.push({
      playerId: socket.id,
      playerName: player.name,
      question: trimmed,
      answer: null,
      tour: room.currentTour,
    });
    room.awaitingAnswer = true;

    io.to(code).emit("note:state", getNoteRoomSummary(room));
    callback?.({ success: true });
  });

  socket.on("note:answer", ({ answer }, callback) => {
    const code = socket.noteRoomCode;
    const room = noteRooms[code];
    if (!room || room.phase !== "questions") return callback?.({ success: false });
    if (room.maitre !== socket.id)
      return callback?.({ success: false, error: "Seul le Maître peut répondre." });
    if (!room.awaitingAnswer) return callback?.({ success: false });

    const trimmed = answer.trim().slice(0, 200);
    if (!trimmed) return callback?.({ success: false, error: "La réponse ne peut pas être vide." });

    room.questions[room.questions.length - 1].answer = trimmed;
    room.awaitingAnswer = false;
    room.currentAskerIndex += 1;

    if (room.currentAskerIndex >= room.askers.length) {
      if (room.currentTour === 1) {
        room.currentTour = 2;
        room.currentAskerIndex = 0;
      } else {
        room.phase = "guessing";
      }
    }

    io.to(code).emit("note:state", getNoteRoomSummary(room));
    callback?.({ success: true });
  });

  socket.on("note:guess", ({ guess }, callback) => {
    const code = socket.noteRoomCode;
    const room = noteRooms[code];
    if (!room || room.phase !== "guessing") return callback?.({ success: false });
    if (socket.id === room.maitre)
      return callback?.({ success: false, error: "Le Maître ne peut pas deviner." });
    if (room.guesses[socket.id] !== undefined)
      return callback?.({ success: false, error: "Tu as déjà proposé une note." });

    const val = parseInt(guess);
    if (isNaN(val) || val < 1 || val > 10)
      return callback?.({ success: false, error: "La note doit être entre 1 et 10." });

    room.guesses[socket.id] = val;

    if (Object.keys(room.guesses).length === room.askers.length) {
      const secret = room.secretNote;
      let minDiff = Infinity;
      room.askers.forEach((id) => {
        const diff = Math.abs(room.guesses[id] - secret);
        if (diff < minDiff) minDiff = diff;
      });
      room.roundWinners = room.askers.filter(
        (id) => Math.abs(room.guesses[id] - secret) === minDiff
      );
      room.roundWinners.forEach((id) => {
        const p = room.players.find((pl) => pl.id === id);
        if (p) p.score += 1;
      });
      room.phase = "round_results";
    }

    io.to(code).emit("note:state", getNoteRoomSummary(room));
    callback?.({ success: true });
  });

  socket.on("note:next_round", (_, callback) => {
    const code = socket.noteRoomCode;
    const room = noteRooms[code];
    if (!room || room.phase !== "round_results") return;
    if (!room.players.find((p) => p.id === socket.id)?.isHost) return;

    if (room.currentRound >= room.totalRounds) {
      room.state = "gameover";
      room.phase = null;
      io.to(code).emit("note:state", getNoteRoomSummary(room));
    } else {
      startNoteRound(code);
    }
    callback?.({ success: true });
  });

  // ─── Le Classement events ───

  socket.on("classement:create", ({ playerName }, callback) => {
    let code;
    do { code = generateRoomCode(); } while (classementRooms[code]);

    classementRooms[code] = {
      code,
      players: [{ id: socket.id, name: playerName, isHost: true, score: 0, secretNumber: null }],
      state: "lobby",
      phase: null,
      theme: null,
      totalRounds: null,
      currentRound: 0,
      currentQuestion: null,
      answers: {},
      rankings: {},
      roundScores: {},
      correctOrder: [],
    };

    socket.join(code);
    socket.classementRoomCode = code;
    callback({ success: true, code });
    io.to(code).emit("classement:state", getClassementRoomSummary(classementRooms[code]));
  });

  socket.on("classement:join", ({ playerName, code }, callback) => {
    const room = classementRooms[code];
    if (!room) return callback({ success: false, error: "Room introuvable." });
    if (room.state !== "lobby") return callback({ success: false, error: "La partie a déjà commencé." });
    if (room.players.length >= 8) return callback({ success: false, error: "La room est pleine (8 joueurs max)." });
    if (room.players.find((p) => p.name.toLowerCase() === playerName.toLowerCase()))
      return callback({ success: false, error: "Ce pseudo est déjà pris." });

    room.players.push({ id: socket.id, name: playerName, isHost: false, score: 0, secretNumber: null });
    socket.join(code);
    socket.classementRoomCode = code;
    callback({ success: true, code });
    io.to(code).emit("classement:state", getClassementRoomSummary(room));
  });

  socket.on("classement:start", ({ theme, totalRounds }, callback) => {
    const code = socket.classementRoomCode;
    const room = classementRooms[code];
    if (!room) return callback?.({ success: false });
    if (!room.players.find((p) => p.id === socket.id)?.isHost)
      return callback?.({ success: false, error: "Seul l'hôte peut lancer." });
    if (room.players.length < 2)
      return callback?.({ success: false, error: "Il faut au moins 2 joueurs." });
    if (!classementQuestions[theme])
      return callback?.({ success: false, error: "Thème invalide." });

    room.theme = theme;
    room.totalRounds = Math.min(10, Math.max(1, parseInt(totalRounds) || 3));
    room.state = "playing";
    startClassementRound(code);
    callback?.({ success: true });
  });

  // Each player submits their answer for the current question
  socket.on("classement:answer", ({ answer }, callback) => {
    const code = socket.classementRoomCode;
    const room = classementRooms[code];
    if (!room || room.phase !== "answering") return callback?.({ success: false });
    if (room.answers[socket.id] !== undefined)
      return callback?.({ success: false, error: "Tu as déjà soumis une réponse." });

    const trimmed = (answer || "").trim().slice(0, 150);
    if (!trimmed) return callback?.({ success: false, error: "La réponse ne peut pas être vide." });

    room.answers[socket.id] = trimmed;

    // All players answered → move to ranking
    if (Object.keys(room.answers).length === room.players.length) {
      room.phase = "ranking";
    }

    io.to(code).emit("classement:state", getClassementRoomSummary(room));
    callback?.({ success: true });
  });

  // Each player submits their ranking: array of other players' IDs, lowest secretNumber first
  socket.on("classement:rank", ({ ranking }, callback) => {
    const code = socket.classementRoomCode;
    const room = classementRooms[code];
    if (!room || room.phase !== "ranking") return callback?.({ success: false });
    if (room.rankings[socket.id] !== undefined)
      return callback?.({ success: false, error: "Tu as déjà soumis ton classement." });

    const allIds = room.players.map((p) => p.id);
    if (
      !Array.isArray(ranking) ||
      ranking.length !== allIds.length ||
      !allIds.every((id) => ranking.includes(id))
    ) return callback?.({ success: false, error: "Classement invalide." });

    room.rankings[socket.id] = ranking;

    // All players ranked → score and reveal
    if (Object.keys(room.rankings).length === room.players.length) {
      room.players.forEach((p) => {
        // Expected order for this player = correctOrder minus themselves
        const expected = room.correctOrder;
        const submitted = room.rankings[p.id];
        let pts = 0;
        expected.forEach((id, i) => { if (submitted[i] === id) pts += 1; });
        room.roundScores[p.id] = pts;
        p.score += pts;
      });
      room.phase = "round_results";
    }

    io.to(code).emit("classement:state", getClassementRoomSummary(room));
    callback?.({ success: true });
  });

  socket.on("classement:next_round", (_, callback) => {
    const code = socket.classementRoomCode;
    const room = classementRooms[code];
    if (!room || room.phase !== "round_results") return;
    if (!room.players.find((p) => p.id === socket.id)?.isHost) return;

    if (room.currentRound >= room.totalRounds) {
      room.state = "gameover";
      room.phase = null;
      io.to(code).emit("classement:state", getClassementRoomSummary(room));
    } else {
      startClassementRound(code);
    }
    callback?.({ success: true });
  });

  // ─── Qui suis-je events ───

  socket.on("qsj:create", ({ playerName }, callback) => {
    let code;
    do { code = generateRoomCode(); } while (qsjRooms[code]);

    qsjRooms[code] = {
      code,
      players: [{ id: socket.id, name: playerName, isHost: true, character: null }],
      state: "lobby",
      phase: null,
      category: "manga",
      totalRounds: 3,
      currentRound: 1,
      currentTurnPlayerId: null,
      currentQuestion: null,
      votes: {},
      winner: null,
      winnerName: null,
      wrongGuess: null,
      wrongGuessTimer: null,
    };

    socket.join(code);
    socket.qsjRoomCode = code;
    callback({ success: true, code });
    io.to(code).emit("qsj:state", getQSJRoomSummary(qsjRooms[code]));
  });

  socket.on("qsj:join", ({ playerName, code }, callback) => {
    const room = qsjRooms[code];
    if (!room) return callback({ success: false, error: "Room introuvable." });
    if (room.state !== "lobby") return callback({ success: false, error: "La partie a déjà commencé." });
    if (room.players.length >= 8) return callback({ success: false, error: "La room est pleine (8 joueurs max)." });
    if (room.players.find((p) => p.name.toLowerCase() === playerName.toLowerCase()))
      return callback({ success: false, error: "Ce pseudo est déjà pris." });

    room.players.push({ id: socket.id, name: playerName, isHost: false, character: null });
    socket.join(code);
    socket.qsjRoomCode = code;
    callback({ success: true, code });
    io.to(code).emit("qsj:state", getQSJRoomSummary(room));
  });

  socket.on("qsj:start", ({ category, totalRounds }, callback) => {
    const code = socket.qsjRoomCode;
    const room = qsjRooms[code];
    if (!room) return callback?.({ success: false });
    if (!room.players.find((p) => p.id === socket.id)?.isHost)
      return callback?.({ success: false, error: "Seul l'hôte peut lancer." });
    if (room.players.length < 2)
      return callback?.({ success: false, error: "Il faut au moins 2 joueurs." });
    if (!qsjCharacters[category])
      return callback?.({ success: false, error: "Catégorie invalide." });

    room.category = category;
    room.totalRounds = Math.min(5, Math.max(1, parseInt(totalRounds) || 3));
    startQSJGame(code);
    callback?.({ success: true });
  });

  socket.on("qsj:ask", ({ question }, callback) => {
    const code = socket.qsjRoomCode;
    const room = qsjRooms[code];
    if (!room || room.state !== "playing" || room.phase !== "questioning")
      return callback?.({ success: false });
    if (room.currentTurnPlayerId !== socket.id)
      return callback?.({ success: false, error: "Ce n'est pas ton tour." });

    const trimmed = (question || "").trim().slice(0, 200);
    if (!trimmed) return callback?.({ success: false, error: "La question ne peut pas être vide." });

    const player = room.players.find((p) => p.id === socket.id);
    room.currentQuestion = { text: trimmed, askerId: socket.id, askerName: player.name };
    room.votes = {};
    room.phase = "voting";

    io.to(code).emit("qsj:state", getQSJRoomSummary(room));
    callback?.({ success: true });
  });

  socket.on("qsj:vote", ({ vote }, callback) => {
    const code = socket.qsjRoomCode;
    const room = qsjRooms[code];
    if (!room || room.state !== "playing" || room.phase !== "voting")
      return callback?.({ success: false });
    if (room.currentTurnPlayerId === socket.id)
      return callback?.({ success: false, error: "Tu ne peux pas voter sur ta propre question." });
    if (room.votes[socket.id] !== undefined)
      return callback?.({ success: false, error: "Tu as déjà voté." });
    if (vote !== "oui" && vote !== "non")
      return callback?.({ success: false, error: "Vote invalide." });

    room.votes[socket.id] = vote;

    const voters = room.players.filter((p) => p.id !== room.currentTurnPlayerId);
    const allVoted = voters.every((p) => room.votes[p.id] !== undefined);

    if (allVoted) {
      room.phase = "vote_reveal";
    }

    io.to(code).emit("qsj:state", getQSJRoomSummary(room));
    callback?.({ success: true });
  });

  socket.on("qsj:guess", ({ guess }, callback) => {
    const code = socket.qsjRoomCode;
    const room = qsjRooms[code];
    if (!room || room.state !== "playing" || room.phase !== "vote_reveal")
      return callback?.({ success: false });
    if (room.currentTurnPlayerId !== socket.id)
      return callback?.({ success: false, error: "Ce n'est pas ton tour." });
    if (room.wrongGuess)
      return callback?.({ success: false, error: "En attente du prochain tour." });

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return callback?.({ success: false });

    const correct = checkQSJGuess(guess, player.character);

    if (correct) {
      room.winner = socket.id;
      room.winnerName = player.name;
      room.state = "gameover";
      room.phase = null;
      io.to(code).emit("qsj:state", getQSJRoomSummary(room));
      callback?.({ success: true, correct: true });
    } else {
      room.wrongGuess = { playerName: player.name, guess };
      io.to(code).emit("qsj:state", getQSJRoomSummary(room));
      callback?.({ success: true, correct: false });

      room.wrongGuessTimer = setTimeout(() => {
        const r = qsjRooms[code];
        if (!r || r.state !== "playing") return;
        r.wrongGuess = null;
        r.wrongGuessTimer = null;
        advanceQSJTurn(code);
      }, 2000);
    }
  });

  socket.on("qsj:pass", (_, callback) => {
    const code = socket.qsjRoomCode;
    const room = qsjRooms[code];
    if (!room || room.state !== "playing" || room.phase !== "vote_reveal")
      return callback?.({ success: false });
    if (room.currentTurnPlayerId !== socket.id)
      return callback?.({ success: false, error: "Ce n'est pas ton tour." });
    if (room.wrongGuess)
      return callback?.({ success: false });

    advanceQSJTurn(code);
    callback?.({ success: true });
  });

  socket.on("qsj:restart", (_, callback) => {
    const code = socket.qsjRoomCode;
    const room = qsjRooms[code];
    if (!room) return;
    if (!room.players.find((p) => p.id === socket.id)?.isHost) return;

    if (room.wrongGuessTimer) clearTimeout(room.wrongGuessTimer);
    room.state = "lobby";
    room.phase = null;
    room.category = "manga";
    room.totalRounds = 3;
    room.currentRound = 1;
    room.currentTurnPlayerId = null;
    room.currentQuestion = null;
    room.votes = {};
    room.winner = null;
    room.winnerName = null;
    room.wrongGuess = null;
    room.wrongGuessTimer = null;
    room.players.forEach((p) => { p.character = null; });

    io.to(code).emit("qsj:state", getQSJRoomSummary(room));
    callback?.({ success: true });
  });

  // Disconnect
  // ─── Citation Mystère events ───

  socket.on("citation:create", ({ playerName }, callback) => {
    let code;
    do { code = generateRoomCode(); } while (citationRooms[code]);

    citationRooms[code] = {
      code,
      players: [{ id: socket.id, name: playerName, isHost: true, score: 0 }],
      state: "lobby",
      phase: null,
      category: "aleatoire",
      totalRounds: 10,
      currentRound: 0,
      currentCitation: null,
      options: [],
      correctOptionIndex: null,
      answers: {},
      roundScores: {},
      phase1StartTime: null,
      phase2StartTime: null,
      phaseTimer: null,
      usedCitationIds: [],
    };

    socket.join(code);
    socket.citationRoomCode = code;
    callback({ success: true, code });
    io.to(code).emit("citation:state", getCitationRoomSummary(citationRooms[code]));
  });

  socket.on("citation:join", ({ playerName, code }, callback) => {
    const room = citationRooms[code];
    if (!room) return callback({ success: false, error: "Room introuvable." });
    if (room.state !== "lobby") return callback({ success: false, error: "La partie a déjà commencé." });
    if (room.players.length >= 8) return callback({ success: false, error: "La room est pleine (8 joueurs max)." });
    if (room.players.find((p) => p.name.toLowerCase() === playerName.toLowerCase()))
      return callback({ success: false, error: "Ce pseudo est déjà pris." });

    room.players.push({ id: socket.id, name: playerName, isHost: false, score: 0 });
    socket.join(code);
    socket.citationRoomCode = code;
    callback({ success: true, code });
    io.to(code).emit("citation:state", getCitationRoomSummary(room));
  });

  socket.on("citation:start", ({ category, totalRounds }, callback) => {
    const code = socket.citationRoomCode;
    const room = citationRooms[code];
    if (!room) return callback?.({ success: false });
    if (!room.players.find((p) => p.id === socket.id)?.isHost)
      return callback?.({ success: false, error: "Seul l'hôte peut lancer." });
    if (room.players.length < 3)
      return callback?.({ success: false, error: "Il faut au moins 3 joueurs." });

    const validCategories = ["aleatoire", "shonen", "shojo", "seinen"];
    room.category = validCategories.includes(category) ? category : "aleatoire";
    room.totalRounds = [5, 10, 15].includes(parseInt(totalRounds)) ? parseInt(totalRounds) : 10;
    room.state = "playing";
    room.usedCitationIds = [];
    room.players.forEach((p) => { p.score = 0; });
    startCitationRound(code);
    callback?.({ success: true });
  });

  socket.on("citation:answer_free", ({ answer }, callback) => {
    const code = socket.citationRoomCode;
    const room = citationRooms[code];
    if (!room || room.phase !== "phase1") return callback?.({ success: false });
    if (room.answers[socket.id] !== undefined) return callback?.({ success: false, error: "Tu as déjà répondu." });

    const trimmed = (answer || "").trim().slice(0, 100);
    if (!trimmed) return callback?.({ success: false, error: "La réponse ne peut pas être vide." });

    room.answers[socket.id] = {
      answer: trimmed,
      choiceIndex: null,
      phase: "phase1",
      timestamp: Date.now(),
    };

    callback?.({ success: true });
    io.to(code).emit("citation:state", getCitationRoomSummary(room));

    const allAnswered = room.players.every((p) => room.answers[p.id] !== undefined);
    if (allAnswered && room.phaseTimer) {
      clearTimeout(room.phaseTimer);
      room.phaseTimer = null;
      startCitationPhase2(code);
    }
  });

  socket.on("citation:answer_choice", ({ choiceIndex }, callback) => {
    const code = socket.citationRoomCode;
    const room = citationRooms[code];
    if (!room || room.phase !== "phase2") return callback?.({ success: false });
    if (room.answers[socket.id] !== undefined) return callback?.({ success: false, error: "Tu as déjà répondu." });

    const idx = parseInt(choiceIndex);
    if (isNaN(idx) || idx < 0 || idx > 3) return callback?.({ success: false, error: "Choix invalide." });

    room.answers[socket.id] = {
      answer: null,
      choiceIndex: idx,
      phase: "phase2",
      timestamp: Date.now(),
    };

    callback?.({ success: true });
    io.to(code).emit("citation:state", getCitationRoomSummary(room));

    const allAnswered = room.players.every((p) => room.answers[p.id] !== undefined);
    if (allAnswered && room.phaseTimer) {
      clearTimeout(room.phaseTimer);
      room.phaseTimer = null;
      revealCitationRound(code);
    }
  });

  socket.on("citation:next_round", (_, callback) => {
    const code = socket.citationRoomCode;
    const room = citationRooms[code];
    if (!room || room.phase !== "reveal") return;
    if (!room.players.find((p) => p.id === socket.id)?.isHost) return;

    if (room.currentRound >= room.totalRounds) {
      room.state = "gameover";
      room.phase = null;
      io.to(code).emit("citation:state", getCitationRoomSummary(room));
    } else {
      startCitationRound(code);
    }
    callback?.({ success: true });
  });

  // ── Dessin events ────────────────────────────────────────────────

  socket.on("dessin:create", ({ playerName }, callback) => {
    if (!playerName?.trim()) return callback?.({ success: false, error: "Prénom requis." });
    let code;
    do { code = generateRoomCode(); } while (dessinRooms[code]);
    dessinRooms[code] = {
      code, state: "lobby", phase: null,
      players: [{ id: socket.id, name: playerName.trim(), isHost: true, score: 0 }],
      category: "aleatoire", totalRounds: 10, currentRound: 0,
      drawerId: null, currentCharacter: null, usedCharacterNames: [],
      answers: {}, attempts: {}, roundScores: {}, roundTimer: null, roundStartTime: null,
    };
    socket.join(code);
    socket.dessinRoomCode = code;
    callback?.({ success: true, code });
    io.to(code).emit("dessin:state", getDessinRoomSummary(dessinRooms[code]));
  });

  socket.on("dessin:join", ({ playerName, code }, callback) => {
    const room = dessinRooms[code?.toUpperCase()];
    if (!room) return callback?.({ success: false, error: "Room introuvable." });
    if (room.state !== "lobby") return callback?.({ success: false, error: "Partie déjà en cours." });
    if (room.players.length >= 8) return callback?.({ success: false, error: "La room est pleine (8 joueurs max)." });
    if (room.players.find((p) => p.name.toLowerCase() === playerName?.toLowerCase()))
      return callback?.({ success: false, error: "Ce pseudo est déjà pris." });
    room.players.push({ id: socket.id, name: playerName.trim(), isHost: false, score: 0 });
    socket.join(code.toUpperCase());
    socket.dessinRoomCode = code.toUpperCase();
    callback?.({ success: true, code: code.toUpperCase() });
    io.to(code.toUpperCase()).emit("dessin:state", getDessinRoomSummary(room));
  });

  socket.on("dessin:start", ({ category, totalRounds }, callback) => {
    const code = socket.dessinRoomCode;
    const room = dessinRooms[code];
    if (!room) return callback?.({ success: false });
    if (!room.players.find((p) => p.id === socket.id)?.isHost)
      return callback?.({ success: false, error: "Seul l'hôte peut lancer." });
    if (room.players.length < 3)
      return callback?.({ success: false, error: "Il faut au moins 3 joueurs." });
    const validCats = ["aleatoire", "shonen", "shojo", "seinen"];
    room.category = validCats.includes(category) ? category : "aleatoire";
    room.totalRounds = [5, 10, 15].includes(parseInt(totalRounds)) ? parseInt(totalRounds) : 10;
    room.state = "playing";
    room.usedCharacterNames = [];
    room.players.forEach((p) => { p.score = 0; });
    startDessinRound(code);
    callback?.({ success: true });
  });

  socket.on("dessin:draw", (data) => {
    const code = socket.dessinRoomCode;
    const room = dessinRooms[code];
    if (!room || room.drawerId !== socket.id || room.phase !== "drawing") return;
    socket.to(code).emit("dessin:stroke", data);
  });

  socket.on("dessin:clear", () => {
    const code = socket.dessinRoomCode;
    const room = dessinRooms[code];
    if (!room || room.drawerId !== socket.id || room.phase !== "drawing") return;
    socket.to(code).emit("dessin:stroke", { type: "clear" });
  });

  socket.on("dessin:guess", ({ guess }, callback) => {
    const code = socket.dessinRoomCode;
    const room = dessinRooms[code];
    if (!room || room.phase !== "drawing") return callback?.({ success: false });
    if (socket.id === room.drawerId) return callback?.({ success: false, error: "Le dessinateur ne peut pas deviner." });
    if (room.answers[socket.id]?.found) return callback?.({ success: false, error: "Tu as déjà trouvé." });
    const attempts = room.attempts[socket.id] || 0;
    if (attempts >= 3) return callback?.({ success: false, error: "Plus de tentatives disponibles." });

    room.attempts[socket.id] = attempts + 1;
    const trimmed = (guess || "").trim().slice(0, 60);
    if (!trimmed) return callback?.({ success: false });

    const correct = checkDessinAnswer(trimmed, room.currentCharacter);
    if (correct) {
      const elapsed = Date.now() - room.roundStartTime;
      const pts = calculateDessinScore(elapsed);
      room.answers[socket.id] = { found: true, timestamp: Date.now() };
      room.roundScores[socket.id] = pts;
    } else {
      if (!room.answers[socket.id]) room.answers[socket.id] = { found: false };
    }

    callback?.({ success: true, correct, attemptsLeft: 3 - room.attempts[socket.id] });
    io.to(code).emit("dessin:state", getDessinRoomSummary(room));

    const guessers = room.players.filter((p) => p.id !== room.drawerId);
    const allDone = guessers.length > 0 && guessers.every(
      (p) => room.answers[p.id]?.found || (room.attempts[p.id] || 0) >= 3
    );
    if (allDone) revealDessinRound(code);
  });

  socket.on("dessin:next_round", (_, callback) => {
    const code = socket.dessinRoomCode;
    const room = dessinRooms[code];
    if (!room) return;
    if (!room.players.find((p) => p.id === socket.id)?.isHost) return;
    if (room.currentRound >= room.totalRounds) {
      room.state = "gameover";
      io.to(code).emit("dessin:state", getDessinRoomSummary(room));
    } else {
      startDessinRound(code);
    }
    callback?.({ success: true });
  });

  socket.on("dessin:restart", (_, callback) => {
    const code = socket.dessinRoomCode;
    const room = dessinRooms[code];
    if (!room) return;
    if (!room.players.find((p) => p.id === socket.id)?.isHost) return;
    if (room.roundTimer) clearTimeout(room.roundTimer);
    room.state = "lobby"; room.phase = null; room.currentRound = 0;
    room.drawerId = null; room.currentCharacter = null; room.usedCharacterNames = [];
    room.answers = {}; room.attempts = {}; room.roundScores = {}; room.roundTimer = null; room.roundStartTime = null;
    room.players.forEach((p) => { p.score = 0; });
    io.to(code).emit("dessin:state", getDessinRoomSummary(room));
    callback?.({ success: true });
  });

  socket.on("citation:restart", (_, callback) => {
    const code = socket.citationRoomCode;
    const room = citationRooms[code];
    if (!room) return;
    if (!room.players.find((p) => p.id === socket.id)?.isHost) return;

    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    room.state = "lobby";
    room.phase = null;
    room.currentRound = 0;
    room.currentCitation = null;
    room.options = [];
    room.correctOptionIndex = null;
    room.answers = {};
    room.roundScores = {};
    room.phase1StartTime = null;
    room.phase2StartTime = null;
    room.phaseTimer = null;
    room.usedCitationIds = [];
    room.players.forEach((p) => { p.score = 0; });

    io.to(code).emit("citation:state", getCitationRoomSummary(room));
    callback?.({ success: true });
  });

  socket.on("disconnect", () => {
    const citCode = socket.citationRoomCode;
    if (citCode && citationRooms[citCode]) {
      const room = citationRooms[citCode];
      const idx = room.players.findIndex((p) => p.id === socket.id);
      if (idx !== -1) {
        const wasHost = room.players[idx].isHost;
        room.players.splice(idx, 1);
        if (room.players.length === 0) {
          if (room.phaseTimer) clearTimeout(room.phaseTimer);
          delete citationRooms[citCode];
        } else {
          if (wasHost) room.players[0].isHost = true;
          if (room.state === "playing" && room.phase !== "reveal") {
            const allAnswered = room.players.every((p) => room.answers[p.id] !== undefined);
            if (allAnswered && room.phaseTimer) {
              clearTimeout(room.phaseTimer);
              room.phaseTimer = null;
              if (room.phase === "phase1") startCitationPhase2(citCode);
              else revealCitationRound(citCode);
            } else {
              io.to(citCode).emit("citation:state", getCitationRoomSummary(room));
            }
          } else {
            io.to(citCode).emit("citation:state", getCitationRoomSummary(room));
          }
        }
      }
    }

    const dessinCode = socket.dessinRoomCode;
    if (dessinCode && dessinRooms[dessinCode]) {
      const room = dessinRooms[dessinCode];
      const idx = room.players.findIndex((p) => p.id === socket.id);
      if (idx !== -1) {
        const wasHost = room.players[idx].isHost;
        const wasDrawer = room.drawerId === socket.id;
        room.players.splice(idx, 1);
        if (room.players.length === 0) {
          if (room.roundTimer) clearTimeout(room.roundTimer);
          delete dessinRooms[dessinCode];
        } else {
          if (wasHost) room.players[0].isHost = true;
          if (room.state === "playing" && room.phase === "drawing") {
            if (wasDrawer) {
              if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }
              revealDessinRound(dessinCode);
            } else {
              const guessers = room.players.filter((p) => p.id !== room.drawerId);
              const allDone = guessers.length > 0 && guessers.every(
                (p) => room.answers[p.id]?.found || (room.attempts[p.id] || 0) >= 3
              );
              if (allDone) {
                if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }
                revealDessinRound(dessinCode);
              } else {
                io.to(dessinCode).emit("dessin:state", getDessinRoomSummary(room));
              }
            }
          } else {
            io.to(dessinCode).emit("dessin:state", getDessinRoomSummary(room));
          }
        }
      }
    }

    const qsjCode = socket.qsjRoomCode;
    if (qsjCode && qsjRooms[qsjCode]) {
      const room = qsjRooms[qsjCode];
      const idx = room.players.findIndex((p) => p.id === socket.id);
      if (idx !== -1) {
        const wasHost = room.players[idx].isHost;
        const wasCurrentTurn = room.currentTurnPlayerId === socket.id;
        const wasVoterDuringVoting = room.phase === "voting" && room.currentTurnPlayerId !== socket.id;
        room.players.splice(idx, 1);

        if (room.players.length === 0) {
          if (room.wrongGuessTimer) clearTimeout(room.wrongGuessTimer);
          delete qsjRooms[qsjCode];
        } else {
          if (wasHost) room.players[0].isHost = true;
          if (room.state === "playing") {
            if (wasCurrentTurn) {
              if (room.wrongGuessTimer) { clearTimeout(room.wrongGuessTimer); room.wrongGuessTimer = null; }
              room.wrongGuess = null;
              advanceQSJTurn(qsjCode);
            } else if (wasVoterDuringVoting) {
              const voters = room.players.filter((p) => p.id !== room.currentTurnPlayerId);
              const allVoted = voters.length > 0 && voters.every((p) => room.votes[p.id] !== undefined);
              if (allVoted) {
                room.phase = "vote_reveal";
              }
              io.to(qsjCode).emit("qsj:state", getQSJRoomSummary(room));
            } else {
              io.to(qsjCode).emit("qsj:state", getQSJRoomSummary(room));
            }
          } else {
            io.to(qsjCode).emit("qsj:state", getQSJRoomSummary(room));
          }
        }
      }
    }

    const noteCode = socket.noteRoomCode;
    if (noteCode && noteRooms[noteCode]) {
      const nroom = noteRooms[noteCode];
      const nidx = nroom.players.findIndex((p) => p.id === socket.id);
      if (nidx !== -1) {
        const wasNoteHost = nroom.players[nidx].isHost;
        nroom.players.splice(nidx, 1);
        if (nroom.players.length === 0) {
          delete noteRooms[noteCode];
        } else {
          if (wasNoteHost) nroom.players[0].isHost = true;
          if (nroom.state === "playing" && nroom.maitre === socket.id) {
            startNoteRound(noteCode);
          } else {
            io.to(noteCode).emit("note:state", getNoteRoomSummary(nroom));
          }
        }
      }
    }

    const classementCode = socket.classementRoomCode;
    if (classementCode && classementRooms[classementCode]) {
      const croom = classementRooms[classementCode];
      const cidx = croom.players.findIndex((p) => p.id === socket.id);
      if (cidx !== -1) {
        const wasHost = croom.players[cidx].isHost;
        croom.players.splice(cidx, 1);
        if (croom.players.length === 0) {
          delete classementRooms[classementCode];
        } else {
          if (wasHost) croom.players[0].isHost = true;
          if (croom.state === "playing") {
            // If everyone answered/ranked already, recalculate thresholds
            const allAnswered = croom.players.every((p) => croom.answers[p.id] !== undefined);
            const allRanked = croom.players.every((p) => croom.rankings[p.id] !== undefined);
            if (croom.phase === "answering" && allAnswered) croom.phase = "ranking";
            if (croom.phase === "ranking" && allRanked) {
              croom.players.forEach((p) => {
                const expected = croom.correctOrder.filter((id) => croom.players.find((pl) => pl.id === id));
                const submitted = (croom.rankings[p.id] || []).filter((id) => croom.players.find((pl) => pl.id === id));
                let pts = 0;
                expected.forEach((id, i) => { if (submitted[i] === id) pts += 1; });
                if (!croom.roundScores[p.id]) { croom.roundScores[p.id] = pts; p.score += pts; }
              });
              croom.phase = "round_results";
            }
          }
          io.to(classementCode).emit("classement:state", getClassementRoomSummary(croom));
        }
      }
    }

    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];

    const idx = room.players.findIndex((p) => p.id === socket.id);
    if (idx === -1) return;

    const wasHost = room.players[idx].isHost;
    room.players.splice(idx, 1);

    if (room.players.length === 0) {
      if (room.timer) clearTimeout(room.timer);
      delete rooms[code];
      return;
    }

    // Transfer host
    if (wasHost && room.players.length > 0) room.players[0].isHost = true;

    // If game was in progress and it was this player's turn
    if (room.state === "playing" && room.currentTurn === socket.id) {
      if (room.timer) clearTimeout(room.timer);
      if (room.players.length >= 3) {
        advanceTurn(code);
      } else {
        room.state = "lobby";
      }
    }

    io.to(code).emit("game:state", getRoomSummary(room));
    io.to(code).emit("game:player_left", { name: "Un joueur a quitté la partie" });
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
