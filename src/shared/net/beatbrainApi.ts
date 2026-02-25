import { API_BASE_URL } from "../config";
import type { ChoosePlaylist } from "../types/app";
import type { ApiClientContext, JsonRecord } from "./apiClient";
import { requestJson } from "./apiClient";

export type SpotifyPlayerDevice = {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
};

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

export async function deleteQuizSession(context: ApiClientContext, sessionId: string) {
  return requestJson(context, `/quiz/sessions/${sessionId}`, {
    method: "DELETE",
  });
}
