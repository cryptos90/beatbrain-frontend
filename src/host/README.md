# Host Web App

Dieser Ordner enthaelt die browserbasierte Host-Webapp fuer BeatBrain:
- Login: `HostLoginScreen`
- Lobby: `HostLobbyScreen`
- Setup: `HostSetupModeScreen`
- Playlist-Auswahl: `HostChoosePlaylistScreen`
- Manuelle Playlist-ID: `HostQuizCreateScreen`
- Live Quiz: `HostQuizScreen`
- Results: `HostResultsScreen`

## Host-Erkennung

- Einstieg bleibt `beatbrain-frontend/App.tsx`.
- Die aktive Host-App rendert nur auf `Platform.OS === "web"`.
- Produktive Host-Routen liegen unter `/host/*`.
- Browser-only Preview-Routen fuer Layout-QA liegen unter `/host/preview/*` und rendern dieselben Screen-Komponenten mit festen Fixture-Daten.

## Responsive Architektur

- Die Host-Webapp verwendet host-only Responsive-Primitives:
  - `src/host/hooks/useHostViewport.ts`
  - `src/host/components/HostScreenContainer.tsx`
  - `src/host/components/HostPanel.tsx`
  - `src/host/components/HostActionBar.tsx`
  - `src/host/components/HostResponsiveGrid.tsx`
  - `src/host/components/HostPlayerAvatar.tsx`
  - `src/host/components/HostPlayerStageGrid.tsx`
- `HostPage` misst nur den verfuegbaren Bereich unter Header/Notice und setzt `center when there is space, otherwise scroll` mit vertikalem Reflow um.
- `HostResponsiveGrid` reagiert auf seine gemessene Containerbreite und ersetzt starre Desktop-Spalten bzw. horizontale Host-Only-Carousels.
- `HostActionBar` laesst Button-Gruppen umbrechen oder stapelt sie auf kleineren Viewports.
- `HostPlayerAvatar` verhindert Layout-Brueche bei fehlenden Avatar-URLs.
- `HostPlayerStageGrid` haelt die Lobby-Spielerflaeche auf konstanter Hoehe und skaliert die Kacheln innerhalb des verfuegbaren Raums statt den Bereich durch neue Zeilen wachsen zu lassen.

## Breakpoint-Strategie

- `verySmall`: bis `359`
- `small`: `360-479`
- `mobile`: `480-767`
- `tablet`: `768-1023`
- `laptop`: `1024-1279`
- `desktop`: `1280-1599`
- `wide`: `1600+`
- Zusatzflags:
  - `compactHeight`: unter `860`
  - `lowHeight`: unter `760`
  - `veryLowHeight`: unter `680`
  - `largeDisplay`: `2440+`
  - `4K`: `3840+` oder `2160` Hoehe
  - `shortHeight`: unter `700`
  - `veryShortHeight`: unter `580`
  - `landscapePhone`: bis `932x430`

## Wichtige Layout-Aenderungen

- Login, Lobby, Setup, Choose, Create, Quiz und Results nutzen jetzt dieselben Panels, Spacing-Tokens und Action-Bars.
- Die Playlist-Auswahl ist kein horizontales Carousel mehr, sondern ein responsives Kartenraster ohne Zoom-Zwang.
- Quiz-Antwortgruppen umbrechen jetzt immer sauber; es gibt kein `nowrap`-Layout fuer dichte Reveal-Zustaende mehr.
- Header, Logo, Typografie, Innenabstaende, CTA-Hoehen und Content-Breiten reagieren host-only fluide auf Viewport-Breite und -Hoehe.
- Horizontale Overflows werden ueber gemessene Containerbreiten, Wrap-Verhalten und reduzierte Max-Breiten vermieden.

## Doku und Verifikation

- Die detaillierte Responsive-Doku liegt unter `beatbrain-frontend/docs/host-responsive.md`.
- Browser-Verifikation kann lokal reproduziert werden mit:
  - `npx expo export -p web --dev --clear --max-workers 1`
  - `node scripts/serve-dist.cjs dist 8081`
  - `node scripts/verify-host-responsive.cjs`
- Das QA-Skript prueft jetzt sowohl horizontalen Dokument-Overflow als auch innere vertikale Scroll-Regionen im Web-Host-Flow.
- Der Report liegt danach unter `beatbrain-frontend/test-results/host-responsive/report.json`.
