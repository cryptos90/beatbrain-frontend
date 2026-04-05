import React from "react";
import { Platform } from "react-native";
import { HostApp } from "./src/host/HostApp";
import { HostPreviewApp } from "./src/host/HostPreviewApp";
import { useBeatBrainController } from "./src/mobile/hooks/useBeatBrainController";
import { AppRouter } from "./src/mobile/navigation/AppRouter";

const MOBILE_WEB_QUERY_KEYS = ["joinCode", "sessionId", "code", "auth_code", "state", "error"];

function hasMobileWebQuery() {
  if (typeof window === "undefined") {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);
  return MOBILE_WEB_QUERY_KEYS.some((key) => {
    const value = searchParams.get(key);
    return typeof value === "string" && value.trim().length > 0;
  });
}

function shouldRenderHostWebApp() {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return false;
  }

  if (window.location.pathname.startsWith("/host/preview")) {
    return false;
  }

  if (window.location.pathname.startsWith("/host")) {
    return true;
  }

  return !hasMobileWebQuery();
}

export default function App() {
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/host/preview")
  ) {
    return <HostPreviewApp />;
  }

  if (shouldRenderHostWebApp()) {
    return <HostApp />;
  }

  const app = useBeatBrainController();
  return <AppRouter app={app} />;
}
