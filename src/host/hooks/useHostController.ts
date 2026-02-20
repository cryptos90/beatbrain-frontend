import { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "../../shared/config";
import {
  buildPlaylistPlaceholders,
  CURATED_PLAYLIST_IDS,
} from "../../shared/data/curatedPlaylists";
import { ApiHttpError, type ApiClientContext } from "../../shared/net/apiClient";
import {
  consumeAuthResult,
  createQuizSession,
  resolveChoosePlaylists,
  startSpotifyAuth,
} from "../../shared/net/beatbrainApi";
import { getStoredHostJwt, setStoredHostJwt } from "../../shared/net/authStorage";
import type { LobbyState, PlaylistCard, QuizQuestion } from "../../shared/types/app";

type HostScreen = "login" | "lobby" | "setup" | "quiz" | "results";

const MIN_QUESTION_COUNT = 10;
const MAX_QUESTION_COUNT = 100;
const QUESTION_STEP = 10;

function clampQuestionCount(value: number) {
  const normalized = Number.isFinite(value) ? value : MIN_QUESTION_COUNT;
  const clamped = Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, normalized));
  const rounded = Math.round(clamped / QUESTION_STEP) * QUESTION_STEP;
  return Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, rounded));
}

function readExceptionMessage(payload: unknown) {
  if (payload && typeof payload === "object") {
    const value = payload as { message?: unknown };
    if (typeof value.message === "string" && value.message.trim()) {
      return value.message.trim();
    }
    if (Array.isArray(value.message) && typeof value.message[0] === "string") {
      return value.message[0];
    }
  }
  return "Socket request failed.";
}

function toMessage(error: unknown, fallback: string) {
  if (error instanceof ApiHttpError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

export function useHostController() {
  const [screen, setScreen] = useState<HostScreen>("login");
  const [hostJwt, setHostJwt] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);

  const [questionCount, setQuestionCount] = useState(20);
  const [playlists, setPlaylists] = useState<PlaylistCard[]>(() =>
    buildPlaylistPlaceholders(),
  );
  const [selectedPlaylistIndex, setSelectedPlaylistIndex] = useState(0);
  const [playlistIdInput, setPlaylistIdInput] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);

  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [creatingLobby, setCreatingLobby] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [allAnswered, setAllAnswered] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [allContinued, setAllContinued] = useState(false);
  const [countdownMs, setCountdownMs] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const preferredLobbyScreenRef = useRef<"lobby" | "setup">("lobby");

  const selectedPlaylist = playlists[selectedPlaylistIndex] ?? null;

  const hasAuth = Boolean(hostJwt);
  const totalPlayers = lobby?.players.length ?? 0;
  const readyCount = lobby?.players.filter((player) => player.readyForNext).length ?? 0;
  const answeredCount = lobby?.players.filter((player) => player.answered).length ?? 0;
  const everyoneContinued = totalPlayers > 0 && readyCount === totalPlayers;

  const joinUrl =
    Platform.OS === "web" && lobby?.joinCode
      ? `${window.location.origin}/?joinCode=${encodeURIComponent(lobby.joinCode)}`
      : "";

  const setPersistedHostJwt = (nextJwt: string | null) => {
    setHostJwt(nextJwt);
    void setStoredHostJwt(nextJwt);
  };

  const apiContext = useMemo<ApiClientContext>(
    () => ({
      getJwt: () => hostJwt,
      setJwt: (nextJwt) => setPersistedHostJwt(nextJwt),
    }),
    [hostJwt],
  );

  const setPreferredLobbyScreen = (mode: "lobby" | "setup") => {
    preferredLobbyScreenRef.current = mode;
  };

  const resetRoundFlags = () => {
    setAllAnswered(false);
    setTimeUp(false);
    setAllContinued(false);
    setPlaybackError(null);
  };

  const connectSocket = () => {
    if (socketRef.current) {
      return socketRef.current;
    }

    const socket = io(API_BASE_URL, {
      transports: ["websocket"],
    });

    socket.on("host:lobbyCreated", (state: LobbyState) => {
      setCreatingLobby(false);
      setSocketError(null);
      setLobby(state);
      setPreferredLobbyScreen("lobby");
      setScreen("lobby");
    });

    socket.on("lobby:state", (state: LobbyState) => {
      setLobby(state);
      if (state.status === "results") {
        setScreen("results");
      } else if (state.status === "question" || state.status === "reveal") {
        setScreen("quiz");
      } else if (state.status === "lobby") {
        setScreen(preferredLobbyScreenRef.current);
      }
    });

    socket.on("round:question", (payload: { question?: QuizQuestion }) => {
      setActionBusy(false);
      setSocketError(null);
      setQuestion(payload.question ?? null);
      setCorrectAnswer(null);
      resetRoundFlags();
      setScreen("quiz");
    });

    socket.on("round:reveal", (payload: { correctAnswer: string; state: LobbyState }) => {
      setActionBusy(false);
      setSocketError(null);
      setCorrectAnswer(payload.correctAnswer);
      setLobby(payload.state);
      setScreen("quiz");
    });

    socket.on("round:allAnswered", () => {
      setAllAnswered(true);
    });

    socket.on("round:timeUp", () => {
      setTimeUp(true);
    });

    socket.on("round:allContinued", () => {
      setAllContinued(true);
    });

    socket.on("round:playbackError", (payload: { message?: string }) => {
      setPlaybackError(payload?.message?.trim() || "Spotify playback failed.");
    });

    socket.on("game:ended", (state: LobbyState) => {
      setActionBusy(false);
      setSocketError(null);
      setLobby(state);
      setScreen("results");
    });

    socket.on("game:restarted", (state: LobbyState) => {
      setActionBusy(false);
      setSocketError(null);
      setLobby(state);
      setQuestion(null);
      setCorrectAnswer(null);
      setQuizSessionId(null);
      setPreferredLobbyScreen("setup");
      resetRoundFlags();
      setScreen("setup");
    });

    socket.on("session:returnedToMenu", (state: LobbyState) => {
      setActionBusy(false);
      setSocketError(null);
      setLobby(state);
      setQuestion(null);
      setCorrectAnswer(null);
      setQuizSessionId(null);
      setPreferredLobbyScreen("lobby");
      resetRoundFlags();
      setScreen("lobby");
    });

    socket.on("exception", (payload: unknown) => {
      const message = readExceptionMessage(payload);
      setCreatingLobby(false);
      setCreatingSession(false);
      setActionBusy(false);
      setSocketError(message);
    });

    socket.on("connect_error", (error: Error) => {
      setSocketError(error.message || "Socket connection failed.");
      setCreatingLobby(false);
      setActionBusy(false);
    });

    socketRef.current = socket;
    return socket;
  };

  const startSpotifyLogin = async () => {
    if (Platform.OS !== "web") {
      return;
    }

    setAuthBusy(true);
    setAuthError(null);
    try {
      const redirectOrigin = `${window.location.origin}/host`;
      const response = await startSpotifyAuth("web", { redirectOrigin });
      const authorizeUrl =
        typeof response.authorizeUrl === "string" ? response.authorizeUrl : "";

      if (!authorizeUrl) {
        throw new Error("Spotify authorize URL missing.");
      }

      window.location.assign(authorizeUrl);
    } catch (error) {
      setAuthError(toMessage(error, "Spotify login failed."));
      setAuthBusy(false);
    }
  };

  const createLobby = () => {
    if (!hostJwt) {
      setAuthError("Missing host login.");
      return;
    }

    setSocketError(null);
    setCreatingLobby(true);
    const socket = connectSocket();
    socket.emit("host:createLobby", { hostJwt });
  };

  const openSetup = () => {
    setPreferredLobbyScreen("setup");
    setSetupError(null);
    setScreen("setup");
  };

  const openLobby = () => {
    setPreferredLobbyScreen("lobby");
    setScreen("lobby");
  };

  const createSession = async () => {
    const selectedPlaylistId = selectedPlaylist?.id ?? "";
    const manualPlaylistId = playlistIdInput.trim();
    const playlistId = manualPlaylistId || selectedPlaylistId;
    if (!playlistId) {
      setSetupError("Bitte eine Playlist waehlen.");
      return;
    }

    const useManualPlaylist = Boolean(manualPlaylistId);
    const decadeTag = !useManualPlaylist ? selectedPlaylist?.decadeTag : undefined;

    setCreatingSession(true);
    setSetupError(null);
    setSocketError(null);
    try {
      const data = await createQuizSession(apiContext, {
        playlistId,
        questionCount: clampQuestionCount(questionCount),
        decadeTag,
      });
      const sessionId =
        typeof data.sessionId === "string" ? data.sessionId.trim() : "";
      if (!sessionId) {
        throw new Error("Quiz session id missing.");
      }

      setQuizSessionId(sessionId);
      setQuestion(null);
      setCorrectAnswer(null);
      resetRoundFlags();
      setPreferredLobbyScreen("setup");
      setScreen("quiz");
    } catch (error) {
      setSetupError(toMessage(error, "Quiz session could not be created."));
    } finally {
      setCreatingSession(false);
    }
  };

  const startRound = () => {
    if (!hostJwt || !lobby?.joinCode) {
      setSocketError("Lobby not ready.");
      return;
    }
    if (!quizSessionId) {
      setSetupError("Bitte zuerst eine Quiz-Session erstellen.");
      setPreferredLobbyScreen("setup");
      setScreen("setup");
      return;
    }

    setActionBusy(true);
    setSocketError(null);
    const socket = connectSocket();
    socket.emit("host:startRound", {
      hostJwt,
      joinCode: lobby.joinCode,
      quizSessionId,
      timerMs: 30_000,
    });
  };

  const revealRound = () => {
    if (!hostJwt || !lobby?.joinCode || !question?.correctAnswer) {
      return;
    }

    setActionBusy(true);
    setSocketError(null);
    const socket = connectSocket();
    socket.emit("host:reveal", {
      hostJwt,
      joinCode: lobby.joinCode,
      correctAnswer: question.correctAnswer,
    });
  };

  const restartQuiz = () => {
    if (!hostJwt || !lobby?.joinCode) {
      return;
    }

    setActionBusy(true);
    setPreferredLobbyScreen("setup");
    setSocketError(null);
    const socket = connectSocket();
    socket.emit("host:restartQuiz", {
      hostJwt,
      joinCode: lobby.joinCode,
    });
  };

  const returnToMenu = () => {
    if (!hostJwt || !lobby?.joinCode) {
      return;
    }

    setActionBusy(true);
    setPreferredLobbyScreen("lobby");
    setSocketError(null);
    const socket = connectSocket();
    socket.emit("host:returnToMenu", {
      hostJwt,
      joinCode: lobby.joinCode,
    });
  };

  useEffect(() => {
    const hydrateAuth = async () => {
      const stored = await getStoredHostJwt();
      if (stored) {
        setHostJwt(stored);
        setScreen("lobby");
      } else {
        setScreen("login");
      }
    };

    void hydrateAuth();
  }, []);

  useEffect(() => {
    if (!hasAuth) {
      return;
    }

    let cancelled = false;

    const loadPlaylists = async () => {
      try {
        const resolved = await resolveChoosePlaylists(apiContext, [...CURATED_PLAYLIST_IDS]);
        if (cancelled || !resolved.length) {
          return;
        }

        setPlaylists(resolved);
        setSelectedPlaylistIndex((index) =>
          Math.max(0, Math.min(index, resolved.length - 1)),
        );
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (__DEV__) {
          console.error("[host] playlist resolve failed", error);
        }
      }
    };

    void loadPlaylists();

    return () => {
      cancelled = true;
    };
  }, [apiContext, hasAuth]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const authCode = currentUrl.searchParams.get("auth_code");
    const oauthError = currentUrl.searchParams.get("error");
    if (!authCode && !oauthError) {
      return;
    }

    const consume = async () => {
      if (oauthError) {
        setAuthError("Spotify login failed.");
        return;
      }

      if (!authCode) {
        return;
      }

      setAuthBusy(true);
      setAuthError(null);
      try {
        const auth = await consumeAuthResult(authCode);
        const appJwt = typeof auth.appJwt === "string" ? auth.appJwt.trim() : "";
        if (!appJwt) {
          throw new Error("Backend returned no appJwt.");
        }
        setPersistedHostJwt(appJwt);
        setScreen("lobby");
      } catch (error) {
        setAuthError(toMessage(error, "Spotify login failed."));
      } finally {
        setAuthBusy(false);
      }
    };

    void consume().finally(() => {
      currentUrl.searchParams.delete("auth_code");
      currentUrl.searchParams.delete("error");
      const nextPath = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      window.history.replaceState({}, document.title, nextPath || "/host");
    });
  }, []);

  useEffect(() => {
    if (lobby?.status !== "question" || !lobby.roundDeadline) {
      setCountdownMs(0);
      return;
    }

    const tick = () => {
      setCountdownMs(Math.max(0, lobby.roundDeadline! - Date.now()));
    };

    tick();
    const handle = setInterval(tick, 250);
    return () => clearInterval(handle);
  }, [lobby?.status, lobby?.roundDeadline]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const canOpenSetup = Boolean(lobby) && totalPlayers > 0;
  const canStartRound =
    Boolean(lobby?.joinCode) &&
    Boolean(quizSessionId) &&
    !actionBusy &&
    (lobby?.status === "lobby" || (lobby?.status === "reveal" && everyoneContinued));
  const canReveal =
    Boolean(question?.correctAnswer) &&
    !actionBusy &&
    lobby?.status === "question" &&
    (allAnswered || timeUp || answeredCount >= totalPlayers);

  return {
    screen,
    hasAuth,
    authBusy,
    authError,
    startSpotifyLogin,

    playlists: playlists as PlaylistCard[],
    selectedPlaylistIndex,
    setSelectedPlaylistIndex,
    selectedPlaylist,
    playlistIdInput,
    setPlaylistIdInput,
    questionCount,
    setQuestionCount: (value: number) => setQuestionCount(clampQuestionCount(value)),
    setupError,
    creatingSession,
    createSession,
    openLobby,

    lobby,
    joinUrl,
    creatingLobby,
    createLobby,
    canOpenSetup,
    openSetup,

    question,
    correctAnswer,
    playbackError,
    socketError,
    actionBusy,
    allAnswered,
    timeUp,
    allContinued,
    countdownMs,
    readyCount,
    totalPlayers,
    canStartRound,
    canReveal,
    startRound,
    revealRound,

    restartQuiz,
    returnToMenu,
  };
}

export type HostController = ReturnType<typeof useHostController>;
