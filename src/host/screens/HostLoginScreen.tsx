import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors } from "../../theme";
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
  const loginLabel = hasAuth ? "Mit Spotify verbunden" : "Mit Spotify verbinden";
  const startLabel = creatingLobby ? "Bitte warten..." : "Session starten";

  return (
    <HostLayout maxWidth={560} notice={notice}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        {authBusy && (
          <View style={{ alignItems: "center", gap: 10 }}>
            <ActivityIndicator size={36 as any} color={Colors.navy} />
            <Text
              style={{
                color: Colors.textOnBg,
                fontSize: 16,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Warte auf Spotify-Login...
            </Text>
          </View>
        )}
        <View style={{ width: "100%", maxWidth: 360, gap: 12 }}>
          <BBButton title={loginLabel} onPress={onLogin} disabled={authBusy || hasAuth} />
          <BBButton
            title={startLabel}
            onPress={onStartSession}
            disabled={!hasAuth || creatingLobby || authBusy}
          />
        </View>

        {!!authError && (
          <Text
            style={{
              marginTop: 2,
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
    </HostLayout>
  );
}
