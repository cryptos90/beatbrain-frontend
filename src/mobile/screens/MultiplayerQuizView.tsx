import React, { useEffect, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { BackButton } from "../../components/BackButton";
import { BBButton } from "../../components/BBButton";
import {
  BACK_BTN_SIZE,
  HEADER_PAD_TOP,
  QUIZ_LOGO_HEIGHT,
  QUIZ_LOGO_WIDTH,
} from "../../constants/app";
import { Colors, Radius } from "../../theme";
import type { LobbyState, QuizQuestion, QuizQuestionOption } from "../../shared/types/app";

type Props = {
  lobby: LobbyState | null;
  question: QuizQuestion | null;
  correctAnswer: string | null;
  playerAnswered: boolean;
  playerContinued: boolean;
  allAnswered: boolean;
  timeUp: boolean;
  allContinued: boolean;
  onBack: () => void;
  onAnswer: (answer: string) => void;
  onContinue: () => void;
};

export function MultiplayerQuizView({
  lobby,
  question,
  correctAnswer,
  playerAnswered,
  playerContinued,
  allAnswered,
  timeUp,
  allContinued,
  onBack,
  onAnswer,
  onContinue,
}: Props) {
  const [yearInput, setYearInput] = useState("");

  useEffect(() => {
    setYearInput("");
  }, [question?.correctSongId]);

  const optionRows = question
    ? (() => {
        const optionDetailsByValue = new Map(
          (question.optionDetails ?? []).map((option) => [option.value, option]),
        );
        const orderedOptions: QuizQuestionOption[] = question.options.map((value) => {
          const existing = optionDetailsByValue.get(value);
          if (existing) {
            return existing;
          }
          return {
            value,
            label: value,
          };
        });
        return orderedOptions.length <= 2
          ? [orderedOptions]
          : [orderedOptions.slice(0, 2), orderedOptions.slice(2, 4)];
      })()
    : [];
  const isYearInputQuestion = Boolean(
    question &&
      (question.questionObject.format === "year_input" ||
        question.questionObject.answerType === "year-input"),
  );
  const isCoverOptionsQuestion = question?.questionObject.format === "cover_options";
  const isAnswerLocked = playerAnswered || Boolean(correctAnswer);
  const canSubmitYearInput = !isAnswerLocked && yearInput.trim().length > 0;

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

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 18, gap: 14 }}>
        {!!lobby && (
          <Text
            style={{
              color: Colors.textOnBg,
              textAlign: "center",
              fontSize: 17,
              fontWeight: "800",
            }}
          >
            Session: {lobby.joinCode}
          </Text>
        )}

        {!question && (
          <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
            Warten auf die nächste Runde...
          </Text>
        )}

        {!!question && (
          <>
            <View
              style={{
                backgroundColor: Colors.navy,
                borderRadius: Radius.xl,
                paddingVertical: 20,
                paddingHorizontal: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: Colors.textOnNavy,
                  fontSize: 22,
                  fontWeight: "800",
                  textAlign: "center",
                }}
              >
                {question.questionObject.questionText}
              </Text>
            </View>

            {isYearInputQuestion ? (
              <View
                style={{
                  backgroundColor: Colors.navy,
                  borderRadius: Radius.xl,
                  padding: 14,
                  gap: 12,
                }}
              >
                <TextInput
                  value={yearInput}
                  onChangeText={(value) => setYearInput(value.replace(/[^\d]/g, ""))}
                  keyboardType="number-pad"
                  maxLength={4}
                  editable={!isAnswerLocked}
                  placeholder="Jahr eingeben"
                  placeholderTextColor="rgba(255,255,255,0.65)"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.14)",
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    color: Colors.textOnNavy,
                    fontSize: 20,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                />
                <BBButton
                  title={playerAnswered ? "Antwort gesendet" : "Antwort senden"}
                  onPress={() => onAnswer(yearInput.trim())}
                  disabled={!canSubmitYearInput}
                />
              </View>
            ) : isCoverOptionsQuestion ? (
              <View style={{ gap: 12 }}>
                {optionRows.map((row, rowIndex) => (
                  <View key={rowIndex} style={{ flexDirection: "row", gap: 12 }}>
                    {row.map((option) => {
                      const disabled = playerAnswered || Boolean(correctAnswer);
                      const isReveal = Boolean(correctAnswer);
                      const optionBackgroundColor = !isReveal
                        ? Colors.navy
                        : option.value === correctAnswer
                          ? "#16a34a"
                          : "#dc2626";
                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => onAnswer(option.value)}
                          disabled={disabled}
                          style={{
                            flex: 1,
                            minHeight: 170,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: optionBackgroundColor,
                            borderRadius: Radius.xl,
                            padding: 10,
                            opacity: isReveal ? 1 : disabled ? 0.86 : 1,
                            gap: 8,
                          }}
                        >
                          {!!option.coverUrl ? (
                            <Image
                              source={{ uri: option.coverUrl }}
                              style={{ width: "100%", aspectRatio: 1, borderRadius: 12 }}
                            />
                          ) : (
                            <View
                              style={{
                                width: "100%",
                                aspectRatio: 1,
                                borderRadius: 12,
                                backgroundColor: "rgba(255,255,255,0.14)",
                              }}
                            />
                          )}
                          {isReveal && (
                            <Text
                              style={{
                                color: Colors.textOnNavy,
                                fontSize: 14,
                                fontWeight: "700",
                                textAlign: "center",
                              }}
                            >
                              {option.label}
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
              <View style={{ gap: 12 }}>
                {optionRows.map((row, rowIndex) => (
                  <View key={rowIndex} style={{ flexDirection: "row", gap: 12 }}>
                    {row.map((option) => {
                      const disabled = playerAnswered || Boolean(correctAnswer);
                      const isReveal = Boolean(correctAnswer);
                      const optionBackgroundColor = !isReveal
                        ? Colors.navy
                        : option.value === correctAnswer
                          ? "#16a34a"
                          : "#dc2626";
                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => onAnswer(option.value)}
                          disabled={disabled}
                          style={{
                            flex: 1,
                            minHeight: 82,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: optionBackgroundColor,
                            borderRadius: Radius.xl,
                            paddingHorizontal: 10,
                            opacity: isReveal ? 1 : disabled ? 0.86 : 1,
                          }}
                        >
                          <Text
                            style={{
                              color: isReveal ? Colors.white : Colors.textOnNavy,
                              fontSize: 18,
                              fontWeight: "700",
                              textAlign: "center",
                            }}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {row.length < 2 && <View style={{ flex: 1 }} />}
                  </View>
                ))}
              </View>
            )}

            {!correctAnswer && (
              <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
                {allAnswered
                  ? "Alle haben geantwortet. Reveal kommt automatisch."
                  : timeUp
                    ? "Zeit ist um. Reveal kommt automatisch."
                    : playerAnswered
                      ? "Antwort gesendet. Warten auf andere Spieler..."
                      : "Tippe auf eine Antwort."}
              </Text>
            )}

            {!!correctAnswer && (
              <>
                <BBButton
                  title={playerContinued ? "Warten auf andere..." : "Weiter"}
                  onPress={onContinue}
                  disabled={playerContinued}
                />

                {allContinued && (
                  <Text
                    style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}
                  >
                    Alle bereit. Nächste Frage startet automatisch...
                  </Text>
                )}
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}
