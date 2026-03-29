import React from "react";
import { Image, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors, Radius } from "../../theme";
import type { LobbyState } from "../../shared/types/app";
import { HostLayout } from "../components/HostLayout";

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
  const { width } = useWindowDimensions();
  const wideActions = width >= 860;
  const sortedPlayers = [...(lobby?.players ?? [])].sort((a, b) => b.score - a.score);

  return (
    <HostLayout
      maxWidth={980}
      notice={notice}
      headerEyebrow="Results"
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 24, gap: 14 }}
      >
        <View
          style={{
            borderRadius: Radius.xl,
            backgroundColor: Colors.navy,
            paddingHorizontal: 22,
            paddingVertical: 20,
            gap: 8,
          }}
        >
          <Text
            style={{
              color: "rgba(46,196,182,0.88)",
              fontSize: 12,
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
              fontSize: 34,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            {sortedPlayers.length > 0
              ? `${sortedPlayers[0].name} führt die Runde an`
              : "Ergebnisse werden geladen"}
          </Text>
          
        </View>

        {sortedPlayers.map((player, index) => (
          <View
            key={player.id}
            style={{
              backgroundColor: index === 0 ? Colors.navy : Colors.white,
              borderRadius: Radius.lg,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Text
              style={{
                color: index === 0 ? Colors.textOnNavy : Colors.textOnBg,
                fontSize: 24,
                fontWeight: "900",
                width: 42,
              }}
            >
              #{index + 1}
            </Text>
            <Image
              source={{ uri: player.avatarDataUrl }}
              style={{ width: 72, height: 72, borderRadius: 36 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: index === 0 ? Colors.textOnNavy : Colors.textOnBg,
                  fontSize: 24,
                  fontWeight: "800",
                }}
              >
                {player.name}
              </Text>
              <Text
                style={{
                  color: index === 0 ? Colors.textOnNavy : Colors.textOnBg,
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                Score: {player.score}
              </Text>
            </View>
          </View>
        ))}

        {!!socketError && (
          <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
            {socketError}
          </Text>
        )}

        <View style={{ flexDirection: wideActions ? "row" : "column", gap: 12 }}>
          <BBButton
            title={actionBusy ? "Bitte warten..." : "Quiz erneut spielen"}
            onPress={onRestartQuiz}
            disabled={actionBusy}
            style={{ flex: 1, height: 62 }}
            textStyle={{ fontSize: 19, fontWeight: "800" }}
          />
          <BBButton
            title={actionBusy ? "Bitte warten..." : "Zurück zur Lobby"}
            onPress={onReturnToMenu}
            disabled={actionBusy}
            style={{ flex: 1, height: 62 }}
            textStyle={{ fontSize: 19, fontWeight: "800" }}
          />
        </View>
      </ScrollView>
    </HostLayout>
  );
}
