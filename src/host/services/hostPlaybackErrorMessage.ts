import { ApiHttpError } from "../../shared/net/apiClient";

function extractMessage(input: unknown) {
  if (typeof input === "string") {
    return input.trim();
  }
  if (input instanceof ApiHttpError || input instanceof Error) {
    return String(input.message ?? "").trim();
  }
  if (input && typeof input === "object" && "message" in input) {
    return String((input as { message?: unknown }).message ?? "").trim();
  }
  return "";
}

function formatRetryAfterSeconds(retryAfterSeconds?: number) {
  if (!Number.isFinite(retryAfterSeconds) || (retryAfterSeconds ?? 0) <= 0) {
    return null;
  }

  const totalSeconds = Math.max(1, Math.ceil(retryAfterSeconds ?? 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0 && seconds > 0) {
    return `${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

export function getHostPlaybackErrorMessage(input: unknown) {
  const message = extractMessage(input);
  const normalized = message.toLowerCase();
  const retryAfter =
    input instanceof ApiHttpError
      ? formatRetryAfterSeconds(input.retryAfterSeconds)
      : input && typeof input === "object" && "retryAfterSeconds" in input
        ? formatRetryAfterSeconds(
            Number((input as { retryAfterSeconds?: unknown }).retryAfterSeconds ?? 0),
          )
        : null;

  if (input instanceof ApiHttpError && input.status === 429) {
    return retryAfter
      ? `Spotify ist aktuell rate-limited. Bitte in ${retryAfter} erneut versuchen.`
      : "Spotify ist aktuell rate-limited. Bitte gleich erneut versuchen.";
  }

  if (
    normalized.includes("spotify access token for browser playback is missing") ||
    normalized.includes("host playback session is missing")
  ) {
    return "Der Host hat aktuell kein gültiges Spotify-Browser-Playback-Token. Bitte den Host-Browser erneut mit Spotify verbinden.";
  }

  if (
    normalized.includes("host must authenticate with spotify first")
  ) {
    return "Die Spotify-Host-Session ist nicht mehr nutzbar. Bitte den Host-Browser erneut mit Spotify verbinden.";
  }

  if (
    normalized.includes("authentication failed") ||
    normalized.includes("authorization failed") ||
    normalized.includes("browser authentication failed")
  ) {
    return "Die Spotify Web Playback SDK hat die Browser-Anmeldung abgelehnt. Bitte die Host-Seite einmal hart neu laden und das Quiz erneut starten.";
  }

  if (
    normalized.includes("premium") ||
    normalized.includes("missing scope") ||
    normalized.includes("streaming scope") ||
    normalized.includes("playback-state") ||
    normalized.includes("account error")
  ) {
    return "Für Browser-Playback werden Spotify Premium sowie die Spotify-Berechtigungen streaming, user-modify-playback-state und user-read-playback-state benötigt.";
  }

  if (
    normalized.includes("autoplay") ||
    normalized.includes("activation failed") ||
    normalized.includes("gesture") ||
    normalized.includes("blocked")
  ) {
    return "Der Browser hat die Spotify-Wiedergabe blockiert. Klicke einmal in die Host-Seite und starte das Quiz erneut.";
  }

  if (
    normalized.includes("browser player is not ready") ||
    normalized.includes("device not ready") ||
    normalized.includes("device unavailable") ||
    normalized.includes("no active device") ||
    normalized.includes("did not become active")
  ) {
    return "Der Spotify-Browser-Player ist noch nicht aktiv. Bitte kurz warten und dann erneut starten.";
  }

  if (normalized.includes("rate limit")) {
    return retryAfter
      ? `Spotify ist aktuell rate-limited. Bitte in ${retryAfter} erneut versuchen.`
      : "Spotify ist aktuell rate-limited. Bitte gleich erneut versuchen.";
  }

  if (normalized.includes("backend not reachable")) {
    return "Das Backend ist aktuell nicht erreichbar. Bitte Host und Backend prüfen.";
  }

  if (
    normalized.startsWith("player command failed:") ||
    normalized.startsWith("playback request failed")
  ) {
    return "Die Spotify-Wiedergabe konnte nicht gestartet werden.";
  }

  if (!message) {
    return "Die Spotify-Wiedergabe konnte nicht gestartet werden.";
  }

  return message;
}
