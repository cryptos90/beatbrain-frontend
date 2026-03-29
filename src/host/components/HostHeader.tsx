import React from "react";
import { Image, Text, View } from "react-native";
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
  const hasCopy = Boolean(String(title ?? "").trim() || String(subtitle ?? "").trim());

  return (
    <View
      style={{
        paddingTop: compact ? 18 : 28,
        paddingHorizontal: 24,
        paddingBottom: compact ? 10 : 18,
      }}
    >
      <View style={{ alignItems: "center", gap: compact ? 10 : 14 }}>
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
            width: compact ? 188 : 236,
            height: compact ? 76 : 96,
            alignSelf: "center",
          }}
        />

        {hasCopy && (
          <View style={{ width: "100%", maxWidth: compact ? 760 : 920, gap: 6 }}>
            {!!String(title ?? "").trim() && (
              <Text
                style={{
                  color: Colors.textOnBg,
                  fontSize: compact ? 28 : 40,
                  fontWeight: "900",
                  textAlign: "center",
                  lineHeight: compact ? 32 : 46,
                }}
              >
                {title}
              </Text>
            )}
            {!!String(subtitle ?? "").trim() && (
              <Text
                style={{
                  color: "rgba(32,44,89,0.86)",
                  fontSize: compact ? 14 : 17,
                  fontWeight: "600",
                  lineHeight: compact ? 20 : 24,
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
