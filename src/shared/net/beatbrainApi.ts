import { API_BASE_URL } from "../config";
import type { ChoosePlaylist } from "../types/app";
import type { ApiClientContext, JsonRecord } from "./apiClient";
import { requestJson } from "./apiClient";

const CHOOSE_REQUEST_TIMEOUT_MS = 20_000;
const CREATE_QUIZ_SESSION_TIMEOUT_MS = 25_000;

export type SpotifyPlayerDevice = {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
};

type AuthRequestOptions = {
  redirectOrigin?: string;
  baseUrl?: string;
};

export async function startSpotifyAuth(
  clientType: "mobile" | "web",
  options?: AuthRequestOptions,
) {
  const baseUrl = options?.baseUrl ?? API_BASE_URL;
  const response = await fetch(
    `${baseUrl}/auth/spotify/start?client=${encodeURIComponent(clientType)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientType,
        redirectOrigin: options?.redirectOrigin ?? undefined,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as JsonRecord;
}

export async function completeSpotifyCallback(
  code: string,
  state: string,
  options?: { baseUrl?: string },
) {
  const baseUrl = options?.baseUrl ?? API_BASE_URL;
  const response = await fetch(`${baseUrl}/auth/spotify/exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, state }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as JsonRecord;
}

export async function consumeAuthResult(authCode: string, options?: { baseUrl?: string }) {
  const baseUrl = options?.baseUrl ?? API_BASE_URL;
  const response = await fetch(`${baseUrl}/auth/result?code=${encodeURIComponent(authCode)}`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as JsonRecord;
}

export async function getSpotifySdkAccessToken(context: ApiClientContext) {
  const payload = (await requestJson(context, "/auth/spotify/token", {
    method: "GET",
  })) as JsonRecord;

  return {
    accessToken: String(payload?.accessToken ?? "").trim(),
    expiresIn: Number(payload?.expiresIn ?? 0),
  };
}

export async function startSpotifyPlayback(
  context: ApiClientContext,
  payload: { trackUri: string; deviceId?: string; positionMs?: number },
) {
  return playSpotifyTrack(context, payload);
}

export async function playSpotifyTrack(
  context: ApiClientContext,
  payload: { trackUri: string; deviceId?: string; positionMs?: number },
) {
  return requestJson(context, "/spotify/player/play", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function stopSpotifyPlayback(
  context: ApiClientContext,
  payload?: { deviceId?: string },
) {
  return requestJson(context, "/spotify/playback/pause", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function getSpotifyPlayerDevices(
  context: ApiClientContext,
): Promise<SpotifyPlayerDevice[]> {
  const payload = (await requestJson(context, "/spotify/player/devices", {
    method: "GET",
  })) as JsonRecord;

  const rawDevices = Array.isArray(payload?.devices) ? payload.devices : [];
  return rawDevices
    .map((entry) => ({
      id: String((entry as any)?.id ?? "").trim(),
      name: String((entry as any)?.name ?? "").trim(),
      type: String((entry as any)?.type ?? "").trim(),
      is_active: Boolean((entry as any)?.is_active),
    }))
    .filter((entry) => Boolean(entry.id));
}

export async function getChoosePlaylists(
  context: ApiClientContext,
): Promise<ChoosePlaylist[]> {
  const payload = (await requestJson(context, "/choose", {
    method: "GET",
    timeoutMs: CHOOSE_REQUEST_TIMEOUT_MS,
  })) as unknown;

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((entry) => ({
      id: String((entry as any)?.id ?? "").trim(),
      name: String((entry as any)?.name ?? "").trim(),
      coverUrl: String((entry as any)?.coverUrl ?? ""),
      tags: Array.isArray((entry as any)?.tags)
        ? ((entry as any).tags as unknown[])
            .map((tag) => String(tag ?? "").trim())
            .filter(Boolean)
        : undefined,
      decadeTag: String((entry as any)?.decadeTag ?? "").trim() || undefined,
      categoryType:
        (entry as any)?.categoryType === "decade" || (entry as any)?.categoryType === "genre"
          ? (entry as any).categoryType
          : undefined,
      trackCount:
        typeof (entry as any)?.trackCount === "number"
          ? Number((entry as any).trackCount)
          : undefined,
    }))
    .filter((entry) => Boolean(entry.id));
}

export async function getPlaylistById(context: ApiClientContext, playlistId: string) {
  return requestJson(context, `/spotify/playlists/${encodeURIComponent(playlistId)}`, {
    method: "GET",
  });
}

export async function createQuizSession(
  context: ApiClientContext,
  payload: {
    playlistId: string;
    questionCount?: number;
    decadeTag?: string;
  },
) {
  return requestJson(context, "/quiz/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: CREATE_QUIZ_SESSION_TIMEOUT_MS,
  });
}

export async function loadNextQuizQuestion(context: ApiClientContext, sessionId: string) {
  return requestJson(context, `/quiz/sessions/${sessionId}/next`, {
    method: "POST",
  });
}

export async function deleteQuizSession(context: ApiClientContext, sessionId: string) {
  return requestJson(context, `/quiz/sessions/${sessionId}`, {
    method: "DELETE",
  });
}
