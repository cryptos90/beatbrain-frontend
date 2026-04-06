import React from "react";
import { Image, Text, View } from "react-native";
import { Colors } from "../../theme";
import type { LobbyState } from "../../shared/types/app";
import { HostActionButton } from "../components/HostActionButton";
import { HostLayout } from "../components/HostLayout";
import { HostPanel } from "../components/HostPanel";
import { HostPlayerStageGrid } from "../components/HostPlayerStageGrid";
import { HostResponsiveGrid } from "../components/HostResponsiveGrid";
import { HostScreenContainer } from "../components/HostScreenContainer";
import { useHostViewport } from "../hooks/useHostViewport";

type Props = {
  lobby: LobbyState | null;
  joinUrl: string;
  socketError: string | null;
  canOpenSetup: boolean;
  onOpenSetup: () => void;
  notice?: string | null;
};

function stageStatusLabel(status: LobbyState["status"] | undefined) {
  if (status === "question") {
    return "Frage läuft";
  }
  if (status === "reveal") {
    return "Auflösung";
  }
  if (status === "results") {
    return "Ergebnisse";
  }
  return "Wartet auf Start";
}

export function HostLobbyScreen({
  lobby,
  joinUrl,
  socketError,
  canOpenSetup,
  onOpenSetup,
  notice,
}: Props) {
  const {
    width,
    contentMax,
    radii,
    space,
    typeScale,
    fluidBetween,
    isCompactHeight,
    isLowHeight,
    panelPaddingY,
  } = useHostViewport();
  const sessionCodeFontSize = fluidBetween(
    isCompactHeight ? 30 : 36,
    isCompactHeight ? 68 : 84,
    "width",
  );
  const qrSize = Math.min(
    fluidBetween(isCompactHeight ? 112 : 128, isCompactHeight ? 176 : 220, "width"),
    fluidBetween(isCompactHeight ? 112 : 128, isCompactHeight ? 168 : 220, "height"),
  );
  const hasPlayers = Boolean(lobby?.players.length);
  const playerStageHeight = fluidBetween(isCompactHeight ? 196 : 220, isCompactHeight ? 246 : 286, "height");

  return (
    <HostLayout maxWidth={contentMax.stage} notice={notice} headerEyebrow="Lobby Stage">
      <HostScreenContainer>
        {!lobby ? (
          <HostPanel tone="glass" style={{ alignItems: "center", justifyContent: "center" }}>
            <Text
              style={{
                color: Colors.textOnBg,
                textAlign: "center",
                fontWeight: "900",
                fontSize: fluidBetween(22, 30, "width"),
              }}
            >
              Session wird vorbereitet...
            </Text>
          </HostPanel>
        ) : (
          <>
            <HostResponsiveGrid
              minItemWidth={isCompactHeight ? 280 : 320}
              maxColumns={2}
              gap={isCompactHeight ? space.md : space.lg}
            >
              <HostPanel
                tone="navy"
                padding={isCompactHeight ? "sm" : "md"}
                style={{ height: "100%", alignItems: "center", justifyContent: "center" }}
              >
                <Text
                  style={{
                    color: "rgba(46,196,182,0.88)",
                    fontSize: typeScale.label,
                    fontWeight: "900",
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    textAlign: "center",
                  }}
                >
                  {stageStatusLabel(lobby.status)}
                </Text>
                <Text
                  style={{
                    color: Colors.textOnNavy,
                    fontSize: sessionCodeFontSize,
                    fontWeight: "900",
                    letterSpacing: fluidBetween(isCompactHeight ? 1 : 2, isCompactHeight ? 4 : 6, "width"),
                    textAlign: "center",
                  }}
                >
                  {lobby.joinCode}
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.82)",
                    fontSize: typeScale.bodySm,
                    lineHeight: typeScale.bodySm + (isLowHeight ? 4 : 6),
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Spieler treten per QR oder Join-Code bei. Sobald mindestens ein Spieler da ist, kann das Quiz vorbereitet werden.
                </Text>
                <View style={{ width: "100%", maxWidth: contentMax.compact }}>
                  <HostActionButton
                    title="Spiel vorbereiten"
                    onPress={onOpenSetup}
                    disabled={!canOpenSetup}
                    invert
                    textStyle={{
                      fontSize: fluidBetween(16, 22, "width"),
                      fontWeight: "900",
                      letterSpacing: 0.4,
                    }}
                  />
                </View>
              </HostPanel>

              <HostPanel
                tone="glass"
                padding={isCompactHeight ? "sm" : "md"}
                style={{ height: "100%", alignItems: "center", justifyContent: "center" }}
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
                  Mit dem Handy beitreten
                </Text>

                {!!joinUrl && (
                  <View
                    style={{
                      width: "100%",
                      maxWidth: qrSize + space.md * 2,
                      padding: isCompactHeight ? space.xs : space.sm,
                      borderRadius: radii.lg,
                      backgroundColor: Colors.white,
                    }}
                  >
                    <Image
                      source={{
                        uri: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(joinUrl)}`,
                      }}
                      style={{
                        width: "100%",
                        aspectRatio: 1,
                        maxWidth: qrSize,
                        alignSelf: "center",
                        borderRadius: radii.md,
                      }}
                    />
                  </View>
                )}

                <Text
                  style={{
                    color: Colors.textOnBg,
                    fontSize: fluidBetween(16, 19, "width"),
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  QR scannen oder Join-Code eingeben
                </Text>
              </HostPanel>
            </HostResponsiveGrid>

            {!!socketError && (
              <Text
                style={{
                  color: Colors.textOnBg,
                  textAlign: "center",
                  fontWeight: "700",
                  fontSize: typeScale.bodySm,
                }}
              >
                {socketError}
              </Text>
            )}

            <HostPanel
              tone={hasPlayers ? "glass" : "soft"}
              padding={isCompactHeight || width < 1600 ? "sm" : "md"}
            >
              {hasPlayers ? (
                <HostPlayerStageGrid
                  players={lobby.players}
                  status={lobby.status}
                  height={Math.max(160, playerStageHeight - panelPaddingY)}
                />
              ) : (
                <HostPanel
                  tone="soft"
                  maxWidth={contentMax.compact}
                  style={{
                    minHeight: Math.max(160, playerStageHeight - panelPaddingY),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: Colors.textOnBg,
                      textAlign: "center",
                      fontWeight: "800",
                      fontSize: typeScale.bodyLg,
                      lineHeight: typeScale.bodyLg + 7,
                    }}
                  >
                    Warte auf den ersten Spieler.
                  </Text>
                </HostPanel>
              )}
            </HostPanel>
          </>
        )}
      </HostScreenContainer>
    </HostLayout>
  );
}
