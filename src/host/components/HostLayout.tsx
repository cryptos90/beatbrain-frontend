import React, { type ReactNode } from "react";
import { Platform, Text, View } from "react-native";
import { Colors } from "../../theme";
import { useHostViewport } from "../hooks/useHostViewport";
import { HostHeader } from "./HostHeader";
import { HostPage } from "./HostPage";

type Props = {
  children: ReactNode;
  maxWidth?: number;
  notice?: string | null;
  headerEyebrow?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  compactHeader?: boolean;
};

export function HostLayout({
  children,
  maxWidth = 980,
  notice,
  headerEyebrow,
  headerTitle,
  headerSubtitle,
  compactHeader = false,
}: Props) {
  const {
    width,
    height,
    compactViewport,
    isCompactHeight,
    pagePadding,
    space,
    typeScale,
    fluid,
  } = useHostViewport();
  const noticeOuterPadding = pagePadding;
  const noticeMaxWidth = Math.min(maxWidth, Math.max(0, width - noticeOuterPadding * 2));
  const effectiveCompactHeader = compactHeader || compactViewport;
  const orbLarge = fluid(340, 220, 420, "width");
  const orbMedium = fluid(300, 200, 360, "width");
  const orbSmall = fluid(140, 96, 180, "width");

  return (
    <View
      style={[
        {
          flex: 1,
          width: "100%",
          minHeight: height,
          backgroundColor: Colors.bg,
          overflow: "hidden",
        },
        Platform.OS === "web"
          ? ({ minHeight: "100dvh", overflowX: "clip" } as any)
          : null,
      ]}
    >
      <View
        style={{
          pointerEvents: "none",
          position: "absolute",
          top: -120,
          right: -60,
          width: orbLarge,
          height: orbLarge,
          borderRadius: orbLarge / 2,
          backgroundColor: "rgba(32,44,89,0.14)",
        }}
      />
      <View
        style={{
          pointerEvents: "none",
          position: "absolute",
          bottom: -140,
          left: -90,
          width: orbMedium,
          height: orbMedium,
          borderRadius: orbMedium / 2,
          backgroundColor: "rgba(255,255,255,0.2)",
        }}
      />
      <View
        style={{
          pointerEvents: "none",
          position: "absolute",
          top: "32%",
          left: "9%",
          width: orbSmall,
          height: orbSmall,
          borderRadius: orbSmall / 2,
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      />

      <HostHeader
        eyebrow={headerEyebrow}
        title={headerTitle}
        subtitle={headerSubtitle}
        compact={effectiveCompactHeader}
      />
      {!!notice && (
        <View
          style={{
            alignSelf: "center",
            width: "100%",
            maxWidth: Math.min(noticeMaxWidth, 860),
            marginBottom: isCompactHeight ? space.xxs : compactViewport ? space.xs : space.sm,
            marginHorizontal: noticeOuterPadding,
            paddingHorizontal: space.md,
            paddingVertical: isCompactHeight ? space.xxs : compactViewport ? space.xs : space.sm,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.68)",
          }}
        >
          <Text
            style={{
              color: Colors.textOnBg,
              textAlign: "center",
              fontSize: typeScale.bodySm,
              fontWeight: "700",
              opacity: 0.92,
            }}
          >
            {notice}
          </Text>
        </View>
      )}
      <HostPage maxWidth={maxWidth}>{children}</HostPage>
    </View>
  );
}
