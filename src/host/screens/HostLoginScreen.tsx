import React from "react";
import { ActivityIndicator, Text, View, useWindowDimensions } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors, Radius } from "../../theme";
import { HostLayout } from "../components/HostLayout";

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
  const { width } = useWindowDimensions();
  const wideLayout = width >= 1080;
  const loginLabel = hasAuth ? "Mit Spotify verbunden" : "Mit Spotify verbinden";
  const startLabel = creatingLobby ? "Session wird erstellt..." : "Host-Session starten";

  return (
    <HostLayout
      maxWidth={1180}
      notice={notice}
      headerEyebrow="Big Screen Host"
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          gap: 20,
          paddingBottom: 18,
        }}
      >
        <View style={{ flexDirection: wideLayout ? "row" : "column", gap: 20 }}>
          <View
            style={{
              flex: wideLayout ? 1.2 : undefined,
              backgroundColor: Colors.navy,
              borderRadius: Radius.xl,
              paddingHorizontal: 28,
              paddingVertical: 28,
              gap: 16,
            }}
          >
            <Text
              style={{
                color: Colors.textOnNavy,
                fontSize: wideLayout ? 34 : 30,
                fontWeight: "900",
                lineHeight: wideLayout ? 40 : 34,
              }}
            >
              Session in drei Schritten starten
            </Text>

            <View style={{ flexDirection: wideLayout ? "row" : "column", gap: 12 }}>
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
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    gap: 8,
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
                      fontSize: 20,
                      fontWeight: "800",
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(46,196,182,0.92)",
                      fontSize: 15,
                      lineHeight: 22,
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
              paddingHorizontal: 24,
              paddingVertical: 24,
              gap: 16,
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
                paddingHorizontal: 16,
                paddingVertical: 16,
                gap: 8,
              }}
            >
              <Text
                style={{
                  color: Colors.textOnBg,
                  fontSize: 22,
                  fontWeight: "900",
                  textAlign: "center",
                }}
              >
                {hasAuth ? "Spotify verbunden" : "Noch nicht verbunden"}
              </Text>
              <Text
                style={{
                  color: "rgba(32,44,89,0.86)",
                  fontSize: 15,
                  lineHeight: 22,
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
                    fontSize: 16,
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  Warte auf Spotify-Login...
                </Text>
              </View>
            )}

            <View style={{ width: "100%", gap: 12 }}>
              <BBButton
                title={loginLabel}
                onPress={onLogin}
                disabled={authBusy || hasAuth}
                style={{ height: 64 }}
                textStyle={{ fontSize: 20, fontWeight: "800" }}
              />
              <BBButton
                title={startLabel}
                onPress={onStartSession}
                disabled={!hasAuth || creatingLobby || authBusy}
                style={{ height: 64 }}
                textStyle={{ fontSize: 20, fontWeight: "800" }}
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
