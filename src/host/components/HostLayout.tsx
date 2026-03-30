import React, { type ReactNode } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { Colors } from "../../theme";
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
  const { width, height } = useWindowDimensions();
  const noticeOuterPadding = width >= 1100 ? 24 : width >= 760 ? 20 : 16;
  const noticeMaxWidth = Math.min(maxWidth, Math.max(0, width - noticeOuterPadding * 2));

  return (
    <View style={{ flex: 1, minHeight: height, backgroundColor: Colors.bg, overflow: "hidden" }}>
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
        compact={compactHeader}
      />
      {!!notice && (
        <View
          style={{
            alignSelf: "center",
            width: "100%",
            maxWidth: Math.min(noticeMaxWidth, 860),
            marginBottom: width >= 1100 ? 12 : 10,
            marginHorizontal: noticeOuterPadding,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.68)",
          }}
        >
          <Text
            style={{
              color: Colors.textOnBg,
              textAlign: "center",
              fontSize: 14,
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
