import React, { useState, useEffect } from "react";
import socket from "./socket";
import GameSelect from "./pages/GameSelect";
import NoteLobby from "./pages/NoteLobby";
import NoteGame from "./pages/NoteGame";
import NoteResults from "./pages/NoteResults";
import ClassementLobby from "./pages/ClassementLobby";
import ClassementGame from "./pages/ClassementGame";
import ClassementResults from "./pages/ClassementResults";
import CitationLobby from "./pages/CitationLobby";
import CitationGame from "./pages/CitationGame";
import CitationResults from "./pages/CitationResults";
import DessinLobby from "./pages/DessinLobby";
import DessinGame from "./pages/DessinGame";
import DessinResults from "./pages/DessinResults";
import QSJLobby from "./pages/QSJLobby";
import QSJGame from "./pages/QSJGame";
import QSJResults from "./pages/QSJResults";
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
  const [classementState, setClassementState] = useState(null);
  const [classementSecretNumber, setClassementSecretNumber] = useState(null);
  const [citationState, setCitationState] = useState(null);
  const [dessinState, setDessinState] = useState(null);
  const [dessinCharacter, setDessinCharacter] = useState(null);
  const [qsjState, setQsjState] = useState(null);
  const [qsjOthersCharacters, setQsjOthersCharacters] = useState({});

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

    socket.on("classement:state", (state) => {
      setClassementState(state);
      if (state.state === "lobby") setPage("classementLobby");
      else if (state.state === "playing" && state.phase === "round_results") setPage("classementResults");
      else if (state.state === "playing") setPage("classementGame");
      else if (state.state === "gameover") setPage("classementResults");
    });

    socket.on("classement:secret", ({ number }) => {
      setClassementSecretNumber(number);
    });

    socket.on("citation:state", (state) => {
      setCitationState(state);
      if (state.state === "lobby") setPage("citationLobby");
      else if (state.state === "playing") setPage("citationGame");
      else if (state.state === "gameover") setPage("citationResults");
    });

    socket.on("dessin:state", (state) => {
      setDessinState(state);
      if (state.state === "lobby") setPage("dessinLobby");
      else if (state.state === "playing") setPage("dessinGame");
      else if (state.state === "gameover") setPage("dessinResults");
    });

    socket.on("dessin:character", ({ character, manga }) => {
      setDessinCharacter({ character, manga });
    });

    socket.on("qsj:state", (state) => {
      setQsjState(state);
      if (state.state === "lobby") {
        setQsjOthersCharacters({});
        setPage("qsjLobby");
      } else if (state.state === "playing") {
        setPage("qsjGame");
      } else if (state.state === "gameover") {
        setPage("qsjResults");
      }
    });

    socket.on("qsj:others_characters", ({ characters }) => {
      setQsjOthersCharacters(characters);
    });

    return () => {
      socket.off("game:state");
      socket.off("game:word");
      socket.off("game:results");
      socket.off("note:state");
      socket.off("note:secret");
      socket.off("classement:state");
      socket.off("classement:secret");
      socket.off("citation:state");
      socket.off("dessin:state");
      socket.off("dessin:character");
      socket.off("qsj:state");
      socket.off("qsj:others_characters");
    };
  }, []);

  const handleSelectGame = (id) => {
    setGameType(id);
    setPage("home");
  };

  const handleJoin = (code, name) => {
    setRoomCode(code);
    setPlayerName(name);
    if (gameType === "lanote") {
      setNoteSecretNote(null);
    } else if (gameType === "classement") {
      setClassementSecretNumber(null);
    } else if (gameType === "citation") {
      // page will be set by citation:state event
    } else if (gameType === "dessin") {
      // page will be set by dessin:state event
    } else if (gameType === "quisuisje") {
      setQsjOthersCharacters({});
    } else {
      setPage("lobby");
    }
  };

  const handleRestart = () => {
    setMyWord(null);
    setMyRole(null);
    setResults(null);
  };

  const handleGoHome = () => {
    setPage("gameSelect");
    setGameType(null);
    setRoomCode(null);
    setPlayerName("");
    setGameState(null);
    setMyWord(null);
    setMyRole(null);
    setResults(null);
    setNoteState(null);
    setNoteSecretNote(null);
    setClassementState(null);
    setClassementSecretNumber(null);
    setCitationState(null);
    setDessinState(null);
    setDessinCharacter(null);
    setQsjState(null);
    setQsjOthersCharacters({});
    if (socket.connected) socket.disconnect();
    setTimeout(() => socket.connect(), 300);
  };

  return (
    <div className="app">
      {page === "gameSelect" && <GameSelect onSelectGame={handleSelectGame} />}
      {page === "home" && <Home onJoin={handleJoin} gameType={gameType} onGoHome={handleGoHome} />}
      {page === "lobby" && (
        <Lobby
          gameState={gameState}
          roomCode={roomCode}
          playerName={playerName}
          myId={socket.id}
          onGoHome={handleGoHome}
        />
      )}
      {page === "game" && (
        <Game
          gameState={gameState}
          myWord={myWord}
          myRole={myRole}
          myId={socket.id}
          playerName={playerName}
          onGoHome={handleGoHome}
        />
      )}
      {page === "results" && (
        <Results
          gameState={gameState}
          results={results}
          myId={socket.id}
          onRestart={handleRestart}
          onGoHome={handleGoHome}
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
      {page === "classementLobby" && (
        <ClassementLobby classementState={classementState} roomCode={roomCode} playerName={playerName} myId={socket.id} />
      )}
      {page === "classementGame" && (
        <ClassementGame classementState={classementState} myId={socket.id} secretNumber={classementSecretNumber} />
      )}
      {page === "classementResults" && (
        <ClassementResults classementState={classementState} myId={socket.id} />
      )}
      {page === "citationLobby" && (
        <CitationLobby citationState={citationState} roomCode={roomCode} playerName={playerName} myId={socket.id} />
      )}
      {page === "citationGame" && (
        <CitationGame citationState={citationState} myId={socket.id} />
      )}
      {page === "citationResults" && (
        <CitationResults citationState={citationState} myId={socket.id} onGoHome={handleGoHome} />
      )}
      {page === "dessinLobby" && (
        <DessinLobby dessinState={dessinState} roomCode={roomCode} playerName={playerName} myId={socket.id} />
      )}
      {page === "dessinGame" && (
        <DessinGame dessinState={dessinState} myId={socket.id} secretCharacter={dessinCharacter} />
      )}
      {page === "dessinResults" && (
        <DessinResults dessinState={dessinState} myId={socket.id} onGoHome={handleGoHome} />
      )}
      {page === "qsjLobby" && (
        <QSJLobby qsjState={qsjState} roomCode={roomCode} playerName={playerName} myId={socket.id} />
      )}
      {page === "qsjGame" && (
        <QSJGame qsjState={qsjState} myId={socket.id} othersCharacters={qsjOthersCharacters} />
      )}
      {page === "qsjResults" && (
        <QSJResults qsjState={qsjState} myId={socket.id} onGoHome={handleGoHome} />
      )}
    </div>
  );
}
