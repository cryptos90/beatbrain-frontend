import React from "react";
import { StatusBar } from "expo-status-bar";
import { QUESTIONS_PER_QUIZ } from "../constants/app";
import { getPlaylistById } from "../services/beatbrainApi";
import { StartScreen } from "../screens/StartScreen";
import { SinglePlayerMenu } from "../screens/SinglePlayerMenu";
import { ChooseQuizView } from "../screens/ChooseQuizView";
import { CreateQuizView } from "../screens/CreateQuizView";
import { MultiplayerView } from "../screens/MultiplayerView";
import { QuizView } from "../screens/QuizView";
import { ResultsView } from "../screens/ResultsView";
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
            app.setScreen({ name: "multiplayer" });
          }}
        />
      </>
    );
  }

  if (app.screen.name === "multiplayer") {
    const joinUrl = app.mpLobby?.joinCode
      ? `beatbrain-login://join?code=${app.mpLobby.joinCode}`
      : "";

    return (
      <>
        <StatusBar hidden />
        <MultiplayerView
          hasAuth={app.hasAuth}
          authBusy={app.authBusy}
          authError={app.authError}
          mpRole={app.mpRole}
          mpLobby={app.mpLobby}
          mpQuestion={app.mpQuestion}
          mpCorrectAnswer={app.mpCorrectAnswer}
          mpJoinCodeInput={app.mpJoinCodeInput}
          mpPlayerName={app.mpPlayerName}
          mpPlayerIcon={app.mpPlayerIcon}
          mpHostPlaylistId={app.mpHostPlaylistId}
          mpYearAnswer={app.mpYearAnswer}
          joinUrl={joinUrl}
          onBack={() => {
            if (app.mpRole !== "none") {
              app.resetMultiplayerState();
              app.setScreen({ name: "multiplayer" });
              return;
            }
            app.resetMultiplayerState();
            app.setScreen({ name: "start" });
          }}
          onSetRole={async (role) => {
            app.setMpRole(role);
            if (role === "host") {
              await app.ensureSpotifyLogin();
            }
          }}
          onRetryLogin={app.startSpotifyLogin}
          onHostPlaylistIdChange={app.setMpHostPlaylistId}
          onCreateLobby={app.createHostLobby}
          onStartRound={app.hostStartRound}
          onReveal={app.hostReveal}
          onJoinCodeChange={app.setMpJoinCodeInput}
          onPlayerNameChange={app.setMpPlayerName}
          onPlayerIconChange={app.setMpPlayerIcon}
          onJoinLobby={app.joinAsPlayer}
          onPlayerAnswer={(answer) => {
            if (app.mpRole === "player") {
              app.playerAnswer(answer);
            }
          }}
          onYearAnswerChange={(value) => app.setMpYearAnswer(value.replace(/[^\d]/g, ""))}
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
        />
      </>
    );
  }

  if (app.screen.name === "choose") {
    return (
      <>
        <StatusBar hidden />
        <ChooseQuizView
          hasAuth={app.hasAuth}
          authBusy={app.authBusy}
          authError={app.authError}
          playlists={app.playlists}
          selectedPlaylistIndex={app.selectedPlaylistIndex}
          selectedPlaylist={app.selectedPlaylist}
          playlistLoading={app.playlistLoading}
          playlistError={app.playlistError}
          carouselRef={app.carouselRef}
          onBack={() => app.setScreen({ name: "singleMenu" })}
          onSelectPlaylistIndex={app.setSelectedPlaylistIndex}
          onStartQuiz={async () => {
            if (!app.selectedPlaylist) return;
            await app.beginQuizForPlaylist(app.selectedPlaylist.id, app.selectedPlaylist.title);
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
          hasAuth={app.hasAuth}
          authBusy={app.authBusy}
          authError={app.authError}
          playlistIdInput={app.playlistIdInput}
          onBack={() => app.setScreen({ name: "singleMenu" })}
          onPlaylistIdChange={app.setPlaylistIdInput}
          onCreateQuiz={async () => {
            const pid = app.playlistIdInput.trim();
            if (!pid) return;

            try {
              const playlist = await getPlaylistById(app.apiContext, pid);
              await app.beginQuizForPlaylist(playlist.id, playlist.title);
            } catch {
              app.setPlaylistError("Playlist ID ist ung�ltig oder nicht lesbar.");
              app.setScreen({ name: "choose" });
            }
          }}
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
          revealed={app.revealed}
          pickedOption={app.pickedOption}
          yearInput={app.yearInput}
          yearWasCorrect={app.yearWasCorrect}
          timerAnim={app.timerAnim}
          timerBarW={app.timerBarW}
          onTimerLayout={app.setTimerBarW}
          onBack={app.finishQuiz}
          onPickOption={app.onPickOption}
          onYearInputChange={(t) => app.setYearInput(t.replace(/[^\d]/g, ""))}
          onSubmitYear={app.onSubmitYear}
          onNextOrFinish={async () => {
            await app.stopAndUnload();
            const isLast = app.qIndex >= QUESTIONS_PER_QUIZ - 1;
            if (isLast) {
              await app.finishQuiz();
            } else {
              app.setQIndex((i) => i + 1);
            }
          }}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar hidden />
      <ResultsView
        score={app.score}
        onBack={() => app.setScreen({ name: "choose" })}
        onRestart={() => {
          if (app.selectedPlaylist) {
            app.beginQuizForPlaylist(app.selectedPlaylist.id, app.selectedPlaylist.title);
          } else {
            app.setScreen({ name: "choose" });
          }
        }}
        onReturnMenu={() => app.setScreen({ name: "singleMenu" })}
      />
    </>
  );
}

