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
  const { controlMinHeight, radii, space, typeScale, isCompactHeight } = useHostViewport();
  const minHeight = controlMinHeight;
  const fontSize = typeScale.bodyLg;

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
          borderRadius: radii.pill,
          paddingHorizontal: isCompactHeight ? space.md : space.lg,
          paddingVertical: isCompactHeight ? space.xs : space.sm,
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
            lineHeight: fontSize + 5,
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
