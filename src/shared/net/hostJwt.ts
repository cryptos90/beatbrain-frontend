type HostJwtPayload = {
  exp?: unknown;
};

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeBase64(base64: string) {
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const char of base64) {
    if (char === "=") {
      break;
    }

    const value = BASE64_ALPHABET.indexOf(char);
    if (value < 0) {
      return null;
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

function decodeBase64UrlSegment(segment: string) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${normalized}${"=".repeat((4 - (normalized.length % 4 || 4)) % 4)}`;
  return decodeBase64(padded);
}

function parseHostJwtPayload(jwt: string): HostJwtPayload | null {
  const normalizedJwt = String(jwt ?? "").trim();
  if (!normalizedJwt) {
    return null;
  }

  const parts = normalizedJwt.split(".");
  if (parts.length < 2 || !parts[1]) {
    return null;
  }

  const decoded = decodeBase64UrlSegment(parts[1]);
  if (!decoded) {
    return null;
  }

  try {
    return JSON.parse(decoded) as HostJwtPayload;
  } catch {
    return null;
  }
}

export function readHostJwtExpirationMs(jwt: string) {
  const payload = parseHostJwtPayload(jwt);
  if (!payload) {
    return null;
  }

  const expSeconds = Number(payload.exp);
  if (!Number.isFinite(expSeconds) || expSeconds <= 0) {
    return null;
  }

  return expSeconds * 1000;
}

export function isHostJwtLikelyValid(jwt: string, options?: { now?: number; skewMs?: number }) {
  const normalizedJwt = String(jwt ?? "").trim();
  if (!normalizedJwt) {
    return false;
  }

  const expMs = readHostJwtExpirationMs(normalizedJwt);
  if (!expMs) {
    return false;
  }

  const now = options?.now ?? Date.now();
  const skewMs = options?.skewMs ?? 30_000;
  return expMs > now + skewMs;
}

export function sanitizeStoredHostJwt(
  jwt: string | null | undefined,
  options?: { now?: number; skewMs?: number },
) {
  const normalizedJwt = String(jwt ?? "").trim();
  if (!normalizedJwt) {
    return null;
  }

  return isHostJwtLikelyValid(normalizedJwt, options) ? normalizedJwt : null;
}
