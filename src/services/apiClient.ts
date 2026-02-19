import { API_BASE_URL } from "../config";
import { getStoredHostJwt } from "./authStorage";

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
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && retry && jwt) {
    const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (refreshResponse.ok) {
      const refreshPayload = (await refreshResponse.json()) as JsonRecord;
      if (refreshPayload.appJwt) {
        context.setJwt?.(String(refreshPayload.appJwt));
        return requestJson(context, path, options, false);
      }
    }

    context.setJwt?.(null);
  }

  if (!response.ok) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10)
      : undefined;
    const text = await response.text();
    let parsedBody: any;
    try {
      parsedBody = text ? JSON.parse(text) : undefined;
    } catch {
      parsedBody = undefined;
    }

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
