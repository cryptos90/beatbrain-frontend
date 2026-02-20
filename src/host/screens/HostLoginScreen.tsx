import React from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors } from "../../theme";

type Props = {
  authBusy: boolean;
  authError: string | null;
  onLogin: () => void;
};

export function HostLoginScreen({ authBusy, authError, onLogin }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 24, paddingTop: 48 }}>
      <View style={{ alignItems: "center", marginBottom: 28 }}>
        <Image
          source={require("../../../assets/logo.png")}
          resizeMode="contain"
          style={{ width: 220, height: 220 }}
        />
      </View>

      {authBusy ? (
        <View style={{ alignItems: "center", gap: 12 }}>
          <ActivityIndicator size={56 as any} color={Colors.navy} />
          <Text
            style={{
              color: Colors.textOnBg,
              fontSize: 22,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Warte auf Login...
          </Text>
        </View>
      ) : (
        <BBButton title="Spotify Login" onPress={onLogin} />
      )}

      {!!authError && (
        <Text
          style={{
            marginTop: 14,
            color: "red",
            fontSize: 16,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {authError}
        </Text>
      )}
    </View>
  );
}
