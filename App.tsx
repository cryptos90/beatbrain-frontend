import React from "react";
import { useBeatBrainController } from "./src/hooks/useBeatBrainController";
import { AppRouter } from "./src/navigation/AppRouter";

export default function App() {
  const app = useBeatBrainController();
  return <AppRouter app={app} />;
}
