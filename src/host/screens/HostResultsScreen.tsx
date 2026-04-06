import React from "react";
import { Text, View } from "react-native";
import { Colors } from "../../theme";
import type { LobbyState } from "../../shared/types/app";
import { HostActionBar } from "../components/HostActionBar";
import { HostActionButton } from "../components/HostActionButton";
import { HostLayout } from "../components/HostLayout";
import { HostPanel } from "../components/HostPanel";
import { HostPlayerAvatar } from "../components/HostPlayerAvatar";
import { HostResponsiveGrid } from "../components/HostResponsiveGrid";
import { HostScreenContainer } from "../components/HostScreenContainer";
import { useHostViewport } from "../hooks/useHostViewport";

type Props = {
  lobby: LobbyState | null;
  actionBusy: boolean;
  socketError: string | null;
  onRestartQuiz: () => void;
  onReturnToMenu: () => void;
  notice?: string | null;
};

export function HostResultsScreen({
  lobby,
  actionBusy,
  socketError,
  onRestartQuiz,
  onReturnToMenu,
  notice,
}: Props) {
  const { width, contentMax, typeScale, fluidBetween, space, isCompactHeight } = useHostViewport();
  const avatarSize = fluidBetween(isCompactHeight ? 42 : 56, isCompactHeight ? 60 : 76, "width");
  const sortedPlayers = [...(lobby?.players ?? [])].sort((a, b) => b.score - a.score);

  return (
    <HostLayout maxWidth={contentMax.wide} notice={notice} headerEyebrow="Results">
      <HostScreenContainer>
        <HostPanel tone="navy" padding={isCompactHeight ? "sm" : "md"}>
          <Text
            style={{
              color: "rgba(46,196,182,0.88)",
              fontSize: typeScale.label,
              fontWeight: "900",
              letterSpacing: 1.1,
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            Runde beendet
          </Text>
          <Text
            style={{
              color: Colors.textOnNavy,
              fontSize: fluidBetween(isCompactHeight ? 22 : 26, isCompactHeight ? 30 : 38, "width"),
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            {sortedPlayers.length > 0
              ? `${sortedPlayers[0].name} führt die Runde an`
              : "Ergebnisse werden geladen"}
          </Text>
        </HostPanel>

        <HostResponsiveGrid
          minItemWidth={width >= 1280 ? (isCompactHeight ? 180 : 220) : isCompactHeight ? 190 : 240}
          maxColumns={width >= 1360 ? 5 : width >= 1024 ? 4 : 3}
          gap={isCompactHeight ? space.md : space.lg}
        >
          {sortedPlayers.map((player, index) => {
            const highlight = index === 0;
            return (
              <HostPanel
                key={player.id}
                tone={highlight ? "navy" : "white"}
                padding={isCompactHeight ? "sm" : "md"}
                style={{ height: "100%", alignItems: "center" }}
              >
                <Text
                  style={{
                    color: highlight ? Colors.textOnNavy : Colors.textOnBg,
                    fontSize: fluidBetween(isCompactHeight ? 18 : 20, isCompactHeight ? 22 : 28, "width"),
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  #{index + 1}
                </Text>
                <HostPlayerAvatar
                  uri={player.avatarDataUrl}
                  name={player.name}
                  size={avatarSize}
                  backgroundColor={highlight ? "rgba(255,255,255,0.16)" : "rgba(32,44,89,0.1)"}
                  textColor={highlight ? Colors.textOnNavy : Colors.textOnBg}
                />
                <Text
                  style={{
                    color: highlight ? Colors.textOnNavy : Colors.textOnBg,
                    fontSize: fluidBetween(isCompactHeight ? 18 : 22, isCompactHeight ? 22 : 28, "width"),
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  {player.name}
                </Text>
                <Text
                  style={{
                    color: highlight ? Colors.textOnNavy : Colors.textOnBg,
                    fontSize: typeScale.body,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Score: {player.score}
                </Text>
              </HostPanel>
            );
          })}
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

        <HostActionBar maxWidth={840} minItemWidth={220} gap={isCompactHeight ? space.sm : space.md}>
          <HostActionButton
            title={actionBusy ? "Bitte warten..." : "Quiz erneut spielen"}
            onPress={onRestartQuiz}
            disabled={actionBusy}
            textStyle={{ fontSize: fluidBetween(17, 19, "width"), fontWeight: "800" }}
          />
          <HostActionButton
            title={actionBusy ? "Bitte warten..." : "Zurück zur Lobby"}
            onPress={onReturnToMenu}
            disabled={actionBusy}
            textStyle={{ fontSize: fluidBetween(17, 19, "width"), fontWeight: "800" }}
          />
        </HostActionBar>
      </HostScreenContainer>
    </HostLayout>
  );
}
