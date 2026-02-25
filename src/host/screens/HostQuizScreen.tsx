import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Text, View, useWindowDimensions } from "react-native";
import { Colors, Radius } from "../../theme";
import type { LobbyPlayer, LobbyState, QuizQuestion } from "../../shared/types/app";
import { HostLayout } from "../components/HostLayout";

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
  notice?: string | null;
};

type AnswerGroup = {
  answer: string;
  players: LobbyPlayer[];
};

function normalizeAnswer(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function playerChips(players: LobbyPlayer[], compact = false) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {players.map((player) => (
        <View
          key={player.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.18)",
            borderRadius: 999,
            paddingVertical: compact ? 3 : 4,
            paddingHorizontal: compact ? 7 : 8,
            gap: 6,
          }}
        >
          <Image
            source={{ uri: player.avatarDataUrl }}
            style={{
              width: compact ? 24 : 28,
              height: compact ? 24 : 28,
              borderRadius: compact ? 12 : 14,
            }}
          />
          <Text
            style={{
              color: Colors.textOnNavy,
              fontSize: compact ? 12 : 13,
              fontWeight: "700",
            }}
          >
            {player.name}
          </Text>
        </View>
      ))}
    </View>
  );
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
  notice,
}: Props) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const players = lobby?.players ?? [];
  const shouldShowTimer = Boolean(
    question && (lobby?.status === "question" || lobby?.status === "reveal"),
  );
  const shouldShowSongInfo = Boolean(
    question &&
      (Boolean(correctAnswer) || allAnswered || timeUp || lobby?.status === "reveal"),
  );

  const isYearInputQuestion = Boolean(
    question &&
      (question.questionObject.format === "year_input" ||
        question.questionObject.answerType === "year-input"),
  );
  const toleranceRaw = Number(question?.questionObject.payload?.toleranceYears ?? 0);
  const toleranceYears =
    Number.isFinite(toleranceRaw) && toleranceRaw >= 0 ? Math.floor(toleranceRaw) : 0;
  const payloadCorrectYearRaw = Number(question?.questionObject.payload?.correctYear);
  const fallbackCorrectYear = Number.parseInt(String(correctAnswer ?? ""), 10);
  const correctYear = Number.isFinite(payloadCorrectYearRaw)
    ? payloadCorrectYearRaw
    : Number.isFinite(fallbackCorrectYear)
      ? fallbackCorrectYear
      : NaN;

  const isPlayerAnswerCorrect = (answer: string | null | undefined) => {
    const normalized = String(answer ?? "").trim();
    if (!normalized || !correctAnswer) {
      return false;
    }

    if (isYearInputQuestion && Number.isFinite(correctYear)) {
      if (!/^\d{1,4}$/.test(normalized)) {
        return false;
      }
      const guess = Number.parseInt(normalized, 10);
      if (!Number.isFinite(guess)) {
        return false;
      }
      return Math.abs(guess - correctYear) <= toleranceYears;
    }

    return normalizeAnswer(normalized) === normalizeAnswer(correctAnswer);
  };

  const correctPlayers = useMemo(
    () =>
      correctAnswer
        ? players.filter((player) => isPlayerAnswerCorrect(player.latestAnswer))
        : [],
    [correctAnswer, players, correctYear, isYearInputQuestion, toleranceYears],
  );

  const wrongAnswerGroups = useMemo<AnswerGroup[]>(() => {
    if (!correctAnswer) {
      return [];
    }

    const grouped = new Map<string, AnswerGroup>();
    for (const player of players) {
      const answer = String(player.latestAnswer ?? "").trim();
      if (!answer || isPlayerAnswerCorrect(answer)) {
        continue;
      }

      const key = normalizeAnswer(answer);
      const existing = grouped.get(key);
      if (existing) {
        existing.players.push(player);
        continue;
      }

      grouped.set(key, {
        answer,
        players: [player],
      });
    }

    return Array.from(grouped.values()).sort((a, b) => b.players.length - a.players.length);
  }, [correctAnswer, players, correctYear, isYearInputQuestion, toleranceYears]);

  const wrongAnswersTitle =
    wrongAnswerGroups.length > 1 ? "Falsche Antworten" : "Falsche Antwort";

  const latestQuestionCountdownRef = useRef(0);
  const [frozenRevealCountdownMs, setFrozenRevealCountdownMs] = useState(0);
  const questionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const nextKey = question?.correctSongId ?? null;
    if (nextKey !== questionKeyRef.current) {
      questionKeyRef.current = nextKey;
      setFrozenRevealCountdownMs(0);
    }
  }, [question?.correctSongId]);

  useEffect(() => {
    if (lobby?.status === "question") {
      latestQuestionCountdownRef.current = Math.max(0, countdownMs);
    }
  }, [countdownMs, lobby?.status]);

  useEffect(() => {
    if (lobby?.status === "reveal") {
      setFrozenRevealCountdownMs(timeUp ? 0 : latestQuestionCountdownRef.current);
    }
  }, [lobby?.status, timeUp]);

  const visibleCountdownMs =
    lobby?.status === "reveal" ? frozenRevealCountdownMs : Math.max(0, countdownMs);
  const secondsLeft = Math.max(0, Math.ceil(visibleCountdownMs / 1000));
  const nextQuestionProgress =
    totalPlayers > 0
      ? Math.max(0, Math.min(1, readyCount / totalPlayers))
      : 0;

  const compactAnswersLayout = viewportWidth < 1100;
  const songCardMaxWidth = Math.min(500, Math.max(320, Math.round(viewportWidth * 0.46)));
  const coverSize = Math.min(
    176,
    Math.max(116, Math.round(Math.min(songCardMaxWidth * 0.5, viewportHeight * 0.22))),
  );

  return (
    <HostLayout notice={notice}>
      <View
        style={{
          flex: 1,
          paddingTop: 100,
          paddingBottom: 6,
          gap: 8,
        }}
      >
        <Text
          style={{
            color: Colors.textOnBg,
            fontSize: 17,
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          Session: {lobby?.joinCode ?? "-"}
        </Text>

        {shouldShowTimer && (
          <>
            <Text
              style={{
                color: Colors.textOnBg,
                fontSize: 36,
                fontWeight: "900",
                textAlign: "center",
                lineHeight: 40,
              }}
            >
              {secondsLeft}s
            </Text>
          </>
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
              paddingVertical: 18,
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={{
                color: Colors.textOnNavy,
                fontSize: 40,
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              {question.questionObject.questionText}
            </Text>
          </View>

            {!!correctAnswer && (
              <>
                <View
                  style={{
                    flexDirection: compactAnswersLayout ? "column" : "row",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      flex: wrongAnswerGroups.length > 0 && !compactAnswersLayout ? 0.44 : 1,
                      backgroundColor: "#16a34a",
                      borderRadius: Radius.xl,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.textOnNavy,
                        fontSize: 18,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      Korrekte Antwort
                    </Text>
                    <Text
                      style={{
                        color: Colors.textOnNavy,
                        fontSize: 27,
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      {correctAnswer}
                    </Text>
                    {isYearInputQuestion && Number.isFinite(correctYear) && (
                      <Text
                        style={{
                          color: Colors.textOnNavy,
                          fontSize: 14,
                          textAlign: "center",
                          opacity: 0.92,
                        }}
                      >
                        Toleranz: {correctYear - toleranceYears} bis {correctYear + toleranceYears}
                      </Text>
                    )}
                    {correctPlayers.length > 0 ? (
                      playerChips(correctPlayers, true)
                    ) : (
                      <Text
                        style={{
                          color: Colors.textOnNavy,
                          textAlign: "center",
                          fontSize: 13,
                          fontWeight: "700",
                        }}
                      >
                        Niemand hat korrekt geantwortet.
                      </Text>
                    )}
                  </View>

                {wrongAnswerGroups.length > 0 && (
                  <View
                    style={{
                      flex: compactAnswersLayout ? undefined : 0.56,
                      backgroundColor: "#dc2626",
                      borderRadius: Radius.xl,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.textOnNavy,
                        fontSize: 17,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      {wrongAnswersTitle}
                    </Text>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {wrongAnswerGroups.map((group) => (
                        <View
                          key={group.answer}
                          style={{
                            flexBasis: compactAnswersLayout ? "100%" : "31%",
                            flexGrow: 1,
                            backgroundColor: "rgba(127,29,29,0.55)",
                            borderRadius: 12,
                            paddingVertical: 8,
                            paddingHorizontal: 8,
                            gap: 6,
                            minWidth: compactAnswersLayout ? undefined : 128,
                          }}
                        >
                          <Text
                            style={{
                              color: Colors.textOnNavy,
                              fontSize: 16,
                              fontWeight: "800",
                              textAlign: "center",
                            }}
                          >
                            {group.answer}
                          </Text>
                          {playerChips(group.players, true)}
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                </View>
              </>
            )}

            {shouldShowSongInfo && (
              <View style={{ marginTop: 100, gap: 12 }}>
                <View
                  style={{
                    alignSelf: "center",
                    width: "100%",
                    maxWidth: songCardMaxWidth,
                    backgroundColor: Colors.navy,
                    borderRadius: Radius.xl,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    gap: 8,
                    marginBottom: 50
                  }}
                >
                  {!!question.trackInfo.coverUrl ? (
                    <Image
                      source={{ uri: question.trackInfo.coverUrl }}
                      resizeMode="cover"
                      style={{
                        width: coverSize,
                        height: coverSize,
                        borderRadius: 12,
                        alignSelf: "center",
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: coverSize,
                        height: coverSize,
                        borderRadius: 12,
                        backgroundColor: "rgba(255,255,255,0.12)",
                        alignSelf: "center",
                      }}
                    />
                  )}

                  <Text
                    style={{
                      color: Colors.textOnNavy,
                      fontSize: 24,
                      fontWeight: "900",
                      textAlign: "center",
                    }}
                  >
                    {question.trackInfo.name}
                  </Text>
                  <Text
                    style={{
                      color: Colors.textOnNavy,
                      fontSize: 17,
                      textAlign: "center",
                      opacity: 0.95,
                    }}
                  >
                    {question.trackInfo.artist}
                  </Text>
                  <Text
                    style={{
                      color: Colors.textOnNavy,
                      fontSize: 15,
                      textAlign: "center",
                      opacity: 0.9,
                    }}
                  >
                    {question.trackInfo.album}
                  </Text>
                  <Text
                    style={{
                      color: Colors.textOnNavy,
                      fontSize: 14,
                      textAlign: "center",
                      opacity: 0.9,
                    }}
                  >
                    Jahr: {question.trackInfo.year || "?"}
                  </Text>
                </View>

                {lobby?.status === "reveal" && (
                  <View style={{ alignSelf: "center", width: "100%", maxWidth: 520, gap: 10 }}>
                    <Text
                      style={{
                        color: Colors.textOnBg,
                        textAlign: "center",
                        fontWeight: "900",
                        fontSize: 24,
                      }}
                    >
                      Nächste Frage
                    </Text>
                    <View
                      style={{
                        alignSelf: "center",
                        width: "100%",
                        height: 20,
                        borderRadius: 999,
                        backgroundColor: "rgba(32,44,89,0.24)",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: "100%",
                          width: `${Math.round(nextQuestionProgress * 100)}%`,
                          backgroundColor: Colors.navy,
                        }}
                      />
                    </View>
                    {allContinued && (
                      <Text
                        style={{
                          color: Colors.textOnBg,
                          textAlign: "center",
                          fontWeight: "800",
                          fontSize: 16,
                        }}
                      >
                        Alle bereit. Nächste Frage startet automatisch.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
            Warte auf die erste Frage...
          </Text>
        )}

        
      </View>
    </HostLayout>
  );
}
