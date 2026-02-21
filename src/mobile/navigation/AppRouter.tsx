import React from "react";
import { StatusBar } from "expo-status-bar";
import { StartScreen } from "../screens/StartScreen";
import { SinglePlayerMenu } from "../screens/SinglePlayerMenu";
import { ChooseQuizView } from "../screens/ChooseQuizView";
import { CreateQuizView } from "../screens/CreateQuizView";
import { QuizView } from "../screens/QuizView";
import { ResultsView } from "../screens/ResultsView";
import { MultiplayerJoinView } from "../screens/MultiplayerJoinView";
import { MultiplayerQuizView } from "../screens/MultiplayerQuizView";
import { MultiplayerResultsView } from "../screens/MultiplayerResultsView";
import type { BeatBrainController } from "../hooks/useBeatBrainController";

type Props = {
  app: BeatBrainController;
};

export function AppRouter({ app }: Props) {
  if (app.screen.name === "start") {
    return (
      <>
        <StatusBar hidden />
        <StartScreen
          onSinglePlayer={async () => {
            app.setScreen({ name: "singleMenu" });
            await app.ensureSpotifyLogin();
          }}
          onMultiplayer={() => {
            app.resetMultiplayerState();
            app.setScreen({ name: "multiplayerJoin" });
          }}
        />
      </>
    );
  }

  if (app.screen.name === "singleMenu") {
    return (
      <>
        <StatusBar hidden />
        <SinglePlayerMenu
          waitingForLogin={!app.hasAuth && app.loginPending}
          loginError={!app.hasAuth ? app.authError : null}
          onRetryLogin={app.startSpotifyLogin}
          onBack={() => app.setScreen({ name: "start" })}
          onChoose={() => app.setScreen({ name: "choose" })}
          onCreate={() => app.setScreen({ name: "create" })}
          questionCount={app.questionCount}
          onQuestionCountChange={app.setQuestionCount}
        />
      </>
    );
  }

  if (app.screen.name === "choose") {
    return (
      <>
        <StatusBar hidden />
        <ChooseQuizView
          playlists={app.playlists}
          loading={app.chooseLoading}
          selectedPlaylistIndex={app.selectedPlaylistIndex}
          selectedPlaylist={app.selectedPlaylist}
          carouselRef={app.carouselRef}
          playlistError={app.playlistError}
          reauthRequired={app.reauthRequired}
          reauthMessage={app.reauthMessage}
          viewMode={app.chooseViewMode}
          onRelogin={app.reloginChoose}
          onRetry={app.retryChooseLoad}
          onBack={() => app.setScreen({ name: "singleMenu" })}
          onSelectPlaylistIndex={app.setSelectedPlaylistIndex}
          onStartQuiz={async () => {
            if (!app.selectedPlaylist) {
              return;
            }

            await app.beginQuizForPlaylist(
              app.selectedPlaylist.id,
              app.selectedPlaylist.title,
              app.selectedPlaylist.decadeTag,
            );
          }}
        />
      </>
    );
  }

  if (app.screen.name === "create") {
    return (
      <>
        <StatusBar hidden />
        <CreateQuizView
          playlistIdInput={app.playlistIdInput}
          playlistError={app.playlistError}
          reauthRequired={app.reauthRequired}
          reauthMessage={app.reauthMessage}
          onRelogin={app.startSpotifyLogin}
          onBack={() => app.setScreen({ name: "singleMenu" })}
          onPlaylistIdChange={app.setPlaylistIdInput}
          onCreateQuiz={app.beginQuizFromCreate}
        />
      </>
    );
  }

  if (app.screen.name === "quiz") {
    return (
      <>
        <StatusBar hidden />
        <QuizView
          currentQuestion={app.currentQuestion}
          qIndex={app.qIndex}
          totalQuestions={app.totalQuestions}
          revealed={app.revealed}
          pickedOption={app.pickedOption}
          timerAnim={app.timerAnim}
          timerBarW={app.timerBarW}
          playbackError={app.quizPlaybackError}
          onTimerLayout={app.setTimerBarW}
          onBack={app.leaveQuizToMenu}
          onPickOption={app.onPickOption}
          onNextOrFinish={app.nextOrFinish}
        />
      </>
    );
  }

  if (app.screen.name === "results") {
    return (
      <>
        <StatusBar hidden />
        <ResultsView
          score={app.score}
          totalQuestions={app.totalQuestions}
          onBack={app.returnToMenu}
          onRestart={app.restartQuiz}
          onReturnMenu={app.returnToMenu}
        />
      </>
    );
  }

  if (app.screen.name === "multiplayerJoin") {
    return (
      <>
        <StatusBar hidden />
        <MultiplayerJoinView
          sessionId={app.mpJoinCodeInput}
          name={app.mpPlayerName}
          avatarDataUrl={app.mpPlayerAvatarDataUrl}
          joinError={app.mpJoinError}
          onBack={() => {
            app.resetMultiplayerState();
            app.setScreen({ name: "start" });
          }}
          onSessionIdChange={app.setMpJoinCodeInput}
          onNameChange={app.setMpPlayerName}
          onPickAvatarCamera={app.pickPlayerAvatarFromCamera}
          onPickAvatarLibrary={app.pickPlayerAvatarFromLibrary}
          onJoin={app.joinAsPlayer}
        />
      </>
    );
  }

  if (app.screen.name === "multiplayerQuiz") {
    return (
      <>
        <StatusBar hidden />
        <MultiplayerQuizView
          lobby={app.mpLobby}
          question={app.mpQuestion}
          correctAnswer={app.mpCorrectAnswer}
          playerAnswered={app.mpPlayerAnswered}
          playerContinued={app.mpPlayerContinued}
          allAnswered={app.mpAllAnswered}
          timeUp={app.mpTimeUp}
          allContinued={app.mpAllContinued}
          onBack={() => {
            app.resetMultiplayerState();
            app.setScreen({ name: "start" });
          }}
          onAnswer={app.playerAnswer}
          onContinue={app.playerContinue}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar hidden />
      <MultiplayerResultsView
        lobby={app.mpLobby}
        onRestart={() => {}}
        onReturnMenu={() => {
          app.resetMultiplayerState();
          app.setScreen({ name: "start" });
        }}
      />
    </>
  );
}
