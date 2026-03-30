import React from "react";
import { Image, Text, View } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors, Radius } from "../../theme";
import type { LobbyState } from "../../shared/types/app";
import { useHostViewport } from "../hooks/useHostViewport";
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
  const { width, fluid } = useHostViewport();
  const wideStage = width >= 1120;
  const gridColumns = width >= 1680 ? 5 : width >= 1320 ? 4 : width >= 980 ? 3 : width >= 640 ? 2 : 1;
  const sessionCodeFontSize = fluid(82, 40, 88);
  const sessionCodeLineHeight = sessionCodeFontSize + fluid(6, 4, 8, "height");
  const sessionCodeLetterSpacing = fluid(5, 2, 6, "width");
  const prepareButtonHeight = fluid(78, 58, 82, "height");
  const prepareButtonFontSize = fluid(23, 17, 24);
  const qrSize = fluid(208, 148, 220);
  const playerAvatarSize = fluid(88, 64, 92);
  const playerCardMinHeight = fluid(188, 156, 196, "height");
  const playerNameFontSize = fluid(21, 18, 22);
  const hasPlayers = Boolean(lobby?.players.length);

  return (
    <HostLayout maxWidth={1380} notice={notice} headerEyebrow="Lobby Stage">
      <View style={{ width: "100%", gap: fluid(18, 12, 18, "height") }}>
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
            <View style={{ flexDirection: wideStage ? "row" : "column", gap: fluid(18, 12, 18, "height") }}>
              <View
                style={{
                  flex: wideStage ? 1.15 : undefined,
                  backgroundColor: Colors.navy,
                  borderRadius: Radius.xl,
                  paddingHorizontal: fluid(24, 16, 24),
                  paddingVertical: fluid(24, 16, 24, "height"),
                  gap: fluid(24, 14, 24, "height"),
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
                    fontSize: fluid(14, 12, 14),
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
                    fontSize: fluid(19, 16, 19),
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
                paddingVertical: fluid(18, 14, 18, "height"),
                gap: fluid(14, 10, 14, "height"),
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
                          paddingVertical: fluid(16, 12, 16, "height"),
                          paddingHorizontal: fluid(12, 10, 12),
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: playerCardMinHeight,
                          gap: fluid(8, 6, 8, "height"),
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
                          style={{
                            color: Colors.textOnNavy,
                            fontSize: fluid(18, 15, 18),
                            fontWeight: "700",
                          }}
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
                              fontSize: fluid(14, 12, 14),
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
