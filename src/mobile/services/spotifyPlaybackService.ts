import type { ApiClientContext } from "../../shared/net/apiClient";
import { ApiHttpError } from "../../shared/net/apiClient";
import {
  getSpotifyPlayerDevices,
  playSpotifyTrack,
  type SpotifyPlayerDevice,
} from "../../shared/net/beatbrainApi";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

type PlaybackResult =
  | { ok: true }
  | { ok: false; message: string; canOpenSpotify: boolean };

const NO_ACTIVE_DEVICE_HINT =
  "Spotify ist nicht als Wiedergabegerät aktiv. Öffne Spotify einmal kurz, starte einen Song (1 Sekunde reicht), geh zurück zu BeatBrain und drücke erneut auf Play.";
const LAST_SPOTIFY_DEVICE_ID_STORAGE_KEY = "beatbrain_last_spotify_device_id";
const NO_ACTIVE_GRACE_DELAY_MS = 1200;

let cachedDeviceId: string | null = null;
let cacheHydrated = false;
let cacheHydrationPromise: Promise<void> | null = null;
let noActiveGraceRetryUsed = false;
let primeInFlightPromise: Promise<void> | null = null;

type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

let asyncStorageModule: AsyncStorageLike | null | undefined;

function debugLog(message: string) {
  if (__DEV__) {
    console.debug(message);
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveAsyncStorage(): AsyncStorageLike | null {
  if (asyncStorageModule !== undefined) {
    return asyncStorageModule ?? null;
  }

  try {
    const required = require("@react-native-async-storage/async-storage");
    asyncStorageModule = (required?.default ?? required) as AsyncStorageLike;
  } catch {
    asyncStorageModule = null;
  }
  return asyncStorageModule;
}

async function readPersistedDeviceId(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      const value = window.localStorage.getItem(LAST_SPOTIFY_DEVICE_ID_STORAGE_KEY);
      return String(value ?? "").trim() || null;
    }

    const secureValue = await SecureStore.getItemAsync(LAST_SPOTIFY_DEVICE_ID_STORAGE_KEY);
    const normalizedSecure = String(secureValue ?? "").trim();
    if (normalizedSecure) {
      return normalizedSecure;
    }

    const asyncStorage = resolveAsyncStorage();
    if (asyncStorage) {
      const fallbackValue = await asyncStorage.getItem(LAST_SPOTIFY_DEVICE_ID_STORAGE_KEY);
      return String(fallbackValue ?? "").trim() || null;
    }
  } catch {
    return null;
  }

  return null;
}

async function persistDeviceId(deviceId: string | null): Promise<void> {
  const normalizedDeviceId = String(deviceId ?? "").trim();
  try {
    if (Platform.OS === "web") {
      if (normalizedDeviceId) {
        window.localStorage.setItem(
          LAST_SPOTIFY_DEVICE_ID_STORAGE_KEY,
          normalizedDeviceId,
        );
      } else {
        window.localStorage.removeItem(LAST_SPOTIFY_DEVICE_ID_STORAGE_KEY);
      }
      return;
    }

    if (normalizedDeviceId) {
      await SecureStore.setItemAsync(
        LAST_SPOTIFY_DEVICE_ID_STORAGE_KEY,
        normalizedDeviceId,
      );
    } else {
      await SecureStore.deleteItemAsync(LAST_SPOTIFY_DEVICE_ID_STORAGE_KEY);
    }

    const asyncStorage = resolveAsyncStorage();
    if (asyncStorage) {
      if (normalizedDeviceId) {
        await asyncStorage.setItem(LAST_SPOTIFY_DEVICE_ID_STORAGE_KEY, normalizedDeviceId);
      } else {
        await asyncStorage.removeItem(LAST_SPOTIFY_DEVICE_ID_STORAGE_KEY);
      }
    }
  } catch {
    // Intentionally ignore storage errors to keep runtime flow alive.
  }
}

async function hydrateCachedDeviceId() {
  if (cacheHydrated) {
    return;
  }

  if (cacheHydrationPromise) {
    await cacheHydrationPromise;
    return;
  }

  cacheHydrationPromise = (async () => {
    cachedDeviceId = await readPersistedDeviceId();
    cacheHydrated = true;
    if (cachedDeviceId) {
      debugLog(`[spotify-playback] hydrated cached deviceId=${cachedDeviceId}`);
    }
  })();

  try {
    await cacheHydrationPromise;
  } finally {
    cacheHydrationPromise = null;
  }
}

function extractApiErrorCode(error: ApiHttpError) {
  const details = (error.details ?? {}) as Record<string, any>;
  const nested = (details.error ?? {}) as Record<string, any>;
  const rawCode = nested.code ?? details.code;
  return String(rawCode ?? "").trim();
}

function isNoActiveDeviceError(error: unknown) {
  if (error instanceof ApiHttpError) {
    const code = extractApiErrorCode(error);
    if (code === "NO_ACTIVE_DEVICE") {
      return true;
    }
    if (error.status === 404) {
      return true;
    }
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("no active device");
}

function toPlaybackErrorMessage(error: unknown) {
  if (error instanceof ApiHttpError) {
    const normalized = String(error.message ?? "").trim();
    return normalized || `Playback request failed (${error.status})`;
  }
  if (error instanceof Error) {
    const normalized = String(error.message ?? "").trim();
    return normalized || "Playback request failed.";
  }
  return "Playback request failed.";
}

function pickBestDevice(devices: SpotifyPlayerDevice[]) {
  const normalized = devices.filter((device) => Boolean(device.id));
  if (!normalized.length) {
    return null;
  }

  const smartphone = normalized.find(
    (device) => String(device.type ?? "").toLowerCase() === "smartphone",
  );
  if (smartphone) {
    return smartphone;
  }

  const iphoneName = normalized.find((device) =>
    String(device.name ?? "").toLowerCase().includes("iphone"),
  );
  if (iphoneName) {
    return iphoneName;
  }

  const active = normalized.find((device) => Boolean(device.is_active));
  if (active) {
    return active;
  }

  return normalized[0] ?? null;
}

export function clearCachedSpotifyPlaybackDevice() {
  cachedDeviceId = null;
  cacheHydrated = true;
  noActiveGraceRetryUsed = false;
  void persistDeviceId(null);
}

export function resetSpotifyPlaybackWarmupState() {
  noActiveGraceRetryUsed = false;
  primeInFlightPromise = null;
}

async function tryOneTimeNoActiveGraceRetry(
  context: ApiClientContext,
  trackUri: string,
  deviceId?: string,
): Promise<PlaybackResult | null> {
  if (noActiveGraceRetryUsed) {
    return null;
  }
  noActiveGraceRetryUsed = true;

  await wait(NO_ACTIVE_GRACE_DELAY_MS);

  try {
    debugLog(
      `[spotify-playback] NO_ACTIVE grace retry (deviceId=${deviceId ? deviceId : "<none>"})`,
    );
    await playSpotifyTrack(context, {
      trackUri,
      ...(deviceId ? { deviceId } : {}),
    });
    if (deviceId) {
      cachedDeviceId = deviceId;
      void persistDeviceId(deviceId);
    }
    return { ok: true };
  } catch (error) {
    if (isNoActiveDeviceError(error)) {
      return null;
    }
    return {
      ok: false,
      message: toPlaybackErrorMessage(error),
      canOpenSpotify: false,
    };
  }
}

async function cacheSelectedDevice(deviceId: string) {
  const normalized = String(deviceId ?? "").trim();
  if (!normalized) {
    return;
  }
  cachedDeviceId = normalized;
  void persistDeviceId(normalized);
}

export async function primeSpotifyPlaybackDevice(context: ApiClientContext): Promise<void> {
  await hydrateCachedDeviceId();
  if (cachedDeviceId) {
    return;
  }

  if (primeInFlightPromise) {
    await primeInFlightPromise;
    return;
  }

  primeInFlightPromise = (async () => {
    try {
      const devices = await getSpotifyPlayerDevices(context);
      const selectedDevice = pickBestDevice(devices);
      if (!selectedDevice?.id) {
        return;
      }
      debugLog(
        `[spotify-playback] Primed device: ${selectedDevice.name || "<unknown>"} (${selectedDevice.type || "<unknown>"})`,
      );
      await cacheSelectedDevice(selectedDevice.id);
    } catch {
      // Prime should stay silent and never block quiz start.
    }
  })();

  try {
    await primeInFlightPromise;
  } finally {
    primeInFlightPromise = null;
  }
}

export async function playTrackWithMinimalSpotifyRequests(
  context: ApiClientContext,
  trackUri: string,
): Promise<PlaybackResult> {
  const normalizedTrackUri = String(trackUri ?? "").trim();
  if (!normalizedTrackUri) {
    return { ok: true };
  }

  await hydrateCachedDeviceId();

  try {
    debugLog(
      `[spotify-playback] PLAY attempt #1 (deviceId=${cachedDeviceId ?? "<none>"})`,
    );
    await playSpotifyTrack(context, {
      trackUri: normalizedTrackUri,
      ...(cachedDeviceId ? { deviceId: cachedDeviceId } : {}),
    });
    return { ok: true };
  } catch (firstError) {
    if (!isNoActiveDeviceError(firstError)) {
      return {
        ok: false,
        message: toPlaybackErrorMessage(firstError),
        canOpenSpotify: false,
      };
    }

    const staleDeviceId = cachedDeviceId;
    if (staleDeviceId) {
      clearCachedSpotifyPlaybackDevice();
      cacheHydrated = true;
    }
  }

  debugLog("[spotify-playback] NO_ACTIVE_DEVICE -> fetching devices once");

  let devices: SpotifyPlayerDevice[];
  try {
    devices = await getSpotifyPlayerDevices(context);
  } catch (devicesError) {
    return {
      ok: false,
      message: toPlaybackErrorMessage(devicesError),
      canOpenSpotify: true,
    };
  }

  const selectedDevice = pickBestDevice(devices);
  if (!selectedDevice?.id) {
    const graceRetryResult = await tryOneTimeNoActiveGraceRetry(
      context,
      normalizedTrackUri,
      undefined,
    );
    if (graceRetryResult) {
      return graceRetryResult;
    }

    clearCachedSpotifyPlaybackDevice();
    cacheHydrated = true;
    return {
      ok: false,
      message: NO_ACTIVE_DEVICE_HINT,
      canOpenSpotify: true,
    };
  }

  await cacheSelectedDevice(selectedDevice.id);
  debugLog(
    `[spotify-playback] Selected device: ${selectedDevice.name || "<unknown>"} (${selectedDevice.type || "<unknown>"})`,
  );

  try {
    debugLog(`[spotify-playback] PLAY attempt #2 (deviceId=${selectedDevice.id})`);
    await playSpotifyTrack(context, {
      trackUri: normalizedTrackUri,
      deviceId: selectedDevice.id,
    });
    return { ok: true };
  } catch (secondError) {
    if (isNoActiveDeviceError(secondError)) {
      const graceRetryResult = await tryOneTimeNoActiveGraceRetry(
        context,
        normalizedTrackUri,
        selectedDevice.id,
      );
      if (graceRetryResult) {
        return graceRetryResult;
      }

      clearCachedSpotifyPlaybackDevice();
      cacheHydrated = true;
      return {
        ok: false,
        message: NO_ACTIVE_DEVICE_HINT,
        canOpenSpotify: true,
      };
    }

    return {
      ok: false,
      message: toPlaybackErrorMessage(secondError),
      canOpenSpotify: false,
    };
  }
}
