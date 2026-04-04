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
          onSinglePlayer={() => {
            app.setScreen({ name: "singleMenu" });
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
          hasAuth={app.hasAuth}
          waitingForLogin={!app.hasAuth && (app.loginPending || app.authBusy)}
          loginError={!app.hasAuth ? app.authError : null}
          onLogin={app.startSpotifyLogin}
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
          isStartingQuiz={app.isStartingQuiz}
          selectedPlaylistIndex={app.selectedPlaylistIndex}
          selectedPlaylist={app.selectedPlaylist}
          startDisabledReason={app.chooseStartDisabledReason}
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
              undefined,
              app.selectedPlaylist.trackCount,
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
          playbackCanOpenSpotify={app.quizPlaybackCanOpenSpotify}
          onTimerLayout={app.setTimerBarW}
          onBack={app.leaveQuizToMenu}
          onPickOption={app.onPickOption}
          onSubmitYearInput={app.submitYearInputAnswer}
          onOpenSpotifyApp={app.openSpotifyForPlayback}
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
          onBackendUrlDetected={app.setMultiplayerApiBaseUrl}
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
            app.leaveMultiplayerSession();
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
          app.leaveMultiplayerSession();
          app.setScreen({ name: "start" });
        }}
      />
    </>
  );
}
