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

type AnswerTile = {
  id: string;
  label: string;
  answer: string;
  players: LobbyPlayer[];
  kind: "correct" | "wrong";
  subtitle?: string | null;
  emptyMessage?: string | null;
};

function normalizeAnswer(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function playerChips(players: LobbyPlayer[], compact = false) {
  const avatarSize = compact ? 72 : 28;
  const chipGap = compact ? 10 : 6;
  const chipPaddingVertical = compact ? 8 : 4;
  const chipPaddingHorizontal = compact ? 12 : 8;
  const labelFontSize = compact ? 18 : 13;

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
            paddingVertical: chipPaddingVertical,
            paddingHorizontal: chipPaddingHorizontal,
            gap: chipGap,
          }}
        >
          <Image
            source={{ uri: player.avatarDataUrl }}
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            }}
          />
          <Text
            style={{
              color: Colors.textOnNavy,
              fontSize: labelFontSize,
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
  const answeredCount = players.filter((player) => player.answered).length;
  const openCount = Math.max(0, totalPlayers - answeredCount);
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
  const answerProgress =
    totalPlayers > 0 ? Math.max(0, Math.min(1, answeredCount / totalPlayers)) : 0;
  const nextQuestionProgress =
    totalPlayers > 0 ? Math.max(0, Math.min(1, readyCount / totalPlayers)) : 0;
  const missingReadyCount = Math.max(0, totalPlayers - readyCount);
  const shouldShowNextQuestionStatus = Boolean(
    question && totalPlayers > 0 && (lobby?.status === "reveal" || readyCount > 0 || allContinued),
  );
  const shouldCenterPrimaryStage = Boolean(
    question && !correctAnswer && !shouldShowSongInfo && !shouldShowNextQuestionStatus,
  );

  const compactAnswersLayout = viewportWidth < 920;
  const wideTopRow = viewportWidth >= 1180;
  const songCardMaxWidth = Math.min(500, Math.max(320, Math.round(viewportWidth * 0.46)));
  const coverSize = Math.min(
    176,
    Math.max(116, Math.round(Math.min(songCardMaxWidth * 0.5, viewportHeight * 0.22))),
  );
  const answerTiles = useMemo<AnswerTile[]>(() => {
    if (!correctAnswer) {
      return [];
    }

    const tiles: AnswerTile[] = [
      {
        id: "correct",
        label: "Korrekte Antwort",
        answer: correctAnswer,
        players: correctPlayers,
        kind: "correct",
        subtitle:
          isYearInputQuestion && Number.isFinite(correctYear)
            ? `Toleranz: ${correctYear - toleranceYears} bis ${correctYear + toleranceYears}`
            : null,
        emptyMessage: "Niemand hat korrekt geantwortet.",
      },
    ];

    for (const group of wrongAnswerGroups) {
      tiles.push({
        id: `wrong-${normalizeAnswer(group.answer)}`,
        label: "Falsche Antwort",
        answer: group.answer,
        players: group.players,
        kind: "wrong",
      });
    }

    return tiles;
  }, [
    correctAnswer,
    correctPlayers,
    correctYear,
    isYearInputQuestion,
    toleranceYears,
    wrongAnswerGroups,
  ]);
  const answerTileColumns =
    answerTiles.length === 0 ? 1 : compactAnswersLayout ? 1 : Math.min(answerTiles.length, 4);
  const answerTileWidth = `${100 / answerTileColumns}%` as `${number}%`;
  const answerTileGap = 12;
  const shouldSplitRevealInfoRow = shouldShowNextQuestionStatus && shouldShowSongInfo;


  return (
    <HostLayout maxWidth={1520} notice={notice} compactHeader headerEyebrow="Live Quiz">
      <View
        style={{
          flex: 1,
          paddingBottom: 10,
          gap: 14,
          justifyContent: shouldCenterPrimaryStage ? "center" : "flex-start",
        }}
      >
        <View
          style={{
            backgroundColor: Colors.navy,
            borderRadius: Radius.xl,
            paddingHorizontal: 24,
            paddingVertical: shouldCenterPrimaryStage ? 32 : 22,
            gap: 16,
            minHeight: shouldCenterPrimaryStage ? Math.min(420, Math.max(260, viewportHeight * 0.32)) : undefined,
          }}
        >
          <View
            style={{
              flexDirection: wideTopRow ? "row" : "column",
              justifyContent: "space-between",
              gap: 16,
              alignItems: wideTopRow ? "flex-start" : "stretch",
            }}
          >
            <View style={{ flex: 1, gap: 10 }}>
              <Text
                style={{
                  color: Colors.textOnNavy,
                  fontSize: question ? (viewportWidth >= 1280 ? 52 : 42) : 34,
                  fontWeight: "900",
                  lineHeight: question ? (viewportWidth >= 1280 ? 58 : 48) : 40,
                  textAlign: "center"
                }}
              >
                {question ? question.questionObject.questionText : "Warte auf die erste Frage..."}
              </Text>
              
            </View>

            {shouldShowTimer && (
              <View
                style={{
                  minWidth: wideTopRow ? 188 : undefined,
                  borderRadius: Radius.xl,
                  backgroundColor:
                    secondsLeft <= 5 ? "rgba(220,38,38,0.92)" : "rgba(255,255,255,0.12)",
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: Colors.textOnNavy,
                    fontSize: 14,
                    fontWeight: "900",
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  Timer
                </Text>
                <Text
                  style={{
                    color: Colors.textOnNavy,
                    fontSize: wideTopRow ? 72 : 60,
                    lineHeight: wideTopRow ? 78 : 66,
                    fontWeight: "900",
                  }}
                >
                  {secondsLeft}s
                </Text>
              </View>
            )}
          </View>

          {question && !correctAnswer && (
            <View
              style={{
                borderRadius: Radius.lg,
                backgroundColor: "rgba(255,255,255,0.1)",
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 10,
              }}
            >
              <View
                style={{
                  flexDirection: wideTopRow ? "row" : "column",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    color: Colors.textOnNavy,
                    fontSize: 20,
                    fontWeight: "800",
                  }}
                >
                  Antworten: {answeredCount}/{totalPlayers}
                </Text>
                
              </View>
              <View
                style={{
                  height: 16,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${Math.round(answerProgress * 100)}%`,
                    backgroundColor: Colors.textOnNavy,
                  }}
                />
              </View>
            </View>
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
            <Text style={{ color: "#fee2e2", textAlign: "center", fontWeight: "700" }}>
              {socketError}
            </Text>
          )}

          {actionBusy && (
            <Text
              style={{
                color: "rgba(46,196,182,0.92)",
                textAlign: "center",
                fontWeight: "800",
              }}
            >
              Host aktualisiert den Raumstatus...
            </Text>
          )}
        </View>

        {question ? (
          <>
            {!!correctAnswer && answerTiles.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginHorizontal: compactAnswersLayout ? 0 : -(answerTileGap / 2),
                }}
              >
                {answerTiles.map((tile) => (
                  <View
                    key={tile.id}
                    style={{
                      width: answerTileWidth,
                      paddingHorizontal: compactAnswersLayout ? 0 : answerTileGap / 2,
                      paddingBottom: answerTileGap,
                    }}
                  >
                    <View
                      style={{
                        minHeight: answerTileColumns === 1 ? 220 : 240,
                        height: "100%",
                        backgroundColor: tile.kind === "correct" ? "#16a34a" : "#dc2626",
                        borderRadius: Radius.xl,
                        paddingVertical: 18,
                        paddingHorizontal: 16,
                        gap: 12,
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ gap: 10 }}>
                        <Text
                          style={{
                            color: Colors.navy,
                            fontSize: 16,
                            fontWeight: "900",
                            textAlign: "center",
                            letterSpacing: 1,
                            textTransform: "uppercase",
                          }}
                        >
                          {tile.label}
                        </Text>
                        <Text
                          style={{
                            color: Colors.navy,
                            fontSize: 34,
                            fontWeight: "900",
                            textAlign: "center",
                            lineHeight: 38,
                          }}
                        >
                          {tile.answer}
                        </Text>
                        {!!tile.subtitle && (
                          <Text
                            style={{
                              color: Colors.navy,
                              fontSize: 15,
                              textAlign: "center",
                              opacity: 0.92,
                            }}
                          >
                            {tile.subtitle}
                          </Text>
                        )}
                      </View>

                      {tile.players.length > 0 ? (
                        playerChips(tile.players, true)
                      ) : !!tile.emptyMessage ? (
                        <Text
                          style={{
                            color: Colors.navy,
                            textAlign: "center",
                            fontSize: 15,
                            fontWeight: "700",
                          }}
                        >
                          {tile.emptyMessage}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {(shouldShowNextQuestionStatus || shouldShowSongInfo) && (
              <View
                style={{
                  flexDirection: shouldSplitRevealInfoRow ? "row" : "column",
                  gap: 12,
                  alignItems: "stretch",
                }}
              >
                {shouldShowNextQuestionStatus && (
                  <View
                    style={{
                      flex: shouldSplitRevealInfoRow ? 1 : undefined,
                      borderRadius: Radius.xl,
                      backgroundColor: "rgba(255,255,255,0.76)",
                      paddingVertical: 18,
                      paddingHorizontal: 18,
                      gap: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.textOnBg,
                        fontSize: 24,
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      Nächste Frage
                    </Text>
                    <Text
                      style={{
                        color: "rgba(32,44,89,0.88)",
                        fontSize: 18,
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      {readyCount}/{totalPlayers} bereit
                    </Text>
                    <View
                      style={{
                        height: 16,
                        borderRadius: 999,
                        backgroundColor: "rgba(32,44,89,0.14)",
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
                  </View>
                )}

                {shouldShowSongInfo && (
                  <View
                    style={{
                      flex: shouldSplitRevealInfoRow ? 1 : undefined,
                      width: shouldSplitRevealInfoRow ? undefined : "100%",
                      maxWidth: shouldSplitRevealInfoRow ? undefined : songCardMaxWidth,
                      alignSelf: shouldSplitRevealInfoRow ? undefined : "center",
                      backgroundColor: Colors.navy,
                      borderRadius: Radius.xl,
                      paddingVertical: 18,
                      paddingHorizontal: 18,
                      gap: 10,
                    }}
                  >
                    {!!question.trackInfo.coverUrl ? (
                      <Image
                        source={{ uri: question.trackInfo.coverUrl }}
                        resizeMode="cover"
                        style={{
                          width: coverSize,
                          height: coverSize,
                          borderRadius: 14,
                          alignSelf: "center",
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: coverSize,
                          height: coverSize,
                          borderRadius: 14,
                          backgroundColor: "rgba(255,255,255,0.12)",
                          alignSelf: "center",
                        }}
                      />
                    )}

                    <Text
                      style={{
                        color: "rgba(46,196,182,0.88)",
                        fontSize: 12,
                        fontWeight: "900",
                        letterSpacing: 1.1,
                        textTransform: "uppercase",
                        textAlign: "center",
                      }}
                    >
                      Song-Info
                    </Text>
                    <Text
                      style={{
                        color: Colors.textOnNavy,
                        fontSize: 28,
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      {question.trackInfo.name}
                    </Text>
                    <Text
                      style={{
                        color: Colors.textOnNavy,
                        fontSize: 18,
                        textAlign: "center",
                        opacity: 0.95,
                      }}
                    >
                      {question.trackInfo.artist}
                    </Text>
                    <Text
                      style={{
                        color: Colors.textOnNavy,
                        fontSize: 16,
                        textAlign: "center",
                        opacity: 0.9,
                      }}
                    >
                      {question.trackInfo.album}
                    </Text>
                    <Text
                      style={{
                        color: Colors.textOnNavy,
                        fontSize: 15,
                        textAlign: "center",
                        opacity: 0.9,
                      }}
                    >
                      Jahr: {question.trackInfo.year || "?"}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          <View
            style={{
              borderRadius: Radius.xl,
              backgroundColor: "rgba(255,255,255,0.72)",
              paddingVertical: 24,
              paddingHorizontal: 20,
              gap: 8,
            }}
          >
            <Text
              style={{
                color: Colors.textOnBg,
                textAlign: "center",
                fontWeight: "900",
                fontSize: 28,
              }}
            >
              Warte auf die erste Frage...
            </Text>
            <Text
              style={{
                color: "rgba(32,44,89,0.84)",
                textAlign: "center",
                fontWeight: "600",
                fontSize: 16,
                lineHeight: 23,
              }}
            >
              Sobald die Runde gestartet wird, erscheinen Frage und Timer hier.
            </Text>
          </View>
        )}
      </View>
    </HostLayout>
  );
}
