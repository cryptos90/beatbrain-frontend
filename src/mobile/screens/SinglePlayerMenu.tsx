import Slider from "@react-native-community/slider";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { BUTTON_DROP } from "../../constants/app";
import { Colors } from "../../theme";

type Props = {
  onBack: () => void;
  onChoose: () => void;
  onCreate: () => void;
  onLogin: () => void;
  hasAuth: boolean;
  waitingForLogin?: boolean;
  loginError?: string | null;
  questionCount: number;
  onQuestionCountChange: (value: number) => void;
};

function normalizeQuestionCount(value: number) {
  const clamped = Math.max(10, Math.min(100, value));
  return Math.max(10, Math.min(100, Math.round(clamped / 10) * 10));
}

export function SinglePlayerMenu({
  onBack,
  onChoose,
  onCreate,
  onLogin,
  hasAuth,
  waitingForLogin,
  loginError,
  questionCount,
  onQuestionCountChange,
}: Props) {
  const loginBusy = Boolean(waitingForLogin);
  const canStartQuiz = hasAuth && !loginBusy;
  const loginLabel = hasAuth ? "Mit Spotify verbunden" : loginBusy ? "Bitte warten..." : "Mit Spotify verbinden";

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: BUTTON_DROP, gap: 14 }}>
        {loginBusy && (
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <ActivityIndicator size={48 as any} color={Colors.navy} />
          </View>
        )}

        <View
          style={{
            backgroundColor: Colors.bg,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Text
            style={{
              color: Colors.textOnBg,
              fontWeight: "700",
              fontSize: 16,
              textAlign: "center",
            }}
          >
            Fragen: {questionCount}
          </Text>
          <Slider
            minimumValue={10}
            maximumValue={100}
            step={10}
            value={questionCount}
            minimumTrackTintColor={Colors.navy}
            maximumTrackTintColor="rgba(15, 23, 42, 0.2)"
            thumbTintColor={Colors.navy}
            onValueChange={(value) => onQuestionCountChange(normalizeQuestionCount(value))}
            onSlidingComplete={(value) =>
              onQuestionCountChange(normalizeQuestionCount(value))
            }
          />
        </View>

        <BBButton title="Choose Quiz" onPress={onChoose} disabled={!canStartQuiz} />
        <BBButton title="Create Quiz" onPress={onCreate} disabled={!canStartQuiz} />

        <View style={{ marginTop: 16 }}>
          <BBButton title={loginLabel} onPress={onLogin} disabled={hasAuth || loginBusy} />
        </View>

        {!!loginError && !hasAuth && (
          <Text
            style={{
              marginTop: 6,
              color: "red",
              fontSize: 15,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            {loginError}
          </Text>
        )}
      </View>
    </View>
  );
}
