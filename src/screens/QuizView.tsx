import React from "react";
import { ActivityIndicator, Animated, Image, Pressable, Text, TextInput, View } from "react-native";
import { BBButton } from "../components/BBButton";
import { BACK_BTN_SIZE, HEADER_PAD_TOP, QUESTIONS_PER_QUIZ, QUIZ_LOGO_SIZE } from "../constants/app";
import { Colors, Radius } from "../theme";
import type { QuizQuestion } from "../types/app";

type Props = {
  currentQuestion: QuizQuestion | null;
  qIndex: number;
  revealed: boolean;
  pickedOption: string | null;
  yearInput: string;
  yearWasCorrect: boolean | null;
  timerAnim: Animated.Value;
  timerBarW: number;
  onTimerLayout: (width: number) => void;
  onBack: () => Promise<void> | void;
  onPickOption: (option: string) => void;
  onYearInputChange: (value: string) => void;
  onSubmitYear: () => void;
  onNextOrFinish: () => Promise<void>;
};

export function QuizView({
  currentQuestion,
  qIndex,
  revealed,
  pickedOption,
  yearInput,
  yearWasCorrect,
  timerAnim,
  timerBarW,
  onTimerLayout,
  onBack,
  onPickOption,
  onYearInputChange,
  onSubmitYear,
  onNextOrFinish,
}: Props) {
  if (!currentQuestion) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: HEADER_PAD_TOP, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const isLast = qIndex >= QUESTIONS_PER_QUIZ - 1;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 16 }}>
        <View style={{ height: BACK_BTN_SIZE, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <BBButton
            title="←"
            onPress={onBack}
            style={{ width: BACK_BTN_SIZE, height: BACK_BTN_SIZE, paddingHorizontal: 0, justifyContent: "center" }}
          />

          <Image source={require("../../assets/logo.png")} resizeMode="contain" style={{ width: QUIZ_LOGO_SIZE, height: QUIZ_LOGO_SIZE }} />
        </View>
      </View>

      <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.textOnBg, textAlign: "center", marginTop: 10 }}>
        Question {qIndex + 1}/{QUESTIONS_PER_QUIZ}
      </Text>

      <View style={{ paddingHorizontal: 18, marginTop: 10 }}>
        <View
          onLayout={(e) => onTimerLayout(e.nativeEvent.layout.width)}
          style={{ height: 10, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.15)", overflow: "hidden" }}
        >
          <Animated.View
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: Colors.navy,
              transform: [
                {
                  translateX: timerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-(timerBarW / 2), 0],
                  }),
                },
                { scaleX: timerAnim },
              ],
            }}
          />
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 14 }}>
        <View
          style={{
            backgroundColor: Colors.navy,
            borderRadius: Radius.xl,
            paddingVertical: 28,
            paddingHorizontal: 18,
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <Text style={{ color: Colors.textOnNavy, fontSize: 24, fontWeight: "800", textAlign: "center" }}>
            {currentQuestion.questionObject.questionText}
          </Text>
        </View>

        {currentQuestion.questionObject.answerType === "year-input" ? (
          <View style={{ marginTop: 18 }}>
            {!revealed && (
              <>
                <View
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <TextInput
                    placeholder="Jahr eingeben..."
                    value={yearInput}
                    onChangeText={onYearInputChange}
                    keyboardType="number-pad"
                    style={{ fontSize: 18 }}
                  />
                </View>

                <View style={{ marginTop: 14 }}>
                  <BBButton title="Antwort absenden" onPress={onSubmitYear} />
                </View>
              </>
            )}

            {revealed && (
              <View style={{ marginTop: 6 }}>
                <Text style={{ textAlign: "center", fontSize: 20, fontWeight: "800", color: yearWasCorrect ? "green" : "red" }}>
                  Richtiges Jahr: {currentQuestion.correctAnswer}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={{ marginTop: 18, gap: 14 }}>
            {Array.from({ length: 2 }).map((_, r) => (
              <View key={r} style={{ flexDirection: "row", gap: 14 }}>
                {Array.from({ length: 2 }).map((__, c) => {
                  const idx = r * 2 + c;
                  const label = currentQuestion.options[idx];
                  if (!label) return <View key={c} style={{ flex: 1 }} />;

                  const pressed = pickedOption === label;
                  const isCorrect = label === currentQuestion.correctAnswer;
                  let bg = Colors.navy;
                  if (revealed) {
                    if (isCorrect) bg = "green";
                    if (pressed && !isCorrect) bg = "red";
                  }

                  return (
                    <Pressable
                      key={`${label}-${idx}`}
                      onPress={() => onPickOption(label)}
                      disabled={revealed}
                      style={{
                        flex: 1,
                        backgroundColor: bg,
                        borderRadius: Radius.xl,
                        paddingVertical: 22,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: revealed && !isCorrect && !pressed ? 0.7 : 1,
                        minHeight: 84,
                      }}
                    >
                      <Text style={{ color: Colors.textOnNavy, fontSize: 18, fontWeight: "700", textAlign: "center", paddingHorizontal: 10 }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {revealed && (
          <View style={{ marginTop: "auto", paddingBottom: 24 }}>
            <View
              style={{
                backgroundColor: Colors.navy,
                borderRadius: Radius.xl,
                paddingVertical: 24,
                paddingHorizontal: 18,
                alignItems: "center",
              }}
            >
              <Text style={{ color: Colors.textOnNavy, fontSize: 28, fontWeight: "800" }}>Song Info</Text>

              <View style={{ height: 12 }} />

              <Text style={{ color: Colors.textOnNavy, fontSize: 18, fontWeight: "700", textAlign: "center" }}>
                {currentQuestion.trackInfo.name}
              </Text>
              <Text style={{ color: Colors.textOnNavy, fontSize: 16, opacity: 0.9, textAlign: "center", marginTop: 4 }}>
                {currentQuestion.trackInfo.artist}
              </Text>
              <Text style={{ color: Colors.textOnNavy, fontSize: 16, opacity: 0.9, textAlign: "center", marginTop: 4 }}>
                {currentQuestion.trackInfo.album} • {currentQuestion.trackInfo.year}
              </Text>
            </View>

            <View style={{ marginTop: 14 }}>
              <BBButton title={isLast ? "Quiz beenden" : "Nächste Frage"} onPress={onNextOrFinish} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
