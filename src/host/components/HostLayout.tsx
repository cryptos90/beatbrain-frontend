import React, { type ReactNode } from "react";
import { Text, View } from "react-native";
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
  const { width, height, isShortViewport, fluid } = useHostViewport();
  const compactViewport = isShortViewport;
  const noticeOuterPadding = fluid(width >= 760 ? 22 : 18, 16, 28, "width");
  const noticeMaxWidth = Math.min(maxWidth, Math.max(0, width - noticeOuterPadding * 2));
  const effectiveCompactHeader = compactHeader || compactViewport;

  return (
    <View
      style={{
        flex: 1,
        height,
        minHeight: height,
        backgroundColor: Colors.bg,
        overflow: "hidden",
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -120,
          right: -60,
          width: 340,
          height: 340,
          borderRadius: 170,
          backgroundColor: "rgba(32,44,89,0.14)",
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: -140,
          left: -90,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: "rgba(255,255,255,0.2)",
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: "32%",
          left: "9%",
          width: 140,
          height: 140,
          borderRadius: 70,
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
