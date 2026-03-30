import React, { type ReactNode, useState } from "react";
import { ScrollView, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";

type Props = {
  children: ReactNode;
  maxWidth: number;
};

export function HostPage({ children, maxWidth }: Props) {
  const { width, height } = useWindowDimensions();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const sidePadding = width >= 1440 ? 40 : width >= 1100 ? 32 : width >= 760 ? 24 : 16;
  const topPadding = width >= 1100 ? 18 : width >= 760 ? 12 : 8;
  const bottomPadding = width >= 1100 ? 28 : 18;
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
