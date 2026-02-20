import React from "react";
import { HostLobbyScreen } from "./screens/HostLobbyScreen";
import { HostLoginScreen } from "./screens/HostLoginScreen";
import { HostQuizScreen } from "./screens/HostQuizScreen";
import { HostQuizSetupScreen } from "./screens/HostQuizSetupScreen";
import { HostResultsScreen } from "./screens/HostResultsScreen";
import { useHostController } from "./hooks/useHostController";

export function HostApp() {
  const app = useHostController();

  if (!app.hasAuth || app.screen === "login") {
    return (
      <HostLoginScreen
        authBusy={app.authBusy}
        authError={app.authError}
        onLogin={app.startSpotifyLogin}
      />
    );
  }

  if (app.screen === "lobby") {
    return (
      <HostLobbyScreen
        lobby={app.lobby}
        joinUrl={app.joinUrl}
        creatingLobby={app.creatingLobby}
        socketError={app.socketError}
        canOpenSetup={app.canOpenSetup}
        onCreateLobby={app.createLobby}
        onOpenSetup={app.openSetup}
      />
    );
  }

  if (app.screen === "setup") {
    return (
      <HostQuizSetupScreen
        playlists={app.playlists}
        selectedPlaylistIndex={app.selectedPlaylistIndex}
        questionCount={app.questionCount}
        playlistIdInput={app.playlistIdInput}
        setupError={app.setupError}
        creatingSession={app.creatingSession}
        onBack={app.openLobby}
        onQuestionCountChange={app.setQuestionCount}
        onSelectPlaylistIndex={app.setSelectedPlaylistIndex}
        onPlaylistIdInputChange={app.setPlaylistIdInput}
        onCreateSession={app.createSession}
      />
    );
  }

  if (app.screen === "quiz") {
    return (
      <HostQuizScreen
        lobby={app.lobby}
        question={app.question}
        correctAnswer={app.correctAnswer}
        playbackError={app.playbackError}
        socketError={app.socketError}
        actionBusy={app.actionBusy}
        allAnswered={app.allAnswered}
        timeUp={app.timeUp}
        allContinued={app.allContinued}
        countdownMs={app.countdownMs}
        readyCount={app.readyCount}
        totalPlayers={app.totalPlayers}
        canStartRound={app.canStartRound}
        canReveal={app.canReveal}
        onBack={app.openSetup}
        onStartRound={app.startRound}
        onReveal={app.revealRound}
      />
    );
  }

  return (
    <HostResultsScreen
      lobby={app.lobby}
      actionBusy={app.actionBusy}
      socketError={app.socketError}
      onRestartQuiz={app.restartQuiz}
      onReturnToMenu={app.returnToMenu}
    />
  );
}
