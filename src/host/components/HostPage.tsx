import React, { type ReactNode, useState } from "react";
import { Platform, ScrollView, View, type LayoutChangeEvent } from "react-native";
import { useHostViewport } from "../hooks/useHostViewport";

type Props = {
  children: ReactNode;
  maxWidth: number;
};

export function HostPage({ children, maxWidth }: Props) {
  const {
    width,
    pagePadding,
    space,
    compactViewport,
    isCompactHeight,
    isLowHeight,
  } = useHostViewport();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const sidePadding = pagePadding;
  const topPadding = isLowHeight ? space.xxs : compactViewport ? space.xs : space.sm;
  const bottomPadding = isLowHeight ? space.sm : isCompactHeight ? space.md : space.lg;
  const availableHeight = Math.max(0, viewportHeight - topPadding - bottomPadding);
  const shouldScroll = viewportHeight > 0 && contentHeight > availableHeight + 4;
  const shouldCenter = !shouldScroll;
  const contentMaxWidth = Math.min(maxWidth, Math.max(240, width - sidePadding * 2));

  const onViewportLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.max(0, event.nativeEvent.layout.height);
    if (Math.abs(nextHeight - viewportHeight) > 1) {
      setViewportHeight(nextHeight);
    }
  };

  const onContentLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.max(0, event.nativeEvent.layout.height);
    if (Math.abs(nextHeight - contentHeight) > 1) {
      setContentHeight(nextHeight);
    }
  };

  return (
    <View
      style={[
        {
          flex: 1,
          width: "100%",
          minHeight: 0,
          maxWidth: "100%",
        },
        Platform.OS === "web" ? ({ overflowX: "clip" } as any) : null,
      ]}
      onLayout={onViewportLayout}
    >
      <ScrollView
        style={[
          { flex: 1, width: "100%" },
          Platform.OS === "web" ? ({ overflowX: "clip" } as any) : null,
        ]}
        contentContainerStyle={[
          {
            flexGrow: 1,
            paddingTop: topPadding,
            paddingBottom: bottomPadding,
            paddingHorizontal: sidePadding,
            width: "100%",
          },
          Platform.OS === "web"
            ? ({
                minHeight: "100%",
                paddingBottom: `calc(${bottomPadding}px + env(safe-area-inset-bottom, 0px))`,
                paddingLeft: `calc(${sidePadding}px + env(safe-area-inset-left, 0px))`,
                paddingRight: `calc(${sidePadding}px + env(safe-area-inset-right, 0px))`,
              } as any)
            : null,
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={shouldScroll}
        showsVerticalScrollIndicator={shouldScroll}
      >
        <View
          style={{
            width: "100%",
            maxWidth: contentMaxWidth,
            minHeight: availableHeight || undefined,
            alignSelf: "center",
            justifyContent: shouldCenter ? "center" : "flex-start",
          }}
        >
          <View style={{ width: "100%" }} onLayout={onContentLayout}>
            {children}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
