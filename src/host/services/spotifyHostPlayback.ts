import { Platform } from "react-native";
import type { ApiClientContext } from "../../shared/net/apiClient";
import { ApiHttpError } from "../../shared/net/apiClient";
import {
  getSpotifyPlayerDevices,
  getSpotifySdkAccessToken,
  playSpotifyTrack,
  transferSpotifyPlayback,
} from "../../shared/net/beatbrainApi";
import { getHostPlaybackErrorMessage } from "./hostPlaybackErrorMessage";

type HostPlaybackResult =
  | { ok: true; mode: "web_sdk" | "fallback" }
  | { ok: false; message: string };

export type HostPlaybackPrimeResult =
  | { ok: true; deviceId: string | null }
  | { ok: false; message: string; code: HostPlaybackErrorCode };

type SpotifyPlayerInit = {
  name: string;
  getOAuthToken: (callback: (token: string) => void) => void;
  volume?: number;
};

type SpotifyPlayerReadyPayload = {
  device_id: string;
};

type SpotifyPlayerErrorPayload = {
  message: string;
};

type SpotifyPlayer = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (eventName: string, callback: (payload?: unknown) => void) => boolean;
  removeListener: (eventName: string, callback?: (payload?: unknown) => void) => boolean;
  activateElement?: () => Promise<void> | void;
};

type HostPlaybackErrorCode =
  | "auth"
  | "initialization"
  | "account"
  | "autoplay"
  | "device_not_ready"
  | "rate_limit"
  | "network"
  | "playback"
  | "sdk_unavailable"
  | "unknown";

type CachedSdkToken = {
  accessToken: string;
  expiresAt: number;
};

declare global {
  interface Window {
    Spotify?: {
      Player: new (init: SpotifyPlayerInit) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

class HostPlaybackError extends Error {
  code: HostPlaybackErrorCode;
  retryAfterSeconds?: number;

  constructor(
    code: HostPlaybackErrorCode,
    message: string,
    options?: { retryAfterSeconds?: number },
  ) {
    super(message);
    this.name = "HostPlaybackError";
    this.code = code;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

const SPOTIFY_WEB_SDK_SRC = "https://sdk.scdn.co/spotify-player.js";
const PLAYER_NAME = "BeatBrain Host";
const PLAYER_READY_TIMEOUT_MS = 7_000;
const DEVICE_DISCOVERY_TIMEOUT_MS = 4_000;
const DEVICE_ACTIVE_TIMEOUT_MS = 6_500;
const DEVICE_POLL_INTERVAL_MS = 350;
const SDK_TOKEN_MIN_VALIDITY_MS = 20_000;

let activeApiContext: ApiClientContext | null = null;
let activeJwtSnapshot: string | null = null;
let sdkScriptPromise: Promise<void> | null = null;
let sdkTokenPromise: Promise<string> | null = null;
let sdkTokenCache: CachedSdkToken | null = null;
let playerInstance: SpotifyPlayer | null = null;
let playerConnectPromise: Promise<string> | null = null;
let playerReadyDeviceId: string | null = null;
let lastPlayerError: string | null = null;
let lastPlayerErrorCode: HostPlaybackErrorCode | null = null;

function isWebRuntime() {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof document !== "undefined";
}

function logPlayback(level: "info" | "warn", event: string, details?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  const logger = level === "warn" ? console.warn : console.info;
  if (details) {
    logger(`[host-playback] ${event}`, details);
    return;
  }

  logger(`[host-playback] ${event}`);
}

function infoPlayback(event: string, details?: Record<string, unknown>) {
  logPlayback("info", event, details);
}

function warnPlayback(event: string, details?: Record<string, unknown>) {
  logPlayback("warn", event, details);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createPlaybackError(
  code: HostPlaybackErrorCode,
  message: string,
  options?: { retryAfterSeconds?: number },
) {
  return new HostPlaybackError(code, message, options);
}

function rememberPlayerError(code: HostPlaybackErrorCode, message: string) {
  const normalized = String(message ?? "").trim();
  if (!normalized) {
    return;
  }

  lastPlayerError = normalized;
  lastPlayerErrorCode = code;
}

function clearPlayerError() {
  lastPlayerError = null;
  lastPlayerErrorCode = null;
}

function resetPlayerState(options?: { clearError?: boolean; clearToken?: boolean }) {
  try {
    playerInstance?.disconnect();
  } catch {
    // Ignore disconnect failures while resetting the browser player.
  }

  playerInstance = null;
  playerConnectPromise = null;
  playerReadyDeviceId = null;

  if (options?.clearToken) {
    sdkTokenCache = null;
    sdkTokenPromise = null;
  }

  if (options?.clearError) {
    clearPlayerError();
  }
}

function mapMessageToCode(message: string) {
  const normalized = String(message ?? "").trim().toLowerCase();
  if (!normalized) {
    return "unknown" as const;
  }

  if (
    normalized.includes("authentication failed") ||
    normalized.includes("authorization failed") ||
    normalized.includes("host must authenticate with spotify first") ||
    normalized.includes("token")
  ) {
    return "auth" as const;
  }

  if (
    normalized.includes("premium") ||
    normalized.includes("missing scope") ||
    normalized.includes("streaming scope") ||
    normalized.includes("playback-state") ||
    normalized.includes("account")
  ) {
    return "account" as const;
  }

  if (
    normalized.includes("autoplay") ||
    normalized.includes("activate") ||
    normalized.includes("gesture") ||
    normalized.includes("blocked")
  ) {
    return "autoplay" as const;
  }

  if (
    normalized.includes("no active device") ||
    normalized.includes("device not ready") ||
    normalized.includes("device unavailable") ||
    normalized.includes("not active")
  ) {
    return "device_not_ready" as const;
  }

  if (normalized.includes("rate limit")) {
    return "rate_limit" as const;
  }

  if (
    normalized.includes("backend not reachable") ||
    normalized.includes("network") ||
    normalized.includes("timed out")
  ) {
    return "network" as const;
  }

  if (
    normalized.includes("initialization") ||
    normalized.includes("spotify web playback sdk")
  ) {
    return "initialization" as const;
  }

  return "playback" as const;
}

function shouldRetryBrowserPlayer(code: HostPlaybackErrorCode) {
  return code === "auth" || code === "initialization";
}

function shouldAllowServerFallback(code: HostPlaybackErrorCode) {
  return code === "sdk_unavailable" || code === "network";
}

function toHostPlaybackError(error: unknown, fallbackMessage: string) {
  if (error instanceof HostPlaybackError) {
    return error;
  }

  if (error instanceof ApiHttpError) {
    const message = String(error.message ?? "").trim() || fallbackMessage;
    if (error.status === 429) {
      return createPlaybackError("rate_limit", message, {
        retryAfterSeconds: error.retryAfterSeconds,
      });
    }
    if (error.status === 401) {
      return createPlaybackError("auth", message);
    }
    if (error.status === 403) {
      const code = mapMessageToCode(message);
      return createPlaybackError(code === "playback" ? "account" : code, message);
    }
    if (error.status === 404) {
      return createPlaybackError("device_not_ready", message);
    }
    return createPlaybackError(mapMessageToCode(message), message);
  }

  if (error instanceof Error) {
    const message = String(error.message ?? "").trim() || fallbackMessage;
    return createPlaybackError(mapMessageToCode(message), message);
  }

  return createPlaybackError("unknown", fallbackMessage);
}

async function syncActiveApiContext(context: ApiClientContext) {
  activeApiContext = context;
  const nextJwt = String((await Promise.resolve(context.getJwt())) ?? "").trim() || null;
  if (nextJwt !== activeJwtSnapshot) {
    activeJwtSnapshot = nextJwt;
    sdkTokenCache = null;
    sdkTokenPromise = null;
    clearPlayerError();
  }
}

function getActiveApiContext() {
  if (!activeApiContext) {
    throw createPlaybackError(
      "auth",
      "Host playback session is missing. Please connect Spotify again.",
    );
  }

  return activeApiContext;
}

async function getFreshSdkToken(context?: ApiClientContext) {
  const resolvedContext = context ?? getActiveApiContext();
  const now = Date.now();
  if (sdkTokenCache && sdkTokenCache.expiresAt - now > SDK_TOKEN_MIN_VALIDITY_MS) {
    return sdkTokenCache.accessToken;
  }

  if (sdkTokenPromise) {
    return sdkTokenPromise;
  }

  infoPlayback("token:fetch:start");
  sdkTokenPromise = (async () => {
    try {
      const payload = await getSpotifySdkAccessToken(resolvedContext);
      const accessToken = String(payload.accessToken ?? "").trim();
      const expiresInSeconds = Number(payload.expiresIn ?? 0);
      if (!accessToken) {
        throw createPlaybackError(
          "auth",
          "Spotify access token for browser playback is missing.",
        );
      }

      const expiresAt = Date.now() + Math.max(30, expiresInSeconds - 20) * 1000;
      sdkTokenCache = {
        accessToken,
        expiresAt,
      };
      infoPlayback("token:fetch:ok", {
        expiresAt: new Date(expiresAt).toISOString(),
      });
      return accessToken;
    } catch (error) {
      sdkTokenCache = null;
      const playbackError = toHostPlaybackError(
        error,
        "Spotify browser authentication failed.",
      );
      warnPlayback("token:fetch:fail", {
        reason: playbackError.message,
        code: playbackError.code,
      });
      throw playbackError;
    } finally {
      sdkTokenPromise = null;
    }
  })();

  return sdkTokenPromise;
}

async function loadSpotifyWebSdkScript() {
  if (!isWebRuntime()) {
    throw createPlaybackError(
      "sdk_unavailable",
      "Spotify Web Playback SDK is only available in web host mode.",
    );
  }

  if (window.Spotify?.Player) {
    return;
  }

  if (sdkScriptPromise) {
    return sdkScriptPromise;
  }

  infoPlayback("sdk:load:start");
  sdkScriptPromise = new Promise<void>((resolve, reject) => {
    const finish = () => {
      if (window.Spotify?.Player) {
        infoPlayback("sdk:load:ready");
        resolve();
        return;
      }

      reject(
        createPlaybackError(
          "sdk_unavailable",
          "Spotify Web Playback SDK did not initialize.",
        ),
      );
    };

    const fail = () => {
      reject(
        createPlaybackError(
          "sdk_unavailable",
          "Spotify Web Playback SDK script failed to load.",
        ),
      );
    };

    const previousReady = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      previousReady?.();
      finish();
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-beatbrain-spotify-web-sdk="true"]',
    );
    if (existingScript) {
      existingScript.addEventListener("load", finish, { once: true });
      existingScript.addEventListener("error", fail, { once: true });
      window.setTimeout(() => {
        if (window.Spotify?.Player) {
          finish();
        }
      }, 0);
      return;
    }

    const script = document.createElement("script");
    script.src = SPOTIFY_WEB_SDK_SRC;
    script.async = true;
    script.dataset.beatbrainSpotifyWebSdk = "true";
    script.addEventListener("error", fail, { once: true });
    document.head.appendChild(script);
  });

  try {
    await sdkScriptPromise;
  } catch (error) {
    sdkScriptPromise = null;
    throw error;
  }
}

function registerPlayerListeners(player: SpotifyPlayer) {
  player.addListener("ready", (payload?: unknown) => {
    const deviceId = String((payload as SpotifyPlayerReadyPayload | undefined)?.device_id ?? "").trim();
    if (!deviceId) {
      return;
    }

    playerReadyDeviceId = deviceId;
    clearPlayerError();
    infoPlayback("player:event:ready", { device_id: deviceId });
  });

  player.addListener("not_ready", (payload?: unknown) => {
    const deviceId = String((payload as SpotifyPlayerReadyPayload | undefined)?.device_id ?? "").trim();
    if (!deviceId) {
      return;
    }

    if (playerReadyDeviceId === deviceId) {
      playerReadyDeviceId = null;
    }
    rememberPlayerError("device_not_ready", "Spotify browser player became unavailable.");
    warnPlayback("player:event:not_ready", { device_id: deviceId });
  });

  player.addListener("initialization_error", (payload?: unknown) => {
    const message =
      String((payload as SpotifyPlayerErrorPayload | undefined)?.message ?? "").trim() ||
      "Spotify browser player initialization failed.";
    rememberPlayerError("initialization", message);
    warnPlayback("player:error:initialization_error", { message });
    resetPlayerState({ clearToken: false, clearError: false });
  });

  player.addListener("authentication_error", (payload?: unknown) => {
    const message =
      String((payload as SpotifyPlayerErrorPayload | undefined)?.message ?? "").trim() ||
      "Spotify browser player authentication failed.";
    sdkTokenCache = null;
    rememberPlayerError("auth", message);
    warnPlayback("player:error:authentication_error", { message });
    resetPlayerState({ clearToken: true, clearError: false });
  });

  player.addListener("account_error", (payload?: unknown) => {
    const message =
      String((payload as SpotifyPlayerErrorPayload | undefined)?.message ?? "").trim() ||
      "Spotify browser player account error.";
    rememberPlayerError("account", message);
    warnPlayback("player:error:account_error", { message });
  });

  player.addListener("playback_error", (payload?: unknown) => {
    const message =
      String((payload as SpotifyPlayerErrorPayload | undefined)?.message ?? "").trim() ||
      "Spotify browser player playback failed.";
    rememberPlayerError("playback", message);
    warnPlayback("player:error:playback_error", { message });
  });

  player.addListener("autoplay_failed", () => {
    const message = "Spotify browser playback was blocked by the browser.";
    rememberPlayerError("autoplay", message);
    warnPlayback("player:event:autoplay_failed");
  });
}

async function ensurePlayer() {
  if (!isWebRuntime()) {
    throw createPlaybackError(
      "sdk_unavailable",
      "Spotify Web Playback SDK is only available in web host mode.",
    );
  }

  await loadSpotifyWebSdkScript();
  await getFreshSdkToken();

  if (playerInstance) {
    return playerInstance;
  }

  const SpotifyCtor = window.Spotify?.Player;
  if (!SpotifyCtor) {
    throw createPlaybackError(
      "sdk_unavailable",
      "Spotify Web Playback SDK is not available.",
    );
  }

  const player = new SpotifyCtor({
    name: PLAYER_NAME,
    volume: 0.9,
    getOAuthToken: (callback) => {
      infoPlayback("token:getOAuthToken called");
      void (async () => {
        try {
          const token = await getFreshSdkToken();
          callback(token);
        } catch (error) {
          const playbackError = toHostPlaybackError(
            error,
            "Spotify browser authentication failed.",
          );
          rememberPlayerError(playbackError.code, playbackError.message);
          callback("");
        }
      })();
    },
  });

  registerPlayerListeners(player);
  playerInstance = player;
  infoPlayback("player:create", { name: PLAYER_NAME });
  return player;
}

async function waitForPlayerReady(timeoutMs = PLAYER_READY_TIMEOUT_MS) {
  if (playerReadyDeviceId) {
    return playerReadyDeviceId;
  }

  return new Promise<string>((resolve, reject) => {
    const handleReady = (payload?: unknown) => {
      const deviceId = String((payload as SpotifyPlayerReadyPayload | undefined)?.device_id ?? "").trim();
      if (!deviceId) {
        return;
      }

      clearTimeout(timeoutHandle);
      playerInstance?.removeListener("ready", handleReady);
      resolve(deviceId);
    };

    const timeoutHandle = setTimeout(() => {
      playerInstance?.removeListener("ready", handleReady);
      reject(
        createPlaybackError(
          lastPlayerErrorCode ?? "device_not_ready",
          lastPlayerError ?? "Spotify browser player is not ready yet.",
        ),
      );
    }, timeoutMs);

    playerInstance?.addListener("ready", handleReady);
  });
}

async function activatePlayerElement(player: SpotifyPlayer) {
  if (typeof player.activateElement !== "function") {
    return;
  }

  try {
    await player.activateElement();
  } catch (error) {
    throw createPlaybackError(
      "autoplay",
      toHostPlaybackError(error, "Browser playback activation failed.").message,
    );
  }
}

function activateExistingPlayerElement() {
  if (typeof playerInstance?.activateElement !== "function") {
    return;
  }

  try {
    const activation = playerInstance.activateElement();
    if (activation && typeof (activation as Promise<void>).catch === "function") {
      void (activation as Promise<void>).catch((error) => {
        const playbackError = toHostPlaybackError(
          error,
          "Browser playback activation failed.",
        );
        rememberPlayerError("autoplay", playbackError.message);
        warnPlayback("player:event:autoplay_failed", {
          message: playbackError.message,
        });
      });
    }
  } catch (error) {
    const playbackError = toHostPlaybackError(
      error,
      "Browser playback activation failed.",
    );
    rememberPlayerError("autoplay", playbackError.message);
    warnPlayback("player:event:autoplay_failed", {
      message: playbackError.message,
    });
  }
}

async function connectPlayer() {
  const player = await ensurePlayer();
  if (playerReadyDeviceId) {
    return playerReadyDeviceId;
  }

  if (playerConnectPromise) {
    return playerConnectPromise;
  }

  playerConnectPromise = (async () => {
    infoPlayback("player:connect:start");
    const connected = await player.connect();
    if (!connected) {
      warnPlayback("player:connect:fail", {
        message: lastPlayerError ?? "Spotify browser player could not connect.",
      });
      throw createPlaybackError(
        lastPlayerErrorCode ?? "playback",
        lastPlayerError ?? "Spotify browser player could not connect.",
      );
    }

    const deviceId = await waitForPlayerReady();
    infoPlayback("player:connect:success", { device_id: deviceId });
    return deviceId;
  })();

  try {
    return await playerConnectPromise;
  } catch (error) {
    throw toHostPlaybackError(error, "Spotify browser player could not connect.");
  } finally {
    playerConnectPromise = null;
  }
}

async function waitForSpotifyDevice(
  context: ApiClientContext,
  deviceId: string,
  options?: { requireActive?: boolean; timeoutMs?: number },
) {
  const requireActive = options?.requireActive ?? false;
  const timeoutMs = options?.timeoutMs ?? DEVICE_DISCOVERY_TIMEOUT_MS;
  const normalizedDeviceId = String(deviceId ?? "").trim();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const devices = await getSpotifyPlayerDevices(context);
      const match = devices.find((device) => device.id === normalizedDeviceId);
      if (match && (!requireActive || match.is_active)) {
        return match;
      }
    } catch (error) {
      throw toHostPlaybackError(error, "Spotify device lookup failed.");
    }

    await wait(DEVICE_POLL_INTERVAL_MS);
  }

  throw createPlaybackError(
    "device_not_ready",
    requireActive
      ? "Spotify browser player did not become active in time."
      : "Spotify browser player is not visible yet.",
  );
}

async function transferToBrowserDevice(context: ApiClientContext, deviceId: string) {
  const normalizedDeviceId = String(deviceId ?? "").trim();
  if (!normalizedDeviceId) {
    throw createPlaybackError("device_not_ready", "Missing Spotify browser device id.");
  }

  infoPlayback("transfer:start", { device_id: normalizedDeviceId });
  try {
    await waitForSpotifyDevice(context, normalizedDeviceId, {
      requireActive: false,
      timeoutMs: DEVICE_DISCOVERY_TIMEOUT_MS,
    });
  } catch (error) {
    const playbackError = toHostPlaybackError(error, "Spotify device lookup failed.");
    if (playbackError.code !== "device_not_ready") {
      throw playbackError;
    }
  }

  await transferSpotifyPlayback(context, {
    deviceId: normalizedDeviceId,
    play: false,
  });
  infoPlayback("transfer:requested", { device_id: normalizedDeviceId });

  await waitForSpotifyDevice(context, normalizedDeviceId, {
    requireActive: true,
    timeoutMs: DEVICE_ACTIVE_TIMEOUT_MS,
  });
  infoPlayback("transfer:confirmed", { device_id: normalizedDeviceId });
}

async function playViaWebSdkDevice(context: ApiClientContext, trackUri: string) {
  const normalizedTrackUri = String(trackUri ?? "").trim();
  if (!normalizedTrackUri) {
    return;
  }

  const player = await ensurePlayer();
  try {
    await activatePlayerElement(player);
  } catch (error) {
    const playbackError = toHostPlaybackError(
      error,
      "Browser playback activation failed.",
    );
    rememberPlayerError(playbackError.code, playbackError.message);
  }

  const deviceId = await connectPlayer();
  await transferToBrowserDevice(context, deviceId);

  infoPlayback("play:start", { device_id: deviceId });
  try {
    await playSpotifyTrack(context, {
      trackUri: normalizedTrackUri,
      deviceId,
      positionMs: 0,
    });
  } catch (error) {
    const playbackError = toHostPlaybackError(error, "Spotify playback failed.");
    if (playbackError.code === "device_not_ready") {
      await waitForSpotifyDevice(context, deviceId, {
        requireActive: true,
        timeoutMs: 2_500,
      });
      await playSpotifyTrack(context, {
        trackUri: normalizedTrackUri,
        deviceId,
        positionMs: 0,
      });
    } else {
      throw playbackError;
    }
  }

  infoPlayback("play:requested", { device_id: deviceId });
}

async function playViaFallback(context: ApiClientContext, trackUri: string) {
  await playSpotifyTrack(context, {
    trackUri,
    positionMs: 0,
  });
}

export function getPreferredHostRoundPlaybackMode(): "host_web_sdk" | "server" {
  return isWebRuntime() ? "host_web_sdk" : "server";
}

export async function warmHostSpotifyWebPlayback(context: ApiClientContext) {
  if (!isWebRuntime()) {
    return;
  }

  try {
    await syncActiveApiContext(context);
    await ensurePlayer();
    await connectPlayer();
  } catch (error) {
    const playbackError = toHostPlaybackError(
      error,
      "Spotify browser player warm-up failed.",
    );
    warnPlayback("player:warm:fail", {
      code: playbackError.code,
      message: playbackError.message,
    });
  }
}

export async function primeHostSpotifyWebPlayback(context: ApiClientContext) {
  if (!isWebRuntime()) {
    return {
      ok: false,
      code: "sdk_unavailable",
      message: getHostPlaybackErrorMessage(
        "Spotify Web Playback SDK is only available in web host mode.",
      ),
    } satisfies HostPlaybackPrimeResult;
  }

  let attempt = 0;
  while (attempt < 2) {
    try {
      activateExistingPlayerElement();
      await syncActiveApiContext(context);
      const player = await ensurePlayer();
      await activatePlayerElement(player);
      const deviceId = await connectPlayer();
      await transferToBrowserDevice(context, deviceId);
      return { ok: true, deviceId };
    } catch (error) {
      const playbackError = toHostPlaybackError(
        error,
        "Spotify browser player could not be prepared.",
      );
      warnPlayback("player:prime:fail", {
        attempt: attempt + 1,
        code: playbackError.code,
        message: playbackError.message,
      });

      if (attempt === 0 && shouldRetryBrowserPlayer(playbackError.code)) {
        resetPlayerState({
          clearToken: playbackError.code === "auth",
          clearError: true,
        });
        attempt += 1;
        continue;
      }

      return {
        ok: false,
        code: playbackError.code,
        message: getHostPlaybackErrorMessage(playbackError),
      };
    }
  }

  return {
    ok: false,
    code: "unknown",
    message: getHostPlaybackErrorMessage("Spotify browser player could not be prepared."),
  };
}

export async function playHostTrackWithWebSdkFallback(
  context: ApiClientContext,
  trackUri: string,
): Promise<HostPlaybackResult> {
  const normalizedTrackUri = String(trackUri ?? "").trim();
  if (!normalizedTrackUri) {
    return { ok: true, mode: "fallback" };
  }

  await syncActiveApiContext(context);

  if (isWebRuntime()) {
    let browserAttempt = 0;
    while (browserAttempt < 2) {
      try {
        await playViaWebSdkDevice(context, normalizedTrackUri);
        return { ok: true, mode: "web_sdk" };
      } catch (error) {
        const browserError = toHostPlaybackError(
          error,
          "Spotify browser playback failed.",
        );
        warnPlayback("player:play:fail", {
          attempt: browserAttempt + 1,
          code: browserError.code,
          message: browserError.message,
        });

        if (browserAttempt === 0 && shouldRetryBrowserPlayer(browserError.code)) {
          resetPlayerState({
            clearToken: browserError.code === "auth",
            clearError: true,
          });
          browserAttempt += 1;
          continue;
        }

        if (!shouldAllowServerFallback(browserError.code)) {
          return {
            ok: false,
            message: getHostPlaybackErrorMessage(browserError),
          };
        }

        try {
          await playViaFallback(context, normalizedTrackUri);
          return { ok: true, mode: "fallback" };
        } catch (fallbackError) {
          const playbackError = toHostPlaybackError(
            fallbackError,
            "Spotify playback failed.",
          );
          warnPlayback("fallback:play:fail", {
            code: playbackError.code,
            message: playbackError.message,
          });
          return {
            ok: false,
            message: getHostPlaybackErrorMessage(playbackError),
          };
        }
      }
    }
  }

  try {
    await playViaFallback(context, normalizedTrackUri);
    return { ok: true, mode: "fallback" };
  } catch (error) {
    const playbackError = toHostPlaybackError(error, "Spotify playback failed.");
    return {
      ok: false,
      message: getHostPlaybackErrorMessage(playbackError),
    };
  }
}

export function disconnectHostSpotifyWebPlayback() {
  activeApiContext = null;
  activeJwtSnapshot = null;
  resetPlayerState({ clearToken: true, clearError: true });
}
