import React, { useState, useEffect } from "react";
import socket from "./socket";
import GameSelect from "./pages/GameSelect";
import NoteLobby from "./pages/NoteLobby";
import NoteGame from "./pages/NoteGame";
import NoteResults from "./pages/NoteResults";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Results from "./pages/Results";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("gameSelect");
  const [gameType, setGameType] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [gameState, setGameState] = useState(null);
  const [myWord, setMyWord] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [results, setResults] = useState(null);
  const [noteState, setNoteState] = useState(null);
  const [noteSecretNote, setNoteSecretNote] = useState(null);

  useEffect(() => {
    socket.connect();

    socket.on("game:state", (state) => {
      setGameState(state);
      if (state.state === "lobby") {
        setPage("lobby");
      }
      if (state.state === "playing" || state.state === "voting") setPage("game");
      if (state.state === "results") setPage("results");
    });

    socket.on("game:word", ({ word, role }) => {
      setMyWord(word);
      setMyRole(role);
    });

    socket.on("game:results", (data) => {
      setResults(data);
    });

    socket.on("note:state", (state) => {
      setNoteState(state);
      if (state.state === "lobby") setPage("noteLobby");
      else if (state.state === "playing" && state.phase === "round_results") setPage("noteResults");
      else if (state.state === "playing") setPage("noteGame");
      else if (state.state === "gameover") setPage("noteResults");
    });

    socket.on("note:secret", ({ note }) => {
      setNoteSecretNote(note);
    });

    return () => {
      socket.off("game:state");
      socket.off("game:word");
      socket.off("game:results");
      socket.off("note:state");
      socket.off("note:secret");
    };
  }, []);

  const handleSelectGame = (id) => {
    setGameType(id);
    setPage("home");
  };

  const handleJoin = (code, name) => {
    setRoomCode(code);
    setPlayerName(name);
    if (gameType !== "lanote") setPage("lobby");
    else setNoteSecretNote(null);
  };

  const handleRestart = () => {
    setMyWord(null);
    setMyRole(null);
    setResults(null);
  };

  return (
    <div className="app">
      {page === "gameSelect" && <GameSelect onSelectGame={handleSelectGame} />}
      {page === "home" && <Home onJoin={handleJoin} gameType={gameType} />}
      {page === "lobby" && (
        <Lobby
          gameState={gameState}
          roomCode={roomCode}
          playerName={playerName}
          myId={socket.id}
        />
      )}
      {page === "game" && (
        <Game
          gameState={gameState}
          myWord={myWord}
          myRole={myRole}
          myId={socket.id}
          playerName={playerName}
        />
      )}
      {page === "results" && (
        <Results
          gameState={gameState}
          results={results}
          myId={socket.id}
          onRestart={handleRestart}
        />
      )}
      {page === "noteLobby" && (
        <NoteLobby noteState={noteState} roomCode={roomCode} playerName={playerName} myId={socket.id} />
      )}
      {page === "noteGame" && (
        <NoteGame noteState={noteState} myId={socket.id} secretNote={noteSecretNote} />
      )}
      {page === "noteResults" && (
        <NoteResults noteState={noteState} myId={socket.id} />
      )}
    </div>
  );
}
