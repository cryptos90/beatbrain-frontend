import { Asset } from "expo-asset";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, Keyboard, Linking, Platform } from "react-native";
import { io, type Socket } from "socket.io-client";
import { TIMER_SECONDS } from "../../constants/app";
import {
  API_BASE_URL,
  SPOTIFY_REDIRECT_URI,
  SPOTIFY_REDIRECT_URI_WEB,
  SPOTIFY_REDIRECT_URI_WEB_FALLBACK,
} from "../../shared/config";
import { ApiHttpError, type ApiClientContext } from "../../shared/net/apiClient";
import {
  completeSpotifyCallback,
  consumeAuthResult,
  createQuizSession,
  deleteQuizSession,
  getSpotifySdkAccessToken,
  getChoosePlaylists,
  loadNextQuizQuestion,
  startSpotifyPlayback,
  startSpotifyAuth,
} from "../../shared/net/beatbrainApi";
import { getStoredHostJwt, setStoredHostJwt } from "../../shared/net/authStorage";
import type { LobbyState, PlaylistCard, QuizQuestion, Screen } from "../../shared/types/app";
import {
  SpotifyAppRemoteError,
  disconnectSpotifyAppRemote,
  openSpotifyApp,
  playTrackViaSpotifyAppRemote,
} from "../services/spotifyAppRemote";

WebBrowser.maybeCompleteAuthSession();

const MAX_AVATAR_DATA_URL_LENGTH = 200_000;
const MIN_QUESTION_COUNT = 10;
const MAX_QUESTION_COUNT = 100;
const QUESTION_COUNT_STEP = 10;
const NATIVE_SPOTIFY_REDIRECT_URI_FALLBACK = "beatbrain-login://callback";

function clampQuestionCount(value: number) {
  const normalized = Number.isFinite(value) ? value : MIN_QUESTION_COUNT;
  const clamped = Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, normalized));
  const rounded = Math.round(clamped / QUESTION_COUNT_STEP) * QUESTION_COUNT_STEP;
  return Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, rounded));
}

function resolveSpotifyRedirectUri(platform: string): string {
  if (platform === "web") {
    const value = SPOTIFY_REDIRECT_URI_WEB.trim();
    if (!value || value.startsWith("exp://")) {
      return SPOTIFY_REDIRECT_URI_WEB_FALLBACK;
    }

    try {
      const parsed = new URL(value);
      if (parsed.protocol === "https:" && parsed.pathname.endsWith("/callback")) {
        return value;
      }
      if (
        parsed.protocol === "http:" &&
        (parsed.hostname === "127.0.0.1" || parsed.hostname === "::1" || parsed.hostname === "[::1]") &&
        parsed.pathname === "/auth/spotify/callback"
      ) {
        return value;
      }
      return SPOTIFY_REDIRECT_URI_WEB_FALLBACK;
    } catch {
      return SPOTIFY_REDIRECT_URI_WEB_FALLBACK;
    }
  }

  const nativeRedirect = SPOTIFY_REDIRECT_URI.trim();
  if (nativeRedirect !== NATIVE_SPOTIFY_REDIRECT_URI_FALLBACK) {
    if (__DEV__) {
      console.warn(
        `[auth] invalid EXPO_PUBLIC_SPOTIFY_REDIRECT_URI (${nativeRedirect || "<empty>"}), fallback=${NATIVE_SPOTIFY_REDIRECT_URI_FALLBACK}`,
      );
    }
    return NATIVE_SPOTIFY_REDIRECT_URI_FALLBACK;
  }

  return nativeRedirect;
}

async function buildAvatarDataUrlFromAssetUri(assetUri: string) {
  const attempts = [
    { size: 256, compress: 0.55 },
    { size: 192, compress: 0.45 },
  ];

  for (const attempt of attempts) {
    const manipulated = await ImageManipulator.manipulateAsync(
      assetUri,
      [{ resize: { width: attempt.size, height: attempt.size } }],
      {
        compress: attempt.compress,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );

    if (!manipulated.base64) {
      continue;
    }

    const dataUrl = `data:image/jpeg;base64,${manipulated.base64}`;
    if (dataUrl.length <= MAX_AVATAR_DATA_URL_LENGTH) {
      return dataUrl;
    }
  }

  return null;
}

function readQueryParam(url: string, key: string) {
  const [, queryString = ""] = url.split("?");
  const params = new URLSearchParams(queryString);
  return params.get(key);
}

function readAuthCode(url: string) {
  return readQueryParam(url, "code") ?? readQueryParam(url, "auth_code");
}

function readState(url: string) {
  return readQueryParam(url, "state");
}

function readJoinCode(url: string) {
  const raw =
    readQueryParam(url, "joinCode") ??
    readQueryParam(url, "sessionId") ??
    readQueryParam(url, "code");
  const normalized = String(raw ?? "").trim().toUpperCase();
  return normalized || null;
}

async function checkBackendHealth(apiBase: string, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${apiBase}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function toPlaybackErrorMessage(error: unknown): string | null {
  if (error instanceof SpotifyAppRemoteError) {
    if (error.code === "MODULE_MISSING") {
      return null;
    }
    if (error.code === "IOS_ONLY") {
      return null;
    }
    if (error.message) {
      return error.message;
    }
    return "Spotify App Remote playback failed.";
  }

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

function toReauthMessage(error: ApiHttpError) {
  const details = (error.details ?? {}) as any;
  const reason = String(details?.error?.reason ?? details?.reason ?? "").trim();
  const spotifyMessage = String(
    details?.error?.spotifyMessage ?? details?.spotifyMessage ?? "",
  ).trim();
  const parts = [reason, spotifyMessage].filter(Boolean);
  return parts.join(" - ");
}

function toShortUiMessage(raw: string | null | undefined, fallback: string) {
  const normalized = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return fallback;
  }
  return normalized.slice(0, 180);
}

type ChooseViewMode = "normal" | "error";

type LastQuizConfig = {
  playlistId: string;
  playlistTitle: string;
  questionCount: number;
  decadeTag?: string;
};

export function useBeatBrainController() {
  const [screen, setScreen] = useState<Screen>({ name: "start" });
  const [hostJwt, setHostJwt] = useState<string | null>(null);
  const appRemoteTokenRef = useRef<{ accessToken: string; expiresAt: number } | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [loginPending, setLoginPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingAuthState, setPendingAuthState] = useState<string | null>(null);

  const [playlists, setPlaylists] = useState<PlaylistCard[]>([]);
  const [selectedPlaylistIndex, setSelectedPlaylistIndex] = useState(0);
  const selectedPlaylist = playlists[selectedPlaylistIndex] ?? null;
  const [playlistIdInput, setPlaylistIdInput] = useState("");
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [reauthRequired, setReauthRequired] = useState(false);
  const [reauthMessage, setReauthMessage] = useState<string | null>(null);
  const [chooseViewMode, setChooseViewMode] = useState<ChooseViewMode>("normal");
  const [chooseLoading, setChooseLoading] = useState(false);
  const [chooseRetryAfterSeconds, setChooseRetryAfterSeconds] = useState<number | null>(null);
  const [chooseReloadNonce, setChooseReloadNonce] = useState(0);
  const [questionCount, setQuestionCount] = useState(10);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);
  const isStartingQuizRef = useRef(false);

  const carouselRef = useRef<FlatList<PlaylistCard>>(null);

  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [pickedOption, setPickedOption] = useState<string | null>(null);
  const [quizPlaybackError, setQuizPlaybackError] = useState<string | null>(null);
  const [quizPlaybackCanOpenSpotify, setQuizPlaybackCanOpenSpotify] = useState(false);
  const [lastQuizConfig, setLastQuizConfig] = useState<LastQuizConfig | null>(null);

  const timerAnim = useRef(new Animated.Value(1)).current;
  const [timerBarW, setTimerBarW] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const [mpLobby, setMpLobby] = useState<LobbyState | null>(null);
  const [mpQuestion, setMpQuestion] = useState<QuizQuestion | null>(null);
  const [mpCorrectAnswer, setMpCorrectAnswer] = useState<string | null>(null);
  const [mpJoinCodeInput, setMpJoinCodeInput] = useState("");
  const [mpJoinError, setMpJoinError] = useState<string | null>(null);
  const [mpPlayerName, setMpPlayerName] = useState("Player");
  const [mpPlayerAvatarDataUrl, setMpPlayerAvatarDataUrl] = useState("");
  const [mpPlayerAnswered, setMpPlayerAnswered] = useState(false);
  const [mpPlayerContinued, setMpPlayerContinued] = useState(false);
  const [mpAllAnswered, setMpAllAnswered] = useState(false);
  const [mpTimeUp, setMpTimeUp] = useState(false);
  const [mpAllContinued, setMpAllContinued] = useState(false);

  const hasAuth = Boolean(hostJwt);

  const setPersistedHostJwt = (jwt: string | null) => {
    setHostJwt(jwt);
    appRemoteTokenRef.current = null;
    void setStoredHostJwt(jwt);
  };

  const apiContext = useMemo<ApiClientContext>(
    () => ({
      getJwt: () => hostJwt,
      setJwt: (nextJwt) => setPersistedHostJwt(nextJwt),
    }),
    [hostJwt],
  );

  const clearChooseErrorState = () => {
    setPlaylistError(null);
    setReauthRequired(false);
    setReauthMessage(null);
    setChooseRetryAfterSeconds(null);
    setChooseViewMode("normal");
  };

  const reloadChoosePlaylists = () => {
    setChooseReloadNonce((value) => value + 1);
  };

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
      setRevealed(true);
    }, TIMER_SECONDS * 1000);
  };

  const resetQuestionUi = () => {
    setRevealed(false);
    setPickedOption(null);
  };

  const cleanupQuizSession = async () => {
    stopTimer();
    if (!quizSessionId) {
      return;
    }

    try {
      await deleteQuizSession(apiContext, quizSessionId);
    } catch {
      // Ignore cleanup errors.
    }
    setQuizSessionId(null);
  };

  const resetMultiplayerState = () => {
    setMpLobby(null);
    setMpQuestion(null);
    setMpCorrectAnswer(null);
    setMpJoinError(null);
    setMpPlayerAnswered(false);
    setMpPlayerContinued(false);
    setMpAllAnswered(false);
    setMpTimeUp(false);
    setMpAllContinued(false);

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const connectSocket = () => {
    if (socketRef.current) {
      return socketRef.current;
    }

    const socket = io(API_BASE_URL, {
      transports: ["websocket"],
    });

    socket.on("lobby:state", (state: LobbyState) => {
      setMpLobby(state);
      if (state.status === "results") {
        setScreen({ name: "multiplayerResults" });
      } else {
        setScreen({ name: "multiplayerQuiz" });
      }
    });

    socket.on("round:question", (payload: { question: QuizQuestion; timerMs?: number }) => {
      setMpQuestion(payload.question);
      setMpCorrectAnswer(null);
      setMpPlayerAnswered(false);
      setMpPlayerContinued(false);
      setMpAllAnswered(false);
      setMpTimeUp(false);
      setMpAllContinued(false);
      setScreen({ name: "multiplayerQuiz" });
    });

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

    socket.on("round:allContinued", () => {
      setMpAllContinued(true);
    });

    socket.on("game:ended", (state: LobbyState) => {
      setMpLobby(state);
      setMpQuestion(null);
      setMpCorrectAnswer(null);
      setMpPlayerAnswered(false);
      setMpPlayerContinued(false);
      setMpAllAnswered(false);
      setMpTimeUp(false);
      setMpAllContinued(false);
      setScreen({ name: "multiplayerResults" });
    });

    socket.on("game:restarted", (state: LobbyState) => {
      setMpLobby(state);
      setMpQuestion(null);
      setMpCorrectAnswer(null);
      setMpPlayerAnswered(false);
      setMpPlayerContinued(false);
      setMpAllAnswered(false);
      setMpTimeUp(false);
      setMpAllContinued(false);
      setScreen({ name: "multiplayerQuiz" });
    });

    socket.on("session:returnedToMenu", (state: LobbyState) => {
      setMpLobby(state);
      setMpQuestion(null);
      setMpCorrectAnswer(null);
      setMpPlayerAnswered(false);
      setMpPlayerContinued(false);
      setMpAllAnswered(false);
      setMpTimeUp(false);
      setMpAllContinued(false);
      setScreen({ name: "multiplayerQuiz" });
    });

    socket.on("exception", (payload: any) => {
      const message =
        typeof payload?.message === "string"
          ? payload.message
          : Array.isArray(payload?.message) && typeof payload.message[0] === "string"
            ? payload.message[0]
            : "Socket request failed.";
      setMpJoinError(message);
    });

    socketRef.current = socket;
    return socket;
  };

  const pickPlayerAvatar = async (source: "camera" | "library") => {
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setMpJoinError("Camera permission missing.");
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setMpJoinError("Media library permission missing.");
          return;
        }
      }

      const commonOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
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
      const assetUri = typeof asset?.uri === "string" ? asset.uri : "";
      if (!assetUri) {
        setMpJoinError("Could not process selected photo.");
        return;
      }

      const dataUrl = await buildAvatarDataUrlFromAssetUri(assetUri);
      if (!dataUrl) {
        setMpJoinError("Avatar too large.");
        return;
      }

      setMpPlayerAvatarDataUrl(dataUrl);
      setMpJoinError(null);
    } catch {
      setMpJoinError("Photo selection failed.");
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
      setMpJoinError("Session ID is required.");
      return;
    }
    if (!name || name.length > 20) {
      setMpJoinError("Name must be 1 to 20 characters.");
      return;
    }
    if (!avatarDataUrl) {
      setMpJoinError("Photo is required.");
      return;
    }
    if (avatarDataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
      setMpJoinError("Avatar too large.");
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

  const playerAnswer = (answer: string) => {
    if (!mpLobby?.joinCode || mpPlayerAnswered) {
      return;
    }

    const normalizedAnswer = String(answer ?? "").trim();
    if (!normalizedAnswer) {
      return;
    }

    setMpPlayerAnswered(true);
    const socket = connectSocket();
    socket.emit("player:answer", {
      joinCode: mpLobby.joinCode,
      answer: normalizedAnswer,
    });
  };

  const playerContinue = () => {
    if (!mpLobby?.joinCode || mpPlayerContinued) {
      return;
    }

    setMpPlayerContinued(true);
    const socket = connectSocket();
    socket.emit("player:continue", {
      joinCode: mpLobby.joinCode,
    });
  };

  const handleAuthRedirect = async (url: string) => {
    try {
      const authCode = readQueryParam(url, "auth_code");
      const code = readQueryParam(url, "code");
      const state = readState(url);
      const oauthError = readQueryParam(url, "error");
      const joinCode = readJoinCode(url);

      if (oauthError) {
        setAuthError("Spotify login failed.");
        setLoginPending(false);
        setPendingAuthState(null);
        return;
      }

      if (joinCode && !state && !code) {
        resetMultiplayerState();
        setMpJoinCodeInput(joinCode);
        setScreen({ name: "multiplayerJoin" });
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

      if (!code || !state || !pendingAuthState) {
        return;
      }

      if (state !== pendingAuthState) {
        setAuthError("Spotify state mismatch.");
        setLoginPending(false);
        setPendingAuthState(null);
        return;
      }

      setAuthBusy(true);
      const exchange = await completeSpotifyCallback(code, state);
      const exchangeCode = typeof exchange.authCode === "string" ? exchange.authCode : "";
      if (!exchangeCode) {
        throw new Error("Missing auth exchange code");
      }

      const data = await consumeAuthResult(exchangeCode);
      setPersistedHostJwt(data.appJwt ?? null);
      setPendingAuthState(null);
      setAuthError(null);
      setLoginPending(false);
    } catch (error) {
      if (__DEV__) {
        console.error("[auth] login failed", error);
      }
      const message =
        error instanceof Error && error.message ? error.message : "Spotify login failed.";
      setAuthError(message);
      setLoginPending(false);
      setPendingAuthState(null);
    } finally {
      setAuthBusy(false);
    }
  };

  const startSpotifyLogin = async () => {
    setReauthRequired(false);
    setReauthMessage(null);
    setPlaylistError(null);
    setAuthBusy(true);
    setLoginPending(true);
    setAuthError(null);

    try {
      const backendHealthy = await checkBackendHealth(API_BASE_URL);
      if (!backendHealthy) {
        setAuthError(
          `Backend nicht erreichbar: ${API_BASE_URL}. Bitte start-backend.bat ausführen.`,
        );
        setAuthBusy(false);
        setLoginPending(false);
        return;
      }

      console.log("[auth] startSpotifyLogin begin");
      console.log("[auth] API_BASE_URL", API_BASE_URL);

      const clientType = Platform.OS === "web" ? "web" : "mobile";
      const redirectUri = resolveSpotifyRedirectUri(Platform.OS);
      const backendStartUrl = `${API_BASE_URL}/auth/spotify/start?client=${encodeURIComponent(clientType)}`;
      console.log("[auth] calling backend start url=", backendStartUrl);

      let data;
      try {
        data = await startSpotifyAuth(clientType, {
          redirectOrigin: Platform.OS === "web" ? window.location.origin : undefined,
        });
      } catch (error) {
        if (__DEV__) {
          console.error("[auth] start endpoint failed", error);
        }
        setAuthError(`Network request failed calling ${backendStartUrl}. Backend läuft?`);
        setLoginPending(false);
        setPendingAuthState(null);
        return;
      }
      const expectedState = typeof data.state === "string" ? data.state : "";

      const serverRedirectUri = typeof data.redirectUri === "string" ? data.redirectUri : redirectUri;
      const authReturnUrl = Platform.OS === "web" ? window.location.origin : serverRedirectUri;

      setPendingAuthState(expectedState || null);
      if (!data.authorizeUrl) {
        throw new Error("Spotify authorize URL missing");
      }

      console.log("[auth] opening auth session", data.authorizeUrl);
      const authResult = await WebBrowser.openAuthSessionAsync(data.authorizeUrl, authReturnUrl);
      console.log(`[auth] auth session result type=${authResult.type}`);
      if (authResult.type === "success" && authResult.url) {
        const code = readAuthCode(authResult.url);
        const returnedState = readState(authResult.url);
        const stateMatches =
          expectedState && returnedState ? returnedState === expectedState : true;
        if (__DEV__) {
          const codeLength = code?.length ?? 0;
          console.log(
            `[auth] redirect parsed codePresent=${Boolean(code)} codeLen=${codeLength} statePresent=${Boolean(returnedState)} stateMatch=${stateMatches}`,
          );
        }

        if (!code) {
          setAuthError("Login fehlgeschlagen: Kein Code in Redirect-URL.");
          setLoginPending(false);
          setPendingAuthState(null);
          return;
        }

        if (expectedState && returnedState && returnedState !== expectedState) {
          setAuthError("Login fehlgeschlagen: State mismatch.");
          setLoginPending(false);
          setPendingAuthState(null);
          return;
        }

        const exchange = await completeSpotifyCallback(
          code,
          returnedState ?? expectedState ?? "",
        );
        let appJwt: string | null = null;
        let resolvedViaConsume = false;

        if (typeof exchange.appJwt === "string" && exchange.appJwt.trim()) {
          appJwt = exchange.appJwt.trim();
        } else if (typeof exchange.authCode === "string" && exchange.authCode.trim()) {
          const auth = await consumeAuthResult(exchange.authCode);
          if (typeof auth.appJwt === "string" && auth.appJwt.trim()) {
            appJwt = auth.appJwt.trim();
          }
          resolvedViaConsume = true;
        }

        if (!appJwt) {
          throw new Error("Login abgeschlossen, aber Backend lieferte kein appJwt/authCode.");
        }

        setPersistedHostJwt(appJwt);
        if (__DEV__) {
          const exchangeMode = resolvedViaConsume ? "consumeAuthResult" : "exchange";
          console.log(`[auth] ${exchangeMode} ok jwtSet=${Boolean(appJwt)}`);
        }
        setAuthError(null);
        setLoginPending(false);
        setPendingAuthState(null);
        setScreen({ name: "singleMenu" });
        return;
      }

      if (authResult.type === "cancel" || authResult.type === "dismiss") {
        setAuthError("Spotify login cancelled.");
      }

      setLoginPending(false);
      setPendingAuthState(null);
    } catch (error) {
      if (__DEV__) {
        console.error("[auth] login failed", error);
        try {
          console.error("[auth] login failed details", JSON.stringify(error));
        } catch {
          // ignore json stringify errors
        }
      }
      setAuthError(
        error instanceof Error ? error.message || "Login fehlgeschlagen" : String(error),
      );
      setLoginPending(false);
      setPendingAuthState(null);
    } finally {
      setAuthBusy(false);
    }
  };

  const ensureSpotifyLogin = async () => {
    if (hasAuth) {
      return;
    }
    await startSpotifyLogin();
  };

  const retryChooseLoad = async () => {
    clearChooseErrorState();
    reloadChoosePlaylists();
  };

  const reloginChoose = async () => {
    clearChooseErrorState();
    await startSpotifyLogin();
    const storedJwt = await getStoredHostJwt();
    if (storedJwt) {
      setScreen({ name: "choose" });
      reloadChoosePlaylists();
    }
  };

  const beginQuizForPlaylist = async (
    playlistId: string,
    playlistTitle: string,
    decadeTag?: string,
    forceQuestionCount?: number,
  ) => {
    if (isStartingQuizRef.current) {
      return;
    }

    isStartingQuizRef.current = true;
    setIsStartingQuiz(true);
    const normalizedPlaylistId = (playlistId ?? "").trim();
    if (!normalizedPlaylistId) {
      setPlaylistError("Playlist ID missing.");
      if (screen.name === "choose") {
        setChooseViewMode("error");
      }
      setIsStartingQuiz(false);
      return;
    }

    const isChooseScreen = screen.name === "choose";
    const effectiveQuestionCount = clampQuestionCount(forceQuestionCount ?? questionCount);
    setQuestionCount(effectiveQuestionCount);
    if (isChooseScreen) {
      clearChooseErrorState();
    } else {
      setPlaylistError(null);
      setReauthRequired(false);
      setReauthMessage(null);
    }

    resetQuestionUi();
    setCurrentQuestion(null);
    setScore(0);
    setQIndex(0);
    setTotalQuestions(effectiveQuestionCount);
    setQuizPlaybackError(null);
    setQuizPlaybackCanOpenSpotify(false);

    try {
      const session = await createQuizSession(apiContext, {
        playlistId: normalizedPlaylistId,
        questionCount: effectiveQuestionCount,
        decadeTag,
      });

      setQuizSessionId(typeof session.sessionId === "string" ? session.sessionId : null);
      setLastQuizConfig({
        playlistId: normalizedPlaylistId,
        playlistTitle,
        questionCount: effectiveQuestionCount,
        decadeTag,
      });
      setScreen({ name: "quiz", playlistTitle });
    } catch (error) {
      if (error instanceof ApiHttpError) {
        const message = toShortUiMessage(
          error.message,
          "Could not create quiz session.",
        );
        if (error.status === 409) {
          setReauthRequired(true);
          setReauthMessage(
            toShortUiMessage(toReauthMessage(error), "Spotify Login erneuern erforderlich."),
          );
        } else {
          setReauthRequired(false);
          setReauthMessage(null);
        }
        setPlaylistError(message);
      } else {
        setReauthRequired(false);
        setReauthMessage(null);
        setPlaylistError("Could not create quiz session.");
      }
      if (isChooseScreen) {
        setChooseViewMode("error");
      }
    } finally {
      isStartingQuizRef.current = false;
      setIsStartingQuiz(false);
    }
  };

  const beginQuizFromCreate = async () => {
    const playlistId = playlistIdInput.trim();
    await beginQuizForPlaylist(playlistId, playlistId || "Custom Playlist");
  };

  const getValidSpotifySdkToken = async () => {
    const cached = appRemoteTokenRef.current;
    if (cached && cached.accessToken && Date.now() < cached.expiresAt - 30_000) {
      return cached.accessToken;
    }

    const tokenPayload = await getSpotifySdkAccessToken(apiContext);
    const accessToken = String(tokenPayload.accessToken ?? "").trim();
    if (!accessToken) {
      throw new Error("Spotify SDK token unavailable.");
    }

    const expiresInSecondsRaw = Number(tokenPayload.expiresIn ?? 0);
    const expiresInSeconds = Number.isFinite(expiresInSecondsRaw)
      ? Math.max(30, Math.floor(expiresInSecondsRaw))
      : 300;
    appRemoteTokenRef.current = {
      accessToken,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    };
    return accessToken;
  };

  const loadNextQuestion = async () => {
    if (!quizSessionId) {
      return;
    }

    const data = await loadNextQuizQuestion(apiContext, quizSessionId);
    if (data.done) {
      await cleanupQuizSession();
      setCurrentQuestion(null);
      setScreen({ name: "results" });
      return;
    }

    const question = data.question as QuizQuestion;
    setCurrentQuestion(question);
    setQuizPlaybackError(null);
    setQuizPlaybackCanOpenSpotify(false);
    resetQuestionUi();
    startTimer();

    const trackUri = typeof question?.correctTrackUri === "string" ? question.correctTrackUri : "";
    if (trackUri) {
      try {
        const spotifySdkAccessToken = await getValidSpotifySdkToken();
        await playTrackViaSpotifyAppRemote(trackUri, spotifySdkAccessToken);
        setQuizPlaybackError(null);
        setQuizPlaybackCanOpenSpotify(false);
      } catch {
        try {
          await startSpotifyPlayback(apiContext, { trackUri });
          setQuizPlaybackError(null);
          setQuizPlaybackCanOpenSpotify(false);
        } catch (fallbackError) {
          const playbackMessage = toPlaybackErrorMessage(fallbackError);
          setQuizPlaybackError(playbackMessage);
          setQuizPlaybackCanOpenSpotify(Boolean(playbackMessage));
        }
      }
    }
  };

  const leaveQuizToMenu = async () => {
    await cleanupQuizSession();
    setCurrentQuestion(null);
    setScreen({ name: "singleMenu" });
  };

  const onPickOption = (option: string) => {
    if (!currentQuestion || revealed) {
      return;
    }

    Keyboard.dismiss();
    stopTimer();
    setRevealed(true);
    setPickedOption(option);

    if (option === currentQuestion.correctAnswer) {
      setScore((value) => value + 1);
    }
  };

  const submitYearInputAnswer = (rawInput: string) => {
    if (!currentQuestion || revealed) {
      return;
    }

    const normalizedInput = String(rawInput ?? "").trim();
    if (!/^\d{1,4}$/.test(normalizedInput)) {
      return;
    }

    const guess = Number.parseInt(normalizedInput, 10);
    if (!Number.isFinite(guess)) {
      return;
    }

    const payload = currentQuestion.questionObject.payload;
    const toleranceRaw = Number(payload?.toleranceYears ?? 0);
    const toleranceYears =
      Number.isFinite(toleranceRaw) && toleranceRaw >= 0 ? Math.floor(toleranceRaw) : 0;

    const payloadCorrectYearRaw = Number(payload?.correctYear);
    const fallbackCorrectYear = Number.parseInt(String(currentQuestion.correctAnswer ?? ""), 10);
    const correctYear = Number.isFinite(payloadCorrectYearRaw)
      ? payloadCorrectYearRaw
      : Number.isFinite(fallbackCorrectYear)
        ? fallbackCorrectYear
        : NaN;

    if (!Number.isFinite(correctYear)) {
      return;
    }

    Keyboard.dismiss();
    stopTimer();
    setRevealed(true);
    setPickedOption(String(guess));

    if (Math.abs(guess - correctYear) <= toleranceYears) {
      setScore((value) => value + 1);
    }
  };

  const nextOrFinish = async () => {
    if (!quizSessionId) {
      setScreen({ name: "results" });
      return;
    }

    setQIndex((value) => value + 1);
  };

  const restartQuiz = async () => {
    if (!lastQuizConfig) {
      setScreen({ name: "singleMenu" });
      return;
    }

    await beginQuizForPlaylist(
      lastQuizConfig.playlistId,
      lastQuizConfig.playlistTitle,
      lastQuizConfig.decadeTag,
      lastQuizConfig.questionCount,
    );
  };

  const returnToMenu = async () => {
    await cleanupQuizSession();
    setCurrentQuestion(null);
    setScreen({ name: "singleMenu" });
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
    if (!hasAuth || screen.name !== "choose") {
      return;
    }

    let cancelled = false;

    const loadPlaylists = async () => {
      setChooseLoading(true);
      setChooseViewMode("normal");
      setChooseRetryAfterSeconds(null);
      setPlaylistError(null);
      setReauthRequired(false);
      setReauthMessage(null);
      try {
        const resolved = await getChoosePlaylists(apiContext);
        if (cancelled) {
          return;
        }

        if (!resolved.length) {
          setPlaylistError("Keine Playlists gefunden.");
          setReauthRequired(false);
          setReauthMessage(null);
          setChooseViewMode("error");
          setPlaylists([]);
          return;
        }

        const cards = resolved.map((playlist) => ({
          id: playlist.id,
          title: playlist.name || playlist.id,
          imageUrl: playlist.coverUrl || "",
        }));
        setPlaylists(cards);
        setSelectedPlaylistIndex((index) =>
          Math.max(0, Math.min(index, cards.length - 1)),
        );
        setChooseViewMode("normal");
        setReauthRequired(false);
        setReauthMessage(null);
        setPlaylistError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (__DEV__) {
          console.error("[choose] playlist resolve failed", error);
        }

        let message = "Playlists konnten nicht geladen werden.";
        if (error instanceof ApiHttpError) {
          if (error.status === 429) {
            const seconds =
              typeof error.retryAfterSeconds === "number" && Number.isFinite(error.retryAfterSeconds)
                ? Math.max(1, Math.ceil(error.retryAfterSeconds))
                : null;
            setChooseRetryAfterSeconds(seconds);
            setReauthRequired(false);
            setReauthMessage(null);
            message = seconds
              ? `Spotify rate-limited. Try again in ${seconds}s.`
              : "Spotify rate-limited. Try again soon.";
          } else if (error.status === 401) {
            setReauthRequired(false);
            setReauthMessage(null);
            message = "Session abgelaufen, bitte erneut einloggen";
          } else if (error.status === 409) {
            setReauthRequired(true);
            setReauthMessage(
              toShortUiMessage(toReauthMessage(error), "Spotify Login erneuern erforderlich."),
            );
            message = toShortUiMessage(error.message, "Re-login erforderlich.");
          } else if (error.message) {
            setReauthRequired(false);
            setReauthMessage(null);
            message = toShortUiMessage(error.message, "Playlists konnten nicht geladen werden.");
          }
        } else {
          setReauthRequired(false);
          setReauthMessage(null);
        }
        setPlaylistError(message);
        setChooseViewMode("error");
        setPlaylists([]);
      } finally {
        if (!cancelled) {
          setChooseLoading(false);
        }
      }
    };

    void loadPlaylists();

    return () => {
      cancelled = true;
    };
  }, [apiContext, chooseReloadNonce, hasAuth, screen.name]);

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
      for (const key of ["auth_code", "code", "state", "error", "joinCode", "sessionId"]) {
        parsed.searchParams.delete(key);
      }
      const nextPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      window.history.replaceState({}, document.title, nextPath || "/");
    });
  }, [pendingAuthState]);

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
    if (screen.name === "quiz" && quizSessionId) {
      void loadNextQuestion();
    }
  }, [screen.name, qIndex, quizSessionId]);

  useEffect(() => {
    if (screen.name !== "quiz") {
      stopTimer();
      setQuizPlaybackError(null);
      setQuizPlaybackCanOpenSpotify(false);
      void disconnectSpotifyAppRemote();
    }
  }, [screen.name]);

  useEffect(() => {
    Asset.fromModule(require("../../../assets/logo.png")).downloadAsync().catch(() => {
      // Ignore preload failures.
    });
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      stopTimer();
    };
  }, []);

  return {
    screen,
    setScreen,
    apiContext,

    hasAuth,
    authBusy,
    loginPending,
    authError,
    startSpotifyLogin,
    ensureSpotifyLogin,

    playlists,
    selectedPlaylistIndex,
    selectedPlaylist,
    setSelectedPlaylistIndex,
    carouselRef,
    playlistIdInput,
    setPlaylistIdInput,
    playlistError,
    reauthRequired,
    reauthMessage,
    chooseViewMode,
    chooseLoading,
    chooseRetryAfterSeconds,
    questionCount,
    setQuestionCount: (value: number) => setQuestionCount(clampQuestionCount(value)),
    isStartingQuiz,

    retryChooseLoad,
    reloginChoose,
    beginQuizForPlaylist,
    beginQuizFromCreate,
    leaveQuizToMenu,
    restartQuiz,
    returnToMenu,

    currentQuestion,
    qIndex,
    score,
    totalQuestions,
    revealed,
    pickedOption,
    timerAnim,
    timerBarW,
    setTimerBarW,
    onPickOption,
    submitYearInputAnswer,
    nextOrFinish,
    quizPlaybackError,
    quizPlaybackCanOpenSpotify,
    openSpotifyForPlayback: openSpotifyApp,

    mpLobby,
    mpQuestion,
    mpCorrectAnswer,
    mpJoinCodeInput,
    setMpJoinCodeInput,
    mpJoinError,
    mpPlayerName,
    setMpPlayerName,
    mpPlayerAvatarDataUrl,
    mpPlayerAnswered,
    mpPlayerContinued,
    mpAllAnswered,
    mpTimeUp,
    mpAllContinued,
    pickPlayerAvatarFromCamera,
    pickPlayerAvatarFromLibrary,
    joinAsPlayer,
    playerAnswer,
    playerContinue,
    resetMultiplayerState,
  };
}

export type BeatBrainController = ReturnType<typeof useBeatBrainController>;

