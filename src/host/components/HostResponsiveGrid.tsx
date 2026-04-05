import React, {
  Children,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { View, type LayoutChangeEvent, type ViewStyle } from "react-native";
import { useHostViewport } from "../hooks/useHostViewport";

type Props = {
  children: ReactNode;
  minItemWidth?: number;
  maxColumns?: number;
  gap?: number;
  style?: ViewStyle;
  itemStyle?: ViewStyle;
};

export function HostResponsiveGrid({
  children,
  minItemWidth = 240,
  maxColumns = 4,
  gap,
  style,
  itemStyle,
}: Props) {
  const { width, pagePadding, columnsForContainer, space } = useHostViewport();
  const childrenArray = Children.toArray(children);
  const [containerWidth, setContainerWidth] = useState(0);
  const resolvedGap = gap ?? space.md;
  const fallbackWidth = Math.max(0, width - pagePadding * 2);
  const effectiveWidth = containerWidth > 0 ? containerWidth : fallbackWidth;
  const columns = useMemo(
    () => columnsForContainer(effectiveWidth + resolvedGap, minItemWidth + resolvedGap, maxColumns),
    [columnsForContainer, effectiveWidth, maxColumns, minItemWidth, resolvedGap],
  );
  const itemWidth = columns <= 1 ? "100%" : `${100 / columns}%`;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.max(0, Math.round(event.nativeEvent.layout.width));
    setContainerWidth((current) => (Math.abs(current - nextWidth) > 1 ? nextWidth : current));
  }, []);

  return (
    <View style={[{ width: "100%" }, style]} onLayout={onLayout}>
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          flexWrap: "wrap",
          marginHorizontal: columns > 1 ? -(resolvedGap / 2) : 0,
        }}
      >
        {childrenArray.map((child, index) => (
          <View
            key={index}
            style={[
              {
                width: itemWidth as ViewStyle["width"],
                paddingHorizontal: columns > 1 ? resolvedGap / 2 : 0,
                paddingBottom: resolvedGap,
              },
              itemStyle,
            ]}
          >
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}
