import { API_BASE_URL } from "../config";
import type { ChoosePlaylist } from "../types/app";
import type { ApiClientContext, JsonRecord } from "./apiClient";
import { requestJson } from "./apiClient";

export async function startSpotifyAuth(
  clientType: "mobile" | "web",
  options?: { redirectOrigin?: string },
) {
  const response = await fetch(
    `${API_BASE_URL}/auth/spotify/start?client=${encodeURIComponent(clientType)}`,
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

export async function completeSpotifyCallback(code: string, state: string) {
  const response = await fetch(`${API_BASE_URL}/auth/spotify/exchange`, {
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

export async function consumeAuthResult(authCode: string) {
  const response = await fetch(
    `${API_BASE_URL}/auth/result?code=${encodeURIComponent(authCode)}`,
  );
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as JsonRecord;
}

export async function getChoosePlaylists(
  context: ApiClientContext,
): Promise<ChoosePlaylist[]> {
  const payload = (await requestJson(context, "/choose", {
    method: "GET",
  })) as unknown;

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((entry) => ({
      id: String((entry as any)?.id ?? "").trim(),
      name: String((entry as any)?.name ?? "").trim(),
      coverUrl: String((entry as any)?.coverUrl ?? ""),
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
  });
}

export async function loadNextQuizQuestion(context: ApiClientContext, sessionId: string) {
  return requestJson(context, `/quiz/sessions/${sessionId}/next`, {
    method: "POST",
  });
}

export async function startSpotifyPlayback(
  context: ApiClientContext,
  trackUri: string,
  deviceId?: string,
) {
  return requestJson(context, "/spotify/playback/play", {
    method: "POST",
    body: JSON.stringify({
      trackUri,
      deviceId: deviceId ?? undefined,
    }),
  });
}

export async function deleteQuizSession(context: ApiClientContext, sessionId: string) {
  return requestJson(context, `/quiz/sessions/${sessionId}`, {
    method: "DELETE",
  });
}
