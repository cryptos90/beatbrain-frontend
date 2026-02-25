import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "../../shared/config";
import { ApiHttpError, type ApiClientContext } from "../../shared/net/apiClient";
import {
  consumeAuthResult,
  createQuizSession,
  getChoosePlaylists,
  startSpotifyAuth,
} from "../../shared/net/beatbrainApi";
import { getStoredHostJwt, setStoredHostJwt } from "../../shared/net/authStorage";
import type { LobbyState, PlaylistCard, QuizQuestion } from "../../shared/types/app";

type HostScreen =
  | "start"
  | "lobby"
  | "setupMode"
  | "setupChoose"
  | "setupCreate"
  | "quiz"
  | "results";

type HostRouteName =
  | "start"
  | "setup"
  | "chooseQuiz"
  | "createQuiz"
  | "session"
  | "quiz"
  | "results";

type ParsedHostRoute = {
  name: HostRouteName;
  code?: string;
};

type NavigateMode = "push" | "replace" | "none";

type LobbyScreenPreference = "lobby" | "setupMode" | "setupChoose" | "setupCreate";

type PersistedHostWebState = {
  questionCount?: number;
  selectedPlaylistIndex?: number;
  playlistIdInput?: string;
  preferredLobbyScreen?: LobbyScreenPreference;
  lastJoinCode?: string | null;
};

type RouteDecision =
  | { kind: "wait" }
  | { kind: "show"; screen: HostScreen; preferredLobbyScreen?: LobbyScreenPreference }
  | {
      kind: "redirect";
      route: ParsedHostRoute;
      notice: string;
      preferredLobbyScreen?: LobbyScreenPreference;
    };

const HOST_WEB_STATE_KEY = "beatbrain_host_web_state_v1";
const HOST_ROUTE_BASE = "/host";

const MIN_QUESTION_COUNT = 10;
const MAX_QUESTION_COUNT = 100;
const QUESTION_STEP = 10;

function clampQuestionCount(value: number) {
  const normalized = Number.isFinite(value) ? value : MIN_QUESTION_COUNT;
  const clamped = Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, normalized));
  const rounded = Math.round(clamped / QUESTION_STEP) * QUESTION_STEP;
  return Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, rounded));
}

function normalizePathname(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

function parseHostPath(pathname: string): ParsedHostRoute {
  const normalized = normalizePathname(pathname);
  const relative = normalized.startsWith(HOST_ROUTE_BASE)
    ? normalized.slice(HOST_ROUTE_BASE.length)
    : normalized;
  const segments = relative.split("/").filter(Boolean);
  const step = segments[0] ?? "";
  const code = segments[1] ? decodeURIComponent(segments[1]) : undefined;

  if (!step || step === "start") {
    return { name: "start" };
  }
  if (step === "setup") {
    return { name: "setup" };
  }
  if (step === "choose-quiz") {
    return { name: "chooseQuiz" };
  }
  if (step === "create-quiz") {
    return { name: "createQuiz" };
  }
  if (step === "session" && code) {
    return { name: "session", code };
  }
  if (step === "quiz" && code) {
    return { name: "quiz", code };
  }
  if (step === "results" && code) {
    return { name: "results", code };
  }

  return { name: "start" };
}

function buildHostPath(route: ParsedHostRoute) {
  if (route.name === "setup") {
    return `${HOST_ROUTE_BASE}/setup`;
  }
  if (route.name === "chooseQuiz") {
    return `${HOST_ROUTE_BASE}/choose-quiz`;
  }
  if (route.name === "createQuiz") {
    return `${HOST_ROUTE_BASE}/create-quiz`;
  }
  if (route.name === "session" && route.code) {
    return `${HOST_ROUTE_BASE}/session/${encodeURIComponent(route.code)}`;
  }
  if (route.name === "quiz" && route.code) {
    return `${HOST_ROUTE_BASE}/quiz/${encodeURIComponent(route.code)}`;
  }
  if (route.name === "results" && route.code) {
    return `${HOST_ROUTE_BASE}/results/${encodeURIComponent(route.code)}`;
  }
  return `${HOST_ROUTE_BASE}/start`;
}

function screenForRouteName(name: HostRouteName): HostScreen {
  if (name === "setup") {
    return "setupMode";
  }
  if (name === "chooseQuiz") {
    return "setupChoose";
  }
  if (name === "createQuiz") {
    return "setupCreate";
  }
  if (name === "session") {
    return "lobby";
  }
  if (name === "quiz") {
    return "quiz";
  }
  if (name === "results") {
    return "results";
  }
  return "start";
}

function screenForPreferredLobby(preferred: LobbyScreenPreference): HostScreen {
  if (preferred === "setupMode") {
    return "setupMode";
  }
  if (preferred === "setupChoose") {
    return "setupChoose";
  }
  if (preferred === "setupCreate") {
    return "setupCreate";
  }
  return "lobby";
}

function routeForScreen(screen: HostScreen, joinCode?: string | null): ParsedHostRoute {
  if (screen === "setupMode") {
    return { name: "setup" };
  }
  if (screen === "setupChoose") {
    return { name: "chooseQuiz" };
  }
  if (screen === "setupCreate") {
    return { name: "createQuiz" };
  }
  if (screen === "lobby" && joinCode) {
    return { name: "session", code: joinCode };
  }
  if (screen === "quiz" && joinCode) {
    return { name: "quiz", code: joinCode };
  }
  if (screen === "results" && joinCode) {
    return { name: "results", code: joinCode };
  }
  return { name: "start" };
}

function routeForLobbyState(state: LobbyState, preferredLobbyScreen: LobbyScreenPreference): ParsedHostRoute {
  if (state.status === "results") {
    return { name: "results", code: state.joinCode };
  }
  if (state.status === "question" || state.status === "reveal") {
    return { name: "quiz", code: state.joinCode };
  }
  if (preferredLobbyScreen === "setupMode") {
    return { name: "setup" };
  }
  if (preferredLobbyScreen === "setupChoose") {
    return { name: "chooseQuiz" };
  }
  if (preferredLobbyScreen === "setupCreate") {
    return { name: "createQuiz" };
  }
  return { name: "session", code: state.joinCode };
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

function getHostWebStorage(): Storage | null {
  if (Platform.OS !== "web") {
    return null;
  }

  try {
    if (window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // Ignore unavailable session storage.
  }

  try {
    if (window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore unavailable local storage.
  }

  return null;
}

function readPersistedHostWebState(): PersistedHostWebState | null {
  const storage = getHostWebStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(HOST_WEB_STATE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedHostWebState;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedHostWebState(state: PersistedHostWebState) {
  const storage = getHostWebStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(HOST_WEB_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write errors to keep host runtime functional.
  }
}

export function useHostController() {
  const [screen, setScreen] = useState<HostScreen>("start");
  const [routeNotice, setRouteNotice] = useState<string | null>(null);
  const [authHydrated, setAuthHydrated] = useState(false);

  const [hostJwt, setHostJwt] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);

  const [questionCount, setQuestionCountState] = useState(20);
  const [playlists, setPlaylists] = useState<PlaylistCard[]>([]);
  const [selectedPlaylistIndex, setSelectedPlaylistIndexState] = useState(0);
  const [playlistIdInput, setPlaylistIdInput] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);

  const [creatingLobby, setCreatingLobby] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [allAnswered, setAllAnswered] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [allContinued, setAllContinued] = useState(false);
  const [countdownMs, setCountdownMs] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const lobbyJoinCodeRef = useRef<string | null>(null);
  const preferredLobbyScreenRef = useRef<LobbyScreenPreference>("lobby");
  const [preferredLobbyScreenState, setPreferredLobbyScreenState] =
    useState<LobbyScreenPreference>("lobby");

  const setPreferredLobbyScreen = useCallback((mode: LobbyScreenPreference) => {
    preferredLobbyScreenRef.current = mode;
    setPreferredLobbyScreenState(mode);
  }, []);

  const selectedPlaylist = playlists[selectedPlaylistIndex] ?? null;

  const hasAuth = Boolean(hostJwt);
  const totalPlayers = lobby?.players.length ?? 0;
  const readyCount = lobby?.players.filter((player) => player.readyForNext).length ?? 0;

  const joinUrl =
    Platform.OS === "web" && lobby?.joinCode
      ? `${window.location.origin}/?joinCode=${encodeURIComponent(lobby.joinCode)}`
      : "";

  useEffect(() => {
    lobbyJoinCodeRef.current = lobby?.joinCode ?? null;
  }, [lobby?.joinCode]);

  const setPersistedHostJwt = (nextJwt: string | null) => {
    setHostJwt(nextJwt);
    void setStoredHostJwt(nextJwt);
  };

  const setLobbyState = (nextLobby: LobbyState | null) => {
    lobbyJoinCodeRef.current = nextLobby?.joinCode ?? null;
    setLobby(nextLobby);
  };

  const apiContext = useMemo<ApiClientContext>(
    () => ({
      getJwt: () => hostJwt,
      setJwt: (nextJwt) => setPersistedHostJwt(nextJwt),
    }),
    [hostJwt],
  );

  const navigateToScreen = useCallback(
    (
      nextScreen: HostScreen,
      options?: {
        mode?: NavigateMode;
        joinCode?: string | null;
        clearNotice?: boolean;
      },
    ) => {
      const mode = options?.mode ?? "push";
      const joinCode = options?.joinCode ?? lobbyJoinCodeRef.current;
      if (options?.clearNotice !== false) {
        setRouteNotice(null);
      }
      setScreen(nextScreen);

      if (Platform.OS !== "web" || mode === "none") {
        return;
      }

      const route = routeForScreen(nextScreen, joinCode);
      const nextPath = buildHostPath(route);
      if (window.location.pathname === nextPath) {
        return;
      }
      if (mode === "replace") {
        window.history.replaceState({}, document.title, nextPath);
      } else {
        window.history.pushState({}, document.title, nextPath);
      }
    },
    [],
  );

  const resolveRoute = useCallback(
    (route: ParsedHostRoute): RouteDecision => {
      if (route.name === "start") {
        return { kind: "show", screen: "start" };
      }

      if (!authHydrated) {
        return { kind: "wait" };
      }

      if (!hasAuth) {
        return {
          kind: "redirect",
          route: { name: "start" },
          notice: "Bitte zuerst mit Spotify verbinden.",
        };
      }

      if (!lobby) {
        return {
          kind: "redirect",
          route: { name: "start" },
          notice: "Sessiondaten fehlen. Bitte Session neu starten.",
        };
      }

      const currentLobbyRoute = routeForLobbyState(lobby, preferredLobbyScreenState);
      const currentJoinCode = lobby.joinCode;
      const joinCodeMismatch =
        (route.name === "session" || route.name === "quiz" || route.name === "results") &&
        route.code !== currentJoinCode;

      if (joinCodeMismatch) {
        return {
          kind: "redirect",
          route: currentLobbyRoute,
          notice: "Aktive Session wurde geladen.",
        };
      }

      if (route.name === "setup") {
        if (lobby.status !== "lobby") {
          return {
            kind: "redirect",
            route: currentLobbyRoute,
            notice: "Sessionstatus hat sich geändert.",
          };
        }
        return {
          kind: "show",
          screen: "setupMode",
          preferredLobbyScreen: "setupMode",
        };
      }

      if (route.name === "chooseQuiz") {
        if (lobby.status !== "lobby") {
          return {
            kind: "redirect",
            route: currentLobbyRoute,
            notice: "Sessionstatus hat sich geändert.",
          };
        }
        return {
          kind: "show",
          screen: "setupChoose",
          preferredLobbyScreen: "setupChoose",
        };
      }

      if (route.name === "createQuiz") {
        if (lobby.status !== "lobby") {
          return {
            kind: "redirect",
            route: currentLobbyRoute,
            notice: "Sessionstatus hat sich geändert.",
          };
        }
        return {
          kind: "show",
          screen: "setupCreate",
          preferredLobbyScreen: "setupCreate",
        };
      }

      if (route.name === "session") {
        if (lobby.status !== "lobby") {
          return {
            kind: "redirect",
            route: currentLobbyRoute,
            notice: "Sessionstatus hat sich geändert.",
          };
        }
        return {
          kind: "show",
          screen: "lobby",
          preferredLobbyScreen: "lobby",
        };
      }

      if (route.name === "quiz") {
        if (lobby.status === "results") {
          return {
            kind: "redirect",
            route: { name: "results", code: currentJoinCode },
            notice: "Spiel ist bereits beendet.",
          };
        }
        if (lobby.status === "lobby") {
          return {
            kind: "redirect",
            route: currentLobbyRoute,
            notice: "Quiz läuft aktuell nicht.",
          };
        }
        return { kind: "show", screen: "quiz" };
      }

      if (route.name === "results") {
        if (lobby.status !== "results") {
          return {
            kind: "redirect",
            route: currentLobbyRoute,
            notice: "Ergebnisse sind noch nicht verfügbar.",
          };
        }
        return { kind: "show", screen: "results" };
      }

      return { kind: "show", screen: "start" };
    },
    [authHydrated, hasAuth, lobby, preferredLobbyScreenState],
  );

  const applyRouteFromLocation = useCallback(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const parsed = parseHostPath(window.location.pathname);
    const canonicalPath = buildHostPath(parsed);
    if (window.location.pathname !== canonicalPath) {
      const nextUrl = `${canonicalPath}${window.location.search}${window.location.hash}`;
      window.history.replaceState({}, document.title, nextUrl);
    }

    const decision = resolveRoute(parsed);
    if (decision.kind === "wait") {
      return;
    }

    if (decision.kind === "redirect") {
      setRouteNotice(decision.notice);
      if (decision.preferredLobbyScreen) {
        setPreferredLobbyScreen(decision.preferredLobbyScreen);
      }

      const nextPath = buildHostPath(decision.route);
      if (window.location.pathname !== nextPath) {
        window.history.replaceState({}, document.title, nextPath);
      }
      setScreen(screenForRouteName(decision.route.name));
      return;
    }

    if (decision.preferredLobbyScreen) {
      setPreferredLobbyScreen(decision.preferredLobbyScreen);
    }
    setRouteNotice(null);
    setScreen(decision.screen);
  }, [resolveRoute, setPreferredLobbyScreen]);

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
      setLobbyState(state);
      setPreferredLobbyScreen("lobby");
      navigateToScreen("lobby", { mode: "push", joinCode: state.joinCode });
    });

    socket.on("lobby:state", (state: LobbyState) => {
      setLobbyState(state);
      if (state.status === "results") {
        navigateToScreen("results", { mode: "replace", joinCode: state.joinCode });
      } else if (state.status === "question" || state.status === "reveal") {
        navigateToScreen("quiz", { mode: "replace", joinCode: state.joinCode });
      } else {
        navigateToScreen(screenForPreferredLobby(preferredLobbyScreenRef.current), {
          mode: "replace",
          joinCode: state.joinCode,
        });
      }
    });

    socket.on("round:question", (payload: { question?: QuizQuestion }) => {
      setActionBusy(false);
      setSocketError(null);
      setQuestion(payload.question ?? null);
      setCorrectAnswer(null);
      resetRoundFlags();
      navigateToScreen("quiz", { mode: "replace" });
    });

    socket.on("round:reveal", (payload: { correctAnswer: string; state: LobbyState }) => {
      setActionBusy(false);
      setSocketError(null);
      setCorrectAnswer(payload.correctAnswer);
      setLobbyState(payload.state);
      navigateToScreen("quiz", { mode: "replace", joinCode: payload.state.joinCode });
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
      setLobbyState(state);
      navigateToScreen("results", { mode: "replace", joinCode: state.joinCode });
    });

    socket.on("game:restarted", (state: LobbyState) => {
      setActionBusy(false);
      setSocketError(null);
      setLobbyState(state);
      setQuestion(null);
      setCorrectAnswer(null);
      setPreferredLobbyScreen("setupMode");
      resetRoundFlags();
      navigateToScreen("setupMode", { mode: "push", joinCode: state.joinCode });
    });

    socket.on("session:returnedToMenu", (state: LobbyState) => {
      setActionBusy(false);
      setSocketError(null);
      setLobbyState(state);
      setQuestion(null);
      setCorrectAnswer(null);
      setPreferredLobbyScreen("lobby");
      resetRoundFlags();
      navigateToScreen("lobby", { mode: "push", joinCode: state.joinCode });
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
      const redirectOrigin = `${window.location.origin}/host/start`;
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
    setPreferredLobbyScreen("setupMode");
    setSetupError(null);
    navigateToScreen("setupMode", { mode: "push" });
  };

  const openSetupChoose = () => {
    setPreferredLobbyScreen("setupChoose");
    setSetupError(null);
    navigateToScreen("setupChoose", { mode: "push" });
  };

  const openSetupCreate = () => {
    setPreferredLobbyScreen("setupCreate");
    setSetupError(null);
    navigateToScreen("setupCreate", { mode: "push" });
  };

  const openLobby = () => {
    setPreferredLobbyScreen("lobby");
    navigateToScreen("lobby", { mode: "push" });
  };

  const emitStartRound = (sessionId: string) => {
    if (!hostJwt || !lobby?.joinCode) {
      setSetupError("Lobby nicht bereit.");
      return;
    }

    setActionBusy(true);
    setSocketError(null);
    const socket = connectSocket();
    socket.emit("host:startRound", {
      hostJwt,
      joinCode: lobby.joinCode,
      quizSessionId: sessionId,
      timerMs: 30_000,
    });
  };

  const createSessionForPlaylist = async (playlistId: string, decadeTag?: string) => {
    const normalizedPlaylistId = String(playlistId ?? "").trim();
    if (!normalizedPlaylistId) {
      setSetupError("Bitte eine Playlist wählen.");
      return;
    }
    setCreatingSession(true);
    setSetupError(null);
    setSocketError(null);
    try {
      const data = await createQuizSession(apiContext, {
        playlistId: normalizedPlaylistId,
        questionCount: clampQuestionCount(questionCount),
        decadeTag,
      });
      const sessionId = typeof data.sessionId === "string" ? data.sessionId.trim() : "";
      if (!sessionId) {
        throw new Error("Quiz session id missing.");
      }

      setQuestion(null);
      setCorrectAnswer(null);
      resetRoundFlags();
      setPreferredLobbyScreen("setupMode");
      navigateToScreen("quiz", { mode: "push" });
      emitStartRound(sessionId);
    } catch (error) {
      setSetupError(toMessage(error, "Quiz session could not be created."));
    } finally {
      setCreatingSession(false);
    }
  };

  const createSessionFromChoose = async () => {
    const playlistId = String(selectedPlaylist?.id ?? "").trim();
    if (!playlistId) {
      setSetupError("Bitte eine Playlist auswählen.");
      return;
    }
    await createSessionForPlaylist(playlistId, selectedPlaylist?.decadeTag);
  };

  const createSessionFromCreate = async () => {
    const playlistId = playlistIdInput.trim();
    if (!playlistId) {
      setSetupError("Bitte eine Playlist-ID eingeben.");
      return;
    }
    await createSessionForPlaylist(playlistId);
  };

  const restartQuiz = () => {
    if (!hostJwt || !lobby?.joinCode) {
      return;
    }

    setActionBusy(true);
    setPreferredLobbyScreen("setupMode");
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
    const persisted = readPersistedHostWebState();
    if (!persisted) {
      return;
    }
    if (typeof persisted.questionCount === "number") {
      setQuestionCountState(clampQuestionCount(persisted.questionCount));
    }
    if (typeof persisted.selectedPlaylistIndex === "number") {
      const normalized = Math.max(0, Math.floor(persisted.selectedPlaylistIndex));
      setSelectedPlaylistIndexState(normalized);
    }
    if (typeof persisted.playlistIdInput === "string") {
      setPlaylistIdInput(persisted.playlistIdInput);
    }
    if (
      persisted.preferredLobbyScreen === "lobby" ||
      persisted.preferredLobbyScreen === "setupMode" ||
      persisted.preferredLobbyScreen === "setupChoose" ||
      persisted.preferredLobbyScreen === "setupCreate"
    ) {
      setPreferredLobbyScreen(persisted.preferredLobbyScreen);
    }
  }, [setPreferredLobbyScreen]);

  useEffect(() => {
    writePersistedHostWebState({
      questionCount,
      selectedPlaylistIndex,
      playlistIdInput,
      preferredLobbyScreen: preferredLobbyScreenState,
      lastJoinCode: lobby?.joinCode ?? null,
    });
  }, [
    lobby?.joinCode,
    playlistIdInput,
    preferredLobbyScreenState,
    questionCount,
    selectedPlaylistIndex,
  ]);

  useEffect(() => {
    const hydrateAuth = async () => {
      const stored = await getStoredHostJwt();
      if (stored) {
        setHostJwt(stored);
      }
      setAuthHydrated(true);
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
        const resolved = await getChoosePlaylists(apiContext);
        if (cancelled || !resolved.length) {
          return;
        }

        const cards = resolved.map((playlist) => ({
          id: playlist.id,
          title: playlist.name || playlist.id,
          imageUrl: playlist.coverUrl || "",
        }));
        setPlaylists(cards);
        setSelectedPlaylistIndexState((index) => Math.max(0, Math.min(index, cards.length - 1)));
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
        setRouteNotice("Spotify verbunden. Session starten.");
      } catch (error) {
        setAuthError(toMessage(error, "Spotify login failed."));
      } finally {
        setAuthBusy(false);
      }
    };

    void consume().finally(() => {
      currentUrl.searchParams.delete("auth_code");
      currentUrl.searchParams.delete("error");
      const parsed = parseHostPath(currentUrl.pathname);
      const nextPath = buildHostPath(parsed);
      const nextUrl = `${nextPath}${currentUrl.search}${currentUrl.hash}`;
      window.history.replaceState({}, document.title, nextUrl || "/host/start");
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    applyRouteFromLocation();
  }, [applyRouteFromLocation]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const onPopState = () => {
      applyRouteFromLocation();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyRouteFromLocation]);

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

  return {
    screen,
    routeNotice,
    hasAuth,
    authBusy,
    authError,
    startSpotifyLogin,

    playlists: playlists as PlaylistCard[],
    selectedPlaylistIndex,
    setSelectedPlaylistIndex: (value: number) => {
      const normalized = Math.max(0, Math.floor(value));
      setSelectedPlaylistIndexState(normalized);
    },
    selectedPlaylist,
    playlistIdInput,
    setPlaylistIdInput,
    questionCount,
    setQuestionCount: (value: number) => setQuestionCountState(clampQuestionCount(value)),
    setupError,
    creatingSession,
    createSessionFromChoose,
    createSessionFromCreate,
    openLobby,

    lobby,
    joinUrl,
    creatingLobby,
    createLobby,
    canOpenSetup,
    openSetup,
    openSetupChoose,
    openSetupCreate,

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

    restartQuiz,
    returnToMenu,
  };
}

export type HostController = ReturnType<typeof useHostController>;
