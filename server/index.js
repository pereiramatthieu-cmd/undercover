const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const wordPairs = require("./words");
const classementQuestions = require("./classement_questions");

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
  if (!room) return;

  const nextIndex = getNextTurnIndex(room);
  const firstPlayerId = room.players[0].id;

  // If we've come back to the first player
  if (room.players[nextIndex].id === firstPlayerId) {
    if (room.round >= 2) {
      // Both rounds done → go to vote
      room.state = "voting";
      room.currentTurn = null;
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
  const reveal = room.phase === "round_results";
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

    // First player's turn
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

    if (room.timer) clearTimeout(room.timer);
    io.to(code).emit("game:state", getRoomSummary(room));
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
    io.to(code).emit("game:votes_count", { count: Object.keys(room.votes).length, total: room.players.length });

    // All voted?
    if (Object.keys(room.votes).length === room.players.length) {
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

    const otherIds = room.players.filter((p) => p.id !== socket.id).map((p) => p.id);
    if (
      !Array.isArray(ranking) ||
      ranking.length !== otherIds.length ||
      !otherIds.every((id) => ranking.includes(id))
    ) return callback?.({ success: false, error: "Classement invalide." });

    room.rankings[socket.id] = ranking;

    // All players ranked → score and reveal
    if (Object.keys(room.rankings).length === room.players.length) {
      room.players.forEach((p) => {
        // Expected order for this player = correctOrder minus themselves
        const expected = room.correctOrder.filter((id) => id !== p.id);
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

  // Disconnect
  socket.on("disconnect", () => {
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
                const expected = croom.correctOrder.filter((id) => id !== p.id && croom.players.find((pl) => pl.id === id));
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
    io.to(code).emit("game:player_left", { name: room.players[idx - 1]?.name || "Un joueur" });
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
