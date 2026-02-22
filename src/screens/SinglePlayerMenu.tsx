import React from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { BackButton } from "../components/BackButton";
import { BBButton } from "../components/BBButton";
import { BACK_BTN_SIZE, BUTTON_DROP, HEADER_PAD_TOP, LOGO_SIZE } from "../constants/app";
import { Colors } from "../theme";

type Props = {
  onBack: () => void;
  onChoose: () => void;
  onCreate: () => void;
  onRetryLogin: () => void;
  waitingForLogin?: boolean;
  loginError?: string | null;
};

export function SinglePlayerMenu({
  onBack,
  onChoose,
  onCreate,
  onRetryLogin,
  waitingForLogin,
  loginError,
}: Props) {
  const showRetryLogin = !waitingForLogin && Boolean(loginError);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 16 }}>
        <View style={{ height: BACK_BTN_SIZE, justifyContent: "flex-start", alignItems: "flex-start" }}>
          <BackButton onPress={onBack} />
        </View>

        <View style={{ alignItems: "center" }}>
          <Image
            source={require("../../assets/logo.png")}
            resizeMode="contain"
            style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
          />
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: BUTTON_DROP, gap: 14 }}>
        {waitingForLogin ? (
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <ActivityIndicator size={56 as any} color={Colors.navy} />
            <Text
              style={{
                marginTop: 14,
                color: Colors.textOnBg,
                fontSize: 20,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Warte auf Login...
            </Text>
          </View>
        ) : showRetryLogin ? (
          <>
            <Text
              style={{
                marginTop: 12,
                color: "red",
                fontSize: 16,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              {loginError}
            </Text>
            <BBButton title="Spotify Login erneut" onPress={onRetryLogin} />
          </>
        ) : (
          <>
            <BBButton title="Choose Quiz" onPress={onChoose} />
            <BBButton title="Create Quiz" onPress={onCreate} />
          </>
        )}
      </View>
    </View>
  );
}
