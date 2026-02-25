import React, { type ReactNode } from "react";
import { Text, View } from "react-native";
import { Colors } from "../../theme";
import { HostHeader } from "./HostHeader";

type Props = {
  children: ReactNode;
  maxWidth?: number;
  notice?: string | null;
};

export function HostLayout({ children, maxWidth = 980, notice }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <HostHeader />
      {!!notice && (
        <Text
          style={{
            color: Colors.textOnBg,
            textAlign: "center",
            fontSize: 13,
            fontWeight: "600",
            opacity: 0.9,
            paddingHorizontal: 24,
            marginBottom: 8,
          }}
        >
          {notice}
        </Text>
      )}
      <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flex: 1, width: "100%", maxWidth, alignSelf: "center" }}>{children}</View>
      </View>
    </View>
  );
}
