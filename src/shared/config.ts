import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_WEB_API_BASE_URL = "http://127.0.0.1:3000";
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeHostname(raw: string) {
  return raw.trim().replace(/^\[|\]$/g, "").toLowerCase();
}

export function isLoopbackHostname(hostname: string) {
  return LOOPBACK_HOSTNAMES.has(normalizeHostname(hostname));
}

export function normalizeApiBaseUrl(raw: string | undefined | null) {
  const value = raw?.trim();
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    const normalizedPath = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${normalizedPath}`;
  } catch {
    return null;
  }
}

export function isLoopbackApiBaseUrl(raw: string | undefined | null) {
  const normalized = normalizeApiBaseUrl(raw);
  if (!normalized) {
    return false;
  }

  try {
    return isLoopbackHostname(new URL(normalized).hostname);
  } catch {
    return false;
  }
}

export function deriveApiBaseUrlFromJoinUrl(raw: string | undefined | null) {
  const value = raw?.trim();
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    const explicitBaseUrl =
      normalizeApiBaseUrl(parsed.searchParams.get("backendUrl")) ??
      normalizeApiBaseUrl(parsed.searchParams.get("apiBaseUrl"));
    if (explicitBaseUrl) {
      return explicitBaseUrl;
    }

    if (isLoopbackHostname(parsed.hostname)) {
      return null;
    }

    const protocol = parsed.protocol === "https:" ? "https:" : "http:";
    return normalizeApiBaseUrl(`${protocol}//${parsed.hostname}:3000`);
  } catch {
    return null;
  }
}

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
  const envValue = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
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

export const SPOTIFY_REDIRECT_URI =
  process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI ?? "beatbrain-login://callback";

export const SPOTIFY_REDIRECT_URI_WEB_FALLBACK =
  "http://127.0.0.1:3000/auth/spotify/callback";

export const SPOTIFY_REDIRECT_URI_WEB =
  process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI_WEB ??
  SPOTIFY_REDIRECT_URI_WEB_FALLBACK;
