import React, { type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { Colors } from "../../theme";
import { useHostViewport } from "../hooks/useHostViewport";

type HostPanelTone = "glass" | "navy" | "white" | "soft";
type HostPanelPadding = "sm" | "md" | "lg";

type Props = {
  children: ReactNode;
  tone?: HostPanelTone;
  padding?: HostPanelPadding;
  gap?: number;
  maxWidth?: number;
  style?: ViewStyle;
};

const TONE_STYLES: Record<HostPanelTone, ViewStyle> = {
  glass: {
    backgroundColor: "rgba(255,255,255,0.76)",
  },
  navy: {
    backgroundColor: Colors.navy,
  },
  white: {
    backgroundColor: Colors.white,
  },
  soft: {
    backgroundColor: "rgba(32,44,89,0.08)",
  },
};

export function HostPanel({
  children,
  tone = "glass",
  padding = "md",
  gap,
  maxWidth,
  style,
}: Props) {
  const { panelPaddingX, panelPaddingY, radii, space } = useHostViewport();
  const paddingScale = padding === "sm" ? 0.82 : padding === "lg" ? 1.16 : 1;

  return (
    <View
      style={[
        {
          width: "100%",
          alignSelf: maxWidth ? "center" : undefined,
          maxWidth,
          borderRadius: radii.xl,
          paddingHorizontal: Math.round(panelPaddingX * paddingScale),
          paddingVertical: Math.round(panelPaddingY * paddingScale),
          gap: gap ?? space.md,
        },
        TONE_STYLES[tone],
        style,
      ]}
    >
      {children}
    </View>
  );
}
