import { Platform } from "react-native";
import type { ApiClientContext } from "../../shared/net/apiClient";
import { getSpotifySdkAccessToken, playSpotifyTrack } from "../../shared/net/beatbrainApi";

type HostPlaybackResult =
  | { ok: true; mode: "web_sdk" | "fallback" }
  | { ok: false; message: string };

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
  addListener: (eventName: string, callback: (payload?: any) => void) => boolean;
  removeListener: (eventName: string, callback?: (payload?: any) => void) => boolean;
  activateElement?: () => Promise<void> | void;
};

declare global {
  interface Window {
    Spotify?: {
      Player: new (init: SpotifyPlayerInit) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

const SPOTIFY_WEB_SDK_SRC = "https://sdk.scdn.co/spotify-player.js";
const PLAYER_NAME = "BeatBrain Host";
const PLAYER_READY_TIMEOUT_MS = 6_000;

let sdkScriptPromise: Promise<void> | null = null;
let playerInstance: SpotifyPlayer | null = null;
let playerConnectPromise: Promise<void> | null = null;
let playerReadyDeviceId: string | null = null;
let lastPlayerError: string | null = null;

function isWebRuntime() {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof document !== "undefined";
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const normalized = String(error.message ?? "").trim();
    return normalized || fallback;
  }
  return fallback;
}

function setPlayerError(message: string) {
  const normalized = String(message ?? "").trim();
  if (normalized) {
    lastPlayerError = normalized;
  }
}

function createReadyWaiter(timeoutMs = PLAYER_READY_TIMEOUT_MS) {
  if (playerReadyDeviceId) {
    return Promise.resolve(playerReadyDeviceId);
  }

  return new Promise<string>((resolve, reject) => {
    const handleReady = (payload?: SpotifyPlayerReadyPayload) => {
      const deviceId = String(payload?.device_id ?? "").trim();
      if (!deviceId) {
        return;
      }
      clearTimeout(timeoutHandle);
      playerInstance?.removeListener("ready", handleReady);
      resolve(deviceId);
    };

    const timeoutHandle = setTimeout(() => {
      playerInstance?.removeListener("ready", handleReady);
      reject(new Error(lastPlayerError ?? "Spotify browser player is not ready yet."));
    }, timeoutMs);

    playerInstance?.addListener("ready", handleReady);
  });
}

async function loadSpotifyWebSdkScript() {
  if (!isWebRuntime()) {
    throw new Error("Spotify Web Playback SDK is only available in web host mode.");
  }

  if (window.Spotify?.Player) {
    return;
  }

  if (sdkScriptPromise) {
    return sdkScriptPromise;
  }

  sdkScriptPromise = new Promise<void>((resolve, reject) => {
    const finish = () => {
      if (window.Spotify?.Player) {
        resolve();
        return;
      }
      reject(new Error("Spotify Web Playback SDK did not initialize."));
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
      existingScript.addEventListener("error", () => {
        reject(new Error("Spotify Web Playback SDK script failed to load."));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = SPOTIFY_WEB_SDK_SRC;
    script.async = true;
    script.dataset.beatbrainSpotifyWebSdk = "true";
    script.onerror = () => {
      reject(new Error("Spotify Web Playback SDK script failed to load."));
    };
    document.head.appendChild(script);
  });

  return sdkScriptPromise;
}

function registerPlayerListeners(player: SpotifyPlayer) {
  player.addListener("ready", (payload?: SpotifyPlayerReadyPayload) => {
    const deviceId = String(payload?.device_id ?? "").trim();
    if (!deviceId) {
      return;
    }
    playerReadyDeviceId = deviceId;
    lastPlayerError = null;
  });

  player.addListener("not_ready", (payload?: SpotifyPlayerReadyPayload) => {
    const deviceId = String(payload?.device_id ?? "").trim();
    if (!deviceId || playerReadyDeviceId !== deviceId) {
      return;
    }
    playerReadyDeviceId = null;
  });

  player.addListener("initialization_error", (payload?: SpotifyPlayerErrorPayload) => {
    setPlayerError(payload?.message ?? "Spotify browser player initialization failed.");
  });

  player.addListener("authentication_error", (payload?: SpotifyPlayerErrorPayload) => {
    setPlayerError(
      payload?.message ??
        "Spotify browser player authentication failed. Please reconnect Spotify once.",
    );
  });

  player.addListener("account_error", (payload?: SpotifyPlayerErrorPayload) => {
    setPlayerError(
      payload?.message ??
        "Spotify browser player account error. Spotify Premium and the streaming scope are required.",
    );
  });

  player.addListener("playback_error", (payload?: SpotifyPlayerErrorPayload) => {
    setPlayerError(payload?.message ?? "Spotify browser player playback failed.");
  });

  player.addListener("autoplay_failed", () => {
    setPlayerError(
      "Spotify browser playback was blocked. Interact with the page once and try again.",
    );
  });
}

async function ensurePlayer(context: ApiClientContext) {
  if (!isWebRuntime()) {
    throw new Error("Spotify Web Playback SDK is only available in web host mode.");
  }

  await loadSpotifyWebSdkScript();
  if (playerInstance) {
    return playerInstance;
  }

  const SpotifyCtor = window.Spotify?.Player;
  if (!SpotifyCtor) {
    throw new Error("Spotify Web Playback SDK is not available.");
  }

  const player = new SpotifyCtor({
    name: PLAYER_NAME,
    volume: 0.9,
    getOAuthToken: async (callback) => {
      try {
        const token = await getSpotifySdkAccessToken(context);
        callback(String(token.accessToken ?? "").trim());
      } catch {
        callback("");
      }
    },
  });

  registerPlayerListeners(player);
  playerInstance = player;
  return player;
}

async function connectPlayer(context: ApiClientContext) {
  const player = await ensurePlayer(context);
  if (playerConnectPromise) {
    return playerConnectPromise;
  }

  playerConnectPromise = (async () => {
    const connected = await player.connect();
    if (!connected) {
      throw new Error(lastPlayerError ?? "Spotify browser player could not connect.");
    }
  })();

  try {
    await playerConnectPromise;
  } finally {
    playerConnectPromise = null;
  }
}

async function activatePlayerElement(context: ApiClientContext) {
  const player = await ensurePlayer(context);
  if (typeof player.activateElement !== "function") {
    return;
  }
  await player.activateElement();
}

async function playViaWebSdkDevice(context: ApiClientContext, trackUri: string) {
  await connectPlayer(context);
  const deviceId = await createReadyWaiter();
  await playSpotifyTrack(context, {
    trackUri,
    deviceId,
    positionMs: 0,
  });
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

export async function primeHostSpotifyWebPlayback(context: ApiClientContext) {
  if (!isWebRuntime()) {
    return false;
  }

  try {
    if (playerInstance && typeof playerInstance.activateElement === "function") {
      await playerInstance.activateElement();
    }
    await ensurePlayer(context);
    await connectPlayer(context);
    await activatePlayerElement(context);
    return true;
  } catch {
    return false;
  }
}

export async function playHostTrackWithWebSdkFallback(
  context: ApiClientContext,
  trackUri: string,
): Promise<HostPlaybackResult> {
  const normalizedTrackUri = String(trackUri ?? "").trim();
  if (!normalizedTrackUri) {
    return { ok: true, mode: "fallback" };
  }

  let webSdkError: string | null = null;
  if (isWebRuntime()) {
    try {
      await playViaWebSdkDevice(context, normalizedTrackUri);
      return { ok: true, mode: "web_sdk" };
    } catch (error) {
      webSdkError = toErrorMessage(error, "Spotify browser playback failed.");
    }
  }

  try {
    await playViaFallback(context, normalizedTrackUri);
    return { ok: true, mode: "fallback" };
  } catch (fallbackError) {
    const fallbackMessage = toErrorMessage(fallbackError, "Spotify playback failed.");
    if (webSdkError && webSdkError !== fallbackMessage) {
      return {
        ok: false,
        message: `${fallbackMessage} (Browser playback failed first: ${webSdkError})`,
      };
    }
    return {
      ok: false,
      message: fallbackMessage,
    };
  }
}

export function disconnectHostSpotifyWebPlayback() {
  if (playerInstance) {
    playerInstance.disconnect();
  }
  playerInstance = null;
  playerConnectPromise = null;
  playerReadyDeviceId = null;
  lastPlayerError = null;
}
