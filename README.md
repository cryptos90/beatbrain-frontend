# beatbrain-frontend

Expo frontend for BeatBrain (singleplayer, host, player flows).

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` (copy from `.env.example`) and set at least:

```env
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=<your-client-id>
EXPO_PUBLIC_SPOTIFY_REDIRECT_URI=beatbrain-login://callback
EXPO_PUBLIC_SPOTIFY_REDIRECT_URI_WEB=http://127.0.0.1:3000/auth/spotify/callback
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

Notes:
- Keep `.env` local only; do not commit it.
- `.env.example` must stay secret-free.

## Run locally

Option 1 (script in this folder):

```bat
start-frontend.bat
```

Optional modes:

```bat
start-frontend.bat web
start-frontend.bat lan
```

Option 2 (manual):

```bash
npm run start
```

## Spotify redirect URI rules

- Mobile (Expo/React Native): `beatbrain-login://callback`
- Local web: `http://127.0.0.1:<PORT>/auth/spotify/callback` (or `http://[::1]:<PORT>/auth/spotify/callback`)
- Production web: `https://<domain>/.../callback`
- Avoid `192.168.x.x`, `localhost` mismatches, and `exp://...` as Spotify redirect URI.
