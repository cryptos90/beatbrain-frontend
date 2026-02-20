import React from "react";
import { Image, Text, View, useWindowDimensions } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { Colors } from "../../theme";
import type { LobbyState } from "../../shared/types/app";

type Props = {
  lobby: LobbyState | null;
  joinUrl: string;
  creatingLobby: boolean;
  socketError: string | null;
  canOpenSetup: boolean;
  onCreateLobby: () => void;
  onOpenSetup: () => void;
};

function playerStatusLabel(status: LobbyState["status"], answered: boolean, continued: boolean) {
  if (status === "reveal") {
    return continued ? "Weiter" : "Wartet";
  }
  if (status === "question") {
    return answered ? "Answered" : "Open";
  }
  return "Ready";
}

export function HostLobbyScreen({
  lobby,
  joinUrl,
  creatingLobby,
  socketError,
  canOpenSetup,
  onCreateLobby,
  onOpenSetup,
}: Props) {
  const { width } = useWindowDimensions();
  const gridColumns = width >= 1600 ? 5 : width >= 1300 ? 4 : width >= 980 ? 3 : 2;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={() => {}} />

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8, gap: 14 }}>
        {!lobby ? (
          <>
            <Text
              style={{
                color: Colors.textOnBg,
                fontSize: 24,
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              Host Lobby starten
            </Text>
            <BBButton
              title={creatingLobby ? "Bitte warten..." : "Session starten"}
              onPress={onCreateLobby}
              disabled={creatingLobby}
            />
          </>
        ) : (
          <>
            <Text
              style={{
                color: Colors.textOnBg,
                fontSize: 34,
                fontWeight: "900",
                textAlign: "center",
                letterSpacing: 2,
              }}
            >
              {lobby.joinCode}
            </Text>

            {!!joinUrl && (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.45)",
                  borderRadius: 16,
                  paddingVertical: 12,
                  gap: 8,
                }}
              >
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(joinUrl)}`,
                  }}
                  style={{ width: 160, height: 160, borderRadius: 12 }}
                />
                <Text style={{ color: Colors.textOnBg, fontSize: 13, fontWeight: "700" }}>
                  {joinUrl}
                </Text>
              </View>
            )}

            <BBButton
              title="Spiel starten"
              onPress={onOpenSetup}
              disabled={!canOpenSetup}
            />
            {!canOpenSetup && (
              <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
                Mindestens ein Player muss joinen.
              </Text>
            )}
          </>
        )}

        {!!socketError && (
          <Text style={{ color: "red", textAlign: "center", fontWeight: "700" }}>
            {socketError}
          </Text>
        )}

        {!!lobby && lobby.players.length > 0 && (
          <View style={{ marginTop: "auto", marginBottom: 10 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
              {lobby.players.map((player) => (
                <View
                  key={player.id}
                  style={{
                    width: `${100 / gridColumns}%`,
                    paddingHorizontal: 6,
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      borderRadius: 16,
                      backgroundColor: Colors.white,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      alignItems: "center",
                      minHeight: 176,
                    }}
                  >
                    <Image
                      source={{ uri: player.avatarDataUrl }}
                      style={{ width: 88, height: 88, borderRadius: 44 }}
                    />
                    <Text
                      numberOfLines={1}
                      style={{
                        marginTop: 10,
                        color: Colors.textOnBg,
                        fontSize: 20,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      {player.name}
                    </Text>
                    <Text style={{ color: Colors.textOnBg, fontSize: 17, fontWeight: "700" }}>
                      Score: {player.score}
                    </Text>
                    <Text style={{ marginTop: 6, color: Colors.textOnBg, fontWeight: "700" }}>
                      {playerStatusLabel(lobby.status, player.answered, player.readyForNext)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
