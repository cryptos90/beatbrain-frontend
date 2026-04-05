import React, { type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { useHostViewport } from "../hooks/useHostViewport";

type Props = {
  children: ReactNode;
  gap?: number;
  style?: ViewStyle;
};

export function HostScreenContainer({ children, gap, style }: Props) {
  const { sectionGap } = useHostViewport();

  return (
    <View
      style={[
        {
          width: "100%",
          gap: gap ?? sectionGap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
