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
  const { width, height, fluid, isShortViewport } = useHostViewport();
  const hasCopy = Boolean(String(title ?? "").trim() || String(subtitle ?? "").trim());
  const compactViewport = isShortViewport;
  const horizontalPadding = fluid(width >= 760 ? 22 : 18, 16, 28, "width");
  const effectiveCompact = compact || compactViewport;
  const logoWidth = effectiveCompact
    ? fluid(width >= 760 ? 164 : 150, 138, 168)
    : fluid(width >= 760 ? 220 : 190, 170, 236);
  const logoHeight = effectiveCompact ? Math.round(logoWidth * 0.4) : Math.round(logoWidth * 0.41);
  const titleFontSize = effectiveCompact ? fluid(26, 20, 28) : fluid(38, 26, 40);
  const titleLineHeight = titleFontSize + (effectiveCompact ? 4 : 6);
  const subtitleFontSize = effectiveCompact ? fluid(13, 11, 14) : fluid(16, 14, 17);
  const subtitleLineHeight = subtitleFontSize + (effectiveCompact ? 5 : 7);
  const copyMaxWidth = Math.min(effectiveCompact ? 760 : 920, Math.max(0, width - horizontalPadding * 2));

  return (
    <View
      style={{
        paddingTop: effectiveCompact ? fluid(14, 10, 16, "height") : fluid(26, 18, 30, "height"),
        paddingHorizontal: horizontalPadding,
        paddingBottom: effectiveCompact ? fluid(10, 8, 12, "height") : hasCopy ? fluid(18, 14, 22, "height") : fluid(14, 12, 18, "height"),
      }}
    >
      <View style={{ alignItems: "center", gap: effectiveCompact ? fluid(8, 6, 10, "height") : fluid(13, 10, 16, "height") }}>
        <View
          style={{
            paddingHorizontal: fluid(12, 10, 14, "width"),
            paddingVertical: effectiveCompact ? fluid(5, 4, 6, "height") : fluid(6, 5, 7, "height"),
            borderRadius: 999,
            backgroundColor: "rgba(32,44,89,0.9)",
          }}
        >
          <Text
            style={{
              color: Colors.textOnNavy,
              fontSize: effectiveCompact ? fluid(10, 9, 11) : fluid(12, 10, 12),
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
