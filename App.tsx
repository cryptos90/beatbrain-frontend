import React from "react";
import { Platform } from "react-native";
import { HostApp } from "./src/host/HostApp";
import { useBeatBrainController } from "./src/mobile/hooks/useBeatBrainController";
import { AppRouter } from "./src/mobile/navigation/AppRouter";

export default function App() {
  if (Platform.OS === "web" && window.location.pathname.startsWith("/host")) {
    return <HostApp />;
  }

  const app = useBeatBrainController();
  return <AppRouter app={app} />;
}
