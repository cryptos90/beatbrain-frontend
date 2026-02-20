import React from "react";
import { ActivityIndicator, Animated, Image, Pressable, Text, View } from "react-native";
import { BBButton } from "../../components/BBButton";
import { BACK_BTN_SIZE, HEADER_PAD_TOP, QUIZ_LOGO_SIZE } from "../../constants/app";
import { Colors, Radius } from "../../theme";
import type { QuizQuestion } from "../../shared/types/app";

type Props = {
  currentQuestion: QuizQuestion | null;
  qIndex: number;
  totalQuestions: number;
  revealed: boolean;
  pickedOption: string | null;
  timerAnim: Animated.Value;
  timerBarW: number;
  playbackError: string | null;
  onTimerLayout: (width: number) => void;
  onBack: () => Promise<void> | void;
  onPickOption: (option: string) => void;
  onNextOrFinish: () => Promise<void>;
};

export function QuizView({
  currentQuestion,
  qIndex,
  totalQuestions,
  revealed,
  pickedOption,
  timerAnim,
  timerBarW,
  playbackError,
  onTimerLayout,
  onBack,
  onPickOption,
  onNextOrFinish,
}: Props) {
  if (!currentQuestion) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.bg,
          paddingTop: HEADER_PAD_TOP,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  const isLast = qIndex >= totalQuestions - 1;
  const rows =
    currentQuestion.options.length <= 2
      ? [currentQuestion.options]
      : [currentQuestion.options.slice(0, 2), currentQuestion.options.slice(2, 4)];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 16 }}>
        <View
          style={{
            height: BACK_BTN_SIZE,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <BBButton
            title="<-"
            onPress={onBack}
            style={{
              width: BACK_BTN_SIZE,
              height: BACK_BTN_SIZE,
              paddingHorizontal: 0,
              justifyContent: "center",
            }}
          />

          <Image
            source={require("../../../assets/logo.png")}
            resizeMode="contain"
            style={{ width: QUIZ_LOGO_SIZE, height: QUIZ_LOGO_SIZE }}
          />
        </View>
      </View>

      <Text
        style={{
          fontSize: 18,
          fontWeight: "800",
          color: Colors.textOnBg,
          textAlign: "center",
          marginTop: 10,
        }}
      >
        Question {qIndex + 1}/{totalQuestions}
      </Text>

      <View style={{ paddingHorizontal: 18, marginTop: 10 }}>
        <View
          onLayout={(e) => onTimerLayout(e.nativeEvent.layout.width)}
          style={{
            height: 10,
            borderRadius: 999,
            backgroundColor: "rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}
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

      {!!playbackError && (
        <Text style={{ marginTop: 8, textAlign: "center", color: "#92400e", fontWeight: "700" }}>
          {playbackError}
        </Text>
      )}

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
          <Text
            style={{
              color: Colors.textOnNavy,
              fontSize: 24,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            {currentQuestion.questionObject.questionText}
          </Text>
        </View>

        <View style={{ marginTop: 18, gap: 14 }}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={{ flexDirection: "row", gap: 14 }}>
              {row.map((label, optionIndex) => {
                const pressed = pickedOption === label;
                const isCorrect = label === currentQuestion.correctAnswer;
                let backgroundColor = Colors.navy;
                if (revealed) {
                  if (isCorrect) {
                    backgroundColor = "green";
                  } else if (pressed) {
                    backgroundColor = "red";
                  }
                }

                return (
                  <Pressable
                    key={`${label}-${rowIndex}-${optionIndex}`}
                    onPress={() => onPickOption(label)}
                    disabled={revealed}
                    style={{
                      flex: 1,
                      backgroundColor,
                      borderRadius: Radius.xl,
                      paddingVertical: 22,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: revealed && !isCorrect && !pressed ? 0.7 : 1,
                      minHeight: 84,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.textOnNavy,
                        fontSize: 18,
                        fontWeight: "700",
                        textAlign: "center",
                        paddingHorizontal: 10,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
              {row.length < 2 && <View style={{ flex: 1 }} />}
            </View>
          ))}
        </View>

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
              <Text style={{ color: Colors.textOnNavy, fontSize: 28, fontWeight: "800" }}>
                Song Info
              </Text>

              <View style={{ height: 12 }} />

              {!!currentQuestion.trackInfo.coverUrl && (
                <Image
                  source={{ uri: currentQuestion.trackInfo.coverUrl }}
                  style={{ width: 120, height: 120, borderRadius: 12 }}
                />
              )}

              <View style={{ height: 12 }} />

              <Text
                style={{
                  color: Colors.textOnNavy,
                  fontSize: 18,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {currentQuestion.trackInfo.name}
              </Text>
              <Text
                style={{
                  color: Colors.textOnNavy,
                  fontSize: 16,
                  opacity: 0.9,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {currentQuestion.trackInfo.artist}
              </Text>
              <Text
                style={{
                  color: Colors.textOnNavy,
                  fontSize: 16,
                  opacity: 0.9,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {currentQuestion.trackInfo.album} | {currentQuestion.trackInfo.year}
              </Text>
            </View>

            <View style={{ marginTop: 14 }}>
              <BBButton title={isLast ? "Quiz beenden" : "Naechste Frage"} onPress={onNextOrFinish} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
