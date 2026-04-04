import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import { Colors, Radius } from "../../theme";
import type {
  LobbyPlayer,
  LobbyState,
  QuizQuestion,
  QuizQuestionOption,
} from "../../shared/types/app";
import { useHostViewport } from "../hooks/useHostViewport";
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
  answerDisplay: string;
  players: LobbyPlayer[];
  kind: "correct" | "wrong";
  subtitle?: string | null;
  coverUrl?: string;
  emptyMessage?: string | null;
};

function normalizeAnswer(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function resolveQuestionOption(
  question: QuizQuestion | null,
  answerValue: string | null | undefined,
): QuizQuestionOption | null {
  if (!question) {
    return null;
  }

  const normalizedAnswerValue = String(answerValue ?? "").trim();
  if (!normalizedAnswerValue) {
    return null;
  }

  return (
    question.optionDetails?.find((option) => option.value === normalizedAnswerValue) ?? null
  );
}

function playerChips(players: LobbyPlayer[], compact = false, dense = false) {
  const avatarSize = compact ? (dense ? 44 : 64) : 28;
  const chipGap = compact ? (dense ? 6 : 8) : 6;
  const chipPaddingVertical = compact ? (dense ? 5 : 7) : 4;
  const chipPaddingHorizontal = compact ? (dense ? 8 : 10) : 8;
  const labelFontSize = compact ? (dense ? 13 : 16) : 13;

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
              color: Colors.navy,
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
  const { width: viewportWidth, height: viewportHeight, fluid, isShortHeight } = useHostViewport();
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

  const resolveAnswerDisplay = (answerValue: string | null | undefined) => {
    const option = resolveQuestionOption(question, answerValue);
    if (option) {
      return {
        label: option.label,
        subtitle: option.subtitle ?? null,
        coverUrl: option.coverUrl,
      };
    }

    const fallbackLabel = String(answerValue ?? "").trim();
    return {
      label: fallbackLabel,
      subtitle: null,
      coverUrl: undefined,
    };
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

  const compactAnswersLayout = viewportWidth < 820 || isShortHeight;
  const wideTopRow = viewportWidth >= 1180 && !isShortHeight;
  const questionFontSize = question ? fluid(48, 28, 56) : fluid(32, 24, 34);
  const questionLineHeight = questionFontSize + fluid(question ? 6 : 5, 4, 7, "height");
  const timerValueFontSize = fluid(wideTopRow ? 68 : 58, 40, 76);
  const timerValueLineHeight = timerValueFontSize + 6;
  const stageHorizontalPadding = fluid(22, 14, 24);
  const stageVerticalPadding = shouldCenterPrimaryStage
    ? fluid(28, 18, 32, "height")
    : fluid(22, 16, 22, "height");
  const songCardMaxWidth = Math.min(
    viewportWidth >= 1180 ? 500 : 440,
    Math.max(280, Math.round(viewportWidth * (viewportWidth >= 1180 ? 0.46 : 0.66))),
  );
  const coverSize = Math.min(
    176,
    Math.max(104, Math.round(Math.min(songCardMaxWidth * 0.48, viewportHeight * 0.2))),
  );
  const answerTiles = useMemo<AnswerTile[]>(() => {
    if (!correctAnswer) {
      return [];
    }

    const correctDisplay = resolveAnswerDisplay(correctAnswer);

    const tiles: AnswerTile[] = [
      {
        id: "correct",
        label: "Korrekte Antwort",
        answer: correctAnswer,
        answerDisplay: correctDisplay.label,
        players: correctPlayers,
        kind: "correct",
        subtitle:
          isYearInputQuestion && Number.isFinite(correctYear)
            ? `Toleranz: ${correctYear - toleranceYears} bis ${correctYear + toleranceYears}`
            : correctDisplay.subtitle,
        ...(correctDisplay.coverUrl ? { coverUrl: correctDisplay.coverUrl } : {}),
        emptyMessage: "Niemand hat korrekt geantwortet.",
      },
    ];

    for (const group of wrongAnswerGroups) {
      const wrongDisplay = resolveAnswerDisplay(group.answer);
      tiles.push({
        id: `wrong-${normalizeAnswer(group.answer)}`,
        label: "Falsche Antwort",
        answer: group.answer,
        answerDisplay: wrongDisplay.label,
        players: group.players,
        kind: "wrong",
        subtitle: wrongDisplay.subtitle,
        ...(wrongDisplay.coverUrl ? { coverUrl: wrongDisplay.coverUrl } : {}),
      });
    }

    return tiles;
  }, [
    correctAnswer,
    correctPlayers,
    correctYear,
    isYearInputQuestion,
    question,
    toleranceYears,
    wrongAnswerGroups,
  ]);
  const answerTileColumns =
    answerTiles.length === 0
      ? 1
      : answerTiles.length > 4
        ? answerTiles.length
      : viewportWidth >= 1500 && !isShortHeight
        ? Math.min(answerTiles.length, 4)
        : viewportWidth >= 1120 && !isShortHeight
          ? Math.min(answerTiles.length, 3)
          : viewportWidth >= 760
            ? Math.min(answerTiles.length, 2)
            : 1;
  const denseAnswerTiles = answerTileColumns > 4;
  const answerTileWidth = `${100 / answerTileColumns}%` as `${number}%`;
  const answerTileGap = denseAnswerTiles ? 8 : viewportWidth >= 760 ? 12 : 10;
  const answerTileMinHeight =
    denseAnswerTiles
      ? fluid(176, 148, 184, "height")
      : answerTileColumns === 1
      ? fluid(210, 176, 220, "height")
      : fluid(viewportWidth >= 1120 ? 240 : 220, 190, 240, "height");
  const answerTileHeadingFontSize = denseAnswerTiles ? 13 : 16;
  const answerTileValueFontSize = denseAnswerTiles
    ? fluid(22, 16, 24)
    : viewportWidth >= 1120
      ? 34
      : viewportWidth >= 760
        ? 30
        : 26;
  const answerTileValueLineHeight = answerTileValueFontSize + (denseAnswerTiles ? 3 : 4);
  const answerTileSubtitleFontSize = denseAnswerTiles ? 12 : 15;
  const shouldSplitRevealInfoRow =
    shouldShowNextQuestionStatus && shouldShowSongInfo && viewportWidth >= 1160 && !isShortHeight;


  return (
    <HostLayout maxWidth={1520} notice={notice} compactHeader headerEyebrow="Live Quiz">
      <View
        style={{
          width: "100%",
          paddingBottom: 10,
          gap: 14,
        }}
      >
        <View
          style={{
            backgroundColor: Colors.navy,
            borderRadius: Radius.xl,
            paddingHorizontal: stageHorizontalPadding,
            paddingVertical: stageVerticalPadding,
            gap: 16,
            minHeight: shouldCenterPrimaryStage
              ? Math.min(380, Math.max(viewportWidth >= 720 ? 240 : 210, viewportHeight * 0.28))
              : undefined,
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
                  fontSize: questionFontSize,
                  fontWeight: "900",
                  lineHeight: questionLineHeight,
                  textAlign: "center",
                }}
              >
                {question ? question.questionObject.questionText : "Warte auf die erste Frage..."}
              </Text>
              
            </View>

            {shouldShowTimer && (
              <View
                style={{
                  width: wideTopRow ? undefined : "100%",
                  maxWidth: wideTopRow ? 220 : 320,
                  alignSelf: wideTopRow ? "auto" : "center",
                  borderRadius: Radius.xl,
                  backgroundColor:
                    secondsLeft <= 5 ? "rgba(220,38,38,0.92)" : "rgba(255,255,255,0.12)",
                  paddingHorizontal: fluid(18, 14, 20),
                  paddingVertical: fluid(16, 12, 18, "height"),
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
                    fontSize: timerValueFontSize,
                    lineHeight: timerValueLineHeight,
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
                  flexWrap: denseAnswerTiles ? "nowrap" : "wrap",
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
                        minHeight: answerTileMinHeight,
                        height: "100%",
                        backgroundColor: tile.kind === "correct" ? "#16a34a" : "#dc2626",
                        borderRadius: Radius.xl,
                        paddingVertical: denseAnswerTiles ? 12 : 18,
                        paddingHorizontal: denseAnswerTiles ? 10 : 16,
                        gap: denseAnswerTiles ? 10 : 12,
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ gap: 10 }}>
                        <Text
                          style={{
                            color: Colors.navy,
                            fontSize: answerTileHeadingFontSize,
                            fontWeight: "900",
                            textAlign: "center",
                            letterSpacing: 1,
                            textTransform: "uppercase",
                          }}
                        >
                          {tile.label}
                        </Text>
                        {!!tile.coverUrl && (
                          <Image
                            source={{ uri: tile.coverUrl }}
                            resizeMode="cover"
                            style={{
                              width: denseAnswerTiles
                                ? Math.min(92, Math.max(62, answerTileMinHeight * 0.36))
                                : Math.min(160, Math.max(110, answerTileMinHeight * 0.48)),
                              height: denseAnswerTiles
                                ? Math.min(92, Math.max(62, answerTileMinHeight * 0.36))
                                : Math.min(160, Math.max(110, answerTileMinHeight * 0.48)),
                              borderRadius: 16,
                              alignSelf: "center",
                            }}
                          />
                        )}
                        <Text
                          style={{
                            color: Colors.navy,
                            fontSize: answerTileValueFontSize,
                            fontWeight: "900",
                            textAlign: "center",
                            lineHeight: answerTileValueLineHeight,
                          }}
                        >
                          {tile.answerDisplay}
                        </Text>
                        {!!tile.subtitle && (
                          <Text
                            style={{
                              color: Colors.navy,
                              fontSize: answerTileSubtitleFontSize,
                              textAlign: "center",
                              opacity: 0.92,
                            }}
                          >
                            {tile.subtitle}
                          </Text>
                        )}
                      </View>

                      {tile.players.length > 0 ? (
                        playerChips(tile.players, true, denseAnswerTiles)
                      ) : !!tile.emptyMessage ? (
                        <Text
                          style={{
                            color: Colors.navy,
                            textAlign: "center",
                            fontSize: answerTileSubtitleFontSize,
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
                        fontSize: viewportWidth >= 760 ? 24 : 20,
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      Nächste Frage
                    </Text>
                    <Text
                      style={{
                        color: "rgba(32,44,89,0.88)",
                        fontSize: viewportWidth >= 760 ? 18 : 16,
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
                        fontSize: viewportWidth >= 760 ? 28 : 24,
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      {question.trackInfo.name}
                    </Text>
                    <Text
                      style={{
                        color: Colors.textOnNavy,
                        fontSize: viewportWidth >= 760 ? 18 : 16,
                        textAlign: "center",
                        opacity: 0.95,
                      }}
                    >
                      {question.trackInfo.artist}
                    </Text>
                    <Text
                      style={{
                        color: Colors.textOnNavy,
                        fontSize: viewportWidth >= 760 ? 16 : 15,
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
