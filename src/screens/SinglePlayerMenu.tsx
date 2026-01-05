import React from "react";
import { Image, View } from "react-native";
import { Colors } from "../theme";
import { BBButton } from "../components/BBButton";

type Props = {
  onBack: () => void;
  onChoose: () => void;
  onCreate: () => void;
};

const HEADER_PAD_TOP = 54;
const BACK_BTN_SIZE = 56;
const LOGO_SIZE = 200;
const BUTTON_DROP = 56 * 2;

export function SinglePlayerMenu({ onBack, onChoose, onCreate }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* HEADER */}
      <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 16 }}>
        {/* ✅ Back-Button sitzt nicht zentriert, sondern “oben” im Block.
            Dadurch endet der Button-Block exakt am Button-Rand → Logo bündig. */}
        <View style={{ height: BACK_BTN_SIZE, justifyContent: "flex-start", alignItems: "flex-start" }}>
          <BBButton
            title="←"
            onPress={onBack}
            style={{
              width: BACK_BTN_SIZE,
              height: BACK_BTN_SIZE,
              paddingHorizontal: 0,
              justifyContent: "center",
            }}
          />
        </View>

        <View style={{ alignItems: "center" }}>
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: LOGO_SIZE, height: LOGO_SIZE, resizeMode: "contain" }}
          />
        </View>
      </View>

      {/* CONTENT */}
      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: BUTTON_DROP, gap: 14 }}>
        <BBButton title="Choose Quiz" onPress={onChoose} />
        <BBButton title="Create Quiz" onPress={onCreate} disabled />
      </View>
    </View>
  );
}
