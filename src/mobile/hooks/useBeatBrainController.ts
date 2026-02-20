import { Asset } from "expo-asset";
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
import { CURATED_PLAYLISTS } from "../../shared/data/curatedPlaylists";
import { ApiHttpError, type ApiClientContext } from "../../shared/net/apiClient";
import {
  completeSpotifyCallback,
  consumeAuthResult,
  createQuizSession,
  deleteQuizSession,
  loadNextQuizQuestion,
  startSpotifyAuth,
  startSpotifyPlayback,
} from "../../shared/net/beatbrainApi";
import { getStoredHostJwt, setStoredHostJwt } from "../../shared/net/authStorage";
import type { LobbyState, PlaylistCard, QuizQuestion, Screen } from "../../shared/types/app";

WebBrowser.maybeCompleteAuthSession();

const MAX_AVATAR_DATA_URL_LENGTH = 200_000;
const MIN_QUESTION_COUNT = 10;
const MAX_QUESTION_COUNT = 100;

function clampQuestionCount(value: number) {
  return Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, Math.round(value)));
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

  if (SPOTIFY_REDIRECT_URI !== "beatbrain-login://callback") {
    throw new Error("Invalid EXPO_PUBLIC_SPOTIFY_REDIRECT_URI. Use beatbrain-login://callback.");
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

type LastQuizConfig = {
  playlistId: string;
  playlistTitle: string;
  questionCount: number;
  decadeTag?: string;
};

export function useBeatBrainController() {
  const [screen, setScreen] = useState<Screen>({ name: "start" });
  const [hostJwt, setHostJwt] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [loginPending, setLoginPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingAuthState, setPendingAuthState] = useState<string | null>(null);

  const playlists = CURATED_PLAYLISTS;
  const [selectedPlaylistIndex, setSelectedPlaylistIndex] = useState(0);
  const selectedPlaylist = playlists[selectedPlaylistIndex] ?? null;
  const [playlistIdInput, setPlaylistIdInput] = useState("");
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(10);

  const carouselRef = useRef<FlatList<PlaylistCard>>(null);

  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [pickedOption, setPickedOption] = useState<string | null>(null);
  const [quizPlaybackError, setQuizPlaybackError] = useState<string | null>(null);
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
    void setStoredHostJwt(jwt);
  };

  const apiContext = useMemo<ApiClientContext>(
    () => ({
      getJwt: () => hostJwt,
      setJwt: (nextJwt) => setPersistedHostJwt(nextJwt),
    }),
    [hostJwt],
  );

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
        setMpJoinError("Could not process selected photo.");
        return;
      }

      const mimeType =
        asset?.mimeType && asset.mimeType.startsWith("image/") ? asset.mimeType : "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${base64}`;
      if (dataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
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
      const authCode = readAuthCode(url);
      const code = readQueryParam(url, "code");
      const state = readQueryParam(url, "state");
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
    } catch {
      setAuthError("Spotify login failed.");
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

      const data = await startSpotifyAuth(clientType, {
        redirectOrigin: Platform.OS === "web" ? window.location.origin : undefined,
      });

      const serverRedirectUri = typeof data.redirectUri === "string" ? data.redirectUri : redirectUri;
      const authReturnUrl = Platform.OS === "web" ? window.location.origin : serverRedirectUri;

      setPendingAuthState(data.state ?? null);
      if (!data.authorizeUrl) {
        throw new Error("Spotify authorize URL missing");
      }

      const authResult = await WebBrowser.openAuthSessionAsync(data.authorizeUrl, authReturnUrl);
      if (authResult.type === "success" && authResult.url) {
        await handleAuthRedirect(authResult.url);
        return;
      }

      if (authResult.type === "cancel" || authResult.type === "dismiss") {
        setAuthError("Spotify login cancelled.");
      }

      setLoginPending(false);
      setPendingAuthState(null);
    } catch {
      setAuthError("Spotify login failed.");
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

  const beginQuizForPlaylist = async (
    playlistId: string,
    playlistTitle: string,
    decadeTag?: string,
    forceQuestionCount?: number,
  ) => {
    const normalizedPlaylistId = (playlistId ?? "").trim();
    if (!normalizedPlaylistId) {
      setPlaylistError("Playlist ID missing.");
      return;
    }

    const effectiveQuestionCount = clampQuestionCount(forceQuestionCount ?? questionCount);
    setQuestionCount(effectiveQuestionCount);
    setPlaylistError(null);

    resetQuestionUi();
    setCurrentQuestion(null);
    setScore(0);
    setQIndex(0);
    setTotalQuestions(effectiveQuestionCount);
    setQuizPlaybackError(null);

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
        setPlaylistError(error.message || "Could not create quiz session.");
      } else {
        setPlaylistError("Could not create quiz session.");
      }
    }
  };

  const beginQuizFromCreate = async () => {
    const playlistId = playlistIdInput.trim();
    await beginQuizForPlaylist(playlistId, playlistId || "Custom Playlist");
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
    resetQuestionUi();
    startTimer();

    const trackUri = typeof question?.correctTrackUri === "string" ? question.correctTrackUri : "";
    if (trackUri) {
      try {
        await startSpotifyPlayback(apiContext, trackUri);
      } catch (error) {
        setQuizPlaybackError(toPlaybackErrorMessage(error));
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
    questionCount,
    setQuestionCount: (value: number) => setQuestionCount(clampQuestionCount(value)),

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
    nextOrFinish,
    quizPlaybackError,

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

