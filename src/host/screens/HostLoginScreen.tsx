import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors, Radius } from "../../theme";
import { HostLayout } from "../components/HostLayout";
import { useHostViewport } from "../hooks/useHostViewport";

type Props = {
  hasAuth: boolean;
  authBusy: boolean;
  authError: string | null;
  creatingLobby: boolean;
  socketError: string | null;
  onLogin: () => void;
  onStartSession: () => void;
  notice?: string | null;
};

export function HostLoginScreen({
  hasAuth,
  authBusy,
  authError,
  creatingLobby,
  socketError,
  onLogin,
  onStartSession,
  notice,
}: Props) {
  const { width, height, fluid, isShortViewport } = useHostViewport();
  const compactViewport = isShortViewport;
  const wideLayout = width >= 1080 && height >= 620;
  const sectionGap = fluid(20, 12, 20, "height");
  const compactCardPadding = fluid(compactViewport ? 20 : 24, 18, 26);
  const leftCardPaddingX = fluid(compactViewport ? 22 : 28, 18, 28);
  const leftCardPaddingY = fluid(compactViewport ? 20 : 28, 18, 28, "height");
  const panelTitleSize = wideLayout ? fluid(compactViewport ? 30 : 34, 24, 34) : fluid(compactViewport ? 28 : 30, 24, 30);
  const panelTitleLineHeight = panelTitleSize + 5;
  const stepTitleSize = fluid(compactViewport ? 18 : 20, 16, 20);
  const stepBodySize = fluid(compactViewport ? 14 : 15, 13, 15);
  const buttonHeight = fluid(compactViewport ? 58 : 64, 52, 64, "height");
  const buttonFontSize = fluid(compactViewport ? 18 : 20, 16, 20);
  const actionRow = wideLayout && compactViewport;
  const loginLabel = hasAuth ? "Mit Spotify verbunden" : "Mit Spotify verbinden";
  const startLabel = creatingLobby ? "Session wird erstellt..." : "Host-Session starten";

  return (
    <HostLayout
      maxWidth={1180}
      notice={notice}
      headerEyebrow="Big Screen Host"
      compactHeader={compactViewport}
    >
      <View
        style={{
          width: "100%",
          gap: sectionGap,
        }}
      >
        <View style={{ flexDirection: wideLayout ? "row" : "column", gap: sectionGap }}>
          <View
            style={{
              flex: wideLayout ? 1.2 : undefined,
              backgroundColor: Colors.navy,
              borderRadius: Radius.xl,
              paddingHorizontal: leftCardPaddingX,
              paddingVertical: leftCardPaddingY,
              gap: fluid(compactViewport ? 12 : 16, 10, 16, "height"),
            }}
          >
            <Text
              style={{
                color: Colors.textOnNavy,
                fontSize: panelTitleSize,
                fontWeight: "900",
                lineHeight: panelTitleLineHeight,
              }}
            >
              Session in drei Schritten starten
            </Text>

            <View style={{ flexDirection: wideLayout ? "row" : "column", gap: fluid(12, 10, 12, "height") }}>
              {[
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
                  text: "Fragen, Timer und Auflösung bleiben extra groß im Fokus.",
                },
              ].map((item) => (
                <View
                  key={item.step}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: Radius.lg,
                    paddingHorizontal: fluid(compactViewport ? 12 : 14, 10, 14),
                    paddingVertical: fluid(compactViewport ? 12 : 14, 10, 14, "height"),
                    gap: fluid(compactViewport ? 6 : 8, 6, 8, "height"),
                  }}
                >
                  <Text
                    style={{
                      color: Colors.textOnNavy,
                      fontSize: 13,
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
            </View>
          </View>

          <View
            style={{
              flex: wideLayout ? 0.82 : undefined,
              backgroundColor: "rgba(255,255,255,0.78)",
              borderRadius: Radius.xl,
              paddingHorizontal: compactCardPadding,
              paddingVertical: compactCardPadding,
              gap: fluid(compactViewport ? 12 : 16, 10, 16, "height"),
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
              Host bereit machen
            </Text>

            <View
              style={{
                borderRadius: Radius.lg,
                backgroundColor: hasAuth ? "rgba(22,163,74,0.14)" : "rgba(32,44,89,0.08)",
                paddingHorizontal: fluid(16, 12, 16),
                paddingVertical: fluid(compactViewport ? 12 : 16, 10, 16, "height"),
                gap: fluid(compactViewport ? 6 : 8, 6, 8, "height"),
              }}
            >
              <Text
                style={{
                  color: Colors.textOnBg,
                  fontSize: fluid(compactViewport ? 20 : 22, 18, 22),
                  fontWeight: "900",
                  textAlign: "center",
                }}
              >
                {hasAuth ? "Spotify verbunden" : "Noch nicht verbunden"}
              </Text>
              <Text
                style={{
                  color: "rgba(32,44,89,0.86)",
                  fontSize: stepBodySize,
                  lineHeight: stepBodySize + 6,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                {hasAuth
                  ? "Spotify ist verbunden. Die Session kann jetzt gestartet werden."
                  : "Verbinde zuerst Spotify, damit Playlists geladen und Sessions gestartet werden können."}
              </Text>
            </View>

            {authBusy && (
              <View style={{ alignItems: "center", gap: 10 }}>
                <ActivityIndicator size={36 as any} color={Colors.navy} />
                <Text
                  style={{
                    color: Colors.textOnBg,
                    fontSize: fluid(compactViewport ? 15 : 16, 14, 16),
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  Warte auf Spotify-Login...
                </Text>
              </View>
            )}

            <View
              style={{
                width: "100%",
                maxWidth: actionRow ? 520 : 420,
                alignSelf: "center",
                flexDirection: actionRow ? "row" : "column",
                gap: fluid(12, 10, 12, "height"),
              }}
            >
              <BBButton
                title={loginLabel}
                onPress={onLogin}
                disabled={authBusy || hasAuth}
                style={{ flex: actionRow ? 1 : undefined, height: buttonHeight }}
                textStyle={{ fontSize: buttonFontSize, fontWeight: "800" }}
              />
              <BBButton
                title={startLabel}
                onPress={onStartSession}
                disabled={!hasAuth || creatingLobby || authBusy}
                style={{ flex: actionRow ? 1 : undefined, height: buttonHeight }}
                textStyle={{ fontSize: buttonFontSize, fontWeight: "800" }}
              />
            </View>

            {!!authError && (
              <Text
                style={{
                  color: Colors.textOnBg,
                  fontSize: 14,
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
                  fontSize: 14,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {socketError}
              </Text>
            )}
          </View>
        </View>
      </View>
    </HostLayout>
  );
}
