import React from "react";
import { Pressable, View, ViewStyle } from "react-native";
import { BACK_BTN_ICON_SIZE, BACK_BTN_SIZE } from "../constants/app";
import { Colors } from "../theme";

type Props = {
  onPress: () => void | Promise<void>;
  style?: ViewStyle;
};

export function BackButton({ onPress, style }: Props) {
  const stroke = 2.5;
  const shaftWidth = BACK_BTN_ICON_SIZE * 0.56;
  const headSize = BACK_BTN_ICON_SIZE * 0.32;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Zurueck"
      style={({ pressed }) => [
        {
          width: BACK_BTN_SIZE,
          height: BACK_BTN_SIZE,
          borderRadius: BACK_BTN_SIZE / 2,
          backgroundColor: Colors.navy,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View
        style={{
          width: BACK_BTN_ICON_SIZE,
          height: BACK_BTN_ICON_SIZE,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: shaftWidth,
            height: stroke,
            borderRadius: 99,
            backgroundColor: Colors.textOnNavy,
            transform: [{ translateX: 1 }],
          }}
        />
        <View
          style={{
            position: "absolute",
            left: BACK_BTN_ICON_SIZE * 0.24,
            top: BACK_BTN_ICON_SIZE * 0.34,
            width: headSize,
            height: headSize,
            borderLeftWidth: stroke,
            borderBottomWidth: stroke,
            borderColor: Colors.textOnNavy,
            transform: [{ rotate: "45deg" }],
          }}
        />
      </View>
    </Pressable>
  );
}
