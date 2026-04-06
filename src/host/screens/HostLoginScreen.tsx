import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Colors } from "../../theme";
import type { HostSpotifyStatus } from "../../shared/net/beatbrainApi";
import { HostActionBar } from "../components/HostActionBar";
import { HostActionButton } from "../components/HostActionButton";
import { HostLayout } from "../components/HostLayout";
import { HostPanel } from "../components/HostPanel";
import { HostResponsiveGrid } from "../components/HostResponsiveGrid";
import { HostScreenContainer } from "../components/HostScreenContainer";
import { useHostViewport } from "../hooks/useHostViewport";

type Props = {
  hasAuth: boolean;
  authBusy: boolean;
  authError: string | null;
  spotifyStatus: HostSpotifyStatus | null;
  spotifyStatusLoading: boolean;
  spotifyPlaybackReady: boolean | null;
  creatingLobby: boolean;
  socketError: string | null;
  onLogin: () => void;
  onStartSession: () => void;
  notice?: string | null;
};

const LOGIN_STEPS = [
  {
    step: "1",
    title: "Spotify verbinden",
    text: "Der Host authentifiziert sich einmal mit Spotify.",
  },
  {
    step: "2",
    title: "Session öffnen",
    text: "Der große Bildschirm zeigt Join-Code und QR-Code.",
  },
  {
    step: "3",
    title: "Lesbar moderieren",
    text: "Fragen, Timer und Auflösung bleiben auf jedem Browserfenster im Fokus.",
  },
];

export function HostLoginScreen({
  hasAuth,
  authBusy,
  authError,
  spotifyStatus,
  spotifyStatusLoading,
  spotifyPlaybackReady,
  creatingLobby,
  socketError,
  onLogin,
  onStartSession,
  notice,
}: Props) {
  const {
    width,
    canUseWideSplit,
    compactViewport,
    isCompactHeight,
    isLowHeight,
    contentMax,
    radii,
    space,
    typeScale,
    fluidBetween,
  } = useHostViewport();
  const wideLayout = canUseWideSplit;
  const panelTitleSize = fluidBetween(isCompactHeight ? 22 : 24, isCompactHeight ? 32 : 36, "width");
  const panelTitleLineHeight = panelTitleSize + (isLowHeight ? 4 : 6);
  const stepTitleSize = fluidBetween(16, 20, "width");
  const stepBodySize = typeScale.bodySm;
  const buttonFontSize = fluidBetween(16, 20, "width");
  const playbackBlocked = hasAuth && spotifyStatus?.webPlaybackStatus === "blocked";
  const playbackUnknown = hasAuth && spotifyStatus?.webPlaybackStatus === "unknown";
  const reconnectRequired = playbackBlocked;
  const loginLabel = reconnectRequired
    ? "Spotify erneut verbinden"
    : hasAuth
      ? "Mit Spotify verbunden"
      : "Mit Spotify verbinden";
  const startLabel = creatingLobby ? "Session wird erstellt..." : "Host-Session starten";
  const statusTitle = !hasAuth
    ? "Noch nicht verbunden"
    : spotifyStatusLoading
      ? "Spotify wird geprüft"
      : playbackBlocked
        ? "Spotify neu verbinden"
        : "Spotify verbunden";
  const statusDescription = !hasAuth
    ? "Verbinde zuerst Spotify, damit Playlists geladen und Sessions gestartet werden können."
    : spotifyStatusLoading
      ? "Die aktuelle Spotify-Anmeldung wird gerade für Browser-Playback geprüft."
      : playbackBlocked
        ? spotifyStatus?.message ||
          "Die aktuelle Spotify-Anmeldung erlaubt noch kein Host-Browser-Playback. Bitte erneut verbinden."
        : playbackUnknown
          ? spotifyStatus?.message ||
            "Spotify ist verbunden. Browser-Playback wird beim Quizstart im Browser verifiziert."
          : "Spotify ist verbunden und für Browser-Playback im Host-Modus bereit.";

  return (
    <HostLayout
      maxWidth={contentMax.wide}
      notice={notice}
      headerEyebrow="Big Screen Host"
      compactHeader={compactViewport}
    >
      <HostScreenContainer>
        <View style={{ flexDirection: wideLayout ? "row" : "column", gap: isCompactHeight ? space.md : space.lg }}>
          <HostPanel
            tone="navy"
            padding={isCompactHeight ? "sm" : "md"}
            style={{ flex: wideLayout ? 1.15 : undefined }}
          >
            <Text
              style={{
                color: Colors.textOnNavy,
                fontSize: panelTitleSize,
                fontWeight: "900",
                lineHeight: panelTitleLineHeight,
                textAlign: wideLayout ? "left" : "center",
              }}
            >
              Session in drei Schritten starten
            </Text>

            <HostResponsiveGrid
              minItemWidth={width < 480 ? 170 : 210}
              maxColumns={3}
              gap={space.sm}
            >
              {LOGIN_STEPS.map((item) => (
                <View
                  key={item.step}
                  style={{
                    height: "100%",
                    minHeight:
                      width <= 479
                        ? undefined
                        : fluidBetween(isCompactHeight ? 118 : 136, isCompactHeight ? 154 : 176, "height"),
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: radii.lg,
                    paddingHorizontal: space.md,
                    paddingVertical: isCompactHeight ? space.sm : space.md,
                    gap: space.xs,
                  }}
                >
                  <Text
                    style={{
                      color: Colors.textOnNavy,
                      fontSize: typeScale.label,
                      fontWeight: "900",
                      letterSpacing: 1,
                    }}
                  >
                    SCHRITT {item.step}
                  </Text>
                  <Text
                    style={{
                      color: Colors.textOnNavy,
                      fontSize: stepTitleSize,
                      fontWeight: "800",
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(46,196,182,0.92)",
                      fontSize: stepBodySize,
                      lineHeight: stepBodySize + 6,
                      fontWeight: "600",
                    }}
                  >
                    {item.text}
                  </Text>
                </View>
              ))}
            </HostResponsiveGrid>
          </HostPanel>

          <HostPanel
            tone="glass"
            padding={isCompactHeight ? "sm" : "md"}
            style={{ flex: wideLayout ? 0.95 : undefined }}
          >
            <Text
              style={{
                color: Colors.textOnBg,
                fontSize: typeScale.label,
                fontWeight: "900",
                letterSpacing: 1.2,
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              Host bereit machen
            </Text>

            <View
              style={{
                borderRadius: radii.lg,
                backgroundColor:
                  !hasAuth || spotifyStatusLoading
                    ? "rgba(32,44,89,0.08)"
                    : playbackBlocked
                      ? "rgba(234,179,8,0.18)"
                      : "rgba(22,163,74,0.14)",
                paddingHorizontal: space.lg,
                paddingVertical: isCompactHeight ? space.md : space.lg,
                gap: space.xs,
              }}
            >
              <Text
                style={{
                  color: Colors.textOnBg,
                  fontSize: fluidBetween(20, 24, "width"),
                  fontWeight: "900",
                  textAlign: "center",
                }}
              >
                {statusTitle}
              </Text>
              <Text
                style={{
                  color: "rgba(32,44,89,0.86)",
                  fontSize: typeScale.bodySm,
                  lineHeight: typeScale.bodySm + 6,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                {statusDescription}
              </Text>
            </View>

            {(authBusy || spotifyStatusLoading) && (
              <View style={{ alignItems: "center", gap: space.sm }}>
                <ActivityIndicator size={36 as any} color={Colors.navy} />
                <Text
                  style={{
                    color: Colors.textOnBg,
                    fontSize: typeScale.body,
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  {authBusy ? "Warte auf Spotify-Login..." : "Spotify-Berechtigung wird geprüft..."}
                </Text>
              </View>
            )}

            <HostActionBar maxWidth={640} minItemWidth={220} stackBelow={920}>
              <HostActionButton
                title={loginLabel}
                onPress={onLogin}
                disabled={authBusy || (hasAuth && !playbackBlocked && !spotifyStatusLoading)}
                textStyle={{ fontSize: buttonFontSize, fontWeight: "800" }}
              />
              <HostActionButton
                title={startLabel}
                onPress={onStartSession}
                disabled={!hasAuth || creatingLobby || authBusy || spotifyStatusLoading || playbackBlocked}
                textStyle={{ fontSize: buttonFontSize, fontWeight: "800" }}
              />
            </HostActionBar>

            {!!authError && (
              <Text
                style={{
                  color: Colors.textOnBg,
                  fontSize: typeScale.bodySm,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {authError}
              </Text>
            )}
            {!!socketError && (
              <Text
                style={{
                  color: Colors.textOnBg,
                  fontSize: typeScale.bodySm,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {socketError}
              </Text>
            )}
          </HostPanel>
        </View>
      </HostScreenContainer>
    </HostLayout>
  );
}
