import React from "react";
import { useBeatBrainController } from "./src/mobile/hooks/useBeatBrainController";
import { AppRouter } from "./src/mobile/navigation/AppRouter";

export default function App() {
  const app = useBeatBrainController();
  return <AppRouter app={app} />;
}
