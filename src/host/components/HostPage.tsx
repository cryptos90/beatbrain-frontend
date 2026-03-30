import React, { type ReactNode, useState } from "react";
import { ScrollView, View, type LayoutChangeEvent } from "react-native";
import { useHostViewport } from "../hooks/useHostViewport";

type Props = {
  children: ReactNode;
  maxWidth: number;
};

export function HostPage({ children, maxWidth }: Props) {
  const { width, height, fluid } = useHostViewport();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const sidePadding = fluid(width >= 760 ? 28 : 20, 16, 40, "width");
  const topPadding = fluid(14, 6, 18, "height");
  const bottomPadding = fluid(24, 14, 30, "height");
  const availableHeight = Math.max(0, viewportHeight - topPadding - bottomPadding);
  const shouldScroll = viewportHeight > 0 && contentHeight > availableHeight + 1;
  const shouldCenter = !shouldScroll;
  const contentMaxWidth = Math.min(maxWidth, Math.max(0, width - sidePadding * 2));

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
    <View style={{ flex: 1, minHeight: height }} onLayout={onViewportLayout}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          paddingHorizontal: sidePadding,
        }}
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
