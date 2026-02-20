// BB_CONTROLLER_OK
import { Asset } from "expo-asset";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, Keyboard, Linking, Platform } from "react-native";
import { io, type Socket } from "socket.io-client";
import { TIMER_SECONDS } from "../constants/app";
import {
  API_BASE_URL,
  SPOTIFY_REDIRECT_URI,
  SPOTIFY_REDIRECT_URI_WEB_FALLBACK,
  SPOTIFY_REDIRECT_URI_WEB,
} from "../config";
import { PLAYLIST_IDS } from "../data/playlists";
import { ApiHttpError, type ApiClientContext } from "../services/apiClient";
import {
  completeSpotifyCallback,
  consumeAuthResult,
  createQuizSession,
  deleteQuizSession,
  loadNextQuizQuestion,
  resolveChoosePlaylists,
  startSpotifyAuth,
  startSpotifyPlayback,
} from "../services/beatbrainApi";
import { getStoredHostJwt, setStoredHostJwt } from "../services/authStorage";
import type { LobbyState, PlaylistCard, QuizQuestion, Screen } from "../types/app";

WebBrowser.maybeCompleteAuthSession();

const MAX_AVATAR_DATA_URL_LENGTH = 200_000;

function resolveSpotifyRedirectUri(platform: string): string {
  if (platform === "web") {
    const value = SPOTIFY_REDIRECT_URI_WEB.trim();
    if (!value || value.startsWith("exp://")) {
      if (__DEV__) {
        console.warn(
          `[auth] invalid EXPO_PUBLIC_SPOTIFY_REDIRECT_URI_WEB (${value || "<empty>"}), fallback=${SPOTIFY_REDIRECT_URI_WEB_FALLBACK}`,
        );
      }
      return SPOTIFY_REDIRECT_URI_WEB_FALLBACK;
    }

    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      if (__DEV__) {
        console.warn(
          `[auth] unparsable EXPO_PUBLIC_SPOTIFY_REDIRECT_URI_WEB (${value}), fallback=${SPOTIFY_REDIRECT_URI_WEB_FALLBACK}`,
        );
      }
      return SPOTIFY_REDIRECT_URI_WEB_FALLBACK;
    }

    const protocol = parsed.protocol.toLowerCase();
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;
    const isLoopbackHost =
      host === "127.0.0.1" || host === "::1" || host === "[::1]";
    const isLanHost =
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);
    const isDevAllowedHost =
      isLoopbackHost || (__DEV__ && (host === "localhost" || isLanHost));

    if (protocol === "http:") {
      const isValidHttpPath =
        path === "/auth/spotify/callback" || path.endsWith("/callback");
      if (!(isDevAllowedHost && isValidHttpPath)) {
        if (__DEV__) {
          console.warn(
            `[auth] invalid HTTP EXPO_PUBLIC_SPOTIFY_REDIRECT_URI_WEB (${value}), fallback=${SPOTIFY_REDIRECT_URI_WEB_FALLBACK}`,
          );
        }
        return SPOTIFY_REDIRECT_URI_WEB_FALLBACK;
      }
      return value;
    }

    if (protocol === "https:" && path.endsWith("/callback")) {
      return value;
    }

    if (__DEV__) {
      console.warn(
        `[auth] invalid EXPO_PUBLIC_SPOTIFY_REDIRECT_URI_WEB protocol (${protocol}), fallback=${SPOTIFY_REDIRECT_URI_WEB_FALLBACK}`,
      );
    }
    return SPOTIFY_REDIRECT_URI_WEB_FALLBACK;
  }
  if (SPOTIFY_REDIRECT_URI !== "beatbrain-login://callback") {
    throw new Error(
      "Invalid EXPO_PUBLIC_SPOTIFY_REDIRECT_URI. Use beatbrain-login://callback.",
    );
  }
  return SPOTIFY_REDIRECT_URI;
}

function readQueryParam(url: string, key: string) {
  const [, queryString = ""] = url.split("?");
  const params = new URLSearchParams(queryString);
  return params.get(key);
}

function readAuthCode(url: string) {
  return readQueryParam(url, "auth_code");
}

function readJoinCode(url: string) {
  const raw =
    readQueryParam(url, "joinCode") ??
    readQueryParam(url, "sessionId") ??
    readQueryParam(url, "code");
  const normalized = String(raw ?? "").trim().toUpperCase();
  return normalized || null;
}

function formatRetryAfter(seconds: number) {
  const safeSeconds = Math.max(1, Math.ceil(seconds));

  if (safeSeconds < 60) {
    return `${safeSeconds}s`;
  }

  if (safeSeconds < 3600) {
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  if (safeSeconds < 86400) {
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

function resolveRateLimitTickMs(seconds: number) {
  if (seconds > 3600) {
    return 60_000;
  }
  if (seconds > 300) {
    return 10_000;
  }
  return 1_000;
}

function resolveRateLimitTickSeconds(seconds: number) {
  if (seconds > 3600) {
    return 60;
  }
  if (seconds > 300) {
    return 10;
  }
  return 1;
}

function toPlaybackErrorMessage(error: unknown) {
  if (error instanceof ApiHttpError) {
    if (error.message) {
      return error.message;
    }
    if (error.status === 404) {
      return "No active Spotify device. Open Spotify and start playing something once.";
    }
    if (error.status === 403) {
      return "Playback requires Spotify Premium / missing scope.";
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Spotify playback failed.";
}

export function useBeatBrainController() {
  const [screen, setScreen] = useState<Screen>({ name: "start" });
  const [hostJwt, setHostJwt] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [loginPending, setLoginPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingAuthState, setPendingAuthState] = useState<string | null>(null);

  const [playlists, setPlaylists] = useState<PlaylistCard[]>([]);
  const [selectedPlaylistIndex, setSelectedPlaylistIndex] = useState(0);
  const selectedPlaylist = playlists[selectedPlaylistIndex] ?? null;
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [playlistRateLimitRemaining, setPlaylistRateLimitRemaining] = useState<number | null>(
    null,
  );

  const carouselRef = useRef<FlatList<PlaylistCard>>(null);
  const [playlistIdInput, setPlaylistIdInput] = useState("");

  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [quizPlaybackError, setQuizPlaybackError] = useState<string | null>(null);

  const [revealed, setRevealed] = useState(false);
  const [pickedOption, setPickedOption] = useState<string | null>(null);
  const [yearInput, setYearInput] = useState("");
  const [yearWasCorrect, setYearWasCorrect] = useState<boolean | null>(null);

  const timerAnim = useRef(new Animated.Value(1)).current;
  const [timerBarW, setTimerBarW] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const hasAuth = Boolean(hostJwt);

  const [mpRole, setMpRole] = useState<"none" | "host" | "player">("none");
  const [mpLobby, setMpLobby] = useState<LobbyState | null>(null);
  const [mpQuestion, setMpQuestion] = useState<QuizQuestion | null>(null);
  const [mpCorrectAnswer, setMpCorrectAnswer] = useState<string | null>(null);
  const [mpJoinCodeInput, setMpJoinCodeInput] = useState("");
  const [mpJoinError, setMpJoinError] = useState<string | null>(null);
  const [mpPlayerName, setMpPlayerName] = useState("Player");
  const [mpPlayerAvatarDataUrl, setMpPlayerAvatarDataUrl] = useState("");
  const [mpHostPlaylistId, setMpHostPlaylistId] = useState(PLAYLIST_IDS[0]?.id ?? "");
  const [mpHostQuizSessionId, setMpHostQuizSessionId] = useState<string | null>(null);
  const [mpYearAnswer, setMpYearAnswer] = useState("");
  const [mpPlayerAnswered, setMpPlayerAnswered] = useState(false);
  const [mpPlayerContinued, setMpPlayerContinued] = useState(false);
  const [mpAllAnswered, setMpAllAnswered] = useState(false);
  const [mpTimeUp, setMpTimeUp] = useState(false);
  const [mpPlaybackError, setMpPlaybackError] = useState<string | null>(null);

  const chooseResolveAbortRef = useRef<AbortController | null>(null);
  const chooseResolveInFlightRef = useRef(new Map<string, Promise<PlaylistCard[]>>());
  const chooseResolveCacheRef = useRef(new Map<string, PlaylistCard[]>());
  const chooseResolveRateLimitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setPersistedHostJwt = (jwt: string | null) => {
    setHostJwt(jwt);
    void setStoredHostJwt(jwt);
  };

  const apiContext = useMemo<ApiClientContext>(
    () => ({
      getJwt: () => hostJwt,
      setJwt: (nextJwt) => setPersistedHostJwt(nextJwt),
    }),
    [hostJwt],
  );

  const mpReadyCount = mpLobby
    ? mpLobby.players.filter((player) => player.readyForNext).length
    : 0;
  const mpAllContinued =
    Boolean(mpLobby) &&
    mpLobby!.players.length > 0 &&
    mpReadyCount === mpLobby!.players.length;

  const resetMultiplayerState = () => {
    setMpRole("none");
    setMpLobby(null);
    setMpQuestion(null);
    setMpCorrectAnswer(null);
    setMpHostQuizSessionId(null);
    setMpYearAnswer("");
    setMpJoinError(null);
    setMpPlayerAnswered(false);
    setMpPlayerContinued(false);
    setMpAllAnswered(false);
    setMpTimeUp(false);
    setMpPlaybackError(null);
  };

  const connectSocket = () => {
    if (socketRef.current) return socketRef.current;

    const socket = io(API_BASE_URL, {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("lobby:state", (state: LobbyState) => {
      setMpLobby(state);
    });
    socket.on("host:lobbyCreated", (state: LobbyState) => {
      setMpLobby(state);
      setMpJoinCodeInput(state.joinCode);
    });
    socket.on(
      "round:question",
      (payload: { question: QuizQuestion; timerMs?: number }) => {
        setMpQuestion(payload.question);
        setMpCorrectAnswer(null);
        setMpYearAnswer("");
        setMpPlayerAnswered(false);
        setMpPlayerContinued(false);
        setMpAllAnswered(false);
        setMpTimeUp(false);
        setMpPlaybackError(null);
      },
    );
    socket.on("round:reveal", (payload: { correctAnswer: string; state: LobbyState }) => {
      setMpCorrectAnswer(payload.correctAnswer);
      setMpLobby(payload.state);
      setMpTimeUp(false);
    });
    socket.on("round:allAnswered", () => {
      setMpAllAnswered(true);
    });
    socket.on("round:timeUp", () => {
      setMpTimeUp(true);
    });
    socket.on("round:playbackError", (payload: { message?: string }) => {
      setMpPlaybackError(
        payload?.message?.trim() ||
          "Spotify playback failed. Open Spotify and check your active device.",
      );
    });
    socket.on("game:ended", (state: LobbyState) => {
      setMpLobby(state);
      setMpQuestion(null);
      setMpCorrectAnswer(null);
      setMpPlayerAnswered(false);
      setMpPlayerContinued(false);
      setMpAllAnswered(false);
      setMpTimeUp(false);
    });

    return socket;
  };

  const createHostLobby = () => {
    if (!hostJwt) return;
    const socket = connectSocket();
    socket.emit("host:createLobby", { hostJwt });
  };

  const pickPlayerAvatar = async (source: "camera" | "library") => {
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setMpJoinError("Kamera-Berechtigung fehlt.");
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setMpJoinError("Galerie-Berechtigung fehlt.");
          return;
        }
      }

      const commonOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      };

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              ...commonOptions,
              cameraType: ImagePicker.CameraType.front,
            })
          : await ImagePicker.launchImageLibraryAsync(commonOptions);

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      const base64 = asset?.base64;
      if (!base64) {
        setMpJoinError("Foto konnte nicht verarbeitet werden.");
        return;
      }

      const mimeType =
        asset?.mimeType && asset.mimeType.startsWith("image/")
          ? asset.mimeType
          : "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${base64}`;
      if (dataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
        setMpJoinError("Avatar zu groß. Bitte ein kleineres Foto wählen.");
        return;
      }

      setMpPlayerAvatarDataUrl(dataUrl);
      setMpJoinError(null);
    } catch {
      setMpJoinError("Fotoauswahl fehlgeschlagen.");
    }
  };

  const pickPlayerAvatarFromCamera = async () => {
    await pickPlayerAvatar("camera");
  };

  const pickPlayerAvatarFromLibrary = async () => {
    await pickPlayerAvatar("library");
  };

  const joinAsPlayer = () => {
    const joinCode = mpJoinCodeInput.trim().toUpperCase();
    const name = mpPlayerName.trim();
    const avatarDataUrl = mpPlayerAvatarDataUrl.trim();

    if (!joinCode) {
      setMpJoinError("Join Code fehlt.");
      return;
    }
    if (!name || name.length > 20) {
      setMpJoinError("Name muss 1 bis 20 Zeichen haben.");
      return;
    }
    if (!avatarDataUrl) {
      setMpJoinError("Bitte ein Foto auswählen.");
      return;
    }
    if (avatarDataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
      setMpJoinError("Avatar zu groß.");
      return;
    }

    setMpJoinError(null);
    const socket = connectSocket();
    socket.emit("player:join", {
      joinCode,
      name,
      avatarDataUrl,
    });
  };

  const hostStartRound = async () => {
    if (!hostJwt || !mpLobby?.joinCode) return;

    let sessionId = mpHostQuizSessionId;
    if (!sessionId) {
      const session = await createQuizSession(apiContext, mpHostPlaylistId);
      sessionId = session.sessionId;
      setMpHostQuizSessionId(sessionId);
    }

    if (!sessionId) return;

    const socket = connectSocket();
    socket.emit("host:startRound", {
      hostJwt,
      joinCode: mpLobby.joinCode,
      quizSessionId: sessionId,
      timerMs: TIMER_SECONDS * 1000,
    });
  };

  const hostReveal = () => {
    if (!hostJwt || !mpLobby?.joinCode || !mpQuestion) return;
    const socket = connectSocket();
    socket.emit("host:reveal", {
      hostJwt,
      joinCode: mpLobby.joinCode,
      correctAnswer: mpQuestion.correctAnswer,
    });
  };

  const playerAnswer = (answer: string) => {
    if (!mpLobby?.joinCode || mpPlayerAnswered) return;
    const normalizedAnswer = String(answer ?? "").trim();
    if (!normalizedAnswer) return;
    setMpPlayerAnswered(true);
    const socket = connectSocket();
    socket.emit("player:answer", {
      joinCode: mpLobby.joinCode,
      answer: normalizedAnswer,
    });
  };

  const playerContinue = () => {
    if (!mpLobby?.joinCode || mpPlayerContinued) return;
    setMpPlayerContinued(true);
    const socket = connectSocket();
    socket.emit("player:continue", {
      joinCode: mpLobby.joinCode,
    });
  };

  const stopAndUnload = async () => {};

  const stopTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    timerAnim.stopAnimation();
  };

  const startTimer = () => {
    stopTimer();
    timerAnim.setValue(1);

    Animated.timing(timerAnim, {
      toValue: 0,
      duration: TIMER_SECONDS * 1000,
      useNativeDriver: true,
    }).start();

    timeoutRef.current = setTimeout(() => {
      if (revealed) return;
      setRevealed(true);
      if (currentQuestion?.questionObject.answerType === "year-input") {
        setYearWasCorrect(false);
      }
    }, TIMER_SECONDS * 1000);
  };

  const resetPerQuestionUi = () => {
    setRevealed(false);
    setPickedOption(null);
    setYearInput("");
    setYearWasCorrect(null);
  };

  const loadChoosePlaylists = async () => {
    if (!hasAuth) return;
    const playlistIds = PLAYLIST_IDS.map((p) => p.id);
    const requestKey = playlistIds.join(",");

    const cached = chooseResolveCacheRef.current.get(requestKey);
    if (cached && cached.length) {
      if (__DEV__) {
        console.info(`[resolve] start playlistIds=${requestKey} source=cache`);
      }
      setPlaylists(cached);
      setSelectedPlaylistIndex(0);
      setPlaylistError(null);
      setPlaylistLoading(false);
      return;
    }

    if (chooseResolveInFlightRef.current.has(requestKey)) {
      if (__DEV__) {
        console.info(`[resolve] dedupe playlistIds=${requestKey} source=in-flight`);
      }
      return;
    }

    if (playlistRateLimitRemaining && playlistRateLimitRemaining > 0) {
      setPlaylistError(
        `Spotify rate-limited. Try again in ${formatRetryAfter(playlistRateLimitRemaining)}.`,
      );
      return;
    }

    if (chooseResolveAbortRef.current) {
      chooseResolveAbortRef.current.abort();
    }
    const abortController = new AbortController();
    chooseResolveAbortRef.current = abortController;

    setPlaylistLoading(true);
    setPlaylistError(null);
    if (__DEV__) {
      console.info(`[resolve] start playlistIds=${requestKey} source=network`);
    }
    const requestPromise = resolveChoosePlaylists(apiContext, playlistIds, {
      signal: abortController.signal,
    });
    chooseResolveInFlightRef.current.set(requestKey, requestPromise);

    try {
      const next = await requestPromise;

      if (!next.length) {
        throw new Error("No Spotify playlists configured");
      }

      if (chooseResolveRateLimitTimerRef.current) {
        clearInterval(chooseResolveRateLimitTimerRef.current);
        chooseResolveRateLimitTimerRef.current = null;
      }
      setPlaylistRateLimitRemaining(null);
      chooseResolveCacheRef.current.set(requestKey, next);
      setPlaylists(next);
      setSelectedPlaylistIndex(0);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }

      if (error instanceof ApiHttpError && error.status === 429) {
        const retryAfterRaw = error.retryAfterSeconds;
        const retryAfterSeconds =
          typeof retryAfterRaw === "number" &&
          Number.isFinite(retryAfterRaw) &&
          retryAfterRaw > 0
            ? Math.ceil(retryAfterRaw)
            : 60;

        if (chooseResolveRateLimitTimerRef.current) {
          clearInterval(chooseResolveRateLimitTimerRef.current);
          chooseResolveRateLimitTimerRef.current = null;
        }

        const tickMs = resolveRateLimitTickMs(retryAfterSeconds);
        const tickSeconds = resolveRateLimitTickSeconds(retryAfterSeconds);
        setPlaylistRateLimitRemaining(retryAfterSeconds);
        setPlaylistError(
          `Spotify rate-limited. Try again in ${formatRetryAfter(retryAfterSeconds)}.`,
        );

        chooseResolveRateLimitTimerRef.current = setInterval(() => {
          setPlaylistRateLimitRemaining((previous) => {
            if (previous === null || previous <= tickSeconds) {
              if (chooseResolveRateLimitTimerRef.current) {
                clearInterval(chooseResolveRateLimitTimerRef.current);
                chooseResolveRateLimitTimerRef.current = null;
              }
              setPlaylistError((current) =>
                current?.startsWith("Spotify rate-limited.") ? null : current,
              );
              return null;
            }

            const nextRemaining = previous - tickSeconds;
            setPlaylistError(
              `Spotify rate-limited. Try again in ${formatRetryAfter(nextRemaining)}.`,
            );
            return nextRemaining;
          });
        }, tickMs);

        if (__DEV__) {
          console.warn(
            `[resolve] rate_limited playlistIds=${requestKey} retry_after=${retryAfterSeconds}s`,
          );
        }
        return;
      }

      if (error instanceof ApiHttpError && error.status === 0) {
        setPlaylistError(error.message);
        if (__DEV__) {
          console.error(`[resolve] backend_unreachable ${error.message}`);
        }
        return;
      }

      setPlaylistError("Playlists konnten nicht von Spotify geladen werden.");
    } finally {
      const inFlight = chooseResolveInFlightRef.current.get(requestKey);
      if (inFlight === requestPromise) {
        chooseResolveInFlightRef.current.delete(requestKey);
      }
      if (chooseResolveAbortRef.current === abortController) {
        chooseResolveAbortRef.current = null;
      }
      setPlaylistLoading(false);
    }
  };

  const handleAuthRedirect = async (url: string) => {
    try {
      const authCode = readAuthCode(url);
      const code = readQueryParam(url, "code");
      const state = readQueryParam(url, "state");
      const oauthError = readQueryParam(url, "error");
      const joinCode = readJoinCode(url);

      if (oauthError) {
        setAuthError("Spotify Login wurde abgebrochen oder ist fehlgeschlagen.");
        setLoginPending(false);
        setPendingAuthState(null);
        return;
      }

      if (authCode) {
        setAuthBusy(true);
        const data = await consumeAuthResult(authCode);
        setPersistedHostJwt(data.appJwt ?? null);
        setPendingAuthState(null);
        setAuthError(null);
        setLoginPending(false);
        return;
      }

      if (joinCode && !state) {
        setScreen({ name: "multiplayer" });
        setMpRole("player");
        setMpJoinCodeInput(joinCode);
        return;
      }

      if (!code || !state || !pendingAuthState) {
        return;
      }

      if (state !== pendingAuthState) {
        setAuthError("Spotify State ungültig.");
        setLoginPending(false);
        setPendingAuthState(null);
        return;
      }

      setAuthBusy(true);
      const exchange = await completeSpotifyCallback(code, state);
      const exchangeCode =
        typeof exchange.authCode === "string" ? exchange.authCode : "";
      if (!exchangeCode) {
        throw new Error("Missing auth exchange code");
      }
      const data = await consumeAuthResult(exchangeCode);

      setPersistedHostJwt(data.appJwt ?? null);
      setPendingAuthState(null);
      setAuthError(null);
      setLoginPending(false);
    } catch {
      setAuthError("Spotify Login fehlgeschlagen.");
      setLoginPending(false);
      setPendingAuthState(null);
    } finally {
      setAuthBusy(false);
    }
  };

  const startSpotifyLogin = async () => {
    setAuthBusy(true);
    setLoginPending(true);
    setAuthError(null);

    try {
      const clientType = Platform.OS === "web" ? "web" : "mobile";
      const redirectUri = resolveSpotifyRedirectUri(Platform.OS);

      if (__DEV__) {
        console.info(`[auth] start clientType=${clientType} redirect_uri=${redirectUri}`);
      }

      const data = await startSpotifyAuth(clientType, {
        redirectOrigin: Platform.OS === "web" ? window.location.origin : undefined,
      });
      const serverRedirectUri =
        typeof data.redirectUri === "string" ? data.redirectUri : redirectUri;
      const authReturnUrl =
        Platform.OS === "web" ? window.location.origin : serverRedirectUri;

      if (__DEV__) {
        console.info(
          `[auth] backend redirect_uri clientType=${clientType} redirect_uri=${serverRedirectUri}`,
        );
      }

      setPendingAuthState(data.state ?? null);

      if (!data.authorizeUrl) {
        throw new Error("Spotify authorize URL missing");
      }

      const authResult = await WebBrowser.openAuthSessionAsync(
        data.authorizeUrl,
        authReturnUrl,
      );

      if (authResult.type === "success" && authResult.url) {
        await handleAuthRedirect(authResult.url);
        return;
      }

      if (authResult.type === "cancel" || authResult.type === "dismiss") {
        setAuthError("Spotify Login wurde abgebrochen.");
      }
      setLoginPending(false);
      setPendingAuthState(null);
    } catch (error: any) {
      const details = error?.message ? ` (${error.message})` : "";
      setAuthError(`Spotify Login konnte nicht gestartet werden.${details}`);
      setLoginPending(false);
      setPendingAuthState(null);
    } finally {
      setAuthBusy(false);
    }
  };

  const ensureSpotifyLogin = async () => {
    if (hasAuth) return;
    await startSpotifyLogin();
  };

  const beginQuizForPlaylist = async (playlistId: string, playlistTitle: string) => {
    resetPerQuestionUi();
    setScore(0);
    setQIndex(0);
    setQuizPlaybackError(null);

    const session = await createQuizSession(apiContext, playlistId);

    setQuizSessionId(session.sessionId ?? null);
    setScreen({ name: "quiz", playlistTitle });
  };

  const loadNextQuestion = async () => {
    if (!quizSessionId) return;

    const data = await loadNextQuizQuestion(apiContext, quizSessionId);

    if (data.done) {
      setScreen({ name: "results" });
      return;
    }

    setCurrentQuestion(data.question);
    setQuizPlaybackError(null);
    resetPerQuestionUi();
    startTimer();

    const trackUri =
      typeof data.question?.correctTrackUri === "string"
        ? data.question.correctTrackUri
        : "";
    if (trackUri) {
      try {
        await startSpotifyPlayback(apiContext, trackUri);
      } catch (error) {
        setQuizPlaybackError(toPlaybackErrorMessage(error));
      }
    }
  };

  const finishQuiz = async () => {
    stopTimer();
    await stopAndUnload();

    if (quizSessionId) {
      try {
        await deleteQuizSession(apiContext, quizSessionId);
      } catch {
        // ignore cleanup errors
      }
    }

    setQuizSessionId(null);
    setCurrentQuestion(null);
    setQuizPlaybackError(null);
    setScreen({ name: "results" });
  };

  const onPickOption = (option: string) => {
    if (!currentQuestion || revealed) return;

    Keyboard.dismiss();
    stopTimer();
    setRevealed(true);
    setPickedOption(option);

    if (option === currentQuestion.correctAnswer) {
      setScore((s) => s + 1);
    }
  };

  const onSubmitYear = () => {
    if (!currentQuestion || revealed) return;

    const guess = parseInt(yearInput.trim(), 10);
    stopTimer();
    setRevealed(true);

    if (Number.isNaN(guess)) {
      setYearWasCorrect(false);
      return;
    }

    const correctYear = parseInt(currentQuestion.correctAnswer, 10);
    const ok = guess === correctYear;
    setYearWasCorrect(ok);
    if (ok) setScore((s) => s + 1);
  };

  useEffect(() => {
    const hydrateAuth = async () => {
      const stored = await getStoredHostJwt();
      if (stored) {
        setHostJwt(stored);
      }
    };

    void hydrateAuth();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const url = window.location.href;
    const hasRedirectParams =
      Boolean(readAuthCode(url)) ||
      Boolean(readJoinCode(url)) ||
      Boolean(readQueryParam(url, "state")) ||
      Boolean(readQueryParam(url, "error"));
    if (!hasRedirectParams) {
      return;
    }

    void handleAuthRedirect(url).finally(() => {
      const parsed = new URL(window.location.href);
      for (const key of [
        "auth_code",
        "code",
        "state",
        "error",
        "joinCode",
        "sessionId",
      ]) {
        parsed.searchParams.delete(key);
      }
      const nextPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      window.history.replaceState({}, document.title, nextPath || "/");
    });
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener("url", (event) => {
      void handleAuthRedirect(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        void handleAuthRedirect(url);
      }
    });

    return () => {
      sub.remove();
    };
  }, [pendingAuthState]);

  useEffect(() => {
    if (screen.name === "choose" && hasAuth) {
      void loadChoosePlaylists();
    }
  }, [screen.name, hasAuth]);

  useEffect(() => {
    return () => {
      if (chooseResolveAbortRef.current) {
        chooseResolveAbortRef.current.abort();
        chooseResolveAbortRef.current = null;
      }
      if (chooseResolveRateLimitTimerRef.current) {
        clearInterval(chooseResolveRateLimitTimerRef.current);
        chooseResolveRateLimitTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (screen.name === "quiz" && quizSessionId) {
      void loadNextQuestion();
    }
  }, [screen.name, qIndex, quizSessionId]);

  useEffect(() => {
    if (screen.name !== "quiz") {
      stopTimer();
      void stopAndUnload();
      setQuizPlaybackError(null);
    }
  }, [screen.name]);

  useEffect(() => {
    // Preload logo once to avoid visible reload while navigating between screens.
    Asset.fromModule(require("../../assets/logo.png")).downloadAsync().catch(() => {
      // Ignore preload failures, UI can still render via normal require path.
    });
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
    console.info(
      `[auth] configured redirect_uri mobile=${SPOTIFY_REDIRECT_URI} web=${SPOTIFY_REDIRECT_URI_WEB}`,
    );
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    screen,
    setScreen,
    ensureSpotifyLogin,
    hasAuth,
    authBusy,
    loginPending,
    authError,
    startSpotifyLogin,

    playlists,
    selectedPlaylistIndex,
    selectedPlaylist,
    playlistLoading,
    playlistError,
    carouselRef,
    setSelectedPlaylistIndex,
    beginQuizForPlaylist,

    playlistIdInput,
    setPlaylistIdInput,
    setPlaylistError,
    apiContext,

    currentQuestion,
    qIndex,
    setQIndex,
    score,
    revealed,
    pickedOption,
    yearInput,
    setYearInput,
    yearWasCorrect,
    timerAnim,
    timerBarW,
    setTimerBarW,
    finishQuiz,
    onPickOption,
    onSubmitYear,
    stopAndUnload,
    quizPlaybackError,

    mpRole,
    setMpRole,
    mpLobby,
    mpQuestion,
    mpCorrectAnswer,
    mpJoinCodeInput,
    setMpJoinCodeInput,
    mpJoinError,
    mpPlayerName,
    setMpPlayerName,
    mpPlayerAvatarDataUrl,
    setMpPlayerAvatarDataUrl,
    mpHostPlaylistId,
    setMpHostPlaylistId,
    mpYearAnswer,
    setMpYearAnswer,
    mpPlayerAnswered,
    mpPlayerContinued,
    mpAllAnswered,
    mpTimeUp,
    mpPlaybackError,
    mpReadyCount,
    mpAllContinued,
    createHostLobby,
    hostStartRound,
    hostReveal,
    joinAsPlayer,
    playerAnswer,
    playerContinue,
    pickPlayerAvatarFromCamera,
    pickPlayerAvatarFromLibrary,
    resetMultiplayerState,
  };
}

export type BeatBrainController = ReturnType<typeof useBeatBrainController>;
