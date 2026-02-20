import React from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { Colors, Radius } from "../../theme";
import type { LobbyState } from "../../shared/types/app";

type Props = {
  lobby: LobbyState | null;
  actionBusy: boolean;
  socketError: string | null;
  onRestartQuiz: () => void;
  onReturnToMenu: () => void;
};

export function HostResultsScreen({
  lobby,
  actionBusy,
  socketError,
  onRestartQuiz,
  onReturnToMenu,
}: Props) {
  const sortedPlayers = [...(lobby?.players ?? [])].sort((a, b) => b.score - a.score);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={() => {}} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 12 }}
      >
        <Text
          style={{
            color: Colors.textOnBg,
            fontSize: 30,
            fontWeight: "900",
            textAlign: "center",
          }}
        >
          Ergebnisse
        </Text>

        {sortedPlayers.map((player, index) => (
          <View
            key={player.id}
            style={{
              backgroundColor: Colors.white,
              borderRadius: Radius.lg,
              paddingVertical: 12,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Text style={{ color: Colors.textOnBg, fontSize: 20, fontWeight: "900", width: 36 }}>
              #{index + 1}
            </Text>
            <Image
              source={{ uri: player.avatarDataUrl }}
              style={{ width: 64, height: 64, borderRadius: 32 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.textOnBg, fontSize: 20, fontWeight: "800" }}>
                {player.name}
              </Text>
              <Text style={{ color: Colors.textOnBg, fontSize: 17, fontWeight: "700" }}>
                Score: {player.score}
              </Text>
            </View>
          </View>
        ))}

        {!!socketError && (
          <Text style={{ color: "red", textAlign: "center", fontWeight: "700" }}>
            {socketError}
          </Text>
        )}

        <BBButton
          title={actionBusy ? "Bitte warten..." : "Restart Quiz"}
          onPress={onRestartQuiz}
          disabled={actionBusy}
        />
        <BBButton
          title={actionBusy ? "Bitte warten..." : "Return zu Menü"}
          onPress={onReturnToMenu}
          disabled={actionBusy}
        />
      </ScrollView>
    </View>
  );
}
