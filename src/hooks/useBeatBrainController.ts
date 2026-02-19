// BB_CONTROLLER_OK
import { Audio } from "expo-av";
import { Asset } from "expo-asset";
import * as SecureStore from "expo-secure-store";
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
import type { ApiClientContext } from "../services/apiClient";
import {
  completeSpotifyCallback,
  consumeAuthResult,
  createQuizSession,
  deleteQuizSession,
  loadNextQuizQuestion,
  resolveChoosePlaylists,
  startSpotifyAuth,
} from "../services/beatbrainApi";
import { getStoredHostJwt, setStoredHostJwt } from "../services/authStorage";
import type { LobbyState, PlaylistCard, QuizQuestion, Screen } from "../types/app";

console.log("BB_CONTROLLER_VERSION", "FIX-2026-02-19-2030");

WebBrowser.maybeCompleteAuthSession();

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

  const carouselRef = useRef<FlatList<PlaylistCard>>(null);

  const [playlistIdInput, setPlaylistIdInput] = useState("");

  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);

  const [revealed, setRevealed] = useState(false);
  const [pickedOption, setPickedOption] = useState<string | null>(null);
  const [yearInput, setYearInput] = useState("");
  const [yearWasCorrect, setYearWasCorrect] = useState<boolean | null>(null);

  const timerAnim = useRef(new Animated.Value(1)).current;
  const [timerBarW, setTimerBarW] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const hasAuth = Boolean(hostJwt);
  const [mpRole, setMpRole] = useState<"none" | "host" | "player">("none");
  const [mpLobby, setMpLobby] = useState<LobbyState | null>(null);
  const [mpQuestion, setMpQuestion] = useState<QuizQuestion | null>(null);
  const [mpCorrectAnswer, setMpCorrectAnswer] = useState<string | null>(null);
  const [mpJoinCodeInput, setMpJoinCodeInput] = useState("");
  const [mpPlayerName, setMpPlayerName] = useState("Player");
  const [mpPlayerIcon, setMpPlayerIcon] = useState("🙂");
  const [mpHostPlaylistId, setMpHostPlaylistId] = useState(PLAYLIST_IDS[0]?.id ?? "");
  const [mpHostQuizSessionId, setMpHostQuizSessionId] = useState<string | null>(null);
  const [mpYearAnswer, setMpYearAnswer] = useState("");

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

  const resetMultiplayerState = () => {
    setMpRole("none");
    setMpLobby(null);
    setMpQuestion(null);
    setMpCorrectAnswer(null);
    setMpHostQuizSessionId(null);
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
    socket.on("round:question", (payload: { question: QuizQuestion }) => {
      setMpQuestion(payload.question);
      setMpCorrectAnswer(null);
      setMpYearAnswer("");
    });
    socket.on("round:reveal", (payload: { correctAnswer: string; state: LobbyState }) => {
      setMpCorrectAnswer(payload.correctAnswer);
      setMpLobby(payload.state);
    });
    socket.on("game:ended", (state: LobbyState) => {
      setMpLobby(state);
      setMpQuestion(null);
    });

    return socket;
  };

  const createHostLobby = () => {
    if (!hostJwt) return;
    const socket = connectSocket();
    socket.emit("host:createLobby", { hostJwt });
  };

  const joinAsPlayer = () => {
    const socket = connectSocket();
    socket.emit("player:join", {
      joinCode: mpJoinCodeInput.trim().toUpperCase(),
      name: mpPlayerName,
      icon: mpPlayerIcon,
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
    if (!mpLobby?.joinCode) return;
    const socket = connectSocket();
    socket.emit("player:answer", {
      joinCode: mpLobby.joinCode,
      answer,
    });
  };

  const stopAndUnload = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      }
    } catch {
      // ignore
    }
    soundRef.current = null;
  };

  const playPreview = async (previewUrl: string | null) => {
    await stopAndUnload();
    if (!previewUrl) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true },
      );
      soundRef.current = sound;
    } catch {
      soundRef.current = null;
    }
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

    setPlaylistLoading(true);
    setPlaylistError(null);
    try {
      const next = await resolveChoosePlaylists(
        apiContext,
        PLAYLIST_IDS.map((p) => p.id),
      );

      if (!next.length) {
        throw new Error("No Spotify playlists configured");
      }

      setPlaylists(next);
      setSelectedPlaylistIndex(0);
    } catch {
      setPlaylistError("Playlists konnten nicht von Spotify geladen werden.");
    } finally {
      setPlaylistLoading(false);
    }
  };

  const handleAuthRedirect = async (url: string) => {
    try {
      const authCode = readAuthCode(url);
      const code = readQueryParam(url, "code");
      const state = readQueryParam(url, "state");
      const oauthError = readQueryParam(url, "error");

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

      if (code && !state) {
        setScreen({ name: "multiplayer" });
        setMpRole("player");
        setMpJoinCodeInput(code.toUpperCase());
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
        console.info(
          `[auth] start clientType=${clientType} redirect_uri=${redirectUri}`,
        );
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
    resetPerQuestionUi();
    await playPreview(data.question.trackPreviewUrl ?? null);
    startTimer();
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
    const authCode = readAuthCode(url);
    if (!authCode) {
      return;
    }

    void handleAuthRedirect(url).finally(() => {
      const parsed = new URL(window.location.href);
      parsed.searchParams.delete("auth_code");
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
    if (screen.name === "choose") {
      loadChoosePlaylists();
    }
  }, [screen.name, hostJwt]);

  useEffect(() => {
    if (screen.name === "quiz" && quizSessionId) {
      loadNextQuestion();
    }
  }, [screen.name, qIndex, quizSessionId]);

  useEffect(() => {
    if (screen.name !== "quiz") {
      stopTimer();
      stopAndUnload();
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

    mpRole,
    setMpRole,
    mpLobby,
    mpQuestion,
    mpCorrectAnswer,
    mpJoinCodeInput,
    setMpJoinCodeInput,
    mpPlayerName,
    setMpPlayerName,
    mpPlayerIcon,
    setMpPlayerIcon,
    mpHostPlaylistId,
    setMpHostPlaylistId,
    mpYearAnswer,
    setMpYearAnswer,
    createHostLobby,
    hostStartRound,
    hostReveal,
    joinAsPlayer,
    playerAnswer,
    resetMultiplayerState,
  };
}

export type BeatBrainController = ReturnType<typeof useBeatBrainController>;




