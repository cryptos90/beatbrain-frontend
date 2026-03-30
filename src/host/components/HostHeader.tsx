import React from "react";
import { Image, Text, View, useWindowDimensions } from "react-native";
import { Colors } from "../../theme";

type Props = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
};

const DEFAULT_EYEBROW = "HOST VIEW";

export function HostHeader({
  eyebrow = DEFAULT_EYEBROW,
  title,
  subtitle,
  compact = false,
}: Props) {
  const { width } = useWindowDimensions();
  const hasCopy = Boolean(String(title ?? "").trim() || String(subtitle ?? "").trim());
  const horizontalPadding = width >= 1100 ? 24 : width >= 760 ? 20 : 16;
  const logoWidth = compact
    ? width >= 1100
      ? 188
      : width >= 760
        ? 176
        : 160
    : width >= 1100
      ? 236
      : width >= 760
        ? 210
        : 180;
  const logoHeight = compact ? Math.round(logoWidth * 0.4) : Math.round(logoWidth * 0.41);
  const titleFontSize = compact ? (width >= 760 ? 28 : 24) : width >= 1100 ? 40 : width >= 760 ? 34 : 28;
  const titleLineHeight = compact ? (width >= 760 ? 32 : 28) : width >= 1100 ? 46 : width >= 760 ? 40 : 34;
  const subtitleFontSize = compact ? (width >= 760 ? 14 : 13) : width >= 760 ? 17 : 15;
  const subtitleLineHeight = compact ? (width >= 760 ? 20 : 18) : width >= 760 ? 24 : 22;
  const copyMaxWidth = Math.min(compact ? 760 : 920, Math.max(0, width - horizontalPadding * 2));

  return (
    <View
      style={{
        paddingTop: compact ? (width >= 760 ? 18 : 16) : width >= 760 ? 28 : 22,
        paddingHorizontal: horizontalPadding,
        paddingBottom: compact ? 12 : hasCopy ? 20 : 16,
      }}
    >
      <View style={{ alignItems: "center", gap: compact ? 10 : width >= 760 ? 14 : 12 }}>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: "rgba(32,44,89,0.9)",
          }}
        >
          <Text
            style={{
              color: Colors.textOnNavy,
              fontSize: compact ? 11 : 12,
              fontWeight: "900",
              letterSpacing: 1.4,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </Text>
        </View>

        <Image
          source={require("../../../assets/logo.png")}
          resizeMode="contain"
          style={{
            width: logoWidth,
            height: logoHeight,
            alignSelf: "center",
          }}
        />

        {hasCopy && (
          <View style={{ width: "100%", maxWidth: copyMaxWidth, gap: 6 }}>
            {!!String(title ?? "").trim() && (
              <Text
                style={{
                  color: Colors.textOnBg,
                  fontSize: titleFontSize,
                  fontWeight: "900",
                  textAlign: "center",
                  lineHeight: titleLineHeight,
                }}
              >
                {title}
              </Text>
            )}
            {!!String(subtitle ?? "").trim() && (
              <Text
                style={{
                  color: "rgba(32,44,89,0.86)",
                  fontSize: subtitleFontSize,
                  fontWeight: "600",
                  lineHeight: subtitleLineHeight,
                  textAlign: "center",
                }}
              >
                {subtitle}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
