export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3000";

export const SPOTIFY_CLIENT_ID =
  process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? "";

export const SPOTIFY_REDIRECT_URI =
  process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI ?? "beatbrain-login://callback";

export const SPOTIFY_REDIRECT_URI_WEB_FALLBACK =
  "http://127.0.0.1:3000/auth/spotify/callback";

export const SPOTIFY_REDIRECT_URI_WEB =
  process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI_WEB ??
  SPOTIFY_REDIRECT_URI_WEB_FALLBACK;
