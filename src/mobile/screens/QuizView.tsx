import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { BackButton } from "../../components/BackButton";
import { BBButton } from "../../components/BBButton";
import {
  BACK_BTN_SIZE,
  HEADER_PAD_TOP,
  QUIZ_LOGO_HEIGHT,
  QUIZ_LOGO_WIDTH,
} from "../../constants/app";
import { getDisplayQuizOptions } from "../../shared/quiz/compactOptionLabels";
import { Colors, Radius } from "../../theme";
import type { QuizQuestion, QuizQuestionOption } from "../../shared/types/app";

type Props = {
  currentQuestion: QuizQuestion | null;
  qIndex: number;
  totalQuestions: number;
  revealed: boolean;
  pickedOption: string | null;
  timerAnim: Animated.Value;
  timerBarW: number;
  playbackError: string | null;
  playbackCanOpenSpotify: boolean;
  onTimerLayout: (width: number) => void;
  onBack: () => Promise<void> | void;
  onPickOption: (option: string) => void;
  onSubmitYearInput: (rawInput: string) => void;
  onOpenSpotifyApp: () => Promise<void> | void;
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
  playbackCanOpenSpotify,
  onTimerLayout,
  onBack,
  onPickOption,
  onSubmitYearInput,
  onOpenSpotifyApp,
  onNextOrFinish,
}: Props) {
  const [yearInput, setYearInput] = useState("");

  useEffect(() => {
    setYearInput("");
  }, [currentQuestion?.correctSongId]);

  useEffect(() => {
    if (!revealed) {
      setYearInput("");
    }
  }, [revealed]);

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
  const isYearInputQuestion =
    currentQuestion.questionObject.format === "year_input" ||
    currentQuestion.questionObject.answerType === "year-input";
  const isCoverOptionsQuestion = currentQuestion.questionObject.format === "cover_options";
  const optionDetailsByValue = new Map(
    (currentQuestion.optionDetails ?? []).map((option) => [option.value, option]),
  );
  const orderedOptions: QuizQuestionOption[] = currentQuestion.options.map((value) => {
    const existing = optionDetailsByValue.get(value);
    if (existing) {
      return existing;
    }
    return {
      value,
      label: value,
    };
  });
  const displayOptions = getDisplayQuizOptions(currentQuestion.questionObject, orderedOptions);
  const payload = currentQuestion.questionObject.payload;
  const toleranceRaw = Number(payload?.toleranceYears ?? 0);
  const toleranceYears =
    Number.isFinite(toleranceRaw) && toleranceRaw >= 0 ? Math.floor(toleranceRaw) : 0;
  const payloadCorrectYearRaw = Number(payload?.correctYear);
  const fallbackCorrectYear = Number.parseInt(String(currentQuestion.correctAnswer ?? ""), 10);
  const correctYear = Number.isFinite(payloadCorrectYearRaw)
    ? payloadCorrectYearRaw
    : Number.isFinite(fallbackCorrectYear)
      ? fallbackCorrectYear
      : NaN;
  const trimmedYearInput = yearInput.trim();
  const yearInputGuess =
    /^\d{4}$/.test(trimmedYearInput) ? Number.parseInt(trimmedYearInput, 10) : NaN;
  const isYearGuessInTolerance =
    Number.isFinite(yearInputGuess) &&
    Number.isFinite(correctYear) &&
    Math.abs(yearInputGuess - correctYear) <= toleranceYears;
  const yearInputFeedbackState =
    !revealed ||
    !isYearInputQuestion ||
    toleranceYears <= 0 ||
    !Number.isFinite(yearInputGuess) ||
    !Number.isFinite(correctYear)
      ? "neutral"
      : isYearGuessInTolerance
        ? "correct"
        : "wrong";
  const yearInputBackgroundColor =
    yearInputFeedbackState === "correct"
      ? "rgba(34,197,94,0.28)"
      : yearInputFeedbackState === "wrong"
        ? "rgba(239,68,68,0.28)"
        : "rgba(255,255,255,0.14)";
  const yearInputBorderColor =
    yearInputFeedbackState === "correct"
      ? "rgba(34,197,94,0.95)"
      : yearInputFeedbackState === "wrong"
        ? "rgba(239,68,68,0.95)"
        : "transparent";
  const rows =
    displayOptions.length <= 2
      ? [displayOptions]
      : [displayOptions.slice(0, 2), displayOptions.slice(2, 4)];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 18 }}>
        <View
          style={{
            height: BACK_BTN_SIZE,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <BackButton onPress={onBack} />

          <Image
            source={require("../../../assets/logo.png")}
            resizeMode="contain"
            style={{ width: QUIZ_LOGO_WIDTH, height: QUIZ_LOGO_HEIGHT }}
          />
        </View>
      </View>

      <Text
        style={{
          fontSize: 18,
          fontWeight: "800",
          color: Colors.textOnBg,
          textAlign: "center",
          marginTop: 14,
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

        {isYearInputQuestion ? (
          <View style={{ marginTop: 18 }}>
            <View
              style={{
                backgroundColor: Colors.navy,
                borderRadius: Radius.xl,
                padding: 14,
              }}
            >
              <TextInput
                value={yearInput}
                onChangeText={(value) => setYearInput(value.replace(/[^\d]/g, ""))}
                keyboardType="number-pad"
                maxLength={4}
                editable={!revealed}
                placeholder="Jahr eingeben"
                placeholderTextColor="rgba(255,255,255,0.65)"
                style={{
                  backgroundColor: yearInputBackgroundColor,
                  borderWidth: 2,
                  borderColor: yearInputBorderColor,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: Colors.textOnNavy,
                  fontSize: 20,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              />
              <View style={{ marginTop: 12 }}>
                <BBButton
                  title="Antwort prüfen"
                  disabled={revealed || yearInput.trim().length === 0}
                  onPress={() => onSubmitYearInput(yearInput)}
                />
              </View>
            </View>
          </View>
        ) : isCoverOptionsQuestion ? (
          <View style={{ marginTop: 18, gap: 14 }}>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={{ flexDirection: "row", gap: 14 }}>
                {row.map((option, optionIndex) => {
                  const pressed = pickedOption === option.value;
                  const isCorrect = option.value === currentQuestion.correctAnswer;
                  let backgroundColor = Colors.navy;
                  if (revealed) {
                    if (isCorrect) {
                      backgroundColor = "#16a34a";
                    } else {
                      backgroundColor = "#dc2626";
                    }
                  }

                  return (
                    <Pressable
                      key={`${option.value}-${rowIndex}-${optionIndex}`}
                      onPress={() => onPickOption(option.value)}
                      disabled={revealed}
                      style={{
                        flex: 1,
                        backgroundColor,
                        borderRadius: Radius.xl,
                        padding: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 1,
                        minHeight: 170,
                        gap: 8,
                      }}
                    >
                      {!!option.coverUrl ? (
                        <Image
                          source={{ uri: option.coverUrl }}
                          style={{ width: "100%", aspectRatio: 1, borderRadius: 14 }}
                        />
                      ) : (
                        <View
                          style={{
                            width: "100%",
                            aspectRatio: 1,
                            borderRadius: 14,
                            backgroundColor: "rgba(255,255,255,0.14)",
                          }}
                        />
                      )}
                      {revealed && (
                        <Text
                          numberOfLines={2}
                          style={{
                            color: Colors.textOnNavy,
                            fontSize: 14,
                            lineHeight: 18,
                            fontWeight: "700",
                            textAlign: "center",
                          }}
                        >
                          {option.displayLabel}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
                {row.length < 2 && <View style={{ flex: 1 }} />}
              </View>
            ))}
          </View>
        ) : (
          <View style={{ marginTop: 18, gap: 14 }}>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={{ flexDirection: "row", gap: 14 }}>
                {row.map((option, optionIndex) => {
                  const pressed = pickedOption === option.value;
                  const isCorrect = option.value === currentQuestion.correctAnswer;
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
                      key={`${option.value}-${rowIndex}-${optionIndex}`}
                      onPress={() => onPickOption(option.value)}
                      disabled={revealed}
                      style={{
                        flex: 1,
                        backgroundColor,
                        borderRadius: Radius.xl,
                        paddingVertical: 22,
                        paddingHorizontal: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: revealed && !isCorrect && !pressed ? 0.7 : 1,
                        minHeight: 84,
                      }}
                    >
                      <Text
                        numberOfLines={2}
                        style={{
                          color: Colors.textOnNavy,
                          fontSize: 18,
                          lineHeight: 22,
                          fontWeight: "700",
                          textAlign: "center",
                          paddingHorizontal: 10,
                        }}
                      >
                        {option.displayLabel}
                      </Text>
                    </Pressable>
                  );
                })}
                {row.length < 2 && <View style={{ flex: 1 }} />}
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
                paddingVertical: 16,
                paddingHorizontal: 14,
              }}
            >
              <View style={{ height: 4 }} />

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {!!currentQuestion.trackInfo.coverUrl ? (
                  <Image
                    source={{ uri: currentQuestion.trackInfo.coverUrl }}
                    style={{ width: 104, height: 104, borderRadius: 10 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 104,
                      height: 104,
                      borderRadius: 10,
                      backgroundColor: "rgba(255,255,255,0.12)",
                    }}
                  />
                )}

                <View
                  style={{
                    marginLeft: 12,
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: Colors.textOnNavy,
                      fontSize: 17,
                      fontWeight: "700",
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    {currentQuestion.trackInfo.name}
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      color: Colors.textOnNavy,
                      fontSize: 15,
                      opacity: 0.92,
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    {currentQuestion.trackInfo.artist}
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      color: Colors.textOnNavy,
                      fontSize: 15,
                      opacity: 0.92,
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    {currentQuestion.trackInfo.album}
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      color: Colors.textOnNavy,
                      fontSize: 15,
                      opacity: 0.92,
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    Jahr: {currentQuestion.trackInfo.year || "?"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <BBButton title={isLast ? "Quiz beenden" : "Nächste Frage"} onPress={onNextOrFinish} />
            </View>
          </View>
        )}
      </View>

      {!!playbackError && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: HEADER_PAD_TOP + BACK_BTN_SIZE + 36,
            left: 0,
            right: 0,
            zIndex: 20,
            alignItems: "center",
            paddingHorizontal: 18,
          }}
        >
          <View
            pointerEvents={playbackCanOpenSpotify ? "auto" : "none"}
            style={{
              width: "100%",
              maxWidth: 520,
              backgroundColor: "rgba(31, 47, 79, 0.96)",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.22)",
              paddingVertical: 12,
              paddingHorizontal: 12,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: Colors.textOnNavy,
                fontWeight: "700",
              }}
            >
              {playbackError}
            </Text>
            {playbackCanOpenSpotify && (
                <View style={{ marginTop: 10, alignItems: "center" }}>
                  <View style={{ width: "72%", maxWidth: 280 }}>
                    <BBButton title="Spotify öffnen" onPress={onOpenSpotifyApp} />
                  </View>
                </View>
              )}
          </View>
        </View>
      )}

    </View>
  );
}
