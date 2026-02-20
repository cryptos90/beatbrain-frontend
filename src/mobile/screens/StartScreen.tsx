import React from "react";
import { Image, View } from "react-native";
import { BBButton } from "../../components/BBButton";
import { BUTTON_DROP } from "../../constants/app";
import { Colors } from "../../theme";

type Props = {
  onSinglePlayer: () => void;
  onMultiplayer: () => void;
};

const HEADER_PAD_TOP = 54;
const BACK_BTN_SIZE = 56;
const LOGO_SIZE = 200;

export function StartScreen({ onSinglePlayer, onMultiplayer }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 16 }}>
        <View style={{ height: BACK_BTN_SIZE }} />

        <View style={{ alignItems: "center" }}>
          <Image
            source={require("../../../assets/logo.png")}
            resizeMode="contain"
            style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
          />
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: BUTTON_DROP, gap: 14 }}>
        <BBButton title="Singleplayer" onPress={onSinglePlayer} />
        <BBButton title="Multiplayer" onPress={onMultiplayer} />
      </View>
    </View>
  );
}

