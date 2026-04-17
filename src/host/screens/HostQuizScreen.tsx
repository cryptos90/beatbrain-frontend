import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import { Colors } from "../../theme";
import type {
  LobbyPlayer,
  LobbyState,
  QuizQuestion,
  QuizQuestionOption,
} from "../../shared/types/app";
import { HostLayout } from "../components/HostLayout";
import { HostPanel } from "../components/HostPanel";
import { HostPlayerAvatar } from "../components/HostPlayerAvatar";
import { HostResponsiveGrid } from "../components/HostResponsiveGrid";
import { HostScreenContainer } from "../components/HostScreenContainer";
import { useHostViewport } from "../hooks/useHostViewport";

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

function playerChips(players: LobbyPlayer[], compact = false) {
  const avatarSize = compact ? 32 : 28;
  const labelFontSize = compact ? 12 : 12;
  const chipGap = compact ? 6 : 6;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
      {players.map((player) => (
        <View
          key={player.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.18)",
            borderRadius: 999,
            paddingVertical: compact ? 5 : 4,
            paddingHorizontal: compact ? 8 : 8,
            gap: chipGap,
          }}
        >
          <HostPlayerAvatar
            uri={player.avatarDataUrl}
            name={player.name}
            size={avatarSize}
            backgroundColor="rgba(255,255,255,0.22)"
            textColor={Colors.navy}
          />
          <Text
            numberOfLines={1}
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
  const {
    width: viewportWidth,
    height: viewportHeight,
    contentMax,
    compactViewport,
    isCompactHeight,
    radii,
    space,
    typeScale,
    fluidBetween,
  } = useHostViewport();
  const players = lobby?.players ?? [];
  const answeredCount = players.filter((player) => player.answered).length;
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
  const isCoverOptionsQuestion = question?.questionObject.format === "cover_options";
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

    return {
      label: String(answerValue ?? "").trim(),
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

      grouped.set(key, { answer, players: [player] });
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
  const shouldShowNextQuestionStatus = Boolean(
    question && totalPlayers > 0 && (lobby?.status === "reveal" || readyCount > 0 || allContinued),
  );
  const shouldCenterPrimaryStage = Boolean(
    question && !correctAnswer && !shouldShowSongInfo && !shouldShowNextQuestionStatus,
  );
  const revealTileCount = correctAnswer ? wrongAnswerGroups.length + 1 : 0;
  const useWideStageRow = viewportWidth >= 1120;
  const questionFontSize = question
    ? Math.min(
        fluidBetween(isCompactHeight ? 20 : 24, isCompactHeight ? 42 : 54, "width"),
        fluidBetween(isCompactHeight ? 24 : 28, isCompactHeight ? 46 : 60, "height"),
      )
    : fluidBetween(20, 32, "width");
  const questionLineHeight = questionFontSize + (isCompactHeight ? 4 : 6);
  const timerValueFontSize = Math.min(
    fluidBetween(isCompactHeight ? 30 : 36, isCompactHeight ? 60 : 76, "width"),
    fluidBetween(isCompactHeight ? 34 : 38, isCompactHeight ? 62 : 80, "height"),
  );
  const timerValueLineHeight = timerValueFontSize + 4;
  const answerTileMinWidth =
    viewportWidth <= 479
      ? 220
      : viewportWidth <= 767
        ? 220
        : isCompactHeight
          ? viewportWidth >= 1280
            ? 180
            : 210
          : viewportWidth <= 1023
            ? 250
            : 270;
  const answerTileColumns =
    revealTileCount >= 4 && viewportWidth >= 1220
      ? 4
      : viewportWidth >= 980
        ? 3
        : 2;
  const useRevealRow = revealTileCount > 1 && viewportWidth >= 1180;
  const coverSize = Math.min(
    isCompactHeight ? 112 : 156,
    Math.max(72, Math.round(Math.min(viewportWidth * 0.18, viewportHeight * 0.17))),
  );
  const songInfoCompact = isCompactHeight || viewportWidth < 1360;
  const useCombinedRevealFooter =
    shouldShowNextQuestionStatus &&
    shouldShowSongInfo &&
    viewportHeight < 1180;

  const answerTiles = useMemo<AnswerTile[]>(() => {
    if (!correctAnswer) {
      return [];
    }

    const correctDisplay = resolveAnswerDisplay(correctAnswer);
    const tiles: AnswerTile[] = [
      {
        id: "correct",
        label: "Korrekte Antwort",
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
    toleranceYears,
    wrongAnswerGroups,
  ]);

  const renderAnswerTile = (tile: AnswerTile) => {
    const showCoverOnlyDetails = isCoverOptionsQuestion && Boolean(tile.coverUrl);

    return (
      <View
        key={tile.id}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: tile.kind === "correct" ? "#16a34a" : "#dc2626",
          borderRadius: radii.xl,
          paddingVertical: isCompactHeight ? space.md : space.lg,
          paddingHorizontal: isCompactHeight ? space.sm : space.md,
          gap: isCompactHeight ? space.sm : space.md,
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: isCompactHeight ? space.xs : space.sm }}>
          <Text
            style={{
              color: Colors.navy,
              fontSize: typeScale.label,
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
                width: Math.min(isCompactHeight ? 76 : 112, Math.max(52, answerTileMinWidth * 0.28)),
                height: Math.min(isCompactHeight ? 76 : 112, Math.max(52, answerTileMinWidth * 0.28)),
                borderRadius: radii.md,
                alignSelf: "center",
              }}
            />
          )}
          {!showCoverOnlyDetails && (
            <Text
              style={{
                color: Colors.navy,
                fontSize: fluidBetween(isCompactHeight ? 16 : 18, isCompactHeight ? 24 : 32, "width"),
                fontWeight: "900",
                textAlign: "center",
                lineHeight: fluidBetween(isCompactHeight ? 20 : 22, isCompactHeight ? 28 : 36, "width"),
              }}
            >
              {tile.answerDisplay}
            </Text>
          )}
          {!showCoverOnlyDetails && !!tile.subtitle && (
            <Text
              style={{
                color: Colors.navy,
                fontSize: typeScale.bodySm,
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
              fontSize: typeScale.bodySm,
              fontWeight: "700",
            }}
          >
            {tile.emptyMessage}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <HostLayout maxWidth={contentMax.stage} notice={notice} compactHeader headerEyebrow="Live Quiz">
      <HostScreenContainer gap={isCompactHeight ? space.md : space.lg}>
        <HostPanel
          tone="navy"
          padding={isCompactHeight ? "sm" : "md"}
          style={{
            minHeight: shouldCenterPrimaryStage
              ? Math.min(isCompactHeight ? 300 : 360, Math.max(200, viewportHeight * 0.24))
              : undefined,
            justifyContent: shouldCenterPrimaryStage ? "center" : undefined,
          }}
        >
          <View
            style={{
              flexDirection: useWideStageRow ? "row" : "column",
              justifyContent: "space-between",
              gap: space.md,
              alignItems: useWideStageRow ? "center" : "stretch",
            }}
          >
            <View style={{ flex: 1, gap: space.xs }}>
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
                  width: useWideStageRow ? (isCompactHeight ? 176 : 208) : "100%",
                  maxWidth: useWideStageRow ? undefined : 280,
                  alignSelf: useWideStageRow ? "auto" : "center",
                  borderRadius: radii.xl,
                  backgroundColor:
                    secondsLeft <= 5 ? "rgba(220,38,38,0.92)" : "rgba(255,255,255,0.12)",
                  paddingHorizontal: isCompactHeight ? space.md : space.lg,
                  paddingVertical: isCompactHeight ? space.md : space.lg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: Colors.textOnNavy,
                    fontSize: typeScale.label,
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
                borderRadius: radii.lg,
                backgroundColor: "rgba(255,255,255,0.1)",
                paddingHorizontal: isCompactHeight ? space.md : space.lg,
                paddingVertical: isCompactHeight ? space.sm : space.md,
                gap: isCompactHeight ? space.xs : space.sm,
              }}
            >
              <Text
                style={{
                  color: Colors.textOnNavy,
                  fontSize: typeScale.bodyLg,
                  fontWeight: "800",
                  textAlign: "center",
                }}
              >
                Antworten: {answeredCount}/{totalPlayers}
              </Text>
              <View
                style={{
                  height: compactViewport ? 12 : 14,
                  borderRadius: radii.pill,
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
                borderRadius: radii.md,
                paddingVertical: space.sm,
                paddingHorizontal: space.md,
              }}
            >
              <Text
                style={{
                  color: "#78350f",
                  fontWeight: "800",
                  textAlign: "center",
                }}
              >
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
        </HostPanel>

        {question ? (
          <>
            {!!correctAnswer && answerTiles.length > 0 && (
              useRevealRow ? (
                <View style={{ flexDirection: "row", gap: isCompactHeight ? space.sm : space.md }}>
                  {answerTiles.map((tile) => (
                    <View key={tile.id} style={{ flex: 1, minWidth: 0 }}>
                      {renderAnswerTile(tile)}
                    </View>
                  ))}
                </View>
              ) : (
                <HostResponsiveGrid
                  minItemWidth={answerTileMinWidth}
                  maxColumns={answerTileColumns}
                  gap={isCompactHeight ? space.sm : space.md}
                >
                  {answerTiles.map((tile) => renderAnswerTile(tile))}
                </HostResponsiveGrid>
              )
            )}

            {useCombinedRevealFooter ? (
              <HostPanel
                tone="navy"
                padding={isCompactHeight ? "sm" : "md"}
                style={{ justifyContent: "center" }}
              >
                <View
                  style={{
                    flexDirection: viewportWidth >= 1180 ? "row" : "column",
                    alignItems: viewportWidth >= 1180 ? "center" : "stretch",
                    gap: isCompactHeight ? space.sm : space.md,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: space.md,
                    }}
                  >
                    {!!question.trackInfo.coverUrl ? (
                      <Image
                        source={{ uri: question.trackInfo.coverUrl }}
                        resizeMode="cover"
                        style={{
                          width: coverSize,
                          height: coverSize,
                          borderRadius: radii.md,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: coverSize,
                          height: coverSize,
                          borderRadius: radii.md,
                          backgroundColor: "rgba(255,255,255,0.12)",
                        }}
                      />
                    )}
                    <View style={{ flex: 1, gap: space.xxs }}>
                      <Text
                        style={{
                          color: "rgba(46,196,182,0.88)",
                          fontSize: typeScale.label,
                          fontWeight: "900",
                          letterSpacing: 1.1,
                          textTransform: "uppercase",
                        }}
                      >
                        Song-Info
                      </Text>
                      <Text
                        style={{
                          color: Colors.textOnNavy,
                          fontSize: fluidBetween(18, 24, "width"),
                          fontWeight: "900",
                        }}
                      >
                        {question.trackInfo.name}
                      </Text>
                      <Text
                        style={{
                          color: Colors.textOnNavy,
                          fontSize: typeScale.bodySm,
                          opacity: 0.95,
                        }}
                      >
                        {question.trackInfo.artist}
                      </Text>
                      <Text
                        style={{
                          color: Colors.textOnNavy,
                          fontSize: typeScale.bodySm,
                          opacity: 0.9,
                        }}
                      >
                        {question.trackInfo.album} · Jahr: {question.trackInfo.year || "?"}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      width: viewportWidth >= 1180 ? Math.min(320, viewportWidth * 0.22) : "100%",
                      gap: space.xs,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.textOnNavy,
                        fontSize: fluidBetween(18, 22, "width"),
                        fontWeight: "900",
                        textAlign: viewportWidth >= 1180 ? "left" : "center",
                      }}
                    >
                      Nächste Frage
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.86)",
                        fontSize: typeScale.bodySm,
                        fontWeight: "700",
                        textAlign: viewportWidth >= 1180 ? "left" : "center",
                      }}
                    >
                      {readyCount}/{totalPlayers} bereit
                    </Text>
                    <View
                      style={{
                        height: compactViewport ? 12 : 14,
                        borderRadius: radii.pill,
                        backgroundColor: "rgba(255,255,255,0.12)",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: "100%",
                          width: `${Math.round(nextQuestionProgress * 100)}%`,
                          backgroundColor: Colors.textOnNavy,
                        }}
                      />
                    </View>
                  </View>
                </View>
              </HostPanel>
            ) : (shouldShowNextQuestionStatus || shouldShowSongInfo) && (
              <HostResponsiveGrid
                minItemWidth={songInfoCompact ? 360 : 320}
                maxColumns={2}
                gap={isCompactHeight ? space.sm : space.md}
              >
                {shouldShowNextQuestionStatus && (
                  <HostPanel
                    tone="glass"
                    padding={isCompactHeight ? "sm" : "md"}
                    style={{ height: "100%", justifyContent: "center" }}
                  >
                    <Text
                      style={{
                        color: Colors.textOnBg,
                        fontSize: fluidBetween(isCompactHeight ? 18 : 20, isCompactHeight ? 22 : 26, "width"),
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      Nächste Frage
                    </Text>
                    <Text
                      style={{
                        color: "rgba(32,44,89,0.88)",
                        fontSize: typeScale.body,
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      {readyCount}/{totalPlayers} bereit
                    </Text>
                    <View
                      style={{
                        height: compactViewport ? 12 : 14,
                        borderRadius: radii.pill,
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
                  </HostPanel>
                )}

                {shouldShowSongInfo && (
                  <HostPanel
                    tone="navy"
                    padding={isCompactHeight ? "sm" : "md"}
                    style={{ height: "100%", justifyContent: "center" }}
                  >
                    {songInfoCompact ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: space.md,
                        }}
                      >
                        {!!question.trackInfo.coverUrl ? (
                          <Image
                            source={{ uri: question.trackInfo.coverUrl }}
                            resizeMode="cover"
                            style={{
                              width: coverSize,
                              height: coverSize,
                              borderRadius: radii.md,
                            }}
                          />
                        ) : (
                          <View
                            style={{
                              width: coverSize,
                              height: coverSize,
                              borderRadius: radii.md,
                              backgroundColor: "rgba(255,255,255,0.12)",
                            }}
                          />
                        )}
                        <View style={{ flex: 1, gap: space.xxs }}>
                          <Text
                            style={{
                              color: "rgba(46,196,182,0.88)",
                              fontSize: typeScale.label,
                              fontWeight: "900",
                              letterSpacing: 1.1,
                              textTransform: "uppercase",
                            }}
                          >
                            Song-Info
                          </Text>
                          <Text
                            style={{
                              color: Colors.textOnNavy,
                              fontSize: fluidBetween(18, 24, "width"),
                              fontWeight: "900",
                            }}
                          >
                            {question.trackInfo.name}
                          </Text>
                          <Text
                            style={{
                              color: Colors.textOnNavy,
                              fontSize: typeScale.bodySm,
                              opacity: 0.95,
                            }}
                          >
                            {question.trackInfo.artist}
                          </Text>
                          <Text
                            style={{
                              color: Colors.textOnNavy,
                              fontSize: typeScale.bodySm,
                              opacity: 0.9,
                            }}
                          >
                            {question.trackInfo.album} · Jahr: {question.trackInfo.year || "?"}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        {!!question.trackInfo.coverUrl ? (
                          <Image
                            source={{ uri: question.trackInfo.coverUrl }}
                            resizeMode="cover"
                            style={{
                              width: coverSize,
                              height: coverSize,
                              borderRadius: radii.md,
                              alignSelf: "center",
                            }}
                          />
                        ) : (
                          <View
                            style={{
                              width: coverSize,
                              height: coverSize,
                              borderRadius: radii.md,
                              backgroundColor: "rgba(255,255,255,0.12)",
                              alignSelf: "center",
                            }}
                          />
                        )}

                        <Text
                          style={{
                            color: "rgba(46,196,182,0.88)",
                            fontSize: typeScale.label,
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
                            fontSize: fluidBetween(22, 30, "width"),
                            fontWeight: "900",
                            textAlign: "center",
                          }}
                        >
                          {question.trackInfo.name}
                        </Text>
                        <Text
                          style={{
                            color: Colors.textOnNavy,
                            fontSize: typeScale.body,
                            textAlign: "center",
                            opacity: 0.95,
                          }}
                        >
                          {question.trackInfo.artist}
                        </Text>
                        <Text
                          style={{
                            color: Colors.textOnNavy,
                            fontSize: typeScale.bodySm,
                            textAlign: "center",
                            opacity: 0.9,
                          }}
                        >
                          {question.trackInfo.album}
                        </Text>
                        <Text
                          style={{
                            color: Colors.textOnNavy,
                            fontSize: typeScale.bodySm,
                            textAlign: "center",
                            opacity: 0.9,
                          }}
                        >
                          Jahr: {question.trackInfo.year || "?"}
                        </Text>
                      </>
                    )}
                  </HostPanel>
                )}
              </HostResponsiveGrid>
            )}
          </>
        ) : (
          <HostPanel tone="glass" style={{ alignItems: "center", justifyContent: "center" }}>
            <Text
              style={{
                color: Colors.textOnBg,
                textAlign: "center",
                fontWeight: "900",
                fontSize: fluidBetween(24, 32, "width"),
              }}
            >
              Warte auf die erste Frage...
            </Text>
            <Text
              style={{
                color: "rgba(32,44,89,0.84)",
                textAlign: "center",
                fontWeight: "600",
                fontSize: typeScale.body,
                lineHeight: typeScale.body + 7,
              }}
            >
              Sobald die Runde gestartet wird, erscheinen Frage und Timer hier.
            </Text>
          </HostPanel>
        )}
      </HostScreenContainer>
    </HostLayout>
  );
}
