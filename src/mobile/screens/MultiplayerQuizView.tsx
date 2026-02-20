import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { Colors, Radius } from "../../theme";
import type { LobbyState, QuizQuestion } from "../../shared/types/app";

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
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 10, gap: 10 }}>
        {!!lobby && (
          <Text
            style={{
              color: Colors.textOnBg,
              textAlign: "center",
              fontSize: 18,
              fontWeight: "800",
            }}
          >
            Session: {lobby.joinCode}
          </Text>
        )}

        {!question && (
          <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
            Waiting for host to start the next round...
          </Text>
        )}

        {!!question && (
          <>
            <View
              style={{
                backgroundColor: Colors.navy,
                borderRadius: Radius.xl,
                paddingVertical: 22,
                paddingHorizontal: 14,
              }}
            >
              <Text
                style={{
                  color: Colors.textOnNavy,
                  fontSize: 20,
                  fontWeight: "800",
                  textAlign: "center",
                }}
              >
                {question.questionObject.questionText}
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {question.options.map((option) => {
                const isCorrect = correctAnswer ? option === correctAnswer : false;
                const isWrongSelected =
                  Boolean(correctAnswer) &&
                  !isCorrect &&
                  playerAnswered &&
                  lobby?.status === "reveal";

                let backgroundColor = Colors.navy;
                if (correctAnswer) {
                  if (isCorrect) {
                    backgroundColor = "green";
                  } else if (isWrongSelected) {
                    backgroundColor = "red";
                  }
                }

                return (
                  <Pressable
                    key={option}
                    onPress={() => onAnswer(option)}
                    disabled={playerAnswered || !!correctAnswer}
                    style={{
                      backgroundColor,
                      borderRadius: Radius.xl,
                      minHeight: 58,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 12,
                      opacity: playerAnswered || !!correctAnswer ? 0.85 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.textOnNavy,
                        fontSize: 17,
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!correctAnswer && (
              <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
                {allAnswered
                  ? "All players answered. Waiting for reveal..."
                  : timeUp
                    ? "Time is up. Waiting for reveal..."
                    : playerAnswered
                      ? "Answer sent. Waiting for other players..."
                      : "Choose your answer."}
              </Text>
            )}

            {!!correctAnswer && (
              <>
                <View
                  style={{
                    backgroundColor: Colors.navy,
                    borderRadius: Radius.xl,
                    paddingVertical: 18,
                    paddingHorizontal: 14,
                    alignItems: "center",
                  }}
                >
                  {!!question.trackInfo.coverUrl && (
                    <Image
                      source={{ uri: question.trackInfo.coverUrl }}
                      style={{ width: 96, height: 96, borderRadius: 12 }}
                    />
                  )}
                  <Text
                    style={{
                      marginTop: 10,
                      color: Colors.textOnNavy,
                      fontSize: 18,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    {question.trackInfo.name}
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      color: Colors.textOnNavy,
                      fontSize: 16,
                      textAlign: "center",
                    }}
                  >
                    {question.trackInfo.artist}
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      color: Colors.textOnNavy,
                      fontSize: 16,
                      textAlign: "center",
                    }}
                  >
                    {question.trackInfo.album} | {question.trackInfo.year}
                  </Text>
                </View>

                <BBButton
                  title={playerContinued ? "Waiting for others..." : "Weiter"}
                  onPress={onContinue}
                  disabled={playerContinued}
                />

                {allContinued && (
                  <Text
                    style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}
                  >
                    All players continued. Waiting for next round...
                  </Text>
                )}
              </>
            )}
          </>
        )}

        {!!lobby && lobby.players.length > 0 && (
          <View
            style={{
              marginTop: "auto",
              backgroundColor: "rgba(255,255,255,0.55)",
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 10,
              gap: 6,
            }}
          >
            {lobby.players.map((player) => (
              <View
                key={player.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: Colors.textOnBg, fontWeight: "700" }}>{player.name}</Text>
                <Text style={{ color: Colors.textOnBg, fontWeight: "700" }}>{player.score}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
