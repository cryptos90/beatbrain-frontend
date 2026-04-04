# Host Web App

Dieser Ordner enthält die Host-Webapp für den Big-Screen-Flow:
- Login (HostLoginScreen)
- Lobby (HostLobbyScreen)
- Quiz Setup (HostQuizSetupScreen)
- Quiz (HostQuizScreen)
- Results (HostResultsScreen)

## Host-Erkennung

- Der Host-Flow wird nur im Web gerendert.
- Einstieg ist `beatbrain-frontend/App.tsx`.
- Host wird aktiviert, wenn `Platform.OS === "web"` und entweder die Route mit `/host` beginnt oder keine Mobile-Query-Parameter wie `joinCode`, `sessionId`, `code`, `auth_code`, `state` oder `error` vorhanden sind.

## Layout-Prinzip

- `center when there is space, otherwise scroll`
- `no fixed sizes for layout-relevant host containers, cards and action rows`
- Die gemeinsame Viewport-Huelle liegt in `src/host/components/HostPage.tsx`.
- `src/host/components/HostLayout.tsx` nutzt `HostPage` unterhalb des Host-Headers mit Logo.
- `src/host/hooks/useHostViewport.ts` liefert host-only Fluid-Sizing aus aktueller Viewport-Breite und -Hoehe, mit `narrow < 1024`, `laptop 1024-1439`, `wide >= 1440` plus `shortHeight < 780`.
- Host/Web ist der grosse Bildschirm fuer Moderation, Session, Quiz und Results.
- Die Mobile App bleibt der reine Player-/Antwort-Client und wird von diesem Layoutpfad nicht beruehrt.
- Wenn der verfuegbare Platz groesser als der Screen-Content ist, wird vertikal zentriert.
- Wenn der Content hoeher als der verfuegbare Bereich ist, startet die Seite oben und scrollt vertikal statt abgeschnitten zu werden.

## Verwendete Screens

- Start/Login: `HostLoginScreen`
- Session/Lobby: `HostLobbyScreen`
- Setup-Auswahl: `HostSetupModeScreen`
- Quiz-Auswahl: `HostChoosePlaylistScreen` (kompatibler Re-Export weiterhin ueber `HostQuizSetupScreen.tsx`)
- Quiz per Playlist-ID: `HostQuizCreateScreen`
- Live-Quiz: `HostQuizScreen`
- Results: `HostResultsScreen`

## Responsive Hinweise

- Alle Host-Screens laufen ueber `HostLayout` und damit indirekt ueber `HostPage`.
- Groessen fuer Header, Cards, Buttons, Typografie und Teile der Quiz-/Lobby-UI werden ueber `useHostViewport` fluide aus Breite und Hoehe des Browser-Viewports abgeleitet.
- Host-Container bleiben ueber `maxWidth` zentriert und reagieren mit abgestuften horizontalen paddings auf Browserbreite.
- Buttons bleiben in moderaten Breiten statt fensterbreit zu werden und nutzen host-only `HostActionButton`.
- Die Playlist-Auswahl bleibt ein horizontales Carousel; es wird nur viewport-basiert skaliert und im unteren Aktionsbereich kompakter gehalten.
- Mehrspaltige Bereiche fallen je nach Breite von 3-4 Spalten ueber 2-3 Spalten bis auf 1 Spalte zurueck.
- Diese Anpassungen sind host-only; mobile Screens und mobile Navigation bleiben unberuehrt.

## Lokal testen

- `cd beatbrain-frontend`
- `npm run start:web`
- `http://localhost:8081/` oder `http://localhost:8081/host/start` im Browser aufrufen
- Relevante Host-Web-Breakpoints: `2560x1440`, `1920x1080`, `1366x768`, `1280x800`, `1024x768`, `820x600`, `390x844`
