import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle, TextStyle } from "react-native";
import { Colors } from "../theme";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function BBButton({ title, onPress, disabled, style, textStyle }: Props) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text numberOfLines={1} style={[styles.text, textStyle]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    // ✅ feste Größe, unabhängig vom Text
    height: 56,
    minHeight: 56,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.navy,
  },
  text: {
    color: Colors.textOnNavy,
    fontSize: 18,
    fontWeight: "700",
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
});
