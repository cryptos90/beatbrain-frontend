import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { io, type Socket } from "socket.io-client";
import {
  API_BASE_URL,
  getCanonicalLoopbackWebUrl,
  isLoopbackApiBaseUrl,
  isLoopbackHostname,
  normalizeApiBaseUrl,
} from "../../shared/config";
import { ApiHttpError, type ApiClientContext } from "../../shared/net/apiClient";
import {
  consumeAuthResult,
  createQuizSession,
  getChoosePlaylists,
  getHostSpotifyStatus,
  type HostSpotifyStatus,
  startSpotifyAuth,
} from "../../shared/net/beatbrainApi";
import { getStoredHostJwt, setStoredHostJwt } from "../../shared/net/authStorage";
import { getRequiredQuizSeedPoolSize } from "../../shared/quiz/playlistRequirements";
import type { LobbyState, PlaylistCard, QuizQuestion } from "../../shared/types/app";
import {
  disconnectHostSpotifyWebPlayback,
  getPreferredHostRoundPlaybackMode,
  playHostTrackWithWebSdkFallback,
  primeHostSpotifyWebPlayback,
  warmHostSpotifyWebPlayback,
} from "../services/spotifyHostPlayback";
import { getHostPlaybackErrorMessage } from "../services/hostPlaybackErrorMessage";

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
const HOST_ROUTE_BASE_ALT = "/--/host";

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

function resolveHostRouteBase(pathname: string) {
  const normalized = normalizePathname(pathname).toLowerCase();
  if (
    normalized === HOST_ROUTE_BASE_ALT ||
    normalized.startsWith(`${HOST_ROUTE_BASE_ALT}/`)
  ) {
    return HOST_ROUTE_BASE_ALT;
  }
  return HOST_ROUTE_BASE;
}

function parseHostPath(pathname: string, routeBase = HOST_ROUTE_BASE): ParsedHostRoute {
  const normalized = normalizePathname(pathname);
  const normalizedLower = normalized.toLowerCase();
  const normalizedRouteBase = normalizePathname(routeBase).toLowerCase();
  const relative = normalizedLower.startsWith(normalizedRouteBase)
    ? normalized.slice(normalizedRouteBase.length)
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

function buildHostPath(route: ParsedHostRoute, routeBase = HOST_ROUTE_BASE) {
  if (route.name === "setup") {
    return `${routeBase}/setup`;
  }
  if (route.name === "chooseQuiz") {
    return `${routeBase}/choose-quiz`;
  }
  if (route.name === "createQuiz") {
    return `${routeBase}/create-quiz`;
  }
  if (route.name === "session" && route.code) {
    return `${routeBase}/session/${encodeURIComponent(route.code)}`;
  }
  if (route.name === "quiz" && route.code) {
    return `${routeBase}/quiz/${encodeURIComponent(route.code)}`;
  }
  if (route.name === "results" && route.code) {
    return `${routeBase}/results/${encodeURIComponent(route.code)}`;
  }
  return `${routeBase}/start`;
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
  return "Socket-Anfrage fehlgeschlagen.";
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

function isInvalidStoredHostJwtError(error: unknown) {
  return error instanceof ApiHttpError && error.status === 401;
}

function getHostSpotifyReconnectMessage(status?: HostSpotifyStatus | null) {
  if (!status) {
    return "Die Spotify-Verbindung des Hosts erlaubt aktuell kein Browser-Playback. Bitte den Host-Browser erneut mit Spotify verbinden.";
  }

  if (status.missingPremium) {
    return "Browser-Playback im Host-Modus benötigt Spotify Premium auf dem Host-Account.";
  }

  if (status.missingPlaybackScope) {
    return "Die aktuelle Spotify-Anmeldung erlaubt das Laden von Playlists, aber noch kein Browser-Playback. Bitte den Host-Browser erneut mit Spotify verbinden.";
  }

  if (status.needsReconnect || !status.connected) {
    return "Die Spotify-Verbindung des Hosts ist nicht mehr gültig. Bitte den Host-Browser erneut mit Spotify verbinden.";
  }

  return status.message || "Spotify-Browser-Playback ist aktuell nicht bereit.";
}

function logHostPlaybackUiState(state: string, details?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  if (details) {
    console.info(`[host-playback] ui:state:${state}`, details);
    return;
  }

  console.info(`[host-playback] ui:state:${state}`);
}

function getBlockingHostSpotifyStatusMessage(status?: HostSpotifyStatus | null) {
  if (!status) {
    return null;
  }

  if (status.webPlaybackStatus === "blocked") {
    return getHostSpotifyReconnectMessage(status);
  }

  return null;
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
  const [spotifyStatus, setSpotifyStatus] = useState<HostSpotifyStatus | null>(null);
  const [spotifyStatusLoading, setSpotifyStatusLoading] = useState(false);

  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);

  const [questionCount, setQuestionCountState] = useState(20);
  const [playlists, setPlaylists] = useState<PlaylistCard[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
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
  const questionPlaybackKeyRef = useRef<string | null>(null);
  const startQuestionPlaybackRef = useRef<(nextQuestion: QuizQuestion | null) => Promise<void>>(
    async () => {},
  );
  const preferredLobbyScreenRef = useRef<LobbyScreenPreference>("lobby");
  const [preferredLobbyScreenState, setPreferredLobbyScreenState] =
    useState<LobbyScreenPreference>("lobby");

  const setPreferredLobbyScreen = useCallback((mode: LobbyScreenPreference) => {
    preferredLobbyScreenRef.current = mode;
    setPreferredLobbyScreenState(mode);
  }, []);

  const selectedPlaylist = playlists[selectedPlaylistIndex] ?? null;
  const requiredPlaylistTrackCount = getRequiredQuizSeedPoolSize(questionCount);
  const chooseStartDisabledReason = useMemo(() => {
    if (!selectedPlaylist) {
      return null;
    }

    const trackCount =
      typeof selectedPlaylist.trackCount === "number" &&
      Number.isFinite(selectedPlaylist.trackCount)
        ? Math.max(0, Math.floor(selectedPlaylist.trackCount))
        : null;

    if (trackCount === null || trackCount >= requiredPlaylistTrackCount) {
      return null;
    }

    if (trackCount === 0) {
      return "Diese BeatBrain-Playlist enthält aktuell noch keine spielbaren Tracks.";
    }

    return `Diese BeatBrain-Playlist enthält aktuell nur ${trackCount} Tracks. Für ${questionCount} Fragen werden mindestens ${requiredPlaylistTrackCount} benötigt.`;
  }, [questionCount, requiredPlaylistTrackCount, selectedPlaylist]);

  const hasAuth = Boolean(hostJwt);
  const spotifyPlaybackReady = spotifyStatus?.canUseWebPlayback ?? null;
  const totalPlayers = lobby?.players.length ?? 0;
  const readyCount = lobby?.players.filter((player) => player.readyForNext).length ?? 0;

  const joinUrl = useMemo(() => {
    if (Platform.OS !== "web" || !lobby?.joinCode) {
      return "";
    }

    const joinTarget = new URL(window.location.origin);
    joinTarget.searchParams.set("joinCode", lobby.joinCode);

    const configuredBackendUrl = normalizeApiBaseUrl(API_BASE_URL);
    if (configuredBackendUrl && !isLoopbackApiBaseUrl(configuredBackendUrl)) {
      joinTarget.searchParams.set("backendUrl", configuredBackendUrl);
      return joinTarget.toString();
    }

    try {
      const pageOrigin = new URL(window.location.origin);
      if (!isLoopbackHostname(pageOrigin.hostname)) {
        const derivedBackendUrl = normalizeApiBaseUrl(`http://${pageOrigin.hostname}:3000`);
        if (derivedBackendUrl) {
          joinTarget.searchParams.set("backendUrl", derivedBackendUrl);
        }
      }
    } catch {
      // Ignore invalid web origin parsing and keep join link usable with code only.
    }

    return joinTarget.toString();
  }, [lobby?.joinCode]);

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

  const refreshSpotifyStatus = useCallback(async () => {
    if (!hostJwt) {
      setSpotifyStatus(null);
      return null;
    }

    logHostPlaybackUiState("status:load:start");
    setSpotifyStatusLoading(true);
    try {
      const nextStatus = await getHostSpotifyStatus(apiContext);
      logHostPlaybackUiState("status:load:result", {
        webPlaybackStatus: nextStatus.webPlaybackStatus,
        scopeStatus: nextStatus.scopeStatus,
        needsReconnect: nextStatus.needsReconnect,
        missingPremium: nextStatus.missingPremium,
        missingPlaybackScope: nextStatus.missingPlaybackScope,
      });
      setSpotifyStatus(nextStatus);
      return nextStatus;
    } catch (error) {
      if (isInvalidStoredHostJwtError(error)) {
        setPersistedHostJwt(null);
        setSpotifyStatus(null);
        return null;
      }

      const fallbackStatus: HostSpotifyStatus = {
        connected: false,
        canUseWebPlayback: null,
        needsReconnect: false,
        missingPremium: false,
        missingPlaybackScope: false,
        scopeStatus: "unknown",
        webPlaybackStatus: "unknown",
        message: toMessage(
          error,
          "Spotify-Status konnte gerade nicht geprüft werden.",
        ),
      };
      logHostPlaybackUiState("status:load:error", {
        message: fallbackStatus.message,
      });
      setSpotifyStatus(fallbackStatus);
      return fallbackStatus;
    } finally {
      setSpotifyStatusLoading(false);
    }
  }, [apiContext, hostJwt]);

  const primeHostPlayback = useCallback(async () => {
    if (Platform.OS !== "web" || !hostJwt) {
      return {
        ok: false,
        code: "auth",
        message: "Bitte den Host zuerst mit Spotify verbinden.",
      };
    }
    logHostPlaybackUiState("prime:start");
    const result = await primeHostSpotifyWebPlayback(apiContext);
    logHostPlaybackUiState(result.ok ? "prime:ok" : "prime:fail", {
      ...(result.ok
        ? { deviceId: result.deviceId ?? null }
        : { code: result.code, message: result.message }),
    });
    return result;
  }, [apiContext, hostJwt]);

  const warmHostPlayback = useCallback(async () => {
    if (Platform.OS !== "web" || !hostJwt) {
      return;
    }

    logHostPlaybackUiState("warm:start");
    await warmHostSpotifyWebPlayback(apiContext);
    logHostPlaybackUiState("warm:done");
  }, [apiContext, hostJwt]);

  const startQuestionPlayback = useCallback(
    async (nextQuestion: QuizQuestion | null) => {
      if (Platform.OS !== "web") {
        return;
      }

      const trackUri = String(nextQuestion?.correctTrackUri ?? "").trim();
      const correctSongId = String(nextQuestion?.correctSongId ?? "").trim();
      if (!trackUri || !correctSongId) {
        return;
      }

      const playbackKey = `${correctSongId}:${trackUri}`;
      questionPlaybackKeyRef.current = playbackKey;
      setPlaybackError(null);

      const result = await playHostTrackWithWebSdkFallback(apiContext, trackUri);
      if (questionPlaybackKeyRef.current !== playbackKey) {
        return;
      }

      if (!result.ok) {
        logHostPlaybackUiState("round:playback:failed", {
          message: result.message,
        });
        setPlaybackError(result.message);
        return;
      }

      logHostPlaybackUiState("round:playback:ok", {
        mode: result.mode,
      });
      setPlaybackError(null);
    },
    [apiContext],
  );

  useEffect(() => {
    startQuestionPlaybackRef.current = startQuestionPlayback;
  }, [startQuestionPlayback]);

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
      const routeBase = resolveHostRouteBase(window.location.pathname);
      const nextPath = buildHostPath(route, routeBase);
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

    const routeBase = resolveHostRouteBase(window.location.pathname);
    const parsed = parseHostPath(window.location.pathname, routeBase);
    const canonicalPath = buildHostPath(parsed, routeBase);
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

      const nextPath = buildHostPath(decision.route, routeBase);
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
    questionPlaybackKeyRef.current = null;
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
      transports: ["websocket", "polling"],
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
      logHostPlaybackUiState("round:question");
      setActionBusy(false);
      setSocketError(null);
      const nextQuestion = payload.question ?? null;
      setQuestion(nextQuestion);
      setCorrectAnswer(null);
      resetRoundFlags();
      navigateToScreen("quiz", { mode: "replace" });
      void startQuestionPlaybackRef.current(nextQuestion);
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
      logHostPlaybackUiState("round:playback:error", {
        message: payload?.message?.trim() || "Spotify playback failed.",
      });
      setPlaybackError(
        getHostPlaybackErrorMessage(payload?.message?.trim() || "Spotify playback failed."),
      );
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
      const message = getHostPlaybackErrorMessage(readExceptionMessage(payload));
      setCreatingLobby(false);
      setCreatingSession(false);
      setActionBusy(false);
      setSocketError(message);
    });

    socket.on("connect_error", (error: Error) => {
      setSocketError(error.message || "Socket-Verbindung fehlgeschlagen.");
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
      const routeBase = resolveHostRouteBase(window.location.pathname);
      const canonicalOrigin =
        getCanonicalLoopbackWebUrl(window.location.origin) ?? window.location.origin;
      const redirectOrigin = new URL(`${routeBase}/start`, canonicalOrigin).toString();
      const response = await startSpotifyAuth("web", { redirectOrigin });
      const authorizeUrl =
        typeof response.authorizeUrl === "string" ? response.authorizeUrl : "";

      if (!authorizeUrl) {
        throw new Error("Spotify authorize URL missing.");
      }

      window.location.assign(authorizeUrl);
    } catch (error) {
      setAuthError(toMessage(error, "Spotify-Login fehlgeschlagen."));
      setAuthBusy(false);
    }
  };

  const createLobby = () => {
    if (!hostJwt) {
      setAuthError("Missing host login.");
      return;
    }

    void warmHostPlayback();
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

  const emitStartRound = async (sessionId: string) => {
    if (!hostJwt || !lobby?.joinCode) {
      setSetupError("Lobby nicht bereit.");
      return false;
    }

    setActionBusy(true);
    setSocketError(null);
    logHostPlaybackUiState("round:start:emit", {
      joinCode: lobby.joinCode,
      playbackMode: getPreferredHostRoundPlaybackMode(),
    });
    const socket = connectSocket();
    socket.emit("host:startRound", {
      hostJwt,
      joinCode: lobby.joinCode,
      quizSessionId: sessionId,
      timerMs: 30_000,
      playbackMode: getPreferredHostRoundPlaybackMode(),
    });
    return true;
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
    logHostPlaybackUiState("quiz:start:click", {
      playlistId: normalizedPlaylistId,
      decadeTag: decadeTag ?? null,
      questionCount: clampQuestionCount(questionCount),
    });
    const preferredSetupScreen =
      screen === "setupCreate" ? "setupCreate" : "setupChoose";
    if (getPreferredHostRoundPlaybackMode() === "host_web_sdk") {
      const primeResult = await primeHostPlayback();
      if (!primeResult.ok) {
        const status = await refreshSpotifyStatus();
        const blockingStatusMessage = getBlockingHostSpotifyStatusMessage(status);
        setSetupError(
          blockingStatusMessage ??
            primeResult.message ??
            "Spotify-Browser-Playback konnte nicht vorbereitet werden.",
        );
        setCreatingSession(false);
        return;
      }
    }
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
      setPreferredLobbyScreen(preferredSetupScreen);
      await emitStartRound(sessionId);
    } catch (error) {
      setSetupError(
        getHostPlaybackErrorMessage(
          error instanceof Error ? error : toMessage(error, "Quiz-Session konnte nicht erstellt werden."),
        ),
      );
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
    if (chooseStartDisabledReason) {
      setSetupError(chooseStartDisabledReason);
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

    void warmHostPlayback();
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
    if (Platform.OS !== "web") {
      return;
    }

    const canonicalUrl = getCanonicalLoopbackWebUrl(window.location.href);
    if (!canonicalUrl || canonicalUrl === window.location.href) {
      return;
    }

    logHostPlaybackUiState("web:origin:canonicalize", {
      from: window.location.origin,
      to: new URL(canonicalUrl).origin,
    });
    window.location.replace(canonicalUrl);
  }, []);

  useEffect(() => {
    const hydrateAuth = async () => {
      const stored = await getStoredHostJwt();
      if (stored) {
        setHostJwt(stored);
      } else {
        setPersistedHostJwt(null);
      }
      setAuthHydrated(true);
    };

    void hydrateAuth();
  }, []);

  useEffect(() => {
    if (!hasAuth) {
      setSpotifyStatus(null);
      setSpotifyStatusLoading(false);
      return;
    }

    void refreshSpotifyStatus();
  }, [hasAuth, refreshSpotifyStatus]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    if (!hasAuth) {
      disconnectHostSpotifyWebPlayback();
      return;
    }

    void warmHostPlayback();
  }, [hasAuth, warmHostPlayback]);

  useEffect(() => {
    if (!hasAuth) {
      setPlaylistsLoading(false);
      setPlaylistsError(null);
      setPlaylists([]);
      return;
    }

    let cancelled = false;

    const loadPlaylists = async () => {
      setPlaylistsLoading(true);
      setPlaylistsError(null);
      try {
        const resolved = await getChoosePlaylists(apiContext);
        if (cancelled) {
          return;
        }

        const cards = resolved.map((playlist) => ({
          id: playlist.id,
          title: playlist.name || playlist.id,
          imageUrl: playlist.coverUrl || "",
          tags: playlist.tags,
          decadeTag: playlist.decadeTag,
          categoryType: playlist.categoryType,
          trackCount: playlist.trackCount,
        }));
        setPlaylists(cards);
        setSelectedPlaylistIndexState((index) => Math.max(0, Math.min(index, cards.length - 1)));
        setPlaylistsError(cards.length ? null : "Keine BeatBrain-Playlists gefunden.");
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isInvalidStoredHostJwtError(error)) {
          setPersistedHostJwt(null);
        }

        setPlaylists([]);
        setPlaylistsError(
          isInvalidStoredHostJwtError(error)
            ? "Spotify-Login abgelaufen. Bitte erneut verbinden."
            : toMessage(error, "BeatBrain-Playlists konnten nicht geladen werden."),
        );

        if (__DEV__ && !isInvalidStoredHostJwtError(error)) {
          console.error("[host] playlist resolve failed", error);
        }
      } finally {
        if (!cancelled) {
          setPlaylistsLoading(false);
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
        setAuthError("Spotify-Login fehlgeschlagen.");
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
        setAuthError(toMessage(error, "Spotify-Login fehlgeschlagen."));
      } finally {
        setAuthBusy(false);
      }
    };

    void consume().finally(() => {
      currentUrl.searchParams.delete("auth_code");
      currentUrl.searchParams.delete("error");
      const routeBase = resolveHostRouteBase(currentUrl.pathname);
      const parsed = parseHostPath(currentUrl.pathname, routeBase);
      const nextPath = buildHostPath(parsed, routeBase);
      const nextUrl = `${nextPath}${currentUrl.search}${currentUrl.hash}`;
      window.history.replaceState({}, document.title, nextUrl || `${routeBase}/start`);
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
      disconnectHostSpotifyWebPlayback();
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
    spotifyStatus,
    spotifyStatusLoading,
    spotifyPlaybackReady,
    startSpotifyLogin,

    playlists: playlists as PlaylistCard[],
    playlistsLoading,
    playlistsError,
    selectedPlaylistIndex,
    setSelectedPlaylistIndex: (value: number) => {
      const normalized = Math.max(0, Math.floor(value));
      setSetupError(null);
      setSelectedPlaylistIndexState(normalized);
    },
    selectedPlaylist,
    chooseStartDisabledReason,
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
