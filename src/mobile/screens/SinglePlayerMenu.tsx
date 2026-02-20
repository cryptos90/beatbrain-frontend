import Slider from "@react-native-community/slider";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { Colors } from "../../theme";

type Props = {
  onBack: () => void;
  onChoose: () => void;
  onCreate: () => void;
  onRetryLogin: () => void;
  waitingForLogin?: boolean;
  loginError?: string | null;
  questionCount: number;
  onQuestionCountChange: (value: number) => void;
};

const BUTTON_DROP = 56 * 2;

function normalizeQuestionCount(value: number) {
  const clamped = Math.max(10, Math.min(100, value));
  return Math.max(10, Math.min(100, Math.round(clamped / 10) * 10));
}

export function SinglePlayerMenu({
  onBack,
  onChoose,
  onCreate,
  onRetryLogin,
  waitingForLogin,
  loginError,
  questionCount,
  onQuestionCountChange,
}: Props) {
  const showRetryLogin = !waitingForLogin && Boolean(loginError);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: BUTTON_DROP, gap: 14 }}>
        {waitingForLogin ? (
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <ActivityIndicator size={56 as any} color={Colors.navy} />
            <Text
              style={{
                marginTop: 14,
                color: Colors.textOnBg,
                fontSize: 20,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Warte auf Login...
            </Text>
          </View>
        ) : showRetryLogin ? (
          <>
            <Text
              style={{
                marginTop: 12,
                color: "red",
                fontSize: 16,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Login fehlgeschlagen
            </Text>
            <BBButton title="Login erneut versuchen" onPress={onRetryLogin} />
          </>
        ) : (
          <>
            <View
              style={{
                backgroundColor: Colors.white,
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

            <BBButton title="Choose Quiz" onPress={onChoose} />
            <BBButton title="Create Quiz" onPress={onCreate} />
          </>
        )}
      </View>
    </View>
  );
}
