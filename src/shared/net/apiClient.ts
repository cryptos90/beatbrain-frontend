import { API_BASE_URL } from "../config";
import { getStoredHostJwt, setStoredHostJwt } from "./authStorage";

export type JsonRecord = Record<string, any>;

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

function backendUnreachableError(baseUrl: string, error: unknown) {
  const causeMessage =
    error instanceof Error && error.message ? ` (${error.message})` : "";
  return new ApiHttpError(
    `Backend not reachable at ${baseUrl}. Is backend running on this host/port?${causeMessage}`,
    0,
    { details: { cause: error instanceof Error ? error.message : String(error) } },
  );
}

async function clearJwt(context: ApiClientContext) {
  context.setJwt?.(null);
  await setStoredHostJwt(null);
}

export async function requestJson(
  context: ApiClientContext,
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<JsonRecord> {
  let jwt = await Promise.resolve(context.getJwt());
  if (!jwt) {
    jwt = await getStoredHostJwt();
    if (jwt) {
      context.setJwt?.(jwt);
    }
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  }

  const baseUrl = context.baseUrl ?? API_BASE_URL;
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw backendUnreachableError(baseUrl, error);
  }

  if (response.status === 401 && retry && jwt) {
    let refreshResponse: Response;
    try {
      refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });
    } catch (error) {
      throw backendUnreachableError(baseUrl, error);
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

