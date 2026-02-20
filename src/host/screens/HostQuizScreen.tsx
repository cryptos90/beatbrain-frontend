import React from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { Colors, Radius } from "../../theme";
import type { LobbyPlayer, LobbyState, QuizQuestion } from "../../shared/types/app";

type Props = {
  lobby: LobbyState | null;
  question: QuizQuestion | null;
  correctAnswer: string | null;
  playbackError: string | null;
  socketError: string | null;
  actionBusy: boolean;
  allAnswered: boolean;
  timeUp: boolean;
  allContinued: boolean;
  countdownMs: number;
  readyCount: number;
  totalPlayers: number;
  canStartRound: boolean;
  canReveal: boolean;
  onBack: () => void;
  onStartRound: () => void;
  onReveal: () => void;
};

function optionBgColor(option: string, correctAnswer: string | null) {
  if (!correctAnswer) {
    return Colors.navy;
  }
  return option === correctAnswer ? "green" : "red";
}

function chosenByOption(option: string, players: LobbyPlayer[]) {
  const normalizedOption = option.toLowerCase();
  return players.filter((player) => {
    const answer = String(player.latestAnswer ?? "").trim().toLowerCase();
    return Boolean(answer) && answer === normalizedOption;
  });
}

export function HostQuizScreen({
  lobby,
  question,
  correctAnswer,
  playbackError,
  socketError,
  actionBusy,
  allAnswered,
  timeUp,
  allContinued,
  countdownMs,
  readyCount,
  totalPlayers,
  canStartRound,
  canReveal,
  onBack,
  onStartRound,
  onReveal,
}: Props) {
  const secondsLeft = Math.max(0, Math.ceil(countdownMs / 1000));
  const startRoundLabel = lobby?.status === "reveal" ? "Nächste Frage" : "Start Runde";

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 12 }}
      >
        <Text
          style={{
            color: Colors.textOnBg,
            fontSize: 18,
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          Session: {lobby?.joinCode ?? "-"}
        </Text>

        {lobby?.status === "question" && (
          <Text
            style={{
              color: Colors.textOnBg,
              fontSize: 44,
              fontWeight: "900",
              textAlign: "center",
              lineHeight: 50,
            }}
          >
            {secondsLeft}s
          </Text>
        )}

        {!!playbackError && (
          <View
            style={{
              backgroundColor: "#fde68a",
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 14,
            }}
          >
            <Text style={{ color: "#78350f", fontWeight: "800", textAlign: "center" }}>
              {playbackError}
            </Text>
            <Text style={{ color: "#78350f", textAlign: "center", marginTop: 6 }}>
              Spotify öffnen und dort einmal ein Gerät aktiv spielen lassen.
            </Text>
          </View>
        )}

        {!!socketError && (
          <Text style={{ color: "red", textAlign: "center", fontWeight: "700" }}>
            {socketError}
          </Text>
        )}

        {question ? (
          <>
            <View
              style={{
                backgroundColor: Colors.navy,
                borderRadius: Radius.xl,
                paddingVertical: 24,
                paddingHorizontal: 16,
              }}
            >
              <Text
                style={{
                  color: Colors.textOnNavy,
                  fontSize: 28,
                  fontWeight: "800",
                  textAlign: "center",
                }}
              >
                {question.questionObject.questionText}
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {question.options.map((option) => {
                const optionPlayers = chosenByOption(option, lobby?.players ?? []);
                return (
                  <View
                    key={option}
                    style={{
                      backgroundColor: optionBgColor(option, correctAnswer),
                      borderRadius: Radius.xl,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      gap: 10,
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
                      {option}
                    </Text>

                    {Boolean(correctAnswer) && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {optionPlayers.length > 0 ? (
                          optionPlayers.map((player) => (
                            <View
                              key={`${option}-${player.id}`}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: "rgba(255,255,255,0.25)",
                                borderRadius: 999,
                                paddingVertical: 4,
                                paddingHorizontal: 8,
                                gap: 6,
                              }}
                            >
                              <Image
                                source={{ uri: player.avatarDataUrl }}
                                style={{ width: 30, height: 30, borderRadius: 15 }}
                              />
                              <Text
                                style={{ color: Colors.textOnNavy, fontSize: 13, fontWeight: "700" }}
                              >
                                {player.name}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text
                            style={{ color: Colors.textOnNavy, fontSize: 13, fontWeight: "700" }}
                          >
                            Keine Auswahl
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {!!correctAnswer && (
              <View
                style={{
                  backgroundColor: Colors.navy,
                  borderRadius: Radius.xl,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  alignItems: "center",
                }}
              >
                {!!question.trackInfo.coverUrl && (
                  <Image
                    source={{ uri: question.trackInfo.coverUrl }}
                    style={{ width: 180, height: 180, borderRadius: 14 }}
                  />
                )}
                <Text
                  style={{
                    marginTop: 10,
                    color: Colors.textOnNavy,
                    fontSize: 24,
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  {question.trackInfo.name}
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    color: Colors.textOnNavy,
                    fontSize: 20,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  {question.trackInfo.artist}
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    color: Colors.textOnNavy,
                    fontSize: 18,
                    textAlign: "center",
                  }}
                >
                  {question.trackInfo.album} | {question.trackInfo.year}
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
            Noch keine aktive Frage. Starte die erste Runde.
          </Text>
        )}

        <BBButton
          title={actionBusy ? "Bitte warten..." : startRoundLabel}
          onPress={onStartRound}
          disabled={!canStartRound || actionBusy}
        />

        {lobby?.status === "question" && (
          <BBButton
            title={actionBusy ? "Bitte warten..." : "Reveal"}
            onPress={onReveal}
            disabled={!canReveal || actionBusy}
          />
        )}

        {lobby?.status === "question" && (
          <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
            {allAnswered
              ? "Alle Spieler haben geantwortet."
              : timeUp
                ? "Zeit abgelaufen (30s)."
                : "Warten auf Antworten..."}
          </Text>
        )}

        {lobby?.status === "reveal" && (
          <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
            Warten auf Spieler ({readyCount}/{totalPlayers})
            {allContinued ? " - alle bereit" : ""}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
