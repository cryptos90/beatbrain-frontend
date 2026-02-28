import React from "react";
import { Platform } from "react-native";
import { HostApp } from "./src/host/HostApp";
import { useBeatBrainController } from "./src/mobile/hooks/useBeatBrainController";
import { AppRouter } from "./src/mobile/navigation/AppRouter";

function isHostWebPath(pathname: string) {
  const normalized = String(pathname ?? "").trim().toLowerCase();
  return (
    normalized === "/host" ||
    normalized.startsWith("/host/") ||
    normalized === "/--/host" ||
    normalized.startsWith("/--/host/")
  );
}

export default function App() {
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    isHostWebPath(window.location.pathname)
  ) {
    return <HostApp />;
  }

  const app = useBeatBrainController();
  return <AppRouter app={app} />;
}
