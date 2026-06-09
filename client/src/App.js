import React, { useState, useEffect } from "react";
import socket from "./socket";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Results from "./pages/Results";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("home");
  const [roomCode, setRoomCode] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [gameState, setGameState] = useState(null);
  const [myWord, setMyWord] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [results, setResults] = useState(null);

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

    return () => {
      socket.off("game:state");
      socket.off("game:word");
      socket.off("game:results");
    };
  }, []);

  const handleJoin = (code, name) => {
    setRoomCode(code);
    setPlayerName(name);
    setPage("lobby");
  };

  const handleRestart = () => {
    setMyWord(null);
    setMyRole(null);
    setResults(null);
  };

  return (
    <div className="app">
      {page === "home" && <Home onJoin={handleJoin} />}
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
    </div>
  );
}
