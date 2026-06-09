const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const wordPairs = require("./words");

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

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getRandomWordPair() {
  return wordPairs[Math.floor(Math.random() * wordPairs.length)];
}

function getRoomSummary(room) {
  return {
    code: room.code,
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

    const pair = getRandomWordPair();
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

  // Disconnect
  socket.on("disconnect", () => {
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
