import { API_BASE_URL } from "../config";
import type { PlaylistCard } from "../types/app";
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

export async function resolveChoosePlaylists(
  context: ApiClientContext,
  playlistIds: string[],
): Promise<PlaylistCard[]> {
  const orderedIds = [...new Set(playlistIds.map((id) => id.trim()).filter(Boolean))];
  if (!orderedIds.length) {
    return [];
  }

  const payload = await requestJson(context, "/spotify/playlists/resolve", {
    method: "POST",
    body: JSON.stringify({
      playlistIds: orderedIds,
    }),
  });

  const resolved = Array.isArray(payload.playlists) ? payload.playlists : [];
  const byId = new Map<string, PlaylistCard>();
  for (const entry of resolved) {
    const id = String(entry?.id ?? "").trim();
    if (!id) {
      continue;
    }
    byId.set(id, {
      id,
      title: String(entry?.title ?? id),
      imageUrl: String(entry?.imageUrl ?? ""),
    });
  }

  return orderedIds.map((id) => byId.get(id) ?? { id, title: id, imageUrl: "" });
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
