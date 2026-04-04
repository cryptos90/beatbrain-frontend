import { API_BASE_URL } from "../config";
import { getStoredHostJwt, setStoredHostJwt } from "./authStorage";

export type JsonRecord = Record<string, any>;
const DEFAULT_REQUEST_TIMEOUT_MS = 8_000;

type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
};

export type ApiClientContext = {
  baseUrl?: string;
  getJwt: () => string | null | Promise<string | null>;
  setJwt?: (nextJwt: string | null) => void;
};

export class ApiHttpError extends Error {
  status: number;
  retryAfterSeconds?: number;
  details?: any;

  constructor(
    message: string,
    status: number,
    options?: { retryAfterSeconds?: number; details?: any },
  ) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.details = options?.details;
  }
}

function backendRequestError(baseUrl: string, path: string, error: unknown) {
  const causeMessage =
    error instanceof Error && error.message ? ` (${error.message})` : "";
  const requestUrl = `${baseUrl}${path}`;

  if (error instanceof Error && error.message.startsWith("Request timed out after")) {
    return new ApiHttpError(
      `Request to ${requestUrl} timed out.${causeMessage} The backend or Spotify upstream request is responding too slowly.`,
      0,
      {
        details: {
          cause: error.message,
          requestUrl,
          timedOut: true,
        },
      },
    );
  }

  return new ApiHttpError(
    `Backend not reachable at ${baseUrl}. Is backend running on this host/port?${causeMessage}`,
    0,
    {
      details: {
        cause: error instanceof Error ? error.message : String(error),
        requestUrl,
      },
    },
  );
}

async function clearJwt(context: ApiClientContext) {
  context.setJwt?.(null);
  await setStoredHostJwt(null);
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const sourceSignal = options.signal;
  let timedOut = false;

  const abortFromSource = () => {
    controller.abort();
  };

  if (sourceSignal) {
    if (sourceSignal.aborted) {
      controller.abort();
    } else {
      sourceSignal.addEventListener("abort", abortFromSource, { once: true });
    }
  }

  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new Error(`Request timed out after ${Math.ceil(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
    sourceSignal?.removeEventListener("abort", abortFromSource);
  }
}

export async function requestJson(
  context: ApiClientContext,
  path: string,
  options: ApiRequestOptions = {},
  retry = true,
): Promise<JsonRecord> {
  const { timeoutMs, ...requestInit } = options;
  let jwt = await Promise.resolve(context.getJwt());
  if (!jwt) {
    jwt = await getStoredHostJwt();
    if (jwt) {
      context.setJwt?.(jwt);
    }
  }

  const headers: Record<string, string> = {
    ...(requestInit.headers as Record<string, string> | undefined),
  };

  if (typeof requestInit.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  }

  const baseUrl = context.baseUrl ?? API_BASE_URL;
  let response: Response;
  try {
    response = await fetchWithTimeout(`${baseUrl}${path}`, {
      ...requestInit,
      headers,
    }, timeoutMs);
  } catch (error) {
    throw backendRequestError(baseUrl, path, error);
  }

  if (response.status === 401 && retry && jwt) {
    let refreshResponse: Response;
    try {
      refreshResponse = await fetchWithTimeout(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });
    } catch (error) {
      throw backendRequestError(baseUrl, "/auth/refresh", error);
    }

    if (refreshResponse.ok) {
      const refreshPayload = (await refreshResponse.json()) as JsonRecord;
      if (refreshPayload.appJwt) {
        const nextJwt = String(refreshPayload.appJwt);
        context.setJwt?.(nextJwt);
        await setStoredHostJwt(nextJwt);
        return requestJson(context, path, options, false);
      }
    }

    await clearJwt(context);
  }

  if (response.status === 401) {
    await clearJwt(context);
  }

  if (!response.ok) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterFromHeader = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10)
      : undefined;
    const text = await response.text();
    let parsedBody: any;
    try {
      parsedBody = text ? JSON.parse(text) : undefined;
    } catch {
      parsedBody = undefined;
    }

    const retryAfterFromBody =
      typeof parsedBody?.retryAfterSeconds === "number"
        ? parsedBody.retryAfterSeconds
        : typeof parsedBody?.error?.retryAfterSeconds === "number"
          ? parsedBody.error.retryAfterSeconds
          : undefined;
    const retryAfterSeconds =
      typeof retryAfterFromHeader === "number" && Number.isFinite(retryAfterFromHeader)
        ? retryAfterFromHeader
        : typeof retryAfterFromBody === "number" && Number.isFinite(retryAfterFromBody)
          ? retryAfterFromBody
          : undefined;

    const message =
      parsedBody?.error?.message ||
      parsedBody?.message ||
      text ||
      `HTTP ${response.status}`;
    throw new ApiHttpError(String(message), response.status, {
      retryAfterSeconds:
        typeof retryAfterSeconds === "number" && Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds
          : undefined,
      details: parsedBody,
    });
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as JsonRecord) : {};
}
