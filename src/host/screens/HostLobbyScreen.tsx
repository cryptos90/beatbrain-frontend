import React from "react";
import { Image, Text, View, useWindowDimensions } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors, Radius } from "../../theme";
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
  if (status === "results") {
    return "Fertig";
  }
  if (status === "reveal") {
    return continued ? "Bereit" : "Liest auf";
  }
  if (status === "question") {
    return answered ? "Antwort da" : "Noch offen";
  }
  return "In der Lobby";
}

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
  const { width } = useWindowDimensions();
  const wideStage = width >= 1120;
  const gridColumns = width >= 1680 ? 5 : width >= 1320 ? 4 : width >= 980 ? 3 : width >= 640 ? 2 : 1;
  const sessionCodeFontSize =
    width >= 1440 ? 88 : width >= 1120 ? 80 : width >= 900 ? 68 : width >= 560 ? 56 : 44;
  const sessionCodeLineHeight = sessionCodeFontSize + (width >= 900 ? 6 : 4);
  const sessionCodeLetterSpacing = width >= 1120 ? 6 : width >= 900 ? 5 : width >= 560 ? 3 : 2;
  const prepareButtonHeight = width >= 900 ? 82 : width >= 560 ? 72 : 64;
  const prepareButtonFontSize = width >= 900 ? 24 : width >= 560 ? 22 : 19;
  const qrSize = width >= 1280 ? 220 : width >= 900 ? 200 : width >= 560 ? 184 : 160;
  const playerAvatarSize = width >= 900 ? 92 : width >= 560 ? 84 : 72;
  const playerCardMinHeight = width >= 900 ? 196 : width >= 560 ? 180 : 164;
  const playerNameFontSize = width >= 900 ? 22 : width >= 560 ? 20 : 18;
  const hasPlayers = Boolean(lobby?.players.length);

  return (
    <HostLayout maxWidth={1380} notice={notice} headerEyebrow="Lobby Stage">
      <View style={{ width: "100%", gap: 18 }}>
        {!lobby ? (
          <View
            style={{
              flex: 1,
              borderRadius: Radius.xl,
              backgroundColor: "rgba(255,255,255,0.72)",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            }}
          >
            <Text
              style={{
                color: Colors.textOnBg,
                textAlign: "center",
                fontWeight: "900",
                fontSize: 28,
              }}
            >
              Session wird vorbereitet...
            </Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: wideStage ? "row" : "column", gap: 18 }}>
              <View
                style={{
                  flex: wideStage ? 1.15 : undefined,
                  backgroundColor: Colors.navy,
                  borderRadius: Radius.xl,
                  paddingHorizontal: 24,
                  paddingVertical: 24,
                  gap: 24,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: Colors.textOnNavy,
                    fontSize: sessionCodeFontSize,
                    fontWeight: "900",
                    letterSpacing: sessionCodeLetterSpacing,
                    lineHeight: sessionCodeLineHeight,
                    textAlign: "center",
                  }}
                >
                  {lobby.joinCode}
                </Text>

                <View style={{ width: wideStage ? 360 : "100%", maxWidth: 420 }}>
                  <BBButton
                    title="Spiel vorbereiten"
                    onPress={onOpenSetup}
                    disabled={!canOpenSetup}
                    style={{
                      height: prepareButtonHeight,
                      backgroundColor: Colors.white,
                      borderWidth: 4,
                      borderColor: "rgba(46,196,182,0.4)",
                      shadowColor: "#000000",
                      shadowOpacity: 0.2,
                      shadowRadius: 16,
                      shadowOffset: { width: 0, height: 8 },
                      elevation: 10,
                    }}
                    textStyle={{
                      color: Colors.navy,
                      fontSize: prepareButtonFontSize,
                      fontWeight: "900",
                      letterSpacing: 0.4,
                    }}
                  />
                </View>
              </View>

              <View
                style={{
                  flex: wideStage ? 0.85 : undefined,
                  backgroundColor: "rgba(255,255,255,0.78)",
                  borderRadius: Radius.xl,
                  paddingHorizontal: 22,
                  paddingVertical: 22,
                  gap: 14,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: Colors.textOnBg,
                    fontSize: 14,
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
                      padding: 12,
                      borderRadius: Radius.lg,
                      backgroundColor: Colors.white,
                    }}
                  >
                    <Image
                      source={{
                        uri: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(joinUrl)}`,
                      }}
                      style={{ width: qrSize, height: qrSize, borderRadius: 16 }}
                    />
                  </View>
                )}

                <Text
                  style={{
                    color: Colors.textOnBg,
                    fontSize: 19,
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  QR scannen oder Join-Code eingeben
                </Text>
              </View>
            </View>

            {!!socketError && (
              <Text
                style={{
                  color: Colors.textOnBg,
                  textAlign: "center",
                  fontWeight: "700",
                }}
              >
                {socketError}
              </Text>
            )}

            <View
              style={{
                borderRadius: Radius.xl,
                backgroundColor: hasPlayers ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.56)",
                paddingHorizontal: 18,
                paddingVertical: 18,
                gap: 14,
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "stretch",
              }}
            >
              {hasPlayers ? (
                <View
                  style={{
                    width: "100%",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    marginHorizontal: -6,
                  }}
                >
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
                          borderRadius: Radius.lg,
                          backgroundColor: Colors.navy,
                          paddingVertical: 16,
                          paddingHorizontal: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: playerCardMinHeight,
                          gap: 8,
                        }}
                      >
                        <Image
                          source={{ uri: player.avatarDataUrl }}
                          style={{
                            width: playerAvatarSize,
                            height: playerAvatarSize,
                            borderRadius: playerAvatarSize / 2,
                          }}
                        />
                        <Text
                          numberOfLines={1}
                          style={{
                            color: Colors.textOnNavy,
                            fontSize: playerNameFontSize,
                            fontWeight: "800",
                            textAlign: "center",
                          }}
                        >
                          {player.name}
                        </Text>
                        <Text
                          style={{ color: Colors.textOnNavy, fontSize: 18, fontWeight: "700" }}
                        >
                          Score: {player.score}
                        </Text>
                        <View
                          style={{
                            marginTop: 2,
                            borderRadius: 999,
                            backgroundColor: "rgba(255,255,255,0.12)",
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: Colors.textOnNavy,
                              fontSize: 14,
                              fontWeight: "800",
                            }}
                          >
                            {playerStatusLabel(lobby.status, player.answered, player.readyForNext)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View
                  style={{
                    alignSelf: "center",
                    maxWidth: 500,
                    borderRadius: Radius.lg,
                    backgroundColor: "rgba(32,44,89,0.08)",
                    paddingHorizontal: 18,
                    paddingVertical: 18,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: Colors.textOnBg,
                      textAlign: "center",
                      fontWeight: "800",
                      fontSize: 17,
                      lineHeight: 24,
                    }}
                  >
                    Warte auf den ersten Spieler.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </HostLayout>
  );
}
