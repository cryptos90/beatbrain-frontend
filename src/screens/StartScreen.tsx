import React from "react";
import { Image, View } from "react-native";
import { Colors } from "../theme";
import { BBButton } from "../components/BBButton";

type Props = {
  onSinglePlayer: () => void;
};

const HEADER_PAD_TOP = 54;
const BACK_BTN_SIZE = 56;
const LOGO_SIZE = 200;
const BUTTON_DROP = 56 * 2; // ✅ ~2 Buttonhöhen nach unten

export function StartScreen({ onSinglePlayer }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* HEADER */}
      <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 16 }}>
        {/* ✅ Spacer statt Back-Button, damit Logo exakt gleich sitzt */}
        <View style={{ height: BACK_BTN_SIZE }} />

        {/* ✅ Logo startet exakt nach dem (Spacer/BackBtn)-Block */}
        <View style={{ alignItems: "center" }}>
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: LOGO_SIZE, height: LOGO_SIZE, resizeMode: "contain" }}
          />
        </View>
      </View>

      {/* CONTENT */}
      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: BUTTON_DROP, gap: 14 }}>
        <BBButton title="Singleplayer" onPress={onSinglePlayer} />
        <BBButton title="Multiplayer" onPress={() => {}} disabled />
      </View>
    </View>
  );
}
