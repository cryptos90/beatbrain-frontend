import React from "react";
import { Image, Text, View } from "react-native";
import { Colors } from "../../theme";

type Props = {
  uri?: string | null;
  name: string;
  size: number;
  backgroundColor?: string;
  textColor?: string;
};

function getInitials(name: string) {
  return String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function HostPlayerAvatar({
  uri,
  name,
  size,
  backgroundColor = "rgba(255,255,255,0.18)",
  textColor = Colors.navy,
}: Props) {
  const sourceUri = String(uri ?? "").trim();

  if (sourceUri) {
    return (
      <Image
        source={{ uri: sourceUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
      }}
    >
      <Text
        style={{
          color: textColor,
          fontWeight: "900",
          fontSize: Math.max(12, Math.round(size * 0.34)),
        }}
      >
        {getInitials(name) || "?"}
      </Text>
    </View>
  );
}
