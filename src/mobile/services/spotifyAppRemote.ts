import { Linking, NativeModules, Platform } from "react-native";
import { SPOTIFY_REDIRECT_URI } from "../../shared/config";

type SpotifyAppRemoteBridge = {
  configure: (config: { clientId: string; redirectUrl: string }) => Promise<void> | void;
  connect: (accessToken: string) => Promise<void> | void;
  disconnect: () => Promise<void> | void;
  playTrackUri: (uri: string) => Promise<void> | void;
};

type NativeModulesShape = {
  SpotifyAppRemoteModule?: SpotifyAppRemoteBridge;
};

const nativeBridge = (NativeModules as NativeModulesShape).SpotifyAppRemoteModule;
const spotifyClientId = String(process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? "").trim();
const spotifyRedirectUrl = String(SPOTIFY_REDIRECT_URI ?? "").trim();

let didConfigure = false;

export class SpotifyAppRemoteError extends Error {
  code:
    | "IOS_ONLY"
    | "MODULE_MISSING"
    | "MISSING_CONFIG"
    | "MISSING_TOKEN"
    | "CONNECT_FAILED"
    | "PLAY_FAILED";

  constructor(
    code:
      | "IOS_ONLY"
      | "MODULE_MISSING"
      | "MISSING_CONFIG"
      | "MISSING_TOKEN"
      | "CONNECT_FAILED"
      | "PLAY_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "SpotifyAppRemoteError";
    this.code = code;
  }
}

async function ensureConfigured() {
  if (!nativeBridge) {
    throw new SpotifyAppRemoteError(
      "MODULE_MISSING",
      "Spotify App Remote module missing (build iOS Dev Client with native module).",
    );
  }

  if (didConfigure) {
    return;
  }

  if (!spotifyClientId || !spotifyRedirectUrl) {
    throw new SpotifyAppRemoteError(
      "MISSING_CONFIG",
      "Spotify App Remote config missing (EXPO_PUBLIC_SPOTIFY_CLIENT_ID / redirect).",
    );
  }

  await Promise.resolve(
    nativeBridge.configure({
      clientId: spotifyClientId,
      redirectUrl: spotifyRedirectUrl,
    }),
  );
  didConfigure = true;
}

export async function playTrackViaSpotifyAppRemote(
  trackUri: string,
  accessToken: string,
) {
  const normalizedUri = String(trackUri ?? "").trim();
  if (!normalizedUri) {
    return;
  }
  const normalizedAccessToken = String(accessToken ?? "").trim();
  if (!normalizedAccessToken) {
    throw new SpotifyAppRemoteError(
      "MISSING_TOKEN",
      "Spotify access token missing for App Remote connect.",
    );
  }

  if (Platform.OS !== "ios") {
    throw new SpotifyAppRemoteError(
      "IOS_ONLY",
      "Spotify App Remote playback is only available on iOS.",
    );
  }

  await ensureConfigured();

  if (!nativeBridge) {
    throw new SpotifyAppRemoteError(
      "MODULE_MISSING",
      "Spotify App Remote module missing.",
    );
  }

  try {
    await Promise.resolve(nativeBridge.connect(normalizedAccessToken));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not connect to Spotify app.";
    throw new SpotifyAppRemoteError("CONNECT_FAILED", message);
  }

  try {
    await Promise.resolve(nativeBridge.playTrackUri(normalizedUri));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not play track via Spotify.";
    throw new SpotifyAppRemoteError("PLAY_FAILED", message);
  }
}

export async function disconnectSpotifyAppRemote() {
  if (!nativeBridge) {
    return;
  }
  try {
    await Promise.resolve(nativeBridge.disconnect());
  } catch {
    // Ignore disconnect failures.
  }
}

export async function openSpotifyApp() {
  await Linking.openURL("spotify:");
}
