import React from "react";
import { Pressable, Text, type TextStyle, type ViewStyle } from "react-native";
import { Colors } from "../../theme";
import { useHostViewport } from "../hooks/useHostViewport";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  invert?: boolean;
};

export function HostActionButton({
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
  invert = false,
}: Props) {
  const { fluid } = useHostViewport();
  const minHeight = fluid(62, 50, 72, "height");
  const borderRadius = fluid(999, 999, 999);
  const fontSize = fluid(19, 16, 22);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        {
          width: "100%",
          minHeight,
          borderRadius,
          paddingHorizontal: fluid(20, 16, 28),
          paddingVertical: fluid(14, 12, 18, "height"),
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: invert ? Colors.white : Colors.navy,
          borderWidth: invert ? 2 : 0,
          borderColor: invert ? "rgba(46,196,182,0.42)" : "transparent",
          opacity: disabled ? 0.45 : pressed ? 0.86 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          {
            color: invert ? Colors.navy : Colors.textOnNavy,
            fontSize,
            fontWeight: "800",
            textAlign: "center",
            lineHeight: fontSize + 4,
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
