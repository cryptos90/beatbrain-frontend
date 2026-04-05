import React, { Children, type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { useHostViewport } from "../hooks/useHostViewport";

type Props = {
  children: ReactNode;
  maxWidth?: number;
  minItemWidth?: number;
  stackBelow?: number;
  gap?: number;
  style?: ViewStyle;
};

export function HostActionBar({
  children,
  maxWidth,
  minItemWidth = 220,
  stackBelow = 820,
  gap,
  style,
}: Props) {
  const { width, isMobileViewport, isLandscapePhone, space } = useHostViewport();
  const childrenArray = Children.toArray(children);
  const shouldStack = width < stackBelow || isMobileViewport || isLandscapePhone;
  const resolvedGap = gap ?? space.md;

  return (
    <View
      style={[
        {
          width: "100%",
          maxWidth,
          alignSelf: "center",
          flexDirection: shouldStack ? "column" : "row",
          flexWrap: shouldStack ? "nowrap" : "wrap",
          gap: resolvedGap,
        },
        style,
      ]}
    >
      {childrenArray.map((child, index) => (
        <View
          key={index}
          style={{
            flex: shouldStack ? undefined : 1,
            width: shouldStack ? "100%" : undefined,
            minWidth: shouldStack ? undefined : minItemWidth,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}
