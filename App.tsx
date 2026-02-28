import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { HostApp } from "./src/host/HostApp";
import { useBeatBrainController } from "./src/mobile/hooks/useBeatBrainController";
import { AppRouter } from "./src/mobile/navigation/AppRouter";

function isHostWebLocation(input: { pathname: string; search: string; hash: string }) {
  const normalized = String(input.pathname ?? "").trim().toLowerCase();
  const normalizedHash = String(input.hash ?? "").trim().toLowerCase();
  const search = String(input.search ?? "");
  const query = new URLSearchParams(search);
  const forcedMode = String(query.get("app") ?? query.get("mode") ?? "")
    .trim()
    .toLowerCase();

  const hashHasHostPath =
    normalizedHash === "#/host" ||
    normalizedHash.startsWith("#/host/") ||
    normalizedHash === "#/--/host" ||
    normalizedHash.startsWith("#/--/host/");

  if (forcedMode === "host") {
    return true;
  }

  return (
    normalized === "/host" ||
    normalized.startsWith("/host/") ||
    normalized === "/--/host" ||
    normalized.startsWith("/--/host/") ||
    hashHasHostPath
  );
}

export default function App() {
  const [locationSnapshot, setLocationSnapshot] = useState(() => {
    if (typeof window === "undefined") {
      return { pathname: "", search: "", hash: "" };
    }
    return {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateLocation = () => {
      setLocationSnapshot({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
    };

    const historyRef = window.history as History & {
      __bbHostPatchApplied?: boolean;
      __bbHostOriginalPushState?: History["pushState"];
      __bbHostOriginalReplaceState?: History["replaceState"];
    };

    if (!historyRef.__bbHostPatchApplied) {
      historyRef.__bbHostPatchApplied = true;
      historyRef.__bbHostOriginalPushState = historyRef.pushState.bind(historyRef);
      historyRef.__bbHostOriginalReplaceState = historyRef.replaceState.bind(historyRef);

      historyRef.pushState = ((...args: Parameters<History["pushState"]>) => {
        historyRef.__bbHostOriginalPushState?.(...args);
        window.dispatchEvent(new Event("beatbrain:location-change"));
      }) as History["pushState"];

      historyRef.replaceState = ((...args: Parameters<History["replaceState"]>) => {
        historyRef.__bbHostOriginalReplaceState?.(...args);
        window.dispatchEvent(new Event("beatbrain:location-change"));
      }) as History["replaceState"];
    }

    window.addEventListener("popstate", updateLocation);
    window.addEventListener("hashchange", updateLocation);
    window.addEventListener("beatbrain:location-change", updateLocation);
    updateLocation();

    return () => {
      window.removeEventListener("popstate", updateLocation);
      window.removeEventListener("hashchange", updateLocation);
      window.removeEventListener("beatbrain:location-change", updateLocation);
    };
  }, []);

  const isHostWeb = useMemo(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return false;
    }
    return isHostWebLocation(locationSnapshot);
  }, [locationSnapshot]);

  if (isHostWeb) {
    return <HostApp />;
  }

  const app = useBeatBrainController();
  return <AppRouter app={app} />;
}
