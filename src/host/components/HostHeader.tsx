import React from "react";
import { Image, Text, View } from "react-native";
import { Colors } from "../../theme";
import { useHostViewport } from "../hooks/useHostViewport";

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
  const {
    width,
    fluid,
    compactViewport,
    isLowHeight,
    isWideViewport,
    pagePadding,
    space,
    typeScale,
  } = useHostViewport();
  const hasCopy = Boolean(String(title ?? "").trim() || String(subtitle ?? "").trim());
  const horizontalPadding = pagePadding;
  const effectiveCompact = compact || compactViewport;
  const logoWidth = effectiveCompact
    ? fluid(width >= 760 ? 132 : 118, 96, 140)
    : fluid(isWideViewport ? 186 : width >= 760 ? 172 : 150, 118, 194);
  const logoHeight = Math.round(logoWidth * (effectiveCompact ? 0.38 : 0.39));
  const titleFontSize = effectiveCompact ? fluid(22, 17, 26) : fluid(28, 20, 34);
  const titleLineHeight = titleFontSize + (effectiveCompact ? 3 : 5);
  const subtitleFontSize = effectiveCompact ? typeScale.bodySm : typeScale.body;
  const subtitleLineHeight = subtitleFontSize + (effectiveCompact ? 4 : 6);
  const copyMaxWidth = Math.min(effectiveCompact ? 760 : 920, Math.max(0, width - horizontalPadding * 2));

  return (
    <View
      style={{
        paddingTop: effectiveCompact ? (isLowHeight ? space.xs : space.sm) : space.lg,
        paddingHorizontal: horizontalPadding,
        paddingBottom: effectiveCompact
          ? space.xs
          : hasCopy
            ? space.md
            : space.sm,
      }}
    >
      <View
        style={{
          alignItems: "center",
          gap: effectiveCompact ? space.xxs : space.xs,
        }}
      >
        <View
          style={{
            paddingHorizontal: space.sm,
            paddingVertical: effectiveCompact ? space.xxs : space.xs,
            borderRadius: 999,
            backgroundColor: "rgba(32,44,89,0.9)",
          }}
        >
          <Text
            style={{
              color: Colors.textOnNavy,
              fontSize: effectiveCompact ? typeScale.eyebrow : typeScale.label,
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
          <View style={{ width: "100%", maxWidth: copyMaxWidth, gap: space.xs }}>
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
