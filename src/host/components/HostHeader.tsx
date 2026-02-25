import React from "react";
import { Image, View } from "react-native";

export function HostHeader() {
  return (
    <View
      style={{
        paddingTop: 24,
        paddingHorizontal: 24,
        paddingBottom: 8,
      }}
    >
      <Image
        source={require("../../../assets/logo.png")}
        resizeMode="contain"
        style={{
          width: 264,
          height: 116,
          alignSelf: "center",
        }}
      />
    </View>
  );
}
