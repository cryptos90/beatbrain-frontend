import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_WEB_API_BASE_URL = "http://127.0.0.1:3000";

function extractHostFromExpoValue(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    return parsed.hostname || null;
  } catch {
    const noScheme = value.replace(/^[a-z]+:\/\//i, "");
    const hostWithPort = noScheme.split("/")[0] ?? "";
    const host = hostWithPort.split(":")[0]?.trim();
    return host || null;
  }
}

function resolveExpoHost(): string | null {
  const anyConstants = Constants as unknown as Record<string, any>;
  const candidates: Array<string | undefined> = [
    anyConstants?.expoConfig?.hostUri,
    anyConstants?.experienceUrl,
    anyConstants?.linkingUri,
    anyConstants?.manifest2?.extra?.expoClient?.hostUri,
    anyConstants?.manifest?.debuggerHost,
    anyConstants?.manifest?.hostUri,
  ];

  for (const candidate of candidates) {
    const host = extractHostFromExpoValue(candidate);
    if (!host) {
      continue;
    }
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      continue;
    }
    if (host.endsWith(".expo.dev")) {
      continue;
    }
    return host;
  }

  return null;
}

function resolveApiBaseUrl() {
  const envValue = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envValue) {
    return { url: envValue, source: "env" };
  }

  if (Platform.OS === "web") {
    return { url: DEFAULT_WEB_API_BASE_URL, source: "default-web" };
  }

  const expoHost = resolveExpoHost();
  if (expoHost) {
    return { url: `http://${expoHost}:3000`, source: "expo-host" };
  }

  if (__DEV__) {
    console.warn(
      "[config] Could not resolve Expo host for native runtime. Falling back to http://127.0.0.1:3000. Set EXPO_PUBLIC_API_BASE_URL for device testing.",
    );
  }
  return { url: DEFAULT_WEB_API_BASE_URL, source: "fallback-loopback" };
}

const resolvedApiBase = resolveApiBaseUrl();

export const API_BASE_URL = resolvedApiBase.url;

if (__DEV__) {
  console.info(
    `[config] API_BASE_URL=${API_BASE_URL} source=${resolvedApiBase.source} platform=${Platform.OS}`,
  );
}

export const SPOTIFY_CLIENT_ID =
  process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? "";

export const SPOTIFY_REDIRECT_URI =
  process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI ?? "beatbrain-login://callback";

export const SPOTIFY_REDIRECT_URI_WEB_FALLBACK =
  "http://127.0.0.1:3000/auth/spotify/callback";

export const SPOTIFY_REDIRECT_URI_WEB =
  process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI_WEB ??
  SPOTIFY_REDIRECT_URI_WEB_FALLBACK;
