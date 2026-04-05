import React, { useCallback, useMemo, useState } from "react";
import { Text, View, type LayoutChangeEvent } from "react-native";
import type { LobbyPlayer, LobbyState } from "../../shared/types/app";
import { Colors } from "../../theme";
import { useHostViewport } from "../hooks/useHostViewport";
import { HostPlayerAvatar } from "./HostPlayerAvatar";

type Props = {
  players: LobbyPlayer[];
  status: LobbyState["status"];
  height: number;
};

function playerStatusLabel(status: LobbyState["status"], answered: boolean, continued: boolean) {
  if (status === "results") {
    return "Fertig";
  }
  if (status === "reveal") {
    return continued ? "Bereit" : "Liest auf";
  }
  if (status === "question") {
    return answered ? "Antwort da" : "Noch offen";
  }
  return "In der Lobby";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function resolveMatrix(count: number, width: number, height: number, gap: number) {
  if (count <= 0 || width <= 0 || height <= 0) {
    return {
      rows: 1,
      columns: 1,
      itemWidth: width,
      itemHeight: height,
    };
  }

  let best = {
    rows: 1,
    columns: count,
    itemWidth: width,
    itemHeight: height,
    score: -Infinity,
  };

  const maxRows = Math.min(count, 4);
  for (let rows = 1; rows <= maxRows; rows += 1) {
    const columns = Math.ceil(count / rows);
    const itemWidth = Math.floor((width - gap * (columns - 1)) / columns);
    const itemHeight = Math.floor((height - gap * (rows - 1)) / rows);
    if (itemWidth <= 0 || itemHeight <= 0) {
      continue;
    }

    const score = Math.min(itemWidth, itemHeight * 1.55);
    if (score > best.score) {
      best = {
        rows,
        columns,
        itemWidth,
        itemHeight,
        score,
      };
    }
  }

  return best;
}

export function HostPlayerStageGrid({ players, status, height }: Props) {
  const { radii, space, typeScale, isCompactHeight } = useHostViewport();
  const [width, setWidth] = useState(0);
  const gap = isCompactHeight ? space.xs : space.sm;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.max(0, Math.round(event.nativeEvent.layout.width));
    setWidth((current) => (Math.abs(current - nextWidth) > 1 ? nextWidth : current));
  }, []);

  const layout = useMemo(
    () => resolveMatrix(players.length, width, height, gap),
    [players.length, width, height, gap],
  );

  const rows = useMemo(() => {
    const chunked: LobbyPlayer[][] = [];
    for (let index = 0; index < players.length; index += layout.columns) {
      chunked.push(players.slice(index, index + layout.columns));
    }
    return chunked;
  }, [layout.columns, players]);

  const cardRadius = clamp(Math.round(Math.min(layout.itemWidth, layout.itemHeight) * 0.16), 14, radii.lg);
  const cardPaddingX = clamp(Math.round(layout.itemWidth * 0.08), 8, space.md);
  const cardPaddingY = clamp(Math.round(layout.itemHeight * 0.1), 8, space.md);
  const cardGap = clamp(Math.round(layout.itemHeight * 0.04), 4, space.xs);
  const avatarSize = clamp(Math.round(Math.min(layout.itemWidth, layout.itemHeight) * 0.3), 28, 54);
  const nameSize = clamp(Math.round(layout.itemWidth * 0.1), 13, 18);
  const scoreSize = clamp(Math.round(layout.itemWidth * 0.075), 12, typeScale.body);
  const statusSize = clamp(Math.round(layout.itemWidth * 0.066), 10, typeScale.bodySm);

  return (
    <View style={{ width: "100%", height }} onLayout={onLayout}>
      <View style={{ flex: 1, justifyContent: "center", gap }}>
        {rows.map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap,
            }}
          >
            {row.map((player) => (
              <View
                key={player.id}
                style={{
                  width: layout.itemWidth,
                  height: layout.itemHeight,
                  borderRadius: cardRadius,
                  backgroundColor: Colors.navy,
                  paddingHorizontal: cardPaddingX,
                  paddingVertical: cardPaddingY,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: cardGap,
                }}
              >
                <HostPlayerAvatar
                  uri={player.avatarDataUrl}
                  name={player.name}
                  size={avatarSize}
                  backgroundColor="rgba(255,255,255,0.18)"
                  textColor={Colors.textOnNavy}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    color: Colors.textOnNavy,
                    fontSize: nameSize,
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  {player.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: Colors.textOnNavy,
                    fontSize: scoreSize,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Score: {player.score}
                </Text>
                <View
                  style={{
                    marginTop: 1,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.12)",
                    paddingHorizontal: clamp(Math.round(layout.itemWidth * 0.08), 8, space.md),
                    paddingVertical: Math.max(2, space.xxs),
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: Colors.textOnNavy,
                      fontSize: statusSize,
                      fontWeight: "800",
                      textAlign: "center",
                    }}
                  >
                    {playerStatusLabel(status, player.answered, player.readyForNext)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
