import React from "react";
import { Image, Text, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { Colors } from "../../theme";
import type { LobbyState } from "../../shared/types/app";

type Props = {
  lobby: LobbyState | null;
  onRestart: () => void;
  onReturnMenu: () => void;
};

export function MultiplayerResultsView({ lobby, onRestart, onReturnMenu }: Props) {
  const players = [...(lobby?.players ?? [])].sort((a, b) => b.score - a.score);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onReturnMenu} />

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 12, gap: 12 }}>
        <Text
          style={{
            color: Colors.textOnBg,
            fontSize: 24,
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          Multiplayer Results
        </Text>

        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.7)",
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 10,
          }}
        >
          {players.length === 0 && (
            <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
              No players connected.
            </Text>
          )}

          {players.map((player, index) => (
            <View
              key={player.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <Image
                  source={{ uri: player.avatarDataUrl }}
                  style={{ width: 46, height: 46, borderRadius: 23 }}
                />
                <Text
                  style={{
                    color: Colors.textOnBg,
                    fontSize: 17,
                    fontWeight: "800",
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                >
                  {index + 1}. {player.name}
                </Text>
              </View>
              <Text style={{ color: Colors.textOnBg, fontWeight: "800", fontSize: 18 }}>
                {player.score}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: "auto", gap: 10, paddingBottom: 20 }}>
          <BBButton title="Restart Quiz" onPress={onRestart} disabled />
          <BBButton title="Return to Menu" onPress={onReturnMenu} />
        </View>
      </View>
    </View>
  );
}
