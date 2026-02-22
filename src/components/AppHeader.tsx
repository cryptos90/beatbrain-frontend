import React from "react";
import { Image, View } from "react-native";
import { BACK_BTN_SIZE, HEADER_PAD_TOP, LOGO_SIZE } from "../constants/app";
import { BackButton } from "./BackButton";

type Props = {
  onBack: () => void;
};

export function AppHeader({ onBack }: Props) {
  return (
    <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 16 }}>
      <View
        style={{
          height: BACK_BTN_SIZE,
          justifyContent: "flex-start",
          alignItems: "flex-start",
        }}
      >
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
  );
}
