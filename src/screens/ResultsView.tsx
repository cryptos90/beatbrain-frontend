import React from "react";
import { Text, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { BBButton } from "../components/BBButton";
import { QUESTIONS_PER_QUIZ } from "../constants/app";
import { Colors } from "../theme";

type Props = {
  score: number;
  onBack: () => void;
  onRestart: () => void;
  onReturnMenu: () => void;
};

export function ResultsView({ score, onBack, onRestart, onReturnMenu }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

      <View style={{ flex: 1, alignItems: "center", paddingTop: 18 }}>
        <Text style={{ marginTop: 10, fontSize: 22, color: Colors.textOnBg, fontWeight: "800" }}>
          Score: {score}/{QUESTIONS_PER_QUIZ}
        </Text>

        <View style={{ width: "80%", gap: 18, marginTop: 24 }}>
          <BBButton title="Restart" onPress={onRestart} />
          <BBButton title="Return to Menu" onPress={onReturnMenu} />
        </View>
      </View>
    </View>
  );
}
