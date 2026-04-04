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
  const { width, height, isShortHeight, fluid } = useHostViewport();
  const compactViewport = isShortHeight;
  const noticeOuterPadding = fluid(width >= 1024 ? 24 : width >= 720 ? 20 : 16, 16, 28, "width");
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
        Platform.OS === "web" ? ({ minHeight: "100vh", overflowX: "hidden" } as any) : null,
      ]}
    >
      <View
        pointerEvents="none"
        style={{
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
        pointerEvents="none"
        style={{
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
        pointerEvents="none"
        style={{
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
            marginBottom: compactViewport ? 8 : width >= 1100 ? 12 : 10,
            marginHorizontal: noticeOuterPadding,
            paddingHorizontal: fluid(16, 12, 18, "width"),
            paddingVertical: fluid(compactViewport ? 8 : 10, 7, 10, "height"),
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.68)",
          }}
        >
          <Text
            style={{
              color: Colors.textOnBg,
              textAlign: "center",
              fontSize: fluid(14, 12, 14),
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
