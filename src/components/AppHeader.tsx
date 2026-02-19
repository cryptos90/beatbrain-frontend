import React from "react";
import { Image, View } from "react-native";
import { BBButton } from "./BBButton";
import { BACK_BTN_SIZE, HEADER_PAD_TOP, LOGO_SIZE } from "../constants/app";

type Props = {
  onBack: () => void;
};

export function AppHeader({ onBack }: Props) {
  return (
    <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 16 }}>
      <View style={{ height: BACK_BTN_SIZE, justifyContent: "flex-start", alignItems: "flex-start" }}>
        <BBButton
          title="←"
          onPress={onBack}
          style={{ width: BACK_BTN_SIZE, height: BACK_BTN_SIZE, paddingHorizontal: 0, justifyContent: "center" }}
        />
      </View>

      <View style={{ alignItems: "center" }}>
        <Image source={require("../../assets/logo.png")} resizeMode="contain" style={{ width: LOGO_SIZE, height: LOGO_SIZE }} />
      </View>
    </View>
  );
}
