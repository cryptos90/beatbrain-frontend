import React from "react";
import type { LobbyPlayer, LobbyState, PlaylistCard, QuizQuestion } from "../shared/types/app";
import { HostChoosePlaylistScreen } from "./screens/HostChoosePlaylistScreen";
import { HostLobbyScreen } from "./screens/HostLobbyScreen";
import { HostLoginScreen } from "./screens/HostLoginScreen";
import { HostQuizCreateScreen } from "./screens/HostQuizCreateScreen";
import { HostQuizScreen } from "./screens/HostQuizScreen";
import { HostResultsScreen } from "./screens/HostResultsScreen";
import { HostSetupModeScreen } from "./screens/HostSetupModeScreen";

type PreviewScreen =
  | "login"
  | "lobby"
  | "setup"
  | "create"
  | "choose"
  | "quiz-question"
  | "quiz-reveal"
  | "results";

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s2aLX4AAAAASUVORK5CYII=";

const PREVIEW_PLAYLISTS: PlaylistCard[] = [
  {
    id: "retro-mix",
    title: "Retro Party Mix fuer sehr lange Titelchecks",
    imageUrl: PIXEL,
    trackCount: 48,
  },
  {
    id: "dance-classics",
    title: "Dance Classics",
    imageUrl: PIXEL,
    trackCount: 54,
  },
  {
    id: "rock-heroes",
    title: "Rock Heroes",
    imageUrl: PIXEL,
    trackCount: 62,
  },
  {
    id: "one-hit-wonders",
    title: "One Hit Wonders",
    imageUrl: PIXEL,
    trackCount: 32,
  },
];

const PREVIEW_PLAYERS: LobbyPlayer[] = [
  {
    id: "p1",
    name: "Alexandra",
    avatarDataUrl: PIXEL,
    score: 18,
    answered: true,
    latestAnswer: "Take On Me",
    readyForNext: true,
  },
  {
    id: "p2",
    name: "Ben",
    avatarDataUrl: "",
    score: 14,
    answered: true,
    latestAnswer: "Take On Me",
    readyForNext: true,
  },
  {
    id: "p3",
    name: "Chris",
    avatarDataUrl: PIXEL,
    score: 12,
    answered: true,
    latestAnswer: "Billie Jean",
    readyForNext: false,
  },
  {
    id: "p4",
    name: "Daria",
    avatarDataUrl: "",
    score: 11,
    answered: true,
    latestAnswer: "Africa",
    readyForNext: false,
  },
  {
    id: "p5",
    name: "Emre",
    avatarDataUrl: PIXEL,
    score: 9,
    answered: false,
    latestAnswer: null,
    readyForNext: false,
  },
];

const PREVIEW_LOBBY_PLAYERS: LobbyPlayer[] = [
  ...PREVIEW_PLAYERS,
  {
    id: "p6",
    name: "Fatima",
    avatarDataUrl: "",
    score: 8,
    answered: false,
    latestAnswer: null,
    readyForNext: false,
  },
  {
    id: "p7",
    name: "Gustav",
    avatarDataUrl: PIXEL,
    score: 7,
    answered: false,
    latestAnswer: null,
    readyForNext: false,
  },
  {
    id: "p8",
    name: "Hana",
    avatarDataUrl: "",
    score: 6,
    answered: false,
    latestAnswer: null,
    readyForNext: false,
  },
  {
    id: "p9",
    name: "Ismail",
    avatarDataUrl: PIXEL,
    score: 5,
    answered: false,
    latestAnswer: null,
    readyForNext: false,
  },
  {
    id: "p10",
    name: "Jule",
    avatarDataUrl: "",
    score: 4,
    answered: false,
    latestAnswer: null,
    readyForNext: false,
  },
];

function buildLobby(status: LobbyState["status"], players = PREVIEW_PLAYERS): LobbyState {
  return {
    joinCode: "BEAT",
    status,
    currentQuestionId: status === "lobby" ? null : "song-1",
    roundDeadline: status === "question" ? Date.now() + 18000 : null,
    players,
    maxPlayers: 10,
  };
}

const PREVIEW_QUESTION: QuizQuestion = {
  questionObject: {
    questionText: "Welcher Song lief zuerst im Radio und bleibt auch auf kleinen Browserfenstern sauber lesbar?",
    answerFieldPath: "name",
    answerType: "multiple-choice",
    format: "options",
  },
  correctSongId: "song-1",
  correctTrackUri: "spotify:track:1",
  correctAnswer: "Take On Me",
  wrongAnswers: ["Africa", "Billie Jean", "Sweet Dreams"],
  options: ["Take On Me", "Africa", "Billie Jean", "Sweet Dreams"],
  optionDetails: [
    { value: "Take On Me", label: "Take On Me", subtitle: "a-ha", coverUrl: PIXEL },
    { value: "Africa", label: "Africa", subtitle: "Toto", coverUrl: PIXEL },
    { value: "Billie Jean", label: "Billie Jean", subtitle: "Michael Jackson", coverUrl: PIXEL },
    { value: "Sweet Dreams", label: "Sweet Dreams", subtitle: "Eurythmics", coverUrl: PIXEL },
  ],
  trackInfo: {
    id: "song-1",
    uri: "spotify:track:1",
    name: "Take On Me",
    artist: "a-ha",
    album: "Hunting High and Low",
    coverUrl: PIXEL,
    year: "1985",
  },
};

function readPreviewScreen(): PreviewScreen {
  if (typeof window === "undefined") {
    return "login";
  }

  const parts = window.location.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "login";
  if (
    last === "login" ||
    last === "lobby" ||
    last === "setup" ||
    last === "create" ||
    last === "choose" ||
    last === "quiz-question" ||
    last === "quiz-reveal" ||
    last === "results"
  ) {
    return last;
  }
  return "login";
}

export function HostPreviewApp() {
  const screen = readPreviewScreen();

  if (screen === "login") {
    return (
      <HostLoginScreen
        hasAuth
        authBusy={false}
        authError={null}
        spotifyStatus={{
          connected: true,
          canUseWebPlayback: true,
          needsReconnect: false,
          missingPremium: false,
          missingPlaybackScope: false,
          scopeStatus: "granted",
          webPlaybackStatus: "ready",
          message: "Spotify ist für Browser-Playback bereit.",
        }}
        spotifyStatusLoading={false}
        spotifyPlaybackReady
        creatingLobby={false}
        socketError={null}
        onLogin={() => {}}
        onStartSession={() => {}}
        notice="Preview route fuer responsive Browser-Checks"
      />
    );
  }

  if (screen === "lobby") {
    return (
      <HostLobbyScreen
        lobby={buildLobby("lobby", PREVIEW_LOBBY_PLAYERS)}
        joinUrl={`${window.location.origin}/?joinCode=BEAT`}
        socketError={null}
        canOpenSetup
        onOpenSetup={() => {}}
        notice="Preview route fuer responsive Browser-Checks"
      />
    );
  }

  if (screen === "setup") {
    return (
      <HostSetupModeScreen
        questionCount={20}
        onQuestionCountChange={() => {}}
        onChooseMode={() => {}}
        onCreateMode={() => {}}
        notice="Preview route fuer responsive Browser-Checks"
      />
    );
  }

  if (screen === "create") {
    return (
      <HostQuizCreateScreen
        playlistIdInput="37i9dQZF1DX4UtSsGT1Sbe"
        setupError={null}
        creatingSession={false}
        onPlaylistIdInputChange={() => {}}
        onCreateSession={() => {}}
        notice="Preview route fuer responsive Browser-Checks"
      />
    );
  }

  if (screen === "choose") {
    return (
      <HostChoosePlaylistScreen
        playlists={PREVIEW_PLAYLISTS}
        loading={false}
        playlistsError={null}
        selectedPlaylistIndex={0}
        setupError={null}
        startDisabledReason={null}
        creatingSession={false}
        onSelectPlaylistIndex={() => {}}
        onCreateSession={() => {}}
        notice="Preview route fuer responsive Browser-Checks"
      />
    );
  }

  if (screen === "quiz-question") {
    return (
      <HostQuizScreen
        lobby={buildLobby("question")}
        question={PREVIEW_QUESTION}
        correctAnswer={null}
        playbackError={null}
        socketError={null}
        actionBusy={false}
        allAnswered={false}
        timeUp={false}
        allContinued={false}
        countdownMs={18000}
        readyCount={0}
        totalPlayers={PREVIEW_PLAYERS.length}
        notice="Preview route fuer responsive Browser-Checks"
      />
    );
  }

  if (screen === "quiz-reveal") {
    return (
      <HostQuizScreen
        lobby={buildLobby("reveal")}
        question={PREVIEW_QUESTION}
        correctAnswer="Take On Me"
        playbackError={null}
        socketError={null}
        actionBusy={false}
        allAnswered
        timeUp={false}
        allContinued={false}
        countdownMs={0}
        readyCount={2}
        totalPlayers={PREVIEW_PLAYERS.length}
        notice="Preview route fuer responsive Browser-Checks"
      />
    );
  }

  return (
    <HostResultsScreen
      lobby={buildLobby("results")}
      actionBusy={false}
      socketError={null}
      onRestartQuiz={() => {}}
      onReturnToMenu={() => {}}
      notice="Preview route fuer responsive Browser-Checks"
    />
  );
}
