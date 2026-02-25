import React from "react";
import { Image, Text, View, useWindowDimensions } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors } from "../../theme";
import type { LobbyState } from "../../shared/types/app";
import { HostLayout } from "../components/HostLayout";

type Props = {
  lobby: LobbyState | null;
  joinUrl: string;
  socketError: string | null;
  canOpenSetup: boolean;
  onOpenSetup: () => void;
  notice?: string | null;
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
  socketError,
  canOpenSetup,
  onOpenSetup,
  notice,
}: Props) {
  const { width } = useWindowDimensions();
  const gridColumns = width >= 1600 ? 5 : width >= 1300 ? 4 : width >= 980 ? 3 : 2;
  const hasPlayers = Boolean(lobby?.players.length);

  return (
    <HostLayout notice={notice}>
      <View style={{ flex: 1, gap: 14 }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            gap: 14,
          }}
        >
          {!lobby ? (
            <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
              <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
                Session wird vorbereitet...
              </Text>
            </View>
          ) : (
            <>
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.45)",
                  borderRadius: 16,
                  paddingVertical: 30,
                  gap: 8,
                }}
              >
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
                  <>
                    <Image
                      source={{
                        uri: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(joinUrl)}`,
                      }}
                      style={{ width: 160, height: 160, borderRadius: 12 }}
                    />
                  </>
                )}
              </View>

              <View style={{ width: "100%", maxWidth: 360, alignSelf: "center" }}>
                <BBButton title="Spiel starten" onPress={onOpenSetup} disabled={!canOpenSetup} />
              </View>
              {!canOpenSetup && (
                <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
                  Mindestens ein Player muss joinen.
                </Text>
              )}
            </>
          )}

          {!!socketError && (
            <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
              {socketError}
            </Text>
          )}
        </View>

        {!!lobby && hasPlayers && (
          <View style={{ marginBottom: 10 }}>
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
                      backgroundColor: Colors.navy,
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
                        color: Colors.textOnNavy,
                        fontSize: 20,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      {player.name}
                    </Text>
                    <Text style={{ color: Colors.textOnNavy, fontSize: 17, fontWeight: "700" }}>
                      Score: {player.score}
                    </Text>
                    <Text style={{ marginTop: 6, color: Colors.textOnNavy, fontWeight: "700" }}>
                      {playerStatusLabel(lobby.status, player.answered, player.readyForNext)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </HostLayout>
  );
}
