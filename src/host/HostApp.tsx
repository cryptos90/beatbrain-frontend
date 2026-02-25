import React from "react";
import { HostLobbyScreen } from "./screens/HostLobbyScreen";
import { HostLoginScreen } from "./screens/HostLoginScreen";
import { HostQuizCreateScreen } from "./screens/HostQuizCreateScreen";
import { HostQuizScreen } from "./screens/HostQuizScreen";
import { HostQuizSetupScreen } from "./screens/HostQuizSetupScreen";
import { HostSetupModeScreen } from "./screens/HostSetupModeScreen";
import { HostResultsScreen } from "./screens/HostResultsScreen";
import { useHostController } from "./hooks/useHostController";

export function HostApp() {
  const app = useHostController();

  if (app.screen === "start") {
    return (
      <HostLoginScreen
        hasAuth={app.hasAuth}
        authBusy={app.authBusy}
        authError={app.authError}
        creatingLobby={app.creatingLobby}
        socketError={app.socketError}
        onLogin={app.startSpotifyLogin}
        onStartSession={app.createLobby}
        notice={app.routeNotice}
      />
    );
  }

  if (app.screen === "lobby") {
    return (
      <HostLobbyScreen
        lobby={app.lobby}
        joinUrl={app.joinUrl}
        socketError={app.socketError}
        canOpenSetup={app.canOpenSetup}
        onOpenSetup={app.openSetup}
        notice={app.routeNotice}
      />
    );
  }

  if (app.screen === "setupMode") {
    return (
      <HostSetupModeScreen
        questionCount={app.questionCount}
        onQuestionCountChange={app.setQuestionCount}
        onChooseMode={app.openSetupChoose}
        onCreateMode={app.openSetupCreate}
        notice={app.routeNotice}
      />
    );
  }

  if (app.screen === "setupChoose") {
    return (
      <HostQuizSetupScreen
        playlists={app.playlists}
        selectedPlaylistIndex={app.selectedPlaylistIndex}
        setupError={app.setupError}
        creatingSession={app.creatingSession}
        onSelectPlaylistIndex={app.setSelectedPlaylistIndex}
        onCreateSession={app.createSessionFromChoose}
        notice={app.routeNotice}
      />
    );
  }

  if (app.screen === "setupCreate") {
    return (
      <HostQuizCreateScreen
        playlistIdInput={app.playlistIdInput}
        setupError={app.setupError}
        creatingSession={app.creatingSession}
        onPlaylistIdInputChange={app.setPlaylistIdInput}
        onCreateSession={app.createSessionFromCreate}
        notice={app.routeNotice}
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
        notice={app.routeNotice}
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
      notice={app.routeNotice}
    />
  );
}
